import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deployArgs } from '../artifact.mjs';
import { ENVIRONMENTS, RECORD_MARKER, lastGood, recordPayload, rollbackHistory } from '../deploy-tracking.mjs';
import { DEPLOY, DeployError, checkEnvironment, parseArgs, planApp, recheckArtifact, redact, runDeploy } from '../deploy.mjs';
import { decideRollback } from '../rollback.mjs';

const REPO = 'engineering102/RMS-Careers';
const RUN_ID = '777';
const RUN_URL = `https://github.com/${REPO}/actions/runs/${RUN_ID}/attempts/1`;
const sha = (c) => c.repeat(40);
const B = sha('b'); // last good (already live)
const D = sha('d'); // the commit being deployed
const VB = 'bbbbbbbb-0000-4000-8000-000000000002';
const VN = '99999999-0000-4000-8000-000000000009'; // the version this deploy creates
const VX = 'eeeeeeee-0000-4000-8000-0000000000ee';
const TOKEN = 'cf-token-SECRET-12345';
const ACCT = 'cf-account-12345';
const ENV_REAL = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCT, PRODUCTION_DEPLOY_ENABLED: 'true', GITHUB_TOKEN: 'ghs_secret_value', PATH: '/bin' };
const ENV_DRY = { PATH: '/bin', GITHUB_TOKEN: 'ghs_secret_value' };

// ---------------------------------------------------------------------------------------------------------------
// A stateful in-memory GitHub Deployments API: what a deploy writes is exactly what rollback and lastGood read back.
// ---------------------------------------------------------------------------------------------------------------
const protectedEnv = (name, over = {}) => ({
  name,
  protection_rules: [{ id: 1, type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { login: 'owner' } }] }],
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  can_admins_bypass: false,
  ...over
});
const mainOnly = { total_count: 1, branch_policies: [{ id: 1, name: 'main', type: 'branch' }] };

function memApi({ failCreateAt = null, failStatus = null, getEnvironment = async (name) => protectedEnv(name), listBranchPolicies = async () => mainOnly } = {}) {
  const deployments = [];
  const statuses = new Map();
  const writes = [];
  let id = 100;
  let creates = 0;
  const api = {
    deployments,
    statuses,
    writes,
    listDeployments: async (environment, page) => (page === 1 ? [...deployments].reverse().filter((d) => d.environment === environment) : []),
    listStatuses: async (i) => [...(statuses.get(i) ?? [])].reverse(),
    getEnvironment,
    listBranchPolicies,
    createDeployment: async ({ sha: ref, environment, payload }) => {
      creates += 1;
      if (failCreateAt === creates) throw new Error('HTTP 500');
      const d = { id: ++id, sha: ref, environment, created_at: new Date(Date.UTC(2026, 9, 10) + id * 1000).toISOString(), creator: { login: 'github-actions[bot]' }, payload };
      deployments.push(d);
      statuses.set(d.id, []);
      writes.push(['create', payload.phase ?? payload.kind, payload.kind, payload.sha, payload.versionId]);
      return { id: d.id };
    },
    createStatus: async (i, { state, description }) => {
      if (failStatus?.(i, state, description, api)) throw new Error('HTTP 500');
      statuses.get(i).push({ state, description });
      writes.push(['status', i, state, description]);
    }
  };
  return api;
}
/** Put a record into the store without logging it as a write (history that existed before the run). */
function seed(api, { app = 'web', at, versionId, kind = 'deploy', phase = 'evidence', states = ['in_progress', 'success'], creator = 'github-actions[bot]' }) {
  const payload = { ...recordPayload({ app, sha: at, runId: '1', runUrl: '', kind, versionId, phase, repo: REPO, runAttempt: 1 }) };
  const d = { id: 50 + api.deployments.length, sha: at, environment: ENVIRONMENTS[app], created_at: new Date(Date.UTC(2026, 9, 9) + api.deployments.length * 1000).toISOString(), creator: { login: creator }, payload };
  api.deployments.push(d);
  api.statuses.set(d.id, states.map((st) => (typeof st === 'string' ? { state: st } : st)));
  return d;
}
const withHistory = () => {
  const api = memApi();
  seed(api, { at: B, versionId: VB });
  return api;
};
const statesOf = (api, i) => api.statuses.get(i).map((s) => s.state);
const lastWrite = (api) => api.writes.at(-1);

