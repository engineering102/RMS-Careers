import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENTS, RECORD_MARKER, recordPayload, rollbackHistory, versionIdFromWranglerOutput } from '../deploy-tracking.mjs';
import {
  RECOVERY, WORKERS, checkHistory, crossCheckVersion, decideRollback, liveStateArgs, parseArgs, parseLive, rollbackArgs, runRollback, validateInputs, versionViewArgs, wranglerEnv
} from '../rollback.mjs';

const sha = (c) => c.repeat(40);
const A = sha('a'); // oldest verified commit
const B = sha('b'); // current last good commit
const C = sha('c'); // a deploy that went live but failed its smoke test
const VA = 'aaaaaaaa-0000-4000-8000-000000000001';
const VB = 'bbbbbbbb-0000-4000-8000-000000000002';
const VC = 'cccccccc-0000-4000-8000-000000000003';
const VX = 'eeeeeeee-0000-4000-8000-0000000000ee'; // a version nobody recorded
const REPO = 'engineering102/RMS-Careers';
const RUN_URL = `https://github.com/${REPO}/actions/runs/42/attempts/1`;
const ENV_OK = { CLOUDFLARE_API_TOKEN: 'tok', CLOUDFLARE_ACCOUNT_ID: 'acct', GITHUB_TOKEN: 'ghs_secret', PATH: '/bin' };

let n = 1;
/** One deployment record, exactly as the (future) deploy job and rollback.mjs create them. Time strictly increases. */
const dep = (app, at, { versionId, kind = 'deploy', creator = 'github-actions[bot]', statuses } = {}) => {
  const id = n++;
  return {
    id,
    sha: at,
    environment: ENVIRONMENTS[app],
    created_at: new Date(Date.UTC(2026, 9, 10) + id * 1000).toISOString(),
    creator: { login: creator },
    payload: { marker: RECORD_MARKER, app, sha: at, runId: '1', runUrl: '', kind, ...(versionId !== undefined ? { versionId } : {}) },
    _statuses: statuses
  };
};
const good = [{ state: 'in_progress' }, { state: 'success' }];
const bad = [{ state: 'in_progress' }, { state: 'failure' }];

/** Fake GitHub API recording every write so tests can assert ordering. `deployments` are listed oldest first. */
function fakeApi(deployments, { failCreate = false, failStatus = null } = {}) {
  const calls = [];
  const newestFirst = [...deployments].reverse();
  return {
    calls,
    listDeployments: async (_env, page) => (page === 1 ? newestFirst : []),
    listStatuses: async (id) => deployments.find((d) => d.id === id)._statuses ?? good,
    createDeployment: async (body) => {
      if (failCreate) throw new Error('HTTP 500');
      calls.push(['create', body.payload.kind, body.payload.sha, body.payload.versionId, body.environment]);
      return { id: 9999 };
    },
    createStatus: async (_id, { state, description }) => {
      if (failStatus === state) throw new Error('HTTP 500');
      calls.push(['status', state, description]);
    }
  };
}

/** A before (A, V_A) -> B (V_B) history: last good is B, live should be V_B. */
const standard = () => [dep('web', A, { versionId: VA }), dep('web', B, { versionId: VB })];
/** ...then C went live (V_C) but its smoke test failed: last good is still B. */
const smokeFailed = () => [...standard(), dep('web', C, { versionId: VC, statuses: bad })];

const versionJson = (v, s) => JSON.stringify({ id: v, annotations: { 'workers/tag': `sha-${s.slice(0, 12)}`, 'workers/message': `${RUN_URL} ${s}` } });
const liveJson = (v, pct = 100) => JSON.stringify({ versions: [{ version_id: v, percentage: pct }] });

/** Fake wrangler. `live` is consumed one answer per `deployments status` call; the last one repeats. */
function fakeWrangler({ live = [VB], view = versionJson(VA, A), viewStatus = 0, liveStatus = 0, rollbackStatus = 0 } = {}) {
  const calls = [];
  let i = 0;
  const fn = (args) => {
    calls.push(args.slice(1));
    if (args[1] === 'deployments') {
      const v = live[Math.min(i++, live.length - 1)];
      return { status: liveStatus, stdout: v.startsWith('{') || v.startsWith('Error') ? v : liveJson(v), stderr: '' };
    }
    if (args[1] === 'versions') return { status: viewStatus, stdout: view, stderr: '' };
    if (args[1] === 'rollback') return { status: rollbackStatus, stdout: '', stderr: '' };
    throw new Error(`unexpected wrangler command ${args[1]}`);
  };
  fn.calls = calls;
  fn.names = () => calls.map((c) => (c[0] === 'versions' ? 'view' : c[0] === 'deployments' ? 'live' : c[0]));
  return fn;
}

