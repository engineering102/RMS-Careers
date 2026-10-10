import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CI_WORKFLOW, GateError, assertOnMain, decisionLine, deploySwitch, evaluateCiGate, evaluateTrigger, githubReader, trustedCiRun } from '../deploy-gate.mjs';

const REPO = 'engineering102/RMS-Careers';
const S = 'a'.repeat(40); // the commit CI ran on
const TIP = 'f'.repeat(40); // the current default-branch tip (what GITHUB_SHA is under workflow_run)

// ---------------------------------------------------------------------------------------------------------------
// evaluateTrigger
// ---------------------------------------------------------------------------------------------------------------
const wrEvent = (over = {}) => ({
  action: 'completed',
  workflow_run: {
    id: 500, run_attempt: 1, name: 'CI', path: '.github/workflows/ci.yml', event: 'push', head_branch: 'main', head_sha: S, status: 'completed', conclusion: 'success',
    head_repository: { full_name: REPO }, repository: { full_name: REPO }, ...over
  }
});
const trigger = (over = {}) => evaluateTrigger({ eventName: 'workflow_run', event: wrEvent(), ref: 'refs/heads/main', githubSha: TIP, repo: REPO, inputs: {}, enabled: 'true', ...over });
const dispatch = (inputs = {}, over = {}) =>
  evaluateTrigger({ eventName: 'workflow_dispatch', event: {}, ref: 'refs/heads/main', githubSha: TIP, repo: REPO, inputs: { app: 'all', bootstrap: 'false', dry_run: 'true', ...inputs }, enabled: 'true', ...over });

describe('deploySwitch: the master switch is off unless it is exactly "true"', () => {
  test('only the exact string "true" enables', () => assert.deepEqual(deploySwitch('true'), { enabled: true }));
  test('unset, empty and "false" are off', () => {
    for (const raw of [undefined, '', 'false']) assert.equal(deploySwitch(raw).enabled, false, String(raw));
  });
  test('malformed values are off and are named as malformed (never guessed)', () => {
    for (const raw of ['TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', 'enabled', 'null']) {
      const sw = deploySwitch(raw);
      assert.equal(sw.enabled, false, JSON.stringify(raw));
      assert.match(sw.reason, /malformed/);
    }
  });
});

describe('evaluateTrigger: workflow_run', () => {
  test('uses the head_sha CI ran on, never GITHUB_SHA (the default-branch tip), and targets every app for real', () => {
    const t = trigger();
    assert.deepEqual([t.proceed, t.sha, t.triggeringRun, t.apps, t.bootstrap, t.dryRun], [true, S, { id: 500, attempt: 1 }, ['web', 'admin', 'student'], false, false]);
    assert.notEqual(t.sha, TIP);
  });
  test('a CI run that did not succeed is a quiet no-op, not an error and not a deploy', () => {
    for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out', null]) {
      const t = trigger({ event: wrEvent({ conclusion }) });
      assert.equal(t.proceed, false, String(conclusion));
      assert.match(t.reason, /not success/);
    }
  });
  test('automatic deploys are off unless PRODUCTION_DEPLOY_ENABLED is exactly "true"', () => {
    for (const enabled of [undefined, '', 'false', 'TRUE', '1', 'yes']) {
      const t = trigger({ enabled });
      assert.equal(t.proceed, false, String(enabled));
      assert.match(t.reason, /disabled/);
    }
  });
  for (const [name, over, code] of [
    ['another workflow', { name: 'Artifact PoC' }, 'untrusted-workflow'],
    ['a same-named workflow file elsewhere', { path: '.github/workflows/evil.yml' }, 'untrusted-workflow'],
    ['a pull_request run', { event: 'pull_request' }, 'untrusted-event'],
    ['a schedule run', { event: 'schedule' }, 'untrusted-event'],
    ['a workflow_dispatch run of CI', { event: 'workflow_dispatch' }, 'untrusted-event'],
    ['a non-main branch', { head_branch: 'feature' }, 'not-main'],
    ['a fork whose branch is called main', { head_repository: { full_name: 'mallory/RMS-Careers' } }, 'untrusted-repository'],
    ['a run of another repository', { repository: { full_name: 'mallory/other' } }, 'untrusted-repository'],
    ['a short head_sha', { head_sha: 'abc123' }, 'bad-sha'],
    ['an uppercase head_sha', { head_sha: 'A'.repeat(40) }, 'bad-sha'],
    ['a missing head_sha', { head_sha: undefined }, 'bad-sha'],
    ['a run that is not completed', { status: 'in_progress' }, 'bad-event'],
    ['a missing run id', { id: undefined }, 'bad-event'],
    ['a missing run attempt', { run_attempt: undefined }, 'bad-event'],
    ['a zero run attempt', { run_attempt: 0 }, 'bad-event']
  ]) {
    test(`rejects ${name}`, () => assert.throws(() => trigger({ event: wrEvent(over) }), new RegExp(code)));
  }
  test('accepts a path with the "@ref" suffix GitHub may append', () => assert.equal(trigger({ event: wrEvent({ path: '.github/workflows/ci.yml@refs/heads/main' }) }).proceed, true));
  test('rejects a missing payload and an unexpected action', () => {
    assert.throws(() => trigger({ event: {} }), /bad-event/);
    assert.throws(() => trigger({ event: { ...wrEvent(), action: 'requested' } }), /bad-event/);
  });
  test('rejects a malformed repository', () => assert.throws(() => trigger({ repo: 'nope' }), /bad-repo/));
});

