#!/usr/bin/env node
/**
 * Phase 4 deploy gate (docs/plans/phase-4-production-deployment-spec.md section 3). First job of deploy.yml; it holds NO
 * credential and only READS GitHub. It decides whether this run may proceed and for exactly which commit.
 *
 *   node scripts/ci/deploy-gate.mjs        (environment-driven; writes $GITHUB_OUTPUT and the step summary)
 *
 * EXACT SHA. For a `workflow_run` trigger the commit is `workflow_run.head_sha` (the commit CI actually ran on), NEVER
 * `GITHUB_SHA`, which in that event is the default-branch tip. For `workflow_dispatch` the commit is the dispatched `main`
 * tip. Either way the commit must then pass ALL of:
 *   1. the trigger is trusted: CI workflow (ci.yml), event push, branch main, this repository (no fork), concluded success.
 *      A real (non-rehearsal) deploy additionally needs PRODUCTION_DEPLOY_ENABLED to be exactly "true".
 *   2. ONE trusted CI workflow run exists for that exact SHA (workflow run API: ci.yml, event push, branch main, this
 *      repository, head_sha equal); it is completed/success; and in the jobs of its LATEST ATTEMPT exactly one job named
 *      `ci-gate` exists, belongs to that run and SHA, and is completed/success. For workflow_run the run must be the
 *      triggering run and still be on the attempt that triggered this deploy (a later re-run makes the trigger stale).
 *   3. the commit is an ancestor of (or equal to) the current origin/main tip
 * Every outcome (allow, skip, deny) prints one `deploy-gate: {json}` line (see decisionLine) so the step log explains the decision.
 * Anything missing, ambiguous, unreadable, truncated or for another SHA fails the job. The one benign non-proceed is a CI run
 * that did not succeed, and automatic runs while the switch is off (reported, not an error).
 *
 * WHY RUNS AND JOBS, NOT THE CHECK-RUNS LIST. `ci-gate` is a job of ci.yml; its check run is created by GitHub Actions. The
 * check-runs list has no documented per-attempt semantics (what `filter=latest` returns after a re-run is not specified), and
 * any GitHub App can create a check named `ci-gate`. The workflow-run and job APIs are attempt-precise and only describe
 * Actions runs of this repository. [assumption] the field names below are the documented REST shapes (workflow run:
 * id, name, path, event, head_branch, head_sha, run_attempt, status, conclusion, repository, head_repository; job: id,
 * run_id, run_attempt, head_sha, name, status, conclusion) and are unproven against the live API until a first run; the
 * unit tests use fixtures of those documented shapes.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APPS, gitIsAncestor } from './deploy-tracking.mjs';

export const CI_WORKFLOW = { name: 'CI', path: '.github/workflows/ci.yml', file: 'ci.yml', job: 'ci-gate', branch: 'main' };
const FULL_SHA = /^[0-9a-f]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const PAGE = 100;

export class GateError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}

const bool = (raw, name) => {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new GateError('bad-input', `${name} must be exactly "true" or "false" (got "${raw}")`);
};

/**
 * The master switch for REAL production deploys. Default is off: only the exact string "true" turns it on. Unset or empty is
 * "off"; anything else (TRUE, 1, yes, ...) is "off" and reported as malformed so the typo is visible, never guessed.
 */
export function deploySwitch(raw) {
  if (raw === 'true') return { enabled: true };
  if (raw === undefined || raw === '' || raw === 'false') return { enabled: false, reason: 'the repository variable PRODUCTION_DEPLOY_ENABLED is not "true"' };
  return { enabled: false, reason: `PRODUCTION_DEPLOY_ENABLED has the malformed value "${String(raw).slice(0, 20)}" (it must be exactly "true" to enable; treated as off)` };
}

/**
 * Pure. Decide what the trigger asks for, or throw. Returns { proceed:false, reason } only for the benign cases.
 * @param {{eventName: string, event: object, ref: string, githubSha: string, repo: string, inputs: Record<string,string>,
 *          enabled: string|undefined}} p
 */