// ---------------------------------------------------------------------------------------------------------------
// A downloaded artifact on disk (manifest + inventory) with independent digest, like the build job hands over.
// ---------------------------------------------------------------------------------------------------------------
const tmp = [];
function makeArtifact({ app = 'web', at = D, runId = RUN_ID, source = {}, manifest = {}, inventory = { entries: [] } } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-art-'));
  tmp.push(dir);
  const invText = JSON.stringify(inventory);
  const man = { app, worker: `rms-${app}`, source: { sha: at, runId, repository: REPO, runAttempt: 1, ...source }, inventory: { sha256: crypto.createHash('sha256').update(invText).digest('hex') }, ...manifest };
  const manText = JSON.stringify(man);
  fs.writeFileSync(path.join(dir, 'inventory.json'), invText);
  fs.writeFileSync(path.join(dir, 'manifest.json'), manText);
  return { dir, expectDigest: `${app}:${crypto.createHash('sha256').update(manText).digest('hex')}`, manText };
}
after(() => tmp.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

// ---------------------------------------------------------------------------------------------------------------
// A fake wrangler: records every command; answers deploy / live state / version metadata.
// ---------------------------------------------------------------------------------------------------------------
const liveJson = (v, pct = 100) => JSON.stringify({ versions: [{ version_id: v, percentage: pct }] });
const viewJson = (v, at = D, over = {}) => JSON.stringify({ id: v, annotations: { 'workers/tag': `sha-${at.slice(0, 12)}`, 'workers/message': `${RUN_URL} ${at}`, ...over } });
const outputNdjson = (v = VN, over = {}) => [JSON.stringify({ type: 'wrangler-session', version: 1 }), JSON.stringify({ type: 'deploy', version: 1, worker_name: 'rms-web', version_id: v, ...over })].join('\n');
function fakeWrangler({ deployStatus = 0, deployStderr = '', live = [VN], view = viewJson(VN), liveStatus = 0, viewStatus = 0 } = {}) {
  const calls = [];
  let li = 0;
  const fn = (args, extra) => {
    calls.push({ args: args.slice(1), extra });
    if (args[1] === 'deploy') return { status: deployStatus, stdout: '', stderr: deployStderr };
    if (args[1] === 'deployments') {
      const v = live[Math.min(li++, live.length - 1)];
      return { status: liveStatus, stdout: v.startsWith('{') || v.startsWith('Error') ? v : liveJson(v), stderr: '' };
    }
    if (args[1] === 'versions') return { status: viewStatus, stdout: view, stderr: '' };
    throw new Error(`unexpected wrangler command ${args[1]}`);
  };
  fn.calls = calls;
  fn.names = () => calls.map((c) => (c.args[0] === 'deployments' ? 'live' : c.args[0] === 'versions' ? 'view' : c.args[0]));
  return fn;
}

const everyApp = ['web', 'admin', 'student'];
function opts(over = {}) {
  const art = over.art ?? makeArtifact();
  const tree = { calls: 0, problemsAt: () => [] };
  return {
    app: 'web', sha: D, mode: 'deploy', dryRun: false, api: withHistory(), env: ENV_REAL, root: '/repo', repo: REPO, runId: RUN_ID, runAttempt: 1,
    artifactDir: art.dir, expectDigest: art.expectDigest, appDir: '/repo/apps/web', wranglerBin: 'wr.js',
    runWrangler: fakeWrangler(), readOutput: () => outputNdjson(), outputFile: '/tmp/out.ndjson',
    verifyTree: async () => ({ problems: tree.problemsAt(++tree.calls) }),
    isAncestor: () => true, // B is an ancestor of D
    detectFn: () => ({ deployableApps: everyApp, degraded: false }),
    dryRunFn: () => ({ ok: true, problems: [], wranglerVersion: '4.147.0' }),
    smoke: async () => ({ ok: true }), sleep: async () => {}, tree, ...over
  };
}
const run = (o) => runDeploy(o);

// ---------------------------------------------------------------------------------------------------------------

describe('deploy: the happy path writes intent, then evidence, in the specified order', () => {
  test('intent (no version id) -> wrangler deploy -> version confirmed live and in metadata -> evidence (with version id) -> smoke -> success', async () => {
    const o = opts();
    const order = [];
    const create = o.api.createDeployment;
    o.api.createDeployment = async (b) => { order.push(`record:${b.payload.phase}`); return create(b); };
    const wr = o.runWrangler;
    o.runWrangler = (args, extra) => { const r = wr(args, extra); order.push(wr.names().at(-1)); return r; };
    o.smoke = async () => { order.push('smoke'); return { ok: true }; };
    const r = await run(o);
    assert.deepEqual([r.ok, r.action, r.versionId], [true, 'deployed', VN]);
    assert.deepEqual(order, ['record:intent', 'deploy', 'live', 'view', 'record:evidence', 'smoke']);

    const intent = o.api.deployments.find((d) => d.id === r.intentId);
    const evidence = o.api.deployments.find((d) => d.id === r.evidenceId);
    assert.deepEqual([intent.payload.phase, 'versionId' in intent.payload, intent.payload.kind, intent.payload.worker, intent.payload.repo, intent.payload.runAttempt, intent.payload.runId], ['intent', false, 'deploy', 'rms-web', REPO, '1', RUN_ID]);
    assert.deepEqual([evidence.payload.phase, evidence.payload.versionId, evidence.sha, evidence.environment], ['evidence', VN, D, 'production-web']);
    assert.deepEqual(statesOf(o.api, r.intentId), ['in_progress', 'inactive']);
    assert.deepEqual(statesOf(o.api, r.evidenceId), ['in_progress', 'success']);
    assert.match(o.api.statuses.get(r.intentId)[0].description, new RegExp(`^${DEPLOY.intent}`));
    assert.match(o.api.statuses.get(r.intentId)[1].description, new RegExp(`^${DEPLOY.superseded}`));
    assert.match(o.api.statuses.get(r.evidenceId)[1].description, new RegExp(`^${DEPLOY.verified}`));
  });

  test('the command is exactly the pinned deployArgs, with wrangler told where to write its output; nothing can rebuild', async () => {
    const o = opts();
    await run(o);
    const deploy = o.runWrangler.calls.find((c) => c.args[0] === 'deploy');
    assert.deepEqual(deploy.args, deployArgs('wr.js', { sha: D, runUrl: RUN_URL }).slice(1));
    assert.deepEqual(deploy.extra, { WRANGLER_OUTPUT_FILE_PATH: '/tmp/out.ndjson' });
    assert.ok(deploy.args.includes('--keep-vars') && deploy.args.includes('--config'));
    for (const forbidden of ['--var', '--env', '--name', '--routes', '--secrets-file']) assert.ok(!deploy.args.includes(forbidden), forbidden);
    // across every wrangler call: no build, no opennext, no pnpm
    assert.ok(o.runWrangler.names().every((n) => ['deploy', 'live', 'view'].includes(n)));
    assert.doesNotMatch(JSON.stringify(o.runWrangler.calls), /build|opennextjs|pnpm|migrate|seed/i);
  });

  test('the new deployment becomes the diff base and is a valid rollback target; rollback to the previous evidence is allowed', async () => {
    const o = opts();
    const r = await run(o);
    const last = await lastGood({ api: o.api, app: 'web' });
    assert.deepEqual([last.status, last.sha], ['found', D]);
    const history = await rollbackHistory({ api: o.api, app: 'web' });
    assert.deepEqual([history.last.versionId, history.newest.settled, history.verified.get(VN), history.verified.get(VB)], [VN, true, D, B]);
    assert.equal(decideRollback({ history, liveVersionId: VN, targetVersionId: VB }).ok, true);
    assert.equal(decideRollback({ history, liveVersionId: VN, targetVersionId: VN }).code, 'already-live');
    assert.ok(r.ok);
  });

  test('the Cloudflare credential is never part of the command or of anything written to GitHub', async () => {
    const o = opts();
    await run(o);
    const written = JSON.stringify(o.api.writes) + JSON.stringify(o.api.deployments) + JSON.stringify(o.runWrangler.calls);
    assert.ok(!written.includes(TOKEN) && !written.includes(ACCT));
  });

  test('a second app and bootstrap mode use their own environment and kind', async () => {
    const api = memApi();
    const art = makeArtifact({ app: 'admin' });
    const wr = fakeWrangler({ view: viewJson(VN), live: [VN] });
    const o = opts({ app: 'admin', mode: 'bootstrap', art, api, runWrangler: wr, readOutput: () => outputNdjson(VN, { worker_name: 'rms-admin' }), appDir: '/repo/apps/admin' });
    // viewJson ties tag/message to D; the admin worker name is checked only through the output entry and artifact manifest
    const r = await run(o);
    assert.equal(r.ok, true);
    assert.ok(api.deployments.every((d) => d.environment === 'production-admin' && d.payload.kind === 'bootstrap' && d.payload.worker === 'rms-admin'));
  });
});

describe('deploy: failures can never produce a successful evidence record', () => {
  const noEvidence = (api) => api.deployments.every((d) => d.payload.phase !== 'evidence' || d.sha === B);
  const noSuccessBeyondSeed = (api) => api.writes.every((w) => !(w[0] === 'status' && w[2] === 'success'));

  test('the deploy command fails: the intent is closed as failure, nothing else is written, the token is redacted from the error', async () => {
    const o = opts({ runWrangler: fakeWrangler({ deployStatus: 1, deployStderr: `boom ${TOKEN} more` }) });
    await assert.rejects(() => run(o), (err) => /deploy-failed/.test(err.message) && !err.message.includes(TOKEN));
    assert.deepEqual(o.runWrangler.names(), ['deploy']);
    assert.ok(noEvidence(o.api) && noSuccessBeyondSeed(o.api));
    assert.deepEqual(o.api.writes.map((w) => w[0] === 'status' ? w[2] : w[1]), ['intent', 'in_progress', 'failure']);
    assert.match(lastWrite(o.api)[3], new RegExp(`^${DEPLOY.failed}`));
  });

  for (const [name, output] of [
    ['no output at all', ''],
    ['no deploy entry', JSON.stringify({ type: 'version-upload', version_id: VN })],
    ['a null version id (aborted or dry run)', outputNdjson(null)],
    ['a malformed version id', outputNdjson('not-a-uuid')],
    ['two deploy entries', `${outputNdjson()}\n${outputNdjson(VX)}`],
    ['another Worker', outputNdjson(VN, { worker_name: 'rms-admin' })],
    ['a non-JSON line', `${outputNdjson()}\nnot json`]
  ]) {
    test(`exit 0 but ${name}: unverified, no evidence`, async () => {
      const o = opts({ readOutput: () => output });
      await assert.rejects(() => run(o), /version-unreadable/);
      assert.deepEqual(o.runWrangler.names(), ['deploy'], 'nothing is verified or smoke-tested on an unknown version');
      assert.ok(noEvidence(o.api) && noSuccessBeyondSeed(o.api));
      assert.deepEqual(statesOf(o.api, o.api.deployments.at(-1).id), ['in_progress', 'error']);
      assert.match(lastWrite(o.api)[3], new RegExp(`^${DEPLOY.unverified}`));
    });
  }

  for (const [name, wrOver, re] of [
    ['Cloudflare reports a different live version', { live: [VX] }, /live version is/],
    ['traffic is split', { live: [liveJson(VN, 50)] }, /50%/],
    ['live state is unreadable', { liveStatus: 1 }, /exited with 1/],
    ['live state is not JSON', { live: ['Error: not logged in'] }, /did not return JSON/],
    ['the version metadata cannot be read', { viewStatus: 1 }, /exited with 1/],
    ['the version tag is missing', { view: viewJson(VN, D, { 'workers/tag': '' }) }, /tag/],
    ['the version message names another commit', { view: viewJson(VN, B, { 'workers/tag': `sha-${D.slice(0, 12)}` }) }, /record|disagrees|says/],
    ['Cloudflare describes another version id', { view: viewJson(VX) }, /not 9999/]
  ]) {
    test(`exit 0 and a version id, but ${name}: unverified, no evidence`, async () => {
      const o = opts({ runWrangler: fakeWrangler(wrOver) });
      await assert.rejects(() => run(o), re);
      assert.ok(noEvidence(o.api) && noSuccessBeyondSeed(o.api));
      assert.deepEqual(statesOf(o.api, o.api.deployments.at(-1).id), ['in_progress', 'error']);
      assert.ok(!o.runWrangler.names().includes('smoke'));
    });
  }

  test('live state that is briefly stale is retried and then accepted', async () => {
    const o = opts({ runWrangler: fakeWrangler({ live: [VB, VB, VN] }) });
    const r = await run(o);
    assert.equal(r.ok, true);
    assert.equal(o.runWrangler.names().filter((n) => n === 'live').length, 3);
  });

  test('the live state never converging fails after the attempt budget', async () => {
    const o = opts({ runWrangler: fakeWrangler({ live: [VB] }) });
    await assert.rejects(() => run(o), /version-unverified/);
    assert.equal(o.runWrangler.names().filter((n) => n === 'live').length, 3);
  });

  test('smoke test fails after a verified deploy: evidence is FAILURE (and rollback can account for it), intent is closed, base does not move', async () => {
    const o = opts({ smoke: async () => ({ ok: false }) });
    const r = await run(o);
    assert.equal(r.ok, false);
    assert.deepEqual(statesOf(o.api, r.evidenceId), ['in_progress', 'failure']);
    assert.match(lastWrite(o.api)[3], new RegExp(`^${DEPLOY.smokeFailed}`));
    assert.equal((await lastGood({ api: o.api, app: 'web' })).sha, B, 'the last verified deployment is still B');
    const history = await rollbackHistory({ api: o.api, app: 'web' });
    assert.ok(history.newerVersions.has(VN));
    // rollback compatibility: the failed-but-live version is accounted for, so rolling back to the last good version is allowed
    assert.equal(decideRollback({ history, liveVersionId: VN, targetVersionId: VB }).ok, true);
  });

  test('a smoke runner that throws is recorded as failure, never success', async () => {
    const o = opts({ smoke: async () => { throw new Error('boom'); } });
    await assert.rejects(() => run(o), /smoke-error/);
    assert.ok(noSuccessBeyondSeed(o.api));
    assert.deepEqual(statesOf(o.api, o.api.deployments.at(-1).id), ['in_progress', 'failure']);
  });

  test('a failed success-write is loud, and the base has not moved', async () => {
    const api = memApi({ failStatus: (_i, state) => state === 'success' });
    seed(api, { at: B, versionId: VB });
    await assert.rejects(() => run(opts({ api })), /HTTP 500/);
    assert.equal((await lastGood({ api, app: 'web' })).sha, B);
  });

  test('an unverified deploy leaves a live version the record does not account for, so rollback refuses (fail closed)', async () => {
    const o = opts({ runWrangler: fakeWrangler({ live: [VX] }) });
    await assert.rejects(() => run(o), /version-unverified/);
    const history = await rollbackHistory({ api: o.api, app: 'web' });
    assert.equal(decideRollback({ history, liveVersionId: VN, targetVersionId: VB }).code, 'live-mismatch');
  });
});

describe('deploy: record writes are ordered and fail closed', () => {
  test('cannot create the intent record => wrangler is never run', async () => {
    const api = memApi({ failCreateAt: 1 });
    seed(api, { at: B, versionId: VB });
    const o = opts({ api });
    await assert.rejects(() => run(o), /HTTP 500/);
    assert.deepEqual(o.runWrangler.names(), []);
  });
  test('cannot write the intent in_progress status => closed as error, wrangler never run', async () => {
    const api = memApi({ failStatus: (_i, state) => state === 'in_progress' });
    seed(api, { at: B, versionId: VB });
    const o = opts({ api });
    await assert.rejects(() => run(o), /record-failed/);
    assert.deepEqual(o.runWrangler.names(), []);
    assert.deepEqual(api.writes.filter((w) => w[0] === 'status').map((w) => w[2]), ['error']);
  });
  test('cannot create the evidence record => the verified deploy is reported loudly, the intent is closed as error, no success exists', async () => {
    const api = memApi({ failCreateAt: 2 });
    seed(api, { at: B, versionId: VB });
    await assert.rejects(() => run(opts({ api })), /record-failed.*evidence record could not be written/);
    assert.ok(api.writes.every((w) => !(w[0] === 'status' && w[2] === 'success')));
    assert.equal((await lastGood({ api, app: 'web' })).sha, B);
  });
  test('cannot set the evidence in_progress => the evidence is closed as error, never success', async () => {
    const api = memApi({ failStatus: (i, state, _d, a) => state === 'in_progress' && a.deployments.find((d) => d.id === i)?.payload.phase === 'evidence' });
    seed(api, { at: B, versionId: VB });
    await assert.rejects(() => run(opts({ api })), /record-failed/);
    const evidence = api.deployments.find((d) => d.payload.phase === 'evidence' && d.sha === D);
    assert.deepEqual(statesOf(api, evidence.id), ['error']);
  });
  test('interrupted (unsettled) records are closed as error before the new intent is written', async () => {
    const api = memApi();
    seed(api, { at: B, versionId: VB });
    const stale = seed(api, { at: sha('c'), phase: 'intent', states: ['in_progress'] });
    const r = await run(opts({ api }));
    assert.equal(r.ok, true);
    assert.deepEqual(statesOf(api, stale.id), ['in_progress', 'error']);
    assert.match(api.statuses.get(stale.id)[1].description, new RegExp(`^${DEPLOY.interrupted}`));
    assert.ok(api.writes.findIndex((w) => w[0] === 'status' && w[1] === stale.id) < api.writes.findIndex((w) => w[0] === 'create'));
  });
  test('if an interrupted record cannot be closed, nothing is deployed', async () => {
    const api = memApi({ failStatus: (_i, state, d) => state === 'error' && /interrupted/.test(d) });
    seed(api, { at: B, versionId: VB });
    seed(api, { at: sha('c'), phase: 'intent', states: ['in_progress'] });
    const o = opts({ api });
    await assert.rejects(() => run(o), /HTTP 500/);
    assert.deepEqual(o.runWrangler.names(), []);
  });
  test('an intent record is never a diff base, even with a (forged or buggy) success status', async () => {
    const api = memApi();
    seed(api, { at: B, versionId: VB });
    seed(api, { at: D, phase: 'intent', states: ['in_progress', 'success'] });
    const last = await lastGood({ api, app: 'web' });
    assert.deepEqual([last.status, last.sha], ['found', B]);
    const h = await rollbackHistory({ api, app: 'web' });
    assert.equal(h.last.sha, B);
    assert.equal(h.verified.size, 1);
  });
});

describe('deploy: decision under the lock (history, ancestry, affected apps, bootstrap)', () => {
  const refuses = (name, code, o) =>
    test(name, async () => {
      await assert.rejects(() => run(o), new RegExp(code));
      assert.deepEqual(o.runWrangler.names(), []);
      assert.deepEqual(o.api.writes, [], 'nothing written');
    });
  refuses('no history and no bootstrap fails closed', 'no-baseline', opts({ api: memApi() }));
  refuses('records from a foreign creator are not history', 'no-baseline', (() => {
    const api = memApi();
    seed(api, { at: B, versionId: VB, creator: 'mallory' });
    return opts({ api });
  })());
  refuses('an unreadable history fails closed (no guess)', 'unreadable', opts({ api: { ...memApi(), listDeployments: async () => { throw new Error('HTTP 502'); } } }));
  refuses('a recorded SHA that is not an ancestor (and not a descendant) fails', 'diverged', opts({ isAncestor: () => false }));
  refuses('git failing to compare fails closed (e.g. shallow clone)', 'git-error', opts({ isAncestor: () => { throw new Error('shallow'); } }));
  refuses('bootstrap when a verified deployment exists is refused', 'bootstrap-not-needed', opts({ mode: 'bootstrap' }));

  const skips = (name, code, o) =>
    test(name, async () => {
      const r = await run(o);
      assert.deepEqual([r.ok, r.action, r.code], [true, 'skip', code]);
      assert.deepEqual(o.runWrangler.names(), []);
      assert.deepEqual(o.api.writes, []);
    });
  skips('the commit is already the last verified deployment', 'already-deployed', opts({ sha: B, art: makeArtifact({ at: B }) }));
  skips('a newer commit is already deployed (superseded)', 'superseded', opts({ isAncestor: (_r, a, b) => a === D && b === B }));
  skips('the app is not affected between the two commits (no-op change)', 'unchanged', opts({ detectFn: () => ({ deployableApps: ['admin', 'student'], degraded: false }) }));

  test('the affected-app classifier is asked about exactly last-good..sha, never HEAD^', async () => {
    let seen;
    const o = opts({ detectFn: (a) => { seen = a; return { deployableApps: ['web'], degraded: false }; } });
    await run(o);
    assert.deepEqual(seen, { root: '/repo', base: B, head: D });
  });
  test('a degraded classifier means "affected" (fail closed to deploying), and is reported', async () => {
    const plan = await planApp({ api: withHistory(), app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ degraded: true, deployableApps: everyApp }) });
    assert.deepEqual([plan.decision.action, plan.degraded], ['deploy', true]);
    const thrown = await planApp({ api: withHistory(), app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => { throw new Error('x'); } });
    assert.deepEqual([thrown.decision.action, thrown.degraded], ['deploy', true]);
  });
  test('explicit bootstrap with no history deploys and records kind bootstrap on both records', async () => {
    const api = memApi();
    const o = opts({ api, mode: 'bootstrap' });
    const r = await run(o);
    assert.equal(r.ok, true);
    assert.ok(api.deployments.length === 2 && api.deployments.every((d) => d.payload.kind === 'bootstrap'));
    assert.deepEqual((await lastGood({ api, app: 'web' })).kind, 'bootstrap');
  });
  test('bootstrap evidence makes the history usable for rollback, but the pre-bootstrap version has no record to roll back to', async () => {
    const api = memApi();
    await run(opts({ api, mode: 'bootstrap' }));
    const h = await rollbackHistory({ api, app: 'web' });
    assert.equal(h.verified.size, 1);
    assert.equal(decideRollback({ history: h, liveVersionId: VN, targetVersionId: VX }).code, 'unverified-target');
  });
});

