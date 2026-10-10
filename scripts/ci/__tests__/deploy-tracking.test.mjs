import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ENVIRONMENTS,
  RECORD_MARKER,
  TrackingError,
  createRecord,
  decide,
  githubApi,
  gitIsAncestor,
  lastGood,
  recordPayload,
  setStatus
} from '../deploy-tracking.mjs';

const sha = (c) => c.repeat(40);
const A = sha('a');
const B = sha('b');
const C = sha('c');

/** A deployment record exactly as our (future) deploy job would create it. */
let nextId = 100;
function record({ app = 'web', at, kind = 'deploy', creator = 'github-actions[bot]', payloadSha, depSha, env, marker = RECORD_MARKER, versionId }) {
  const id = nextId++;
  return {
    id,
    sha: depSha ?? at,
    environment: env ?? ENVIRONMENTS[app],
    created_at: `2026-10-10T00:00:${String(id % 60).padStart(2, '0')}Z`,
    creator: { login: creator },
    payload: { marker, app, sha: payloadSha ?? at, runId: '1', runUrl: '', kind, ...(versionId !== undefined ? { versionId } : {}) }
  };
}
const fakeApi = (deployments, statusesById, { failList = false, failStatus = false } = {}) => ({
  listDeployments: async (_env, page) => {
    if (failList) throw new Error('HTTP 502');
    return page === 1 ? deployments : [];
  },
  listStatuses: async (id) => {
    if (failStatus) throw new Error('HTTP 500');
    return statusesById[id] ?? [];
  }
});
const ok = (id) => ({ [id]: [{ state: 'in_progress' }, { state: 'success' }] });

describe('lastGood: reading the record', () => {
  test('no deployments at all is "none" (complete read), not an error', async () => {
    assert.deepEqual(await lastGood({ api: fakeApi([], {}), app: 'web' }), { status: 'none', ignored: {} });
  });

  test('returns the newest verified success; a newer failed or in-progress attempt does not move the base', async () => {
    const good = record({ at: A });
    const failed = record({ at: B });
    const inProgress = record({ at: C });
    const r = await lastGood({ api: fakeApi([good, failed, inProgress], { ...ok(good.id), [failed.id]: [{ state: 'in_progress' }, { state: 'failure' }], [inProgress.id]: [{ state: 'in_progress' }] }), app: 'web' });
    assert.equal(r.status, 'found');
    assert.equal(r.sha, A);
  });

  test('an older success that GitHub turned inactive is still found through the status history', async () => {
    const old = record({ at: A });
    const r = await lastGood({ api: fakeApi([old], { [old.id]: [{ state: 'inactive' }, { state: 'success' }] }), app: 'web' });
    assert.equal(r.sha, A);
  });

  test('newest success wins when there are several', async () => {
    const a = record({ at: A });
    const b = record({ at: B });
    const r = await lastGood({ api: fakeApi([a, b], { ...ok(a.id), ...ok(b.id) }), app: 'web' });
    assert.equal(r.sha, B);
  });

  test('a rollback record is the base even though its commit is older', async () => {
    const dep = record({ at: B });
    const rb = record({ at: A, kind: 'rollback', versionId: '11111111-2222-3333-4444-555555555555' });
    const r = await lastGood({ api: fakeApi([dep, rb], { ...ok(dep.id), ...ok(rb.id) }), app: 'web' });
    assert.deepEqual([r.sha, r.kind], [A, 'rollback']);
  });

  test('records from another creator, without our marker, for another app, or with a mismatched SHA are ignored', async () => {
    const forged = [
      record({ at: A, creator: 'mallory' }),
      record({ at: A, marker: 'something-else' }),
      record({ at: A, app: 'admin', env: ENVIRONMENTS.web }),
      record({ at: A, payloadSha: B }),
      record({ at: A, kind: 'nuke' })
    ];
    const statuses = Object.fromEntries(forged.map((d) => [d.id, [{ state: 'success' }]]));
    const r = await lastGood({ api: fakeApi(forged, statuses), app: 'web' });
    assert.equal(r.status, 'none');
    assert.deepEqual(r.ignored, { 'foreign-creator': 1, 'not-a-record': 1, 'wrong-app': 1, 'sha-mismatch': 1, 'bad-kind': 1 });
  });

  test('FAIL CLOSED: an API error is "unreadable", never "none"', async () => {
    await assert.rejects(lastGood({ api: fakeApi([], {}, { failList: true }), app: 'web' }), (e) => e instanceof TrackingError && e.code === 'unreadable');
    const d = record({ at: A });
    await assert.rejects(lastGood({ api: fakeApi([d], ok(d.id), { failStatus: true }), app: 'web' }), (e) => e.code === 'unreadable');
  });

  test('FAIL CLOSED: malformed responses are unreadable', async () => {
    await assert.rejects(lastGood({ api: { listDeployments: async () => ({ message: 'rate limited' }), listStatuses: async () => [] }, app: 'web' }), (e) => e.code === 'unreadable');
    const d = record({ at: A });
    await assert.rejects(lastGood({ api: { listDeployments: async () => [d], listStatuses: async () => 'nope' }, app: 'web' }), (e) => e.code === 'unreadable');
  });

  test('FAIL CLOSED: a truncated history (more pages than the limit) is unreadable, not "none"', async () => {
    const full = Array.from({ length: 100 }, () => record({ at: A, creator: 'mallory' }));
    const api = { listDeployments: async () => full, listStatuses: async () => [] };
    await assert.rejects(lastGood({ api, app: 'web' }), (e) => e.code === 'unreadable' && /refusing to guess/.test(e.message));
  });

  test('each app reads only its own environment', async () => {
    const seen = [];
    const api = { listDeployments: async (env) => (seen.push(env), []), listStatuses: async () => [] };
    for (const app of ['web', 'admin', 'student']) await lastGood({ api, app });
    assert.deepEqual(seen, ['production-web', 'production-admin', 'production-student']);
    await assert.rejects(lastGood({ api, app: 'tutor' }), /unknown app/);
  });
});