const base = (deployments = standard(), over = {}) => ({
  app: 'web', versionId: VA, reason: 'bad release', dryRun: false, runUrl: RUN_URL, runId: '42', repo: REPO,
  api: fakeApi(deployments), env: ENV_OK, wranglerBin: 'wr.js', smoke: async () => ({ ok: true }), ...over
});
const statesOf = (api) => api.calls.filter((c) => c[0] === 'status').map((c) => c[1]);

describe('rollback: command construction', () => {
  test('rollbackArgs pins version, worker name, config and message; no other flags', () => {
    assert.deepEqual(rollbackArgs('wr.js', { app: 'admin', versionId: VA, reason: 'bad release', runUrl: RUN_URL }), [
      'wr.js', 'rollback', VA, '--name', 'rms-admin', '--config', 'wrangler.jsonc', '--message', `rollback: bad release (${RUN_URL})`, '--yes'
    ]);
    const args = rollbackArgs('wr.js', { app: 'web', versionId: VA, reason: 'x', runUrl: RUN_URL });
    for (const forbidden of ['--env', '--var', '--routes', '--domains', '--secrets-file', 'deploy']) assert.ok(!args.includes(forbidden));
  });
  test('every app maps to its own Worker name, and every read is pinned to it', () => {
    assert.deepEqual(WORKERS, { web: 'rms-web', admin: 'rms-admin', student: 'rms-student' });
    assert.deepEqual(versionViewArgs('wr.js', { app: 'student', versionId: VA }), ['wr.js', 'versions', 'view', VA, '--name', 'rms-student', '--json']);
    assert.deepEqual(liveStateArgs('wr.js', { app: 'admin' }), ['wr.js', 'deployments', 'status', '--name', 'rms-admin', '--json']);
  });
  test('a malformed run URL is refused', () => {
    assert.throws(() => rollbackArgs('wr.js', { app: 'web', versionId: VA, reason: 'x', runUrl: 'http://evil.example/x' }), /bad-run-url/);
  });
  test('the wrangler child gets the Cloudflare pair and nothing sensitive from the parent', () => {
    const env = wranglerEnv({ ...ENV_OK, AWS_SECRET: 'x', POSTGRES_URL: 'postgres://prod' }, '/tmp/h');
    assert.equal(env.CLOUDFLARE_API_TOKEN, 'tok');
    assert.equal(env.CLOUDFLARE_ACCOUNT_ID, 'acct');
    assert.equal(env.HOME, '/tmp/h');
    for (const k of ['GITHUB_TOKEN', 'AWS_SECRET', 'POSTGRES_URL']) assert.ok(!(k in env), k);
  });
});

describe('rollback: input validation', () => {
  test('accepts a UUID version, a known app and a short reason', () => {
    assert.deepEqual(validateInputs({ app: 'web', versionId: VA, reason: '  bad release ' }), { app: 'web', versionId: VA, reason: 'bad release' });
  });
  for (const [name, input, code] of [
    ['unknown app', { app: 'tutor', versionId: VA, reason: 'x' }, 'bad-app'],
    ['missing version id (no "previous" guessing)', { app: 'web', versionId: '', reason: 'x' }, 'bad-version-id'],
    ['non-UUID version id', { app: 'web', versionId: 'latest; rm -rf /', reason: 'x' }, 'bad-version-id'],
    ['uppercase UUID', { app: 'web', versionId: VA.toUpperCase(), reason: 'x' }, 'bad-version-id'],
    ['empty reason', { app: 'web', versionId: VA, reason: '  ' }, 'bad-reason'],
    ['multi-line reason', { app: 'web', versionId: VA, reason: 'a\nb' }, 'bad-reason'],
    ['over-long reason', { app: 'web', versionId: VA, reason: 'x'.repeat(101) }, 'bad-reason']
  ]) {
    test(`rejects ${name}`, () => assert.throws(() => validateInputs(input), new RegExp(code)));
  }
});