describe('deploy: artifact verification in the deploy job', () => {
  const rejects = (name, code, make, over = {}) =>
    test(name, async () => {
      const art = make();
      const o = opts({ art, ...over });
      await assert.rejects(() => run(o), new RegExp(code));
      assert.deepEqual(o.runWrangler.names(), []);
      assert.deepEqual(o.api.writes, []);
    });
  rejects('a manifest that no longer matches the independently supplied digest', 'expected-digest-mismatch', () => {
    const a = makeArtifact();
    fs.writeFileSync(path.join(a.dir, 'manifest.json'), a.manText.replace('"web"', '"web" '));
    return a;
  });
  rejects('a tampered inventory', 'inventory-digest-mismatch', () => {
    const a = makeArtifact();
    fs.writeFileSync(path.join(a.dir, 'inventory.json'), JSON.stringify({ entries: [{ path: 'x' }] }));
    return a;
  });
  rejects('an artifact built from another commit', 'source-sha-mismatch', () => makeArtifact({ at: sha('9') }));
  rejects('an artifact built in another run', 'run-id-mismatch', () => makeArtifact({ runId: '1' }));
  rejects('an artifact for another app (digest relabelled for this app)', 'app-mismatch', () => {
    const a = makeArtifact({ app: 'admin' });
    return { ...a, expectDigest: a.expectDigest.replace('admin:', 'web:') };
  });
  rejects('an artifact that targets another Worker', 'worker-name-mismatch', () => makeArtifact({ manifest: { worker: 'rms-admin' } }));
  rejects('a missing artifact directory', 'unreadable-artifact', () => ({ dir: path.join(os.tmpdir(), 'does-not-exist-xyz'), expectDigest: `web:${'0'.repeat(64)}` }));
  rejects('an empty digest hand-off', 'missing-expectation', () => makeArtifact(), { expectDigest: '' });
  rejects('a malformed digest hand-off', 'bad-expectation', () => makeArtifact(), { expectDigest: 'web:xyz' });
  rejects('a digest published for another app', 'digest-app-mismatch', () => { const a = makeArtifact(); return { ...a, expectDigest: a.expectDigest.replace('web:', 'admin:') }; });
  rejects('an extracted tree that differs from the inventory', 'artifact-tree-changed', () => makeArtifact(), { verifyTree: async () => ({ problems: [{ code: 'content-mismatch' }] }) });

  test('a tree changed between the first check and the moment before wrangler: the intent is closed as error and wrangler never runs', async () => {
    const o = opts();
    o.tree.problemsAt = (n) => (n >= 2 ? [{ code: 'extra-file' }] : []);
    await assert.rejects(() => run(o), /artifact-tree-changed/);
    assert.deepEqual(o.runWrangler.names(), []);
    assert.deepEqual(statesOf(o.api, o.api.deployments.at(-1).id), ['in_progress', 'error']);
    assert.ok(o.api.deployments.every((d) => d.payload.phase !== 'evidence' || d.sha === B));
  });
  test('recheckArtifact accepts a good artifact and reports the manifest', async () => {
    const a = makeArtifact();
    const r = await recheckArtifact({ app: 'web', sha: D, runId: RUN_ID, artifactDir: a.dir, appDir: '/x', root: '/x', expectDigest: a.expectDigest, verifyTree: async () => ({ problems: [] }) });
    assert.equal(r.manifest.worker, 'rms-web');
  });
});