describe('evaluateTrigger: workflow_dispatch', () => {
  test('a rehearsal of the dispatched main tip; app "all" targets the three apps; the switch is not needed', () => {
    for (const enabled of [undefined, '', 'false', 'TRUE']) {
      const t = dispatch({}, { enabled });
      assert.deepEqual([t.proceed, t.sha, t.triggeringRun, t.apps, t.bootstrap, t.dryRun], [true, TIP, null, ['web', 'admin', 'student'], false, true], String(enabled));
    }
  });
  test('a REAL run needs the master switch to be exactly "true", however it was started', () => {
    for (const enabled of [undefined, '', 'false', 'TRUE', '1', 'yes', ' true']) {
      assert.throws(() => dispatch({ dry_run: 'false', app: 'web' }, { enabled }), /deploy-disabled/, JSON.stringify(enabled));
      assert.throws(() => dispatch({ dry_run: 'false', app: 'web', bootstrap: 'true' }, { enabled }), /deploy-disabled/, JSON.stringify(enabled));
    }
    const t = dispatch({ app: 'admin', dry_run: 'false' }, { enabled: 'true' });
    assert.deepEqual([t.apps, t.dryRun], [['admin'], false]);
  });
  test('bootstrap needs exactly one app', () => {
    assert.throws(() => dispatch({ bootstrap: 'true', app: 'all' }), /bootstrap-needs-one-app/);
    const t = dispatch({ bootstrap: 'true', app: 'student', dry_run: 'false' });
    assert.deepEqual([t.bootstrap, t.apps], [true, ['student']]);
  });
  test('refuses a dispatch from any ref but main (so a branch workflow can never reach the credentials)', () => {
    for (const ref of ['refs/heads/feature', 'refs/heads/main2', 'refs/heads/xmain', 'refs/tags/v1', 'refs/pull/4/merge', undefined]) {
      assert.throws(() => dispatch({}, { ref }), /not-main/, String(ref));
    }
  });
  test('rejects unknown apps and non-boolean flags', () => {
    assert.throws(() => dispatch({ app: 'tutor' }), /bad-input/);
    assert.throws(() => dispatch({ app: '' }), /bad-input/);
    for (const bad of ['', 'TRUE', '1', undefined]) {
      assert.throws(() => dispatch({ dry_run: bad }), /bad-input/, String(bad));
      assert.throws(() => dispatch({ bootstrap: bad }), /bad-input/, String(bad));
    }
  });
  test('rejects a short GITHUB_SHA and unsupported events', () => {
    assert.throws(() => dispatch({}, { githubSha: 'abc' }), /bad-sha/);
    for (const eventName of ['push', 'pull_request', 'pull_request_target', 'schedule', 'repository_dispatch', 'workflow_call']) {
      assert.throws(() => evaluateTrigger({ eventName, event: {}, ref: 'refs/heads/main', githubSha: TIP, repo: REPO, enabled: 'true' }), /bad-event/, eventName);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// evaluateCiGate: workflow run + jobs of the latest attempt (documented shapes)
// ---------------------------------------------------------------------------------------------------------------
const run = (over = {}) => ({
  id: 500, name: 'CI', path: '.github/workflows/ci.yml', event: 'push', head_branch: 'main', head_sha: S, run_attempt: 1, status: 'completed', conclusion: 'success',
  repository: { full_name: REPO }, head_repository: { full_name: REPO }, ...over
});
const job = (over = {}) => ({ id: 9001, run_id: 500, run_attempt: 1, head_sha: S, name: 'ci-gate', status: 'completed', conclusion: 'success', ...over });
const otherJobs = () => [job({ id: 1, name: 'detect affected apps' }), job({ id: 2, name: 'typecheck + unit tests' }), job({ id: 3, name: 'lint workflows', conclusion: 'skipped' })];
/**
 * Fake of the three GitHub reads. `jobsByAttempt` maps "<run>:<attempt>" to a job list so tests can prove the attempt asked for.
 */
function gateApi({ runs = { 500: run() }, list = undefined, jobsByAttempt = { '500:1': [...otherJobs(), job()] }, fail = {} } = {}) {
  const calls = [];
  return {
    calls,
    getRun: async (id) => {
      calls.push(['getRun', id]);
      if (fail.getRun) throw new Error('HTTP 500');
      if (!runs[id]) throw new Error(`HTTP 404 run ${id}`);
      return runs[id];
    },
    listCiRuns: async (sha) => {
      calls.push(['listCiRuns', sha]);
      if (fail.listCiRuns) throw new Error('HTTP 502');
      const all = list ?? Object.values(runs);
      return { total_count: all.length, workflow_runs: all };
    },
    listJobs: async (id, attempt) => {
      calls.push(['listJobs', id, attempt]);
      if (fail.listJobs) throw new Error('HTTP 403');
      const jobs = jobsByAttempt[`${id}:${attempt}`];
      if (!jobs) throw new Error(`HTTP 404 attempt ${attempt}`);
      return { total_count: jobs.length, jobs };
    }
  };
}
const gate = (api, extra = {}) => evaluateCiGate({ api, sha: S, repo: REPO, ...extra });

describe('evaluateCiGate: the triggering run (workflow_run)', () => {
  test('a green run on the attempt that triggered the deploy, with exactly one green ci-gate job, passes', async () => {
    const api = gateApi();
    assert.deepEqual(await gate(api, { triggeringRun: { id: 500, attempt: 1 } }), { runId: 500, attempt: 1, jobId: 9001 });
    assert.deepEqual(api.calls, [['getRun', 500], ['listJobs', 500, 1]], 'the jobs asked for are those of the run attempt, nothing else');
  });
  test('a run that is not the trigger, or not CI push-on-main for this SHA, is rejected', async () => {
    await assert.rejects(() => gate(gateApi({ runs: { 500: run({ id: 501 }) } }), { triggeringRun: { id: 500, attempt: 1 } }), /untrusted-run/);
    for (const over of [{ name: 'Other' }, { path: '.github/workflows/other.yml' }, { event: 'pull_request' }, { head_branch: 'feature' }, { head_sha: 'c'.repeat(40) }, { repository: { full_name: 'x/y' } }, { head_repository: { full_name: 'x/y' } }, { run_attempt: undefined }]) {
      await assert.rejects(() => gate(gateApi({ runs: { 500: run(over) } }), { triggeringRun: { id: 500, attempt: 1 } }), /untrusted-run/, JSON.stringify(over));
    }
  });
  test('a re-run after the trigger makes the trigger stale (the newer attempt triggers its own deploy)', async () => {
    const api = gateApi({ runs: { 500: run({ run_attempt: 2 }) }, jobsByAttempt: { '500:2': [job({ run_attempt: 2 })] } });
    await assert.rejects(() => gate(api, { triggeringRun: { id: 500, attempt: 1 } }), /stale-trigger/);
    assert.equal((await gate(api, { triggeringRun: { id: 500, attempt: 2 } })).attempt, 2);
  });
  test('a failed ci-gate of an EARLIER attempt is never read when the latest attempt is green', async () => {
    const api = gateApi({ runs: { 500: run({ run_attempt: 2 }) }, jobsByAttempt: { '500:1': [job({ conclusion: 'failure' })], '500:2': [job({ run_attempt: 2 })] } });
    assert.equal((await gate(api, { triggeringRun: { id: 500, attempt: 2 } })).jobId, 9001);
    assert.ok(!api.calls.some((c) => c[0] === 'listJobs' && c[2] === 1));
  });
  test('a green earlier attempt does not rescue a latest attempt that is not green', async () => {
    const api = gateApi({ runs: { 500: run({ run_attempt: 2, conclusion: 'failure' }) }, jobsByAttempt: { '500:1': [job()], '500:2': [job({ run_attempt: 2, conclusion: 'failure' })] } });
    await assert.rejects(() => gate(api, { triggeringRun: { id: 500, attempt: 2 } }), /not-green/);
  });
});

describe('evaluateCiGate: lookup by commit (workflow_dispatch)', () => {
  test('exactly one trusted CI run for the SHA is used', async () => {
    const api = gateApi();
    assert.equal((await gate(api)).runId, 500);
    assert.deepEqual(api.calls[0], ['listCiRuns', S]);
  });
  test('no run at all, or only untrusted runs, is missing (fail closed)', async () => {
    await assert.rejects(() => gate(gateApi({ runs: {}, list: [] })), /missing/);
    await assert.rejects(() => gate(gateApi({ list: [run({ event: 'pull_request' }), run({ id: 501, head_branch: 'feature' }), run({ id: 502, head_sha: 'b'.repeat(40) })], runs: {} })), /missing.*3 other/);
  });
  test('two trusted runs for the same SHA are ambiguous', async () => {
    const list = [run(), run({ id: 501 })];
    await assert.rejects(() => gate(gateApi({ list, runs: { 500: run(), 501: run({ id: 501 }) } })), /ambiguous.*500, 501/);
  });
  test('a pull_request run of the same commit does not make the result ambiguous and is never used', async () => {
    const list = [run(), run({ id: 600, event: 'pull_request' })];
    assert.equal((await gate(gateApi({ list }))).runId, 500);
  });
  test('the decision rests on the run object read by id, which must still be trusted', async () => {
    await assert.rejects(() => gate(gateApi({ list: [run()], runs: { 500: run({ conclusion: 'failure' }) } })), /not-green/);
    await assert.rejects(() => gate(gateApi({ list: [run()], runs: { 500: run({ head_sha: 'c'.repeat(40) }) } })), /untrusted-run/);
  });
  test('a run list that is truncated or oddly shaped is unreadable', async () => {
    const full = Array.from({ length: 100 }, (_, i) => run({ id: 1000 + i, event: 'pull_request' }));
    await assert.rejects(() => gate(gateApi({ list: full, runs: {} })), /unreadable.*too many/);
    await assert.rejects(() => gate({ ...gateApi(), listCiRuns: async () => ({ total_count: 250, workflow_runs: [run()] }) }), /unreadable/);
    await assert.rejects(() => gate({ ...gateApi(), listCiRuns: async () => undefined }), /unreadable/);
    await assert.rejects(() => gate({ ...gateApi(), listCiRuns: async () => ({ workflow_runs: [] }) }), /unreadable/);
  });
});

describe('evaluateCiGate: the ci-gate job of the latest attempt', () => {
  const trig = { triggeringRun: { id: 500, attempt: 1 } };
  const withJobs = (jobs, runOver = {}) => gateApi({ runs: { 500: run(runOver) }, jobsByAttempt: { [`500:${runOver.run_attempt ?? 1}`]: jobs } });
  test('no ci-gate job is missing', async () => {
    await assert.rejects(() => gate(withJobs(otherJobs()), trig), /missing.*no job named ci-gate/);
    await assert.rejects(() => gate(withJobs([]), trig), /missing/);
  });
  test('two ci-gate jobs are ambiguous', async () => {
    await assert.rejects(() => gate(withJobs([job(), job({ id: 9002 })]), trig), /ambiguous.*2 jobs/);
  });
  test('a ci-gate that is failed, cancelled, skipped, pending or unfinished is not green', async () => {
    for (const over of [{ conclusion: 'failure' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }, { conclusion: null, status: 'in_progress' }, { conclusion: null, status: 'queued' }]) {
      await assert.rejects(() => gate(withJobs([job(over)]), trig), /not-green/, JSON.stringify(over));
    }
  });
  test('a CI run that is not green is refused before its jobs are read', async () => {
    for (const over of [{ conclusion: 'failure' }, { conclusion: 'cancelled' }, { status: 'in_progress', conclusion: null }]) {
      const api = withJobs([job()], over);
      await assert.rejects(() => gate(api, trig), /not-green/, JSON.stringify(over));
      assert.ok(!api.calls.some((c) => c[0] === 'listJobs'));
    }
  });
  test('a job of another run, attempt or commit is not accepted even if it is named ci-gate and green', async () => {
    for (const over of [{ run_id: 999 }, { run_attempt: 2 }, { head_sha: 'b'.repeat(40) }, { head_sha: undefined }]) {
      await assert.rejects(() => gate(withJobs([job(over)]), trig), /wrong-job/, JSON.stringify(over));
    }
  });
  test('truncated or oddly shaped job lists are unreadable', async () => {
    await assert.rejects(() => gate({ ...gateApi(), listJobs: async () => ({ total_count: 200, jobs: [job()] }) }, trig), /unreadable/);
    await assert.rejects(() => gate({ ...gateApi(), listJobs: async () => ({ total_count: 100, jobs: Array.from({ length: 100 }, (_, i) => job({ id: i, name: `j${i}` })) }) }, trig), /unreadable/);
    await assert.rejects(() => gate({ ...gateApi(), listJobs: async () => undefined }, trig), /unreadable/);
    await assert.rejects(() => gate({ ...gateApi(), listJobs: async () => ({ jobs: [job()] }) }, trig), /unreadable/);
  });
  test('API errors (permissions, 5xx, missing attempt) fail closed with "unreadable"', async () => {
    await assert.rejects(() => gate(gateApi({ fail: { getRun: true } }), trig), /unreadable/);
    await assert.rejects(() => gate(gateApi({ fail: { listJobs: true } }), trig), /unreadable.*HTTP 403/);
    await assert.rejects(() => gate(gateApi({ fail: { listCiRuns: true } })), /unreadable/);
    await assert.rejects(() => gate(gateApi({ jobsByAttempt: {} }), trig), /unreadable/);
  });
  test('only a full SHA is accepted', async () => {
    await assert.rejects(() => evaluateCiGate({ api: gateApi(), sha: 'abc', repo: REPO }), /bad-sha/);
  });
});

describe('trustedCiRun', () => {
  test('accepts exactly the shape of a CI push-on-main run of this repository for the SHA', () => assert.equal(trustedCiRun(run(), S, REPO), true));
  test('rejects each deviation', () => {
    for (const over of [{ name: 'x' }, { path: 'x' }, { event: 'pull_request' }, { head_branch: 'x' }, { head_sha: 'b'.repeat(40) }, { repository: undefined }, { head_repository: undefined }, { id: '5' }, { run_attempt: 0 }]) {
      assert.equal(trustedCiRun(run(over), S, REPO), false, JSON.stringify(over));
    }
    assert.equal(trustedCiRun(null, S, REPO), false);
  });
});

describe('githubReader: documented endpoints, GET only, actions:read', () => {
  test('requests the CI workflow runs of that commit (push, main, no PRs), a run, and the jobs of one attempt', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push([url, init.method ?? 'GET']);
      return { ok: true, json: async () => ({}) };
    };
    const api = githubReader({ repo: REPO, token: 't', fetchImpl });
    await api.listCiRuns(S);
    await api.getRun(500);
    await api.listJobs(500, 2);
    assert.match(seen[0][0], new RegExp(`/repos/${REPO}/actions/workflows/ci\\.yml/runs\\?head_sha=${S}&event=push&branch=main&exclude_pull_requests=true&per_page=100$`));
    assert.match(seen[1][0], new RegExp(`/repos/${REPO}/actions/runs/500$`));
    assert.match(seen[2][0], new RegExp(`/repos/${REPO}/actions/runs/500/attempts/2/jobs\\?per_page=100$`));
    assert.ok(seen.every(([, method]) => method === 'GET'));
    assert.ok(!seen.some(([url]) => /check-runs|filter=latest/.test(url)), 'the unspecified check-runs/filter=latest strategy is gone');
  });
  test('an HTTP error is an error', async () => {
    const api = githubReader({ repo: REPO, fetchImpl: async () => ({ ok: false, status: 403 }) });
    await assert.rejects(() => api.getRun(1), /HTTP 403/);
  });
  test('a malformed repo is refused', () => assert.throws(() => githubReader({ repo: 'x' }), /bad-repo/));
});

describe('assertOnMain (real git)', () => {
  let dir;
  let first;
  let second;
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-git-'));
    git('init', '-q');
    git('config', 'user.email', 'ci@example.test');
    git('config', 'user.name', 'ci');
    git('config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(dir, 'a'), '1');
    git('add', 'a');
    git('commit', '-q', '-m', 'one');
    first = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(dir, 'a'), '2');
    git('commit', '-qam', 'two');
    second = git('rev-parse', 'HEAD');
    git('checkout', '-q', '-b', 'side', first);
    fs.writeFileSync(path.join(dir, 'b'), '3');
    git('add', 'b');
    git('commit', '-q', '-m', 'side');
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  test('without origin/main it refuses', () => assert.throws(() => assertOnMain(dir, first), /git-error.*origin\/main/));
  test('an ancestor or the tip itself passes; a commit on a side branch does not', () => {
    git('update-ref', 'refs/remotes/origin/main', second);
    assert.equal(assertOnMain(dir, first), second);
    assert.equal(assertOnMain(dir, second), second);
    assert.throws(() => assertOnMain(dir, git('rev-parse', 'side')), /not-on-main/);
  });
  test('an unknown commit is an error, not a pass', () => assert.throws(() => assertOnMain(dir, 'd'.repeat(40)), /git-error/));
});

test('the trusted workflow constants are the ones ci.yml really has', () => {
  const ci = fs.readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.match(ci, /^name: CI$/m);
  assert.match(ci, /^ {2}ci-gate:\n {4}name: ci-gate$/m, 'the job id and the job NAME the gate looks for');
  assert.equal(CI_WORKFLOW.path, '.github/workflows/ci.yml');
  assert.equal(CI_WORKFLOW.job, 'ci-gate');
  assert.ok(GateError);
});

// ---------------------------------------------------------------------------------------------------------------
// Decision logging: the step log explains every decision and never carries a secret
// ---------------------------------------------------------------------------------------------------------------
const parseLine = (line) => {
  assert.match(line, /^deploy-gate: \{.*\}$/, 'one structured line');
  return JSON.parse(line.slice('deploy-gate: '.length));
};

describe('decisionLine', () => {
  test('allow: SHA, scope, mode and the CI evidence', () => {
    const e = parseLine(decisionLine({ decision: 'allow', source: 'workflow_dispatch', sha: S, apps: ['web'], bootstrap: true, dryRun: true, ciRun: { runId: 500, attempt: 2, jobId: 9001 } }));
    assert.deepEqual(e, { decision: 'allow', source: 'workflow_dispatch', sha: S, apps: ['web'], bootstrap: true, dryRun: true, ciRun: 500, attempt: 2, ciGateJob: 9001 });
  });
  test('deny and skip carry a code or reason, collapsed to one short line', () => {
    const deny = parseLine(decisionLine({ decision: 'deny', source: 'workflow_dispatch', code: 'not-main', reason: `not-main: line one\nline two ${'x'.repeat(500)}` }));
    assert.equal(deny.decision, 'deny');
    assert.equal(deny.code, 'not-main');
    assert.ok(!deny.reason.includes('\n') && deny.reason.length <= 300);
    const skip = parseLine(decisionLine({ decision: 'skip', source: 'workflow_run', sha: S, reason: 'automatic production deploys are disabled' }));
    assert.deepEqual([skip.decision, skip.sha], ['skip', S]);
  });
  test('a boolean false is kept (dryRun false is information, not absence)', () => assert.equal(parseLine(decisionLine({ decision: 'allow', dryRun: false, bootstrap: false })).dryRun, false));
});

describe('deploy-gate CLI: every outcome is logged, and no secret is ever printed', () => {
  const script = fileURLToPath(new URL('../deploy-gate.mjs', import.meta.url));
  const CANARY = 'ghs_CANARY_must_never_appear_in_output';
  let tmp;
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-gate-cli-'));
  });
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const runGate = (env, event) => {
    const eventPath = path.join(tmp, `event-${Math.random().toString(36).slice(2)}.json`);
    const outPath = path.join(tmp, `out-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(eventPath, JSON.stringify(event ?? {}));
    fs.writeFileSync(outPath, '');
    const res = spawnSync(process.execPath, [script], {
      env: { PATH: process.env.PATH, GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: CANARY, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outPath, GITHUB_SHA: TIP, ...env },
      encoding: 'utf8', timeout: 30000
    });
    const lines = `${res.stdout}\n${res.stderr}`.split(/\r?\n/);
    assert.ok(!`${res.stdout}${res.stderr}`.includes(CANARY), 'the token never appears in the log');
    return { status: res.status, lines, entry: lines.filter((l) => l.startsWith('deploy-gate: ')).map(parseLine), outputs: fs.readFileSync(outPath, 'utf8') };
  };

  test('a dispatch from another ref is denied and logged with its code, before any API call', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/feature', INPUT_APP: 'web', INPUT_BOOTSTRAP: 'true', INPUT_DRY_RUN: 'true' });
    assert.equal(r.status, 1);
    assert.equal(r.entry.length, 1);
    assert.deepEqual([r.entry[0].decision, r.entry[0].code, r.entry[0].source], ['deny', 'not-main', 'workflow_dispatch']);
  });
  test('a real dispatch with the switch off is denied: deploy-disabled', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', INPUT_APP: 'web', INPUT_BOOTSTRAP: 'false', INPUT_DRY_RUN: 'false' });
    assert.equal(r.status, 1);
    assert.deepEqual([r.entry[0].decision, r.entry[0].code], ['deny', 'deploy-disabled']);
  });
  test('bootstrap with app=all is denied: bootstrap-needs-one-app', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', INPUT_APP: 'all', INPUT_BOOTSTRAP: 'true', INPUT_DRY_RUN: 'true' });
    assert.equal(r.status, 1);
    assert.equal(r.entry[0].code, 'bootstrap-needs-one-app');
  });
  test('an automatic run while the switch is off is a logged skip with the CI SHA, exit 0, proceed=false', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REF: 'refs/heads/main' }, wrEvent());
    assert.equal(r.status, 0);
    assert.deepEqual([r.entry[0].decision, r.entry[0].sha, r.entry[0].source], ['skip', S, 'workflow_run']);
    assert.match(r.entry[0].reason, /disabled/);
    assert.match(r.outputs, /^proceed=false$/m);
    assert.match(r.outputs, /^apps=\[\]$/m);
  });
  test('a CI run that did not succeed is a logged skip, never an allow', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REF: 'refs/heads/main', PRODUCTION_DEPLOY_ENABLED: 'true' }, wrEvent({ conclusion: 'failure' }));
    assert.equal(r.status, 0);
    assert.equal(r.entry[0].decision, 'skip');
    assert.match(r.outputs, /^proceed=false$/m);
  });
  test('an untrusted trigger is denied and logged', () => {
    const r = runGate({ GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REF: 'refs/heads/main', PRODUCTION_DEPLOY_ENABLED: 'true' }, wrEvent({ event: 'pull_request' }));
    assert.equal(r.status, 1);
    assert.deepEqual([r.entry[0].decision, r.entry[0].code], ['deny', 'untrusted-event']);
  });
});