export function evaluateTrigger({ eventName, event, ref, githubSha, repo, inputs = {}, enabled }) {
  if (!REPO.test(repo ?? '')) throw new GateError('bad-repo', 'GITHUB_REPOSITORY is missing or malformed');
  const sw = deploySwitch(enabled);
  if (eventName === 'workflow_run') {
    const wr = event?.workflow_run;
    if (!wr || typeof wr !== 'object') throw new GateError('bad-event', 'workflow_run payload is missing');
    if (event.action !== undefined && event.action !== 'completed') throw new GateError('bad-event', `unexpected workflow_run action "${event.action}"`);
    if (wr.name !== CI_WORKFLOW.name || String(wr.path ?? '').split('@')[0] !== CI_WORKFLOW.path) throw new GateError('untrusted-workflow', `triggering workflow is "${wr.name}" (${wr.path}), not ${CI_WORKFLOW.name} (${CI_WORKFLOW.path})`);
    if (wr.event !== 'push') throw new GateError('untrusted-event', `triggering run event is "${wr.event}", not push`);
    if (wr.head_branch !== CI_WORKFLOW.branch) throw new GateError('not-main', `triggering run branch is "${wr.head_branch}", not ${CI_WORKFLOW.branch}`);
    if (wr.head_repository?.full_name !== repo || wr.repository?.full_name !== repo) throw new GateError('untrusted-repository', 'the triggering run is not from this repository (fork?)');
    if (!FULL_SHA.test(wr.head_sha ?? '')) throw new GateError('bad-sha', 'workflow_run.head_sha is not a full commit SHA');
    if (!Number.isInteger(wr.id) || !Number.isInteger(wr.run_attempt) || wr.run_attempt < 1) throw new GateError('bad-event', 'workflow_run.id / run_attempt are missing');
    if (wr.status !== 'completed') throw new GateError('bad-event', `triggering run status is "${wr.status}", not completed`);
    if (wr.conclusion !== 'success') return { proceed: false, reason: `CI concluded "${wr.conclusion}", not success: nothing to deploy`, sha: wr.head_sha };
    if (!sw.enabled) return { proceed: false, reason: `automatic production deploys are disabled: ${sw.reason}`, sha: wr.head_sha };
    return { proceed: true, source: 'workflow_run', sha: wr.head_sha, triggeringRun: { id: wr.id, attempt: wr.run_attempt }, apps: [...APPS], bootstrap: false, dryRun: false };
  }
  if (eventName === 'workflow_dispatch') {
    if (ref !== 'refs/heads/main') throw new GateError('not-main', `a deployment may only be dispatched from main (this run is on ${ref})`);
    if (!FULL_SHA.test(githubSha ?? '')) throw new GateError('bad-sha', 'GITHUB_SHA is not a full commit SHA');
    const app = inputs.app;
    if (app !== 'all' && !APPS.includes(app)) throw new GateError('bad-input', `app must be all, ${APPS.join(', ')}`);
    const bootstrap = bool(inputs.bootstrap, 'bootstrap');
    const dryRun = bool(inputs.dry_run, 'dry_run');
    if (bootstrap && app === 'all') throw new GateError('bootstrap-needs-one-app', 'a bootstrap deploys exactly one app at a time: choose web, admin or student');
    // A rehearsal never needs the switch; a REAL deploy always does, however it was started.
    if (!dryRun && !sw.enabled) throw new GateError('deploy-disabled', `a real deployment was requested but ${sw.reason}`);
    return { proceed: true, source: 'workflow_dispatch', sha: githubSha, triggeringRun: null, apps: app === 'all' ? [...APPS] : [app], bootstrap, dryRun };
  }
  throw new GateError('bad-event', `unsupported event "${eventName}"`);
}

/** A workflow run is trusted only if it is CI's push-on-main run of THIS repository for exactly `sha`. */
export function trustedCiRun(run, sha, repo) {
  return (
    run?.name === CI_WORKFLOW.name &&
    String(run.path ?? '').split('@')[0] === CI_WORKFLOW.path &&
    run.event === 'push' &&
    run.head_branch === CI_WORKFLOW.branch &&
    run.head_sha === sha &&
    run.repository?.full_name === repo &&
    run.head_repository?.full_name === repo &&
    Number.isInteger(run.id) &&
    Number.isInteger(run.run_attempt) &&
    run.run_attempt >= 1
  );
}

/**
 * Async. `api` = { getRun(id) -> run, listCiRuns(sha) -> {total_count, workflow_runs}, listJobs(runId, attempt) -> {total_count, jobs} }.
 * Throws unless exactly one trusted, green CI run exists for `sha` whose latest attempt has exactly one green `ci-gate` job.
 */