describe('deploy: rehearsal (dry run) and credential scope', () => {
  test('performs the checks and builds the command, but writes nothing, never calls wrangler and uses no credentials', async () => {
    const o = opts({ dryRun: true, env: ENV_DRY });
    const r = await run(o);
    assert.deepEqual([r.ok, r.action, r.dryRun, r.decision.code], [true, 'rehearsed', true, 'changed']);
    assert.deepEqual(r.command, deployArgs('wr.js', { sha: D, runUrl: RUN_URL }).slice(1));
    assert.deepEqual([o.api.writes, o.runWrangler.calls], [[], []]);
  });
  test('only an explicit false is a real deploy: omitted or non-boolean dryRun is a rehearsal', async () => {
    for (const dryRun of [undefined, null, 'false', 0, 'true', true]) {
      const o = opts({ dryRun, env: ENV_DRY });
      assert.equal((await run(o)).dryRun, true, String(dryRun));
      assert.deepEqual([o.api.writes, o.runWrangler.calls], [[], []]);
    }
  });
  test('refuses a rehearsal when any Cloudflare/Wrangler variable is present (it is credential-free by construction)', async () => {
    await assert.rejects(() => run(opts({ dryRun: true, env: { CLOUDFLARE_API_TOKEN: 'x' } })), /credentials-present/);
    await assert.rejects(() => run(opts({ dryRun: true, env: { WRANGLER_LOG: 'debug' } })), /credentials-present/);
  });
  test('a real deploy needs BOTH Cloudflare variables, checked before any read', async () => {
    for (const env of [{}, { CLOUDFLARE_API_TOKEN: TOKEN }, { CLOUDFLARE_ACCOUNT_ID: ACCT }]) {
      const o = opts({ env });
      await assert.rejects(() => run(o), /missing-credentials/);
      assert.deepEqual([o.api.writes, o.runWrangler.calls], [[], []]);
    }
  });
  test('the rehearsal still applies the history decision (no baseline fails, a skip skips)', async () => {
    await assert.rejects(() => run(opts({ dryRun: true, env: ENV_DRY, api: memApi() })), /no-baseline/);
    const r = await run(opts({ dryRun: true, env: ENV_DRY, sha: B, art: makeArtifact({ at: B }) }));
    assert.equal(r.action, 'skip');
  });
  test('a failing wrangler dry run fails the rehearsal', async () => {
    await assert.rejects(() => run(opts({ dryRun: true, env: ENV_DRY, dryRunFn: () => ({ ok: false, problems: [{ code: 'dry-run-failed' }] }) })), /dry-run-failed/);
  });
});