describe('version association in the deployment record', () => {
  test('recordPayload stores a valid versionId, rejects a malformed one, and requires it on rollback records', () => {
    assert.equal(recordPayload({ app: 'web', sha: A, kind: 'deploy', versionId: VA }).versionId, VA);
    assert.equal('versionId' in recordPayload({ app: 'web', sha: A, kind: 'deploy' }), false);
    for (const bad of ['', 'latest', VA.toUpperCase(), VA.slice(1), 123]) assert.throws(() => recordPayload({ app: 'web', sha: A, kind: 'deploy', versionId: bad }), /bad-version-id/);
    assert.throws(() => recordPayload({ app: 'web', sha: A, kind: 'rollback' }), /rollback record must carry/);
  });

  test('a record with a malformed versionId is ignored entirely (cannot be a target or a base)', async () => {
    const forged = dep('web', A, { versionId: 'not-a-uuid' });
    const h = await rollbackHistory({ api: fakeApi([forged]), app: 'web' });
    assert.deepEqual([h.records.length, h.last, h.verified.size], [0, null, 0]);
  });

  test('a rollback record without a versionId is ignored', async () => {
    const r = dep('web', A, { kind: 'rollback' });
    assert.equal((await rollbackHistory({ api: fakeApi([r]), app: 'web' })).records.length, 0);
  });

  test('missing association: a successful record without versionId is the base but never a rollback target', async () => {
    const h = await rollbackHistory({ api: fakeApi([dep('web', A), dep('web', B, { versionId: VB })]), app: 'web' });
    assert.equal(h.last.sha, B);
    assert.deepEqual([...h.verified], [[VB, B]]);
    const legacy = await rollbackHistory({ api: fakeApi([dep('web', B, { versionId: VB }), dep('web', C)]), app: 'web' });
    assert.equal(checkHistory(legacy).code, 'unreconcilable');
  });

  test('duplicated association: one version tied to two commits aborts the read, whatever the status', async () => {
    const api = fakeApi([dep('web', A, { versionId: VA }), dep('web', B, { versionId: VA })]);
    await assert.rejects(() => rollbackHistory({ api, app: 'web' }), /ambiguous-version/);
    const api2 = fakeApi([dep('web', A, { versionId: VA }), dep('web', B, { versionId: VA, statuses: bad })]);
    await assert.rejects(() => rollbackHistory({ api: api2, app: 'web' }), /ambiguous-version/);
  });

  test('the same version with the same commit twice is fine; one commit with two versions is fine (a redeploy)', async () => {
    const h = await rollbackHistory({ api: fakeApi([dep('web', A, { versionId: VA }), dep('web', A, { versionId: VA, kind: 'rollback' }), dep('web', A, { versionId: VB })]), app: 'web' });
    assert.deepEqual([...h.verified.entries()].sort(), [[VA, A], [VB, A]].sort());
  });

  test('records of another app never associate a version with this one', async () => {
    const other = dep('admin', A, { versionId: VA });
    const h = await rollbackHistory({ api: { ...fakeApi([other]), listDeployments: async () => [{ ...other }] }, app: 'web' });
    assert.equal(h.verified.size, 0);
  });

  test('only failed attempts newer than the last good record populate newerVersions', async () => {
    const h = await rollbackHistory({ api: fakeApi(smokeFailed()), app: 'web' });
    assert.equal(h.last.sha, B);
    assert.deepEqual([...h.newerVersions], [VC]);
    assert.deepEqual([...h.verified.keys()].sort(), [VA, VB].sort());
  });

  test('an unreadable API is an error, not an empty history', async () => {
    const api = { listDeployments: async () => { throw new Error('HTTP 503'); }, listStatuses: async () => [] };
    await assert.rejects(() => rollbackHistory({ api, app: 'web' }), /unreadable/);
  });
});

describe('live state', () => {
  test('one version at 100% is the live version', () => assert.deepEqual(parseLive(JSON.parse(liveJson(VB))), { versionId: VB }));
  for (const [name, json, re] of [
    ['a gradual deployment', { versions: [{ version_id: VA, percentage: 50 }, { version_id: VB, percentage: 50 }] }, /split/],
    ['a single version below 100%', { versions: [{ version_id: VB, percentage: 90 }] }, /90%/],
    ['no versions', { versions: [] }, /no versions/],
    ['no versions key', {}, /no versions/],
    ['a malformed id', { versions: [{ version_id: 'x', percentage: 100 }] }, /malformed/],
    ['a string percentage', { versions: [{ version_id: VB, percentage: '100' }] }, /not 100%/],
    ['null', null, /no versions/]
  ]) {
    test(`${name} is ambiguous`, () => assert.match(parseLive(json).problem, re));
  }
});