export async function evaluateCiGate({ api, sha, repo, triggeringRun = null }) {
  if (!FULL_SHA.test(sha ?? '')) throw new GateError('bad-sha', 'not a full commit SHA');
  const read = async (what, fn) => {
    try {
      return await fn();
    } catch (err) {
      throw new GateError('unreadable', `cannot read ${what}: ${err.message}`);
    }
  };
  let run;
  if (triggeringRun) {
    run = await read(`workflow run ${triggeringRun.id}`, () => api.getRun(triggeringRun.id));
    if (!trustedCiRun(run, sha, repo) || run.id !== triggeringRun.id) throw new GateError('untrusted-run', `workflow run ${triggeringRun.id} is not CI's push-on-main run of ${CI_WORKFLOW.path} for ${sha.slice(0, 12)} in this repository`);
    if (run.run_attempt !== triggeringRun.attempt) throw new GateError('stale-trigger', `the run was re-run: this deploy was triggered by attempt ${triggeringRun.attempt} but the run is now on attempt ${run.run_attempt}; the newer attempt will trigger its own deploy`);
  } else {
    const listed = await read('the CI runs of this commit', () => api.listCiRuns(sha));
    if (!Array.isArray(listed?.workflow_runs) || !Number.isInteger(listed.total_count)) throw new GateError('unreadable', 'workflow-runs response has an unexpected shape');
    if (listed.total_count > listed.workflow_runs.length || listed.workflow_runs.length >= PAGE) throw new GateError('unreadable', 'too many CI runs for one commit to read in one page: refusing to guess');
    const trusted = listed.workflow_runs.filter((r) => trustedCiRun(r, sha, repo));
    if (trusted.length === 0) throw new GateError('missing', `no trusted CI run (push on main, ${CI_WORKFLOW.path}) exists for ${sha.slice(0, 12)} (${listed.workflow_runs.length} other run(s) ignored)`);
    if (trusted.length > 1) throw new GateError('ambiguous', `${trusted.length} trusted CI runs exist for ${sha.slice(0, 12)} (${trusted.map((r) => r.id).join(', ')}): refusing to pick one`);
    // re-read by id so the decision rests on the run object itself, not on a list entry
    run = await read(`workflow run ${trusted[0].id}`, () => api.getRun(trusted[0].id));
    if (!trustedCiRun(run, sha, repo) || run.id !== trusted[0].id) throw new GateError('untrusted-run', `workflow run ${trusted[0].id} changed while it was being read`);
  }
  if (run.status !== 'completed' || run.conclusion !== 'success') throw new GateError('not-green', `the CI run ${run.id} is ${run.status}/${run.conclusion} on attempt ${run.run_attempt}, not completed/success`);
  const jobsPage = await read(`the jobs of run ${run.id} attempt ${run.run_attempt}`, () => api.listJobs(run.id, run.run_attempt));
  if (!Array.isArray(jobsPage?.jobs) || !Number.isInteger(jobsPage.total_count)) throw new GateError('unreadable', 'jobs response has an unexpected shape');
  if (jobsPage.total_count > jobsPage.jobs.length || jobsPage.jobs.length >= PAGE) throw new GateError('unreadable', 'too many jobs to read in one page: refusing to guess');
  const gates = jobsPage.jobs.filter((j) => j?.name === CI_WORKFLOW.job);
  if (gates.length === 0) throw new GateError('missing', `attempt ${run.run_attempt} of CI run ${run.id} has no job named ${CI_WORKFLOW.job}`);
  if (gates.length > 1) throw new GateError('ambiguous', `attempt ${run.run_attempt} of CI run ${run.id} has ${gates.length} jobs named ${CI_WORKFLOW.job}`);
  const [job] = gates;
  if (job.run_id !== run.id || job.run_attempt !== run.run_attempt || job.head_sha !== sha) {
    throw new GateError('wrong-job', `the ${CI_WORKFLOW.job} job belongs to run ${job.run_id} attempt ${job.run_attempt} commit ${String(job.head_sha).slice(0, 12)}, not run ${run.id} attempt ${run.run_attempt} commit ${sha.slice(0, 12)}`);
  }
  if (job.status !== 'completed' || job.conclusion !== 'success') throw new GateError('not-green', `${CI_WORKFLOW.job} is ${job.status}/${job.conclusion}, not completed/success`);
  return { runId: run.id, attempt: run.run_attempt, jobId: job.id };
}