const envDoc = (name, over) => protectedEnv(name, over);
const refusesEnv = (name, code, apiOver) =>
  test(name, async () => {
    for (const real of [true, false]) {
      const api = memApi(apiOver);
      seed(api, { at: B, versionId: VB });
      const o = opts(real ? { api } : { api, dryRun: true, env: ENV_DRY });
      await assert.rejects(() => run(o), new RegExp(code), real ? 'real run' : 'rehearsal');
      assert.deepEqual(api.writes, [], 'nothing written');
      assert.deepEqual(o.runWrangler.calls, [], 'wrangler never run');
    }
  });

describe('deploy: the master switch is enforced in the executor', () => {
  test('a real deploy needs PRODUCTION_DEPLOY_ENABLED to be exactly "true"; every other value refuses BEFORE anything is read or written', async () => {
    for (const value of [undefined, '', 'false', 'TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', 'enabled']) {
      const env = { ...ENV_REAL };
      if (value === undefined) delete env.PRODUCTION_DEPLOY_ENABLED;
      else env.PRODUCTION_DEPLOY_ENABLED = value;
      const o = opts({ env });
      let reads = 0;
      o.api.getEnvironment = async () => { reads++; return protectedEnv('production-web'); };
      const listed = o.api.listDeployments;
      o.api.listDeployments = async (...a) => { reads++; return listed(...a); };
      await assert.rejects(() => run(o), /deploy-disabled/, JSON.stringify(value));
      assert.deepEqual([reads, o.api.writes, o.runWrangler.calls], [0, [], []], JSON.stringify(value));
    }
  });
  test('the exact value "true" is accepted', async () => assert.equal((await run(opts())).ok, true));
  test('a rehearsal never needs the switch (and never reads it)', async () => {
    const r = await run(opts({ dryRun: true, env: ENV_DRY }));
    assert.equal(r.action, 'rehearsed');
  });
  test('the switch check comes after the credential check but before the Cloudflare credential could be used', async () => {
    await assert.rejects(() => run(opts({ env: { PRODUCTION_DEPLOY_ENABLED: 'true' } })), /missing-credentials/);
    await assert.rejects(() => run(opts({ env: { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCT } })), /deploy-disabled/);
  });
});