describe('decide: the deploy decision', () => {
  const found = (s, kind = 'deploy') => ({ status: 'found', sha: s, kind, deploymentId: 1 });
  const linear = (a, d) => ({ [`${A}>${B}`]: true, [`${A}>${C}`]: true, [`${B}>${C}`]: true }[`${a}>${d}`] ?? false); // A -> B -> C
  const base = { app: 'web', isAncestor: linear };

  test('descendant commit that affects the app deploys; one that does not is skipped', () => {
    assert.equal(decide({ ...base, sha: C, last: found(A), deployableApps: ['web'] }).action, 'deploy');
    const skip = decide({ ...base, sha: C, last: found(A), deployableApps: ['admin'] });
    assert.deepEqual([skip.action, skip.code], ['skip', 'unchanged']);
  });

  test('a failed deployment followed by unrelated commits: the base is still the last good SHA, so the app deploys again', () => {
    const d = decide({ ...base, sha: C, last: found(A), deployableApps: ['web', 'admin'] });
    assert.deepEqual([d.action, d.base], ['deploy', A]);
  });

  test('two queued runs: the older commit run is superseded and never overwrites the newer deployment', () => {
    const old = decide({ ...base, sha: B, last: found(C), deployableApps: ['web'] });
    assert.deepEqual([old.action, old.code], ['skip', 'superseded']);
    assert.equal(decide({ ...base, sha: C, last: found(C), deployableApps: ['web'] }).code, 'already-deployed');
  });

  test('a commit that is neither ahead of nor behind the last good SHA fails closed', () => {
    const d = decide({ ...base, sha: sha('d'), last: found(A), deployableApps: ['web'] });
    assert.deepEqual([d.action, d.code], ['fail', 'diverged']);
  });

  test('after a rollback the base is the rolled-back SHA and a newer main commit deploys', () => {
    assert.equal(decide({ ...base, sha: C, last: found(A, 'rollback'), deployableApps: ['web'] }).action, 'deploy');
  });

  test('first deployment: no record fails closed unless bootstrap is explicit', () => {
    const none = { status: 'none', ignored: {} };
    assert.deepEqual([decide({ ...base, sha: C, last: none }).action, decide({ ...base, sha: C, last: none }).code], ['fail', 'no-baseline']);
    assert.deepEqual([decide({ ...base, sha: C, last: none, bootstrap: true }).action, decide({ ...base, sha: C, last: none, bootstrap: true }).code], ['deploy', 'bootstrap']);
  });

  test('bootstrap is refused when a verified record already exists', () => {
    assert.equal(decide({ ...base, sha: C, last: found(A), bootstrap: true, deployableApps: ['web'] }).code, 'bootstrap-not-needed');
  });

  test('an unreadable or missing record, a bad app and a bad SHA all fail closed', () => {
    assert.equal(decide({ ...base, sha: C, last: null }).code, 'unreadable');
    assert.equal(decide({ ...base, sha: C, last: { status: 'maybe' } }).code, 'unreadable');
    assert.equal(decide({ ...base, app: 'tutor', sha: C, last: found(A) }).code, 'bad-app');
    assert.equal(decide({ ...base, sha: 'abc123', last: found(A) }).code, 'bad-sha');
  });

  test('a git failure (unknown commit, shallow clone) fails closed', () => {
    const boom = () => {
      throw new TrackingError('git-error', 'cannot compare');
    };
    assert.deepEqual([decide({ ...base, isAncestor: boom, sha: C, last: found(A), deployableApps: ['web'] }).action], ['fail']);
  });

  test('success then workflow failure: the record (not the workflow result) is the input, so the next run skips', () => {
    // the deploy job wrote success before a later step failed: last good is already C
    assert.equal(decide({ ...base, sha: C, last: found(C), deployableApps: ['web'] }).action, 'skip');
  });
});