/** Minimal GitHub REST reader (GET only). Permissions needed: `actions: read`. */
export function githubReader({ repo, token, fetchImpl = fetch, apiUrl = 'https://api.github.com' }) {
  if (!REPO.test(repo ?? '')) throw new GateError('bad-repo', 'repo must be owner/name');
  const get = async (route) => {
    const res = await fetchImpl(`${apiUrl}/repos/${repo}${route}`, {
      headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'rms-deploy-gate/1', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`GitHub API GET ${route.split('?')[0]} -> HTTP ${res.status}`);
    return res.json();
  };
  return {
    getRun: (id) => get(`/actions/runs/${id}`),
    listCiRuns: (sha) => get(`/actions/workflows/${CI_WORKFLOW.file}/runs?head_sha=${sha}&event=push&branch=${CI_WORKFLOW.branch}&exclude_pull_requests=true&per_page=${PAGE}`),
    listJobs: (runId, attempt) => get(`/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=${PAGE}`)
  };
}

/** The commit must be reachable from the current origin/main tip. Needs a full clone (fetch-depth: 0). */
export function assertOnMain(root, sha, isAncestor = gitIsAncestor) {
  let tip;
  try {
    tip = execFileSync('git', ['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    throw new GateError('git-error', 'origin/main is not available in this checkout (is it a full clone?)');
  }
  let ok;
  try {
    ok = isAncestor(root, sha, tip);
  } catch (err) {
    throw new GateError('git-error', err.message);
  }
  if (!ok) throw new GateError('not-on-main', `${sha.slice(0, 12)} is not an ancestor of origin/main (${tip.slice(0, 12)})`);
  return tip;
}

/**
 * One concise, structured, non-sensitive log line that explains a gate decision (the job summary is not part of the step log).
 * It carries only the commit SHA, the app scope, the mode flags, CI run/attempt/job ids and a reason; never an environment
 * value, token or secret. `decision` is allow (proceed), skip (benign non-proceed) or deny (the run fails).
 */
export function decisionLine({ decision, source, sha, apps, bootstrap, dryRun, ciRun, reason, code }) {
  const clean = (v) => String(v).replace(/\s+/g, ' ').slice(0, 300);
  const entry = {
    decision,
    ...(source ? { source } : {}),
    ...(sha ? { sha } : {}),
    ...(apps ? { apps } : {}),
    ...(bootstrap !== undefined ? { bootstrap } : {}),
    ...(dryRun !== undefined ? { dryRun } : {}),
    ...(ciRun ? { ciRun: ciRun.runId, attempt: ciRun.attempt, ciGateJob: ciRun.jobId } : {}),
    ...(code ? { code } : {}),
    ...(reason ? { reason: clean(reason) } : {})
  };
  return `deploy-gate: ${JSON.stringify(entry)}`;
}

async function main() {
  const env = process.env;
  const repo = env.GITHUB_REPOSITORY;
  const event = env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const out = (kv) => env.GITHUB_OUTPUT && fs.appendFileSync(env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}
`).join(''));
  const summary = (md) => env.GITHUB_STEP_SUMMARY && fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${md}
`);
  const log = (entry) => process.stdout.write(`${decisionLine(entry)}
`);
  const source = env.GITHUB_EVENT_NAME;
  let trigger;
  try {
    trigger = evaluateTrigger({
      eventName: env.GITHUB_EVENT_NAME, event, ref: env.GITHUB_REF, githubSha: env.GITHUB_SHA, repo,
      inputs: { app: env.INPUT_APP, bootstrap: env.INPUT_BOOTSTRAP, dry_run: env.INPUT_DRY_RUN }, enabled: env.PRODUCTION_DEPLOY_ENABLED
    });
  } catch (err) {
    log({ decision: 'deny', source, code: err.code, reason: err.message });
    throw err;
  }
  if (!trigger.proceed) {
    out({ proceed: 'false', sha: trigger.sha ?? '', apps: '[]', bootstrap: 'false', dry_run: 'true' });
    summary(`### Deploy gate: not proceeding
- ${trigger.reason}`);
    log({ decision: 'skip', source, sha: trigger.sha, reason: trigger.reason });
    process.stdout.write(`::notice title=deploy-gate::${trigger.reason}
`);
    return;
  }
  const scope = { source: trigger.source, sha: trigger.sha, apps: trigger.apps, bootstrap: trigger.bootstrap, dryRun: trigger.dryRun };
  const root = path.resolve(env.GITHUB_WORKSPACE ?? '.');
  let green;
  try {
    assertOnMain(root, trigger.sha);
    green = await evaluateCiGate({ api: githubReader({ repo, token: env.GITHUB_TOKEN }), sha: trigger.sha, repo, triggeringRun: trigger.triggeringRun });
  } catch (err) {
    log({ decision: 'deny', ...scope, code: err.code, reason: err.message });
    throw err;
  }
  out({ proceed: 'true', sha: trigger.sha, apps: JSON.stringify(trigger.apps), bootstrap: String(trigger.bootstrap), dry_run: String(trigger.dryRun) });
  summary(`### Deploy gate: passed
- commit \`${trigger.sha}\` (${trigger.source}), CI run ${green.runId} attempt ${green.attempt}, job ${CI_WORKFLOW.job} (${green.jobId}) succeeded
- apps: ${trigger.apps.join(', ')}; bootstrap: ${trigger.bootstrap}; dry run: ${trigger.dryRun}`);
  log({ decision: 'allow', ...scope, ciRun: green });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error title=${err.code ?? 'error'}::${String(err.message).replace(/\r?\n/g, ' ')}\n`);
    process.exit(1);
  });
}