describe('cross-check of the Worker metadata against the record', () => {
  const ok = () => JSON.parse(versionJson(VA, A));
  test('agreement passes', () => assert.deepEqual(crossCheckVersion(ok(), VA, A, REPO), { ok: true }));
  test('the repository comparison is case-insensitive', () => assert.deepEqual(crossCheckVersion(ok(), VA, A, 'engineering102/rms-careers'), { ok: true }));
  test('a different or missing id means Cloudflare described another version', () => {
    assert.match(crossCheckVersion({ ...ok(), id: VB }, VA, A).problem, /not /);
    const { id, ...noId } = ok();
    assert.match(crossCheckVersion(noId, VA, A).problem, /no id/);
  });
  test('a message that is not exactly "<run url> <full sha>" is ambiguous', () => {
    for (const message of ['manual', `hello ${A}`, `${RUN_URL} ${A} extra`, `${RUN_URL} ${A.slice(0, 12)}`, `${RUN_URL} ${A.toUpperCase()}`, `${RUN_URL} ${B} ${A}`]) {
      const j = ok();
      j.annotations['workers/message'] = message;
      assert.ok(crossCheckVersion(j, VA, A).problem, message);
    }
  });
  test('a missing or inconsistent tag is refused', () => {
    const j = ok();
    delete j.annotations['workers/tag'];
    assert.match(crossCheckVersion(j, VA, A).problem, /tag/);
    j.annotations['workers/tag'] = `sha-${B.slice(0, 12)}`;
    assert.match(crossCheckVersion(j, VA, A).problem, /disagrees/);
  });
  test('a run of another repository is refused', () => assert.match(crossCheckVersion(ok(), VA, A, 'someone/else').problem, /not someone\/else/));
  test('metadata that names a different commit than the record is refused (the record wins)', () => {
    assert.match(crossCheckVersion(JSON.parse(versionJson(VA, B)), VA, A, REPO).problem, /record for this version says/);
  });
  test('not an object', () => {
    assert.ok(crossCheckVersion(null, VA, A).problem);
    assert.ok(crossCheckVersion('text', VA, A).problem);
  });
});

describe('decision: record vs live state', () => {
  const hist = async (deployments) => rollbackHistory({ api: fakeApi(deployments), app: 'web' });
  test('rolls back from the last good version to an older verified one', async () => {
    const d = decideRollback({ history: await hist(standard()), liveVersionId: VB, targetVersionId: VA });
    assert.deepEqual([d.ok, d.sha], [true, A]);
  });
  test('refuses the version that is live', async () => {
    assert.equal(decideRollback({ history: await hist(standard()), liveVersionId: VB, targetVersionId: VB }).code, 'already-live');
  });
  test('deploy succeeded but smoke failed: live is the failed version, and the last good version IS a valid target', async () => {
    const h = await hist(smokeFailed());
    const d = decideRollback({ history: h, liveVersionId: VC, targetVersionId: VB });
    assert.deepEqual([d.ok, d.sha], [true, B]);
    assert.equal(decideRollback({ history: h, liveVersionId: VC, targetVersionId: VC }).code, 'already-live');
  });
  test('the same failed deploy where the old version is still live: rolling back to it is "already live"', async () => {
    assert.equal(decideRollback({ history: await hist(smokeFailed()), liveVersionId: VB, targetVersionId: VB }).code, 'already-live');
  });
  test('a live version the record does not account for (changed outside the pipeline / stale) refuses', async () => {
    assert.equal(decideRollback({ history: await hist(standard()), liveVersionId: VX, targetVersionId: VA }).code, 'live-mismatch');
    // a manual rollback to an older verified version is also "outside the pipeline"
    assert.equal(decideRollback({ history: await hist(standard()), liveVersionId: VA, targetVersionId: VB }).code, 'live-mismatch');
  });
  test('a target with no verified-success record refuses (failed-only, never recorded)', async () => {
    const h = await hist(smokeFailed());
    assert.equal(decideRollback({ history: h, liveVersionId: VB, targetVersionId: VC }).code, 'unverified-target');
    assert.equal(decideRollback({ history: h, liveVersionId: VB, targetVersionId: VX }).code, 'unverified-target');
  });
  test('no baseline, unsettled newest record, and unknown live version all refuse', async () => {
    assert.equal(decideRollback({ history: await hist([]), liveVersionId: VB, targetVersionId: VA }).code, 'no-baseline');
    const pending = [...standard(), dep('web', C, { versionId: VC, statuses: [{ state: 'in_progress' }] })];
    assert.equal(decideRollback({ history: await hist(pending), liveVersionId: VB, targetVersionId: VA }).code, 'unsettled-history');
    assert.equal(decideRollback({ history: await hist(standard()), liveVersionId: undefined, targetVersionId: VA }).code, 'live-unknown');
  });
});