describe('deploy: the GitHub Environment must be protected, or nothing privileged happens', () => {
  refusesEnv('a missing Environment (HTTP 404) refuses, and says GitHub would otherwise create it unprotected', 'environment-unreadable.*does not exist.*unprotected', { getEnvironment: async () => { throw new Error('GitHub API GET /environments/production-web -> HTTP 404'); } });
  refusesEnv('an unreadable Environment (HTTP 403, token scope) refuses', 'environment-unreadable.*actions: read', { getEnvironment: async () => { throw new Error('GitHub API GET /environments/production-web -> HTTP 403'); } });
  refusesEnv('GitHub describing another Environment refuses', 'environment-unreadable.*expected', { getEnvironment: async () => protectedEnv('production-admin') });
  refusesEnv('an Environment with no protection rules refuses', 'environment-unprotected', { getEnvironment: async (n) => envDoc(n, { protection_rules: [] }) });
  refusesEnv('an Environment with only a wait timer refuses', 'environment-unprotected', { getEnvironment: async (n) => envDoc(n, { protection_rules: [{ type: 'wait_timer', wait_timer: 5 }] }) });
  refusesEnv('required reviewers with an empty reviewer list refuse', 'environment-unprotected', { getEnvironment: async (n) => envDoc(n, { protection_rules: [{ type: 'required_reviewers', reviewers: [] }] }) });
  refusesEnv('no protection_rules field at all refuses', 'environment-unprotected', { getEnvironment: async (n) => envDoc(n, { protection_rules: undefined }) });
  refusesEnv('no deployment-branch policy refuses', 'environment-branches', { getEnvironment: async (n) => envDoc(n, { deployment_branch_policy: null }) });
  refusesEnv('"protected branches" alone (not a main-only custom policy) refuses', 'environment-branches', { getEnvironment: async (n) => envDoc(n, { deployment_branch_policy: { protected_branches: true, custom_branch_policies: false } }) });
  refusesEnv('a custom policy that lists no branch refuses', 'environment-branches.*none', { listBranchPolicies: async () => ({ total_count: 0, branch_policies: [] }) });
  refusesEnv('a custom policy that allows two branches refuses', 'environment-branches.*main, release', { listBranchPolicies: async () => ({ total_count: 2, branch_policies: [{ name: 'main' }, { name: 'release' }] }) });
  refusesEnv('a custom policy for another branch refuses', 'environment-branches.*release', { listBranchPolicies: async () => ({ total_count: 1, branch_policies: [{ name: 'release', type: 'branch' }] }) });
  refusesEnv('a tag policy named main refuses', 'environment-branches', { listBranchPolicies: async () => ({ total_count: 1, branch_policies: [{ name: 'main', type: 'tag' }] }) });
  refusesEnv('unreadable branch policies refuse', 'environment-unreadable.*branch policies', { listBranchPolicies: async () => { throw new Error('HTTP 500'); } });
  refusesEnv('a malformed policy list refuses', 'environment-branches', { listBranchPolicies: async () => ({}) });

  test('an Environment with required reviewers and a main-only branch policy passes, and the check is made for the app being deployed', async () => {
    const seen = [];
    const api = memApi({ getEnvironment: async (n) => { seen.push(n); return protectedEnv(n); }, listBranchPolicies: async (n) => { seen.push(n); return mainOnly; } });
    seed(api, { at: B, versionId: VB });
    assert.equal((await run(opts({ api }))).ok, true);
    assert.deepEqual(seen, ['production-web', 'production-web']);
    const admin = memApi({ getEnvironment: async (n) => { seen.push(n); return protectedEnv(n); } });
    assert.equal((await checkEnvironment({ api: admin, app: 'admin' })).name, 'production-admin');
  });
  test('credentials that exist at repository level do not bypass the check: a missing Environment still refuses a real run', async () => {
    const api = memApi({ getEnvironment: async () => { throw new Error('HTTP 404'); } });
    seed(api, { at: B, versionId: VB });
    const o = opts({ api });
    await assert.rejects(() => run(o), /environment-unreadable/);
    assert.deepEqual([api.writes, o.runWrangler.calls], [[], []]);
  });
  test('admins being able to bypass the reviewers is surfaced as a warning, not hidden', async () => {
    const api = memApi({ getEnvironment: async (n) => envDoc(n, { can_admins_bypass: true }) });
    seed(api, { at: B, versionId: VB });
    const r = await run(opts({ api }));
    assert.ok(r.warnings.some((w) => /bypass/.test(w)));
  });
  test('the check is made before the history is read: a protected-Environment failure cannot be masked by a history failure', async () => {
    const api = memApi({ getEnvironment: async () => { throw new Error('HTTP 404'); } });
    api.listDeployments = async () => { throw new Error('should not be read'); };
    await assert.rejects(() => run(opts({ api })), /environment-unreadable/);
  });
});