describe('gitIsAncestor against a real repository', () => {
  let dir;
  const c = {};
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracking-git-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@example.test');
    git('config', 'user.name', 't');
    git('config', 'commit.gpgsign', 'false');
    const commit = (name) => {
      fs.writeFileSync(path.join(dir, name), name);
      git('add', name);
      git('commit', '-q', '-m', name);
      return git('rev-parse', 'HEAD');
    };
    c.a = commit('a');
    c.b = commit('b');
    git('checkout', '-q', '-b', 'side', c.a);
    c.s = commit('s');
    git('checkout', '-q', 'main');
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  test('ancestor, descendant, diverged, and unknown commit', () => {
    assert.equal(gitIsAncestor(dir, c.a, c.b), true);
    assert.equal(gitIsAncestor(dir, c.b, c.a), false);
    assert.equal(gitIsAncestor(dir, c.s, c.b), false);
    assert.equal(gitIsAncestor(dir, c.b, c.s), false);
    assert.throws(() => gitIsAncestor(dir, sha('e'), c.b), (e) => e.code === 'git-error');
    assert.throws(() => gitIsAncestor(dir, 'HEAD', c.b), (e) => e.code === 'bad-sha');
  });

  test('decide + real git: diverged branch fails, newer main deploys', () => {
    const isAncestor = (x, y) => gitIsAncestor(dir, x, y);
    assert.equal(decide({ app: 'web', sha: c.s, last: { status: 'found', sha: c.b, kind: 'deploy', deploymentId: 1 }, isAncestor, deployableApps: ['web'] }).code, 'diverged');
    assert.equal(decide({ app: 'web', sha: c.b, last: { status: 'found', sha: c.a, kind: 'deploy', deploymentId: 1 }, isAncestor, deployableApps: ['web'] }).action, 'deploy');
  });
});

describe('writers and the GitHub adapter', () => {
  test('payload validation rejects bad apps, short SHAs and unknown kinds', () => {
    assert.throws(() => recordPayload({ app: 'tutor', sha: A, kind: 'deploy' }), /unknown app/);
    assert.throws(() => recordPayload({ app: 'web', sha: 'abc', kind: 'deploy' }), /full 40/);
    assert.throws(() => recordPayload({ app: 'web', sha: A.toUpperCase(), kind: 'deploy' }), /full 40/);
    assert.throws(() => recordPayload({ app: 'web', sha: A, kind: 'whatever' }), /kind must be/);
    assert.equal(recordPayload({ app: 'web', sha: A, kind: 'bootstrap', runId: 5 }).marker, RECORD_MARKER);
  });

  test('createRecord uses the app environment, the exact SHA, no auto-merge and no required contexts', async () => {
    const calls = [];
    const api = { createDeployment: async (x) => (calls.push(x), { id: 7 }), createStatus: async (...x) => calls.push(x) };
    assert.equal(await createRecord(api, { app: 'admin', sha: B, runId: 9, runUrl: 'https://example.test/run/9', kind: 'deploy' }), 7);
    assert.equal(calls[0].environment, 'production-admin');
    assert.equal(calls[0].sha, B);
    assert.equal(calls[0].payload.app, 'admin');
    await assert.rejects(createRecord({ createDeployment: async () => ({}) }, { app: 'web', sha: A, kind: 'deploy' }), /did not return a deployment id/);
    await assert.rejects(setStatus(api, 7, { state: 'deployed' }), /unsupported state/);
    await setStatus(api, 7, { state: 'success', description: 'x'.repeat(500) });
    assert.equal(calls[1][1].description.length, 140);
  });

  test('the adapter sends the token only as a bearer header, URL-encodes the environment, and surfaces HTTP errors', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => (seen.push({ url, init }), new Response(JSON.stringify([]), { status: seen.length === 2 ? 403 : 200 }));
    const api = githubApi({ repo: 'o/r', token: 'TOKEN-VALUE', fetchImpl });
    await api.listDeployments('production-web', 1);
    assert.match(seen[0].url, /\/repos\/o\/r\/deployments\?environment=production-web&per_page=100&page=1$/);
    assert.equal(seen[0].init.headers.authorization, 'Bearer TOKEN-VALUE');
    assert.doesNotMatch(seen[0].url, /TOKEN-VALUE/);
    await assert.rejects(api.listStatuses(5), /HTTP 403/);
    assert.throws(() => githubApi({ repo: 'not a repo' }), /owner\/name/);
    const anon = githubApi({ repo: 'o/r', fetchImpl: async (u, i) => (seen.push({ u, i }), new Response('[]')) });
    await anon.listDeployments('production-web', 1);
    assert.equal(seen.at(-1).i.headers.authorization, undefined);
  });
});