describe('runRollback: dry run (rehearsal)', () => {
  test('reads GitHub, builds the command, writes nothing and never calls wrangler', async () => {
    const wr = fakeWrangler();
    const o = base(standard(), { dryRun: true, env: { PATH: '/bin', GITHUB_TOKEN: 'x' }, runWrangler: wr });
    const r = await runRollback(o);
    assert.deepEqual([r.ok, r.dryRun, r.last.sha, r.verifiedVersions, r.targetRecorded, r.command[0]], [true, true, B, 2, true, 'rollback']);
    assert.deepEqual(o.api.calls, []);
    assert.deepEqual(wr.calls, []);
  });
  test('only an explicit false is a real run: omitted or non-boolean dryRun is a rehearsal that never reaches wrangler', async () => {
    for (const dryRun of [undefined, null, 'false', 0, 'true', true]) {
      const wr = fakeWrangler();
      const o = base(standard(), { dryRun, env: { PATH: '/bin' }, runWrangler: wr });
      assert.equal((await runRollback(o)).dryRun, true, String(dryRun));
      assert.deepEqual([wr.calls, o.api.calls], [[], []]);
    }
  });
  test('unexpected inputs and environment variables cannot make the rehearsal contact Cloudflare', async () => {
    const wr = fakeWrangler();
    const env = { PATH: '/bin', GITHUB_TOKEN: 'x', OPEN_NEXT_DEPLOY: 'true', CI: 'true', INPUT_DRY_RUN: 'false', DRY_RUN: 'false' };
    const r = await runRollback(base(standard(), { dryRun: true, env, runWrangler: wr, reason: 'real run please; --yes' }));
    assert.equal(r.dryRun, true);
    assert.deepEqual(wr.calls, []);
  });
  test('refuses to run when any Cloudflare/Wrangler variable is present', async () => {
    await assert.rejects(() => runRollback(base(standard(), { dryRun: true, env: { CLOUDFLARE_API_TOKEN: 'tok' } })), /credentials-present/);
    await assert.rejects(() => runRollback(base(standard(), { dryRun: true, env: { WRANGLER_LOG: 'debug' } })), /credentials-present/);
  });
  test('applies the same GitHub-side refusals as a real run: no baseline, unsettled newest record, ambiguous versions, no version id on the base', async () => {
    const env = { PATH: '/bin' };
    await assert.rejects(() => runRollback(base([], { dryRun: true, env })), /no-baseline/);
    const pending = [...standard(), dep('web', C, { versionId: VC, statuses: [{ state: 'in_progress' }] })];
    await assert.rejects(() => runRollback(base(pending, { dryRun: true, env })), /unsettled-history/);
    await assert.rejects(() => runRollback(base([dep('web', A, { versionId: VA }), dep('web', B, { versionId: VA })], { dryRun: true, env })), /ambiguous-version/);
    await assert.rejects(() => runRollback(base([dep('web', B)], { dryRun: true, env })), /unreconcilable/);
  });
  test('an unreadable record fails the rehearsal', async () => {
    const api = { ...fakeApi([]), listDeployments: async () => { throw new Error('HTTP 502'); } };
    await assert.rejects(() => runRollback(base(standard(), { dryRun: true, env: { PATH: '/bin' }, api })), /unreadable/);
  });
});