describe('deploy: artifact bound to repository and run attempt', () => {
  const rejects = (name, code, make, over = {}) =>
    test(name, async () => {
      const o = opts({ art: make(), ...over });
      await assert.rejects(() => run(o), new RegExp(code));
      assert.deepEqual([o.runWrangler.names(), o.api.writes], [[], []]);
    });
  rejects('an artifact built by another repository', 'repository-mismatch', () => makeArtifact({ source: { repository: 'mallory/RMS-Careers' } }));
  rejects('an artifact with no repository', 'repository-mismatch', () => makeArtifact({ source: { repository: undefined } }));
  rejects('an artifact with no run attempt', 'run-attempt-mismatch', () => makeArtifact({ source: { runAttempt: undefined } }));
  rejects('an artifact with a malformed run attempt', 'run-attempt-mismatch', () => makeArtifact({ source: { runAttempt: 'x' } }));
  rejects('an artifact with a zero run attempt', 'run-attempt-mismatch', () => makeArtifact({ source: { runAttempt: 0 } }));
  rejects('an artifact built on a LATER attempt than this one', 'run-attempt-mismatch', () => makeArtifact({ source: { runAttempt: 3 } }), { runAttempt: 2 });
  test('the repository comparison ignores case; a deploy-only re-run (attempt 2) may use the build of attempt 1', async () => {
    const o = opts({ art: makeArtifact({ source: { repository: REPO.toUpperCase(), runAttempt: 1 } }), runAttempt: 2 });
    o.runWrangler = fakeWrangler({ view: viewJson(VN, D).replace('/attempts/1', '/attempts/2') });
    assert.equal((await run(o)).ok, true);
  });
});

describe('deploy: history that is incomplete, interrupted or contradictory is never silent', () => {
  test('a previous attempt whose version could not be verified is surfaced as a warning; the deploy still verifies afresh', async () => {
    const api = memApi();
    seed(api, { at: B, versionId: VB });
    seed(api, { at: sha('c'), phase: 'intent', states: [{ state: 'in_progress' }, { state: 'error', description: `${DEPLOY.unverified}: no version id observed` }] });
    const plan = await planApp({ api, app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ deployableApps: everyApp }) });
    assert.ok(plan.warnings.some((w) => /uncertain live state.*NOT recorded/.test(w)));
    const r = await run(opts({ api }));
    assert.ok(r.ok && r.warnings.some((w) => /uncertain live state/.test(w)));
  });
  test('a previous attempt whose wrangler exited non-zero is also an uncertain live state; one that certainly deployed nothing is not', async () => {
    const mk = (description, state) => {
      const api = memApi();
      seed(api, { at: B, versionId: VB });
      seed(api, { at: sha('c'), phase: 'intent', states: [{ state: 'in_progress' }, { state, description }] });
      return planApp({ api, app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ deployableApps: everyApp }) });
    };
    assert.ok((await mk(`${DEPLOY.failed}: wrangler exited with 1`, 'failure')).warnings.some((w) => /uncertain live state/.test(w)));
    assert.deepEqual((await mk(`${DEPLOY.failed}: artifact check failed; nothing deployed`, 'error')).warnings, []);
    assert.deepEqual((await mk(`${DEPLOY.failed}: intent record could not be written; nothing deployed`, 'error')).warnings, []);
  });
  test('an interrupted (unsettled) newest record is a warning in the plan and is closed by a real deploy', async () => {
    const api = memApi();
    seed(api, { at: B, versionId: VB });
    const stale = seed(api, { at: sha('c'), phase: 'intent', states: ['in_progress'] });
    const plan = await planApp({ api, app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ deployableApps: everyApp }) });
    assert.ok(plan.warnings.some((w) => /never finished/.test(w)));
    await run(opts({ api }));
    assert.deepEqual(statesOf(api, stale.id), ['in_progress', 'error']);
  });
  test('a version tied to two commits is contradictory history: the plan and a real deploy both fail closed', async () => {
    const api = memApi();
    seed(api, { at: B, versionId: VB });
    seed(api, { at: sha('c'), versionId: VB });
    await assert.rejects(() => planApp({ api, app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ deployableApps: everyApp }) }), /ambiguous-version/);
    const o = opts({ api });
    await assert.rejects(() => run(o), /ambiguous-version/);
    assert.deepEqual([api.writes, o.runWrangler.calls], [[], []]);
  });
  test('a clean history produces no warnings', async () => {
    const plan = await planApp({ api: withHistory(), app: 'web', sha: D, root: '/repo', isAncestor: () => true, detectFn: () => ({ deployableApps: everyApp }) });
    assert.deepEqual(plan.warnings, []);
  });
});