describe('runRollback: real run', () => {
  test('happy path: live read, target cross-check, record BEFORE wrangler, re-read, rollback, verify live, smoke, success', async () => {
    const order = [];
    const o = base();
    const create = o.api.createDeployment;
    o.api.createDeployment = async (b) => { order.push('record'); return create(b); };
    const wr = fakeWrangler({ live: [VB, VB, VA] });
    const run = (args) => { const r = wr(args); order.push(wr.names().at(-1)); return r; };
    const r = await runRollback({ ...o, runWrangler: run, smoke: async (x) => { order.push('smoke'); assert.equal(x.baseUrl, 'https://www.rms-careers.com'); return { ok: true }; } });
    assert.equal(r.ok, true);
    assert.deepEqual(order, ['live', 'view', 'record', 'live', 'rollback', 'live', 'smoke']);
    assert.deepEqual(o.api.calls[0], ['create', 'rollback', A, VA, 'production-web']);
    assert.deepEqual(statesOf(o.api), ['in_progress', 'success']);
    assert.ok(o.api.calls[1][2].startsWith(RECOVERY.inProgress));
    assert.ok(o.api.calls[2][2].startsWith(RECOVERY.recovered));
    assert.deepEqual(wr.calls.find((c) => c[0] === 'rollback'), ['rollback', VA, '--name', 'rms-web', '--config', 'wrangler.jsonc', '--message', `rollback: bad release (${RUN_URL})`, '--yes']);
    assert.deepEqual([r.from, r.to, r.sha], [VB, VA, A]);
  });

  test('deploy succeeded but smoke failed: rolling back to the last good version is allowed and recorded as recovered', async () => {
    const o = base(smokeFailed(), { versionId: VB });
    const r = await runRollback({ ...o, runWrangler: fakeWrangler({ live: [VC, VC, VB], view: versionJson(VB, B) }) });
    assert.equal(r.ok, true);
    assert.deepEqual(o.api.calls[0], ['create', 'rollback', B, VB, 'production-web']);
    assert.deepEqual(statesOf(o.api), ['in_progress', 'success']);
  });

  describe('refusals that change nothing', () => {
    const refuses = (name, code, { deployments, wr, over }) =>
      test(name, async () => {
        const o = base(deployments ?? standard(), over);
        const w = wr ?? fakeWrangler();
        await assert.rejects(() => runRollback({ ...o, runWrangler: w }), new RegExp(code));
        assert.deepEqual(o.api.calls, [], 'no record written');
        assert.ok(!w.names().includes('rollback'), 'wrangler rollback never ran');
      });
    refuses('live version unreadable (wrangler fails)', 'cloudflare-unreadable', { wr: fakeWrangler({ liveStatus: 1 }) });
    refuses('live version output is not JSON', 'cloudflare-unreadable', { wr: fakeWrangler({ live: ['Error: not logged in'] }) });
    refuses('live traffic is split (ambiguous)', 'live-ambiguous', { wr: fakeWrangler({ live: [liveJson(VB, 50)] }) });
    refuses('live version is not one the record accounts for (changed outside the pipeline)', 'live-mismatch', { wr: fakeWrangler({ live: [VX] }) });
    refuses('stale record: live is an older verified version after a manual rollback', 'live-mismatch', { wr: fakeWrangler({ live: [VA] }), over: { versionId: VB } });
    refuses('the target is already live', 'already-live', { over: { versionId: VB }, wr: fakeWrangler({ live: [VB], view: versionJson(VB, B) }) });
    refuses('a target version nobody recorded', 'unverified-target', { over: { versionId: VX } });
    refuses('a target that only ever failed', 'unverified-target', { deployments: smokeFailed(), over: { versionId: VC }, wr: fakeWrangler({ live: [VB] }) });
    refuses('Cloudflare describes a different version than requested', 'metadata-mismatch', { wr: fakeWrangler({ view: versionJson(VB, A) }) });
    refuses('Worker metadata names a different commit than the record', 'metadata-mismatch', { wr: fakeWrangler({ view: versionJson(VA, B) }) });
    refuses('Worker metadata is missing (version deployed outside the pipeline)', 'metadata-mismatch', { wr: fakeWrangler({ view: JSON.stringify({ id: VA, annotations: {} }) }) });
    refuses('Worker metadata cannot be read', 'cloudflare-unreadable', { wr: fakeWrangler({ viewStatus: 1 }) });
    refuses('the metadata comes from a run of another repository', 'metadata-mismatch', { over: { repo: 'someone/else' } });
    refuses('no verified baseline', 'no-baseline', { deployments: [] });
    refuses('an interrupted attempt (newest record never settled)', 'unsettled-history', { deployments: [...standard(), dep('web', C, { versionId: VC, statuses: [{ state: 'in_progress' }] })] });
    refuses('one version tied to two commits', 'ambiguous-version', { deployments: [dep('web', A, { versionId: VA }), dep('web', B, { versionId: VA })] });
    test('refuses without both Cloudflare variables, before any read', async () => {
      const wr = fakeWrangler();
      await assert.rejects(() => runRollback({ ...base(standard(), { env: { CLOUDFLARE_API_TOKEN: 'tok' } }), runWrangler: wr }), /missing-credentials/);
      await assert.rejects(() => runRollback({ ...base(standard(), { env: {} }), runWrangler: wr }), /missing-credentials/);
      assert.deepEqual(wr.calls, []);
    });
    test('an unreadable record refuses before wrangler is contacted at all', async () => {
      const wr = fakeWrangler();
      const api = { ...fakeApi([]), listDeployments: async () => { throw new Error('HTTP 502'); } };
      await assert.rejects(() => runRollback({ ...base(standard(), { api }), runWrangler: wr }), /unreadable/);
      assert.deepEqual(wr.calls, []);
    });
  });

  describe('records written around the change', () => {
    test('cannot create the record => wrangler rollback is never run', async () => {
      const wr = fakeWrangler();
      await assert.rejects(() => runRollback({ ...base(standard(), { api: fakeApi(standard(), { failCreate: true }) }), runWrangler: wr }), /HTTP 500/);
      assert.ok(!wr.names().includes('rollback'));
    });

    test('cannot write in_progress => the record is closed as error (rollback-aborted) and wrangler rollback never runs', async () => {
      const o = base(standard(), { api: fakeApi(standard(), { failStatus: 'in_progress' }) });
      const wr = fakeWrangler();
      await assert.rejects(() => runRollback({ ...o, runWrangler: wr }), /record-failed/);
      assert.ok(!wr.names().includes('rollback'));
      assert.deepEqual(statesOf(o.api), ['error']);
      assert.ok(o.api.calls.at(-1)[2].startsWith(RECOVERY.aborted));
    });

    test('live state changes between the first read and the change => aborted as error, nothing rolled back', async () => {
      const o = base();
      const wr = fakeWrangler({ live: [VB, VC] });
      await assert.rejects(() => runRollback({ ...o, runWrangler: wr }), /live-changed/);
      assert.ok(!wr.names().includes('rollback'));
      assert.deepEqual(statesOf(o.api), ['in_progress', 'error']);
    });

    test('live state unreadable on the re-read => aborted as error, nothing rolled back', async () => {
      const o = base();
      const answers = [{ status: 0, stdout: liveJson(VB) }, { status: 1, stdout: '' }];
      const wr = fakeWrangler();
      const run = (args) => (args[1] === 'deployments' ? { ...answers.shift(), stderr: '' } : wr(args));
      await assert.rejects(() => runRollback({ ...o, runWrangler: run }), /live-unreadable/);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'error']);
    });

    test('wrangler refuses => rollback-failed (failure), never success, smoke not run', async () => {
      let smoked = false;
      const o = base(standard(), { smoke: async () => { smoked = true; return { ok: true }; } });
      await assert.rejects(() => runRollback({ ...o, runWrangler: fakeWrangler({ live: [VB], rollbackStatus: 1 }) }), /rollback-failed/);
      assert.equal(smoked, false);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'failure']);
      assert.ok(o.api.calls.at(-1)[2].startsWith(RECOVERY.failed));
    });

    test('wrangler succeeded but live is not the target => rollback-unverified (failure), smoke not run', async () => {
      let smoked = false;
      const o = base(standard(), { smoke: async () => { smoked = true; return { ok: true }; } });
      await assert.rejects(() => runRollback({ ...o, runWrangler: fakeWrangler({ live: [VB, VB, VB] }) }), /rollback-unverified/);
      assert.equal(smoked, false);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'failure']);
      assert.ok(o.api.calls.at(-1)[2].startsWith(RECOVERY.unverified));
    });

    test('wrangler succeeded but live cannot be read afterwards => rollback-unverified (failure)', async () => {
      const o = base();
      const wr = fakeWrangler({ live: [VB, VB] });
      let live = 0;
      const run = (args) => (args[1] === 'deployments' && ++live === 3 ? { status: 1, stdout: '', stderr: '' } : wr(args));
      await assert.rejects(() => runRollback({ ...o, runWrangler: run }), /rollback-unverified/);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'failure']);
    });

    test('live is the target but the smoke test fails => rollback-unverified (failure), exit not ok, never success', async () => {
      const o = base(standard(), { smoke: async () => ({ ok: false }) });
      const r = await runRollback({ ...o, runWrangler: fakeWrangler({ live: [VB, VB, VA] }) });
      assert.equal(r.ok, false);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'failure']);
      assert.ok(o.api.calls.at(-1)[2].startsWith(RECOVERY.unverified));
    });

    test('a smoke runner that throws is recorded as rollback-unverified, never success', async () => {
      const o = base(standard(), { smoke: async () => { throw new Error('boom'); } });
      await assert.rejects(() => runRollback({ ...o, runWrangler: fakeWrangler({ live: [VB, VB, VA] }) }), /rollback-unverified/);
      assert.deepEqual(statesOf(o.api), ['in_progress', 'failure']);
    });

    test('a failing failure-write does not mask the original error', async () => {
      const o = base(standard(), { api: fakeApi(standard(), { failStatus: 'failure' }) });
      await assert.rejects(() => runRollback({ ...o, runWrangler: fakeWrangler({ rollbackStatus: 1 }) }), /rollback-failed.*"failure" record could not be written/);
      assert.ok(!statesOf(o.api).includes('success'));
    });

    test('a failed success-write is loud (thrown), never silent', async () => {
      const o = base(standard(), { api: fakeApi(standard(), { failStatus: 'success' }) });
      await assert.rejects(() => runRollback({ ...o, runWrangler: fakeWrangler({ live: [VB, VB, VA] }) }), /HTTP 500/);
    });

    test('the four outcomes are distinguishable in the record by state and description prefix', () => {
      assert.deepEqual(Object.values(RECOVERY).sort(), ['rollback-aborted', 'rollback-failed', 'rollback-in-progress', 'rollback-recovered', 'rollback-unverified']);
    });
  });
});

describe('parseArgs', () => {
  test('value options always consume the next argument, even when it starts with --', () => {
    assert.deepEqual(parseArgs(['--app', 'web', '--version-id', VA, '--reason', '--dry-run', '--dry-run']), { app: 'web', 'version-id': VA, reason: '--dry-run', 'dry-run': 'true' });
  });
  test('a reason that looks like a flag cannot switch the mode: no --dry-run flag means no dry-run', () => {
    assert.equal(parseArgs(['--app', 'web', '--version-id', VA, '--reason', '--dry-run'])['dry-run'], undefined);
  });
  test('unknown options, stray arguments and missing values are errors', () => {
    assert.throws(() => parseArgs(['--force']), /unknown option/);
    assert.throws(() => parseArgs(['web']), /unexpected argument/);
    assert.throws(() => parseArgs(['--reason']), /needs a value/);
  });
});

describe('capturing the version id from the wrangler output file (contract for the future deploy job)', () => {
  const entry = (o = {}) => JSON.stringify({ type: 'deploy', version: 1, worker_name: 'rms-web', worker_tag: 't', version_id: VA, timestamp: 'x', ...o });
  test('exactly one deploy entry with a UUID yields the id; other entry types are ignored', () => {
    assert.equal(versionIdFromWranglerOutput(`${JSON.stringify({ type: 'wrangler-session' })}\n${entry()}\n`, 'rms-web'), VA);
    assert.equal(versionIdFromWranglerOutput(entry({ worker_name: null }), 'rms-web'), VA);
  });
  for (const [name, text, re] of [
    ['no deploy entry', JSON.stringify({ type: 'version-upload', version_id: VA }), /found 0/],
    ['two deploy entries', `${entry()}\n${entry({ version_id: VB })}`, /found 2/],
    ['a null version id (aborted or dry run)', entry({ version_id: null }), /no valid version_id/],
    ['a malformed version id', entry({ version_id: 'abc' }), /no valid version_id/],
    ['another Worker', entry({ worker_name: 'rms-admin' }), /not "rms-web"/],
    ['a non-JSON line', `${entry()}\nnot json`, /not JSON/],
    ['empty output', '', /found 0/]
  ]) {
    test(`rejects ${name}`, () => assert.throws(() => versionIdFromWranglerOutput(text, 'rms-web'), re));
  }
});