describe('deploy: input validation and helpers', () => {
  for (const [name, over, re] of [
    ['an unknown app', { app: 'tutor' }, /bad-app/],
    ['a short SHA', { sha: 'abc' }, /bad-sha/],
    ['an uppercase SHA', { sha: 'D'.repeat(40) }, /bad-sha/],
    ['an unknown mode', { mode: 'force' }, /bad-mode/],
    ['a malformed repo', { repo: 'nope' }, /bad-repo/],
    ['a non-numeric run id', { runId: 'abc' }, /bad-run-id/],
    ['a zero run attempt', { runAttempt: 0 }, /bad-run-attempt/]
  ]) {
    test(`rejects ${name}`, async () => assert.rejects(() => run(opts(over)), re));
  }
  test('redact removes secrets and ignores short or empty values', () => {
    assert.equal(redact(`a ${TOKEN} b ${ACCT}`, [TOKEN, ACCT, '', undefined, 'x']), 'a *** b ***');
  });
  test('parseArgs is strict', () => {
    assert.deepEqual(parseArgs(['run', '--app', 'web', '--sha', D, '--mode', 'deploy', '--dry-run']).opts, { app: 'web', sha: D, mode: 'deploy', 'dry-run': 'true' });
    assert.deepEqual(parseArgs(['plan', '--app', 'web', '--bootstrap']).opts, { app: 'web', bootstrap: 'true' });
    assert.throws(() => parseArgs(['run', '--force']), /unknown option/);
    assert.throws(() => parseArgs(['run', 'web']), /unexpected argument/);
    assert.throws(() => parseArgs(['run', '--app']), /needs a value/);
  });
  test('record payloads: intent cannot claim a version, evidence must have one, rollback is evidence', () => {
    const base = { app: 'web', sha: D, runId: '1', runUrl: '', repo: REPO, runAttempt: 1 };
    assert.throws(() => recordPayload({ ...base, kind: 'deploy', phase: 'intent', versionId: VN }), /bad-phase/);
    assert.throws(() => recordPayload({ ...base, kind: 'rollback', phase: 'intent' }), /bad-phase|bad-version-id/);
    assert.throws(() => recordPayload({ ...base, kind: 'rollback', phase: 'intent', versionId: VN }), /bad-phase/);
    assert.throws(() => recordPayload({ ...base, kind: 'deploy', phase: 'evidence' }), /bad-phase/);
    assert.throws(() => recordPayload({ ...base, kind: 'deploy', phase: 'final' }), /bad-phase/);
    assert.throws(() => recordPayload({ ...base, kind: 'deploy', repo: 'x' }), /bad-repo/);
    assert.throws(() => recordPayload({ ...base, kind: 'deploy', runAttempt: 'x' }), /bad-attempt/);
    assert.equal(recordPayload({ ...base, kind: 'deploy', phase: 'evidence', versionId: VN }).worker, 'rms-web');
    assert.equal(RECORD_MARKER, 'rms-deploy-record');
  });
  test('the reader ignores records whose phase/worker/repo/attempt fields contradict each other', async () => {
    const api = memApi();
    const good = seed(api, { at: B, versionId: VB });
    for (const bad of [{ phase: 'intent', versionId: VX }, { phase: 'evidence', worker: 'rms-admin' }, { repo: 'nope' }, { runAttempt: 'x' }, { phase: 'weird' }]) {
      const d = seed(api, { at: D, versionId: VN });
      Object.assign(d.payload, bad);
    }
    const h = await rollbackHistory({ api, app: 'web' });
    assert.deepEqual(h.records.map((r) => r.deploymentId), [good.id]);
  });
});

test('DeployError carries a code', () => assert.equal(new DeployError('x', 'y').code, 'x'));

describe('deploy: a skip is never a rehearsal; baseline and bootstrap rules hold in a rehearsal too', () => {
  const rehearsalOpts = (over = {}) => {
    const calls = { dryRun: 0 };
    const o = opts({ dryRun: true, env: ENV_DRY, dryRunFn: () => { calls.dryRun++; return { ok: true, problems: [], wranglerVersion: '4.147.0' }; }, ...over });
    return { o, calls };
  };

  const skipCases = [
    ['already-deployed', () => ({ sha: B, art: makeArtifact({ at: B }) })],
    ['superseded', () => ({ isAncestor: (_r, a, b) => a === D && b === B })],
    ['unchanged', () => ({ detectFn: () => ({ deployableApps: ['admin', 'student'], degraded: false }) })]
  ];
  for (const [code, over] of skipCases) {
    test(`${code}: a rehearsal that plans a skip is reported as a skip, runs no dry-run bundle and writes nothing`, async () => {
      const { o, calls } = rehearsalOpts(over());
      const r = await run(o);
      assert.deepEqual([r.ok, r.action, r.code, r.dryRun], [true, 'skip', code, true]);
      assert.notEqual(r.action, 'rehearsed');
      assert.equal(r.command, undefined, 'no deploy command was built');
      assert.equal(r.environment, undefined, 'no rehearsal evidence block');
      assert.equal(calls.dryRun, 0, 'wrangler --dry-run was never run');
      assert.deepEqual([o.api.writes, o.runWrangler.calls], [[], []]);
    });
  }

  test('a real rehearsal is reported as rehearsed with the command and the Environment evidence', async () => {
    const { o, calls } = rehearsalOpts();
    const r = await run(o);
    assert.deepEqual([r.action, r.decision.action, calls.dryRun], ['rehearsed', 'deploy', 1]);
    assert.equal(r.environment.name, 'production-web');
    assert.equal(r.environment.reviewerRules, 1);
  });

  test('no baseline and no bootstrap: the rehearsal refuses (no-baseline) before the dry-run bundle', async () => {
    const { o, calls } = rehearsalOpts({ api: memApi() });
    await assert.rejects(() => run(o), /no-baseline/);
    assert.equal(calls.dryRun, 0);
    assert.deepEqual(o.api.writes, []);
  });

  test('explicit bootstrap with no baseline: the rehearsal decides bootstrap, rehearses, and invents no record', async () => {
    const { o, calls } = rehearsalOpts({ api: memApi(), mode: 'bootstrap' });
    const r = await run(o);
    assert.deepEqual([r.action, r.decision.code, r.decision.base, calls.dryRun], ['rehearsed', 'bootstrap', null, 1]);
    assert.deepEqual([o.api.writes, o.api.deployments], [[], []], 'no intent, evidence or baseline record is created');
    assert.equal((await lastGood({ api: o.api, app: 'web' })).status, 'none', 'history is still empty afterwards');
  });

  test('bootstrap when a verified baseline exists is refused (bootstrap-not-needed), in a rehearsal as in a real run', async () => {
    const { o, calls } = rehearsalOpts({ mode: 'bootstrap' });
    await assert.rejects(() => run(o), /bootstrap-not-needed/);
    assert.equal(calls.dryRun, 0);
    assert.deepEqual([o.api.writes, o.runWrangler.calls], [[], []]);
  });

  test('a bootstrap needs a rehearsal-visible Environment: a missing one refuses the bootstrap rehearsal (environment-unreadable)', async () => {
    const { o, calls } = rehearsalOpts({ api: memApi({ getEnvironment: async () => { throw new Error('GitHub API GET /environments/production-web -> HTTP 404'); } }), mode: 'bootstrap' });
    await assert.rejects(() => run(o), /environment-unreadable/);
    assert.equal(calls.dryRun, 0);
  });

  test('the summaries say plainly that a skip is not rehearsal evidence', () => {
    const src = fs.readFileSync(new URL('../deploy.mjs', import.meta.url), 'utf8');
    assert.match(src, /a skip is not rehearsal evidence/);
    assert.match(src, /NOT rehearsal evidence/);
  });
});
