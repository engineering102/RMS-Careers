#!/usr/bin/env node
/**
 * Phase 4: per-app "last verified-deployed SHA" records, kept as GitHub Deployments (see
 * docs/plans/cicd-deployment-tracking-design.md). This module only READS and DECIDES; it contains no Cloudflare code
 * and nothing in it can deploy. The writers (`createRecord`, `setStatus`) talk to the GitHub Deployments API only and
 * are used by a future deploy job.
 *
 * FAIL CLOSED. Anything that makes the last good SHA uncertain (API error, rate limit, truncated pagination, malformed
 * or foreign record, a SHA that is not in the checkout) is an error, never "no baseline" and never "deploy everything".
 * "No baseline" is returned only when a COMPLETE read found no verified-successful record of ours.
 *
 *   node scripts/ci/deploy-tracking.mjs last-good --app web [--repo owner/name]     (read-only; uses GITHUB_TOKEN if set)
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const APPS = ['web', 'admin', 'student'];
export const ENVIRONMENTS = { web: 'production-web', admin: 'production-admin', student: 'production-student' };
export const RECORD_MARKER = 'rms-deploy-record';
export const RECORD_KINDS = ['deploy', 'bootstrap', 'rollback'];
export const TRUSTED_CREATOR = 'github-actions[bot]';
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const FULL_SHA = /^[0-9a-f]{40}$/;
export const VERSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const WORKER_NAMES = { web: 'rms-web', admin: 'rms-admin', student: 'rms-student' };
/**
 * A deploy writes TWO records (spec section 5): an `intent` record before the deploy (it can never carry a version id and
 * can never be a diff base or rollback target) and an `evidence` record after the version was observed and verified
 * (it must carry the version id). Rollback records are evidence by nature. Records without a phase are legacy/rollback.
 */
export const PHASES = ['intent', 'evidence'];
const REPO = /^[\w.-]+\/[\w.-]+$/;
const ATTEMPT = /^[1-9]\d{0,3}$/;

export class TrackingError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}

/** Payload stored with every record. The reader trusts a record only if it matches its own deployment. */
export function recordPayload({ app, sha, runId, runUrl, kind, versionId, phase, repo, runAttempt }) {
  if (!APPS.includes(app)) throw new TrackingError('bad-app', `unknown app "${app}"`);
  if (!FULL_SHA.test(sha ?? '')) throw new TrackingError('bad-sha', 'sha must be a full 40-character lowercase commit SHA');
  if (!RECORD_KINDS.includes(kind)) throw new TrackingError('bad-kind', `kind must be one of ${RECORD_KINDS.join(', ')}`);
  if (versionId !== undefined && !VERSION_ID.test(versionId)) throw new TrackingError('bad-version-id', 'versionId must be a lowercase Cloudflare Worker version UUID');
  if (kind === 'rollback' && versionId === undefined) throw new TrackingError('bad-version-id', 'a rollback record must carry the Worker version it restores');
  if (phase !== undefined) {
    if (!PHASES.includes(phase)) throw new TrackingError('bad-phase', `phase must be one of ${PHASES.join(', ')}`);
    if (phase === 'intent' && (versionId !== undefined || kind === 'rollback')) throw new TrackingError('bad-phase', 'an intent record cannot claim a version id and cannot be a rollback');
    if (phase === 'evidence' && versionId === undefined) throw new TrackingError('bad-phase', 'an evidence record must carry the observed Worker version id');
  }
  if (repo !== undefined && !REPO.test(repo)) throw new TrackingError('bad-repo', 'repo must be owner/name');
  if (runAttempt !== undefined && !ATTEMPT.test(String(runAttempt))) throw new TrackingError('bad-attempt', 'runAttempt must be a positive integer');
  // `versionId` is the exact Cloudflare Worker version this record's SHA is live as. A record without it still moves the
  // diff base (lastGood) but can never be a rollback target and cannot be reconciled with live state.
  return {
    marker: RECORD_MARKER, app, sha, runId: String(runId ?? ''), runUrl: runUrl ?? '', kind,
    ...(versionId !== undefined ? { versionId } : {}),
    ...(phase !== undefined ? { phase, worker: WORKER_NAMES[app] } : {}),
    ...(repo !== undefined ? { repo } : {}),
    ...(runAttempt !== undefined ? { runAttempt: String(runAttempt) } : {})
  };
}

function validRecord(deployment, app) {
  const p = deployment?.payload;
  if (deployment?.creator?.login !== TRUSTED_CREATOR) return 'foreign-creator';
  if (!p || typeof p !== 'object' || p.marker !== RECORD_MARKER) return 'not-a-record';
  if (p.app !== app || deployment.environment !== ENVIRONMENTS[app]) return 'wrong-app';
  if (!FULL_SHA.test(p.sha ?? '') || p.sha !== deployment.sha) return 'sha-mismatch';
  if (!RECORD_KINDS.includes(p.kind)) return 'bad-kind';
  if ('versionId' in p && !(typeof p.versionId === 'string' && VERSION_ID.test(p.versionId))) return 'bad-version-id';
  if (p.kind === 'rollback' && !('versionId' in p)) return 'bad-version-id';
  if ('phase' in p) {
    if (!PHASES.includes(p.phase)) return 'bad-phase';
    if (p.phase === 'intent' && ('versionId' in p || p.kind === 'rollback')) return 'bad-phase';
    if (p.phase === 'evidence' && !('versionId' in p)) return 'bad-phase';
    if (p.worker !== WORKER_NAMES[app]) return 'wrong-worker';
  }
  if ('repo' in p && !(typeof p.repo === 'string' && REPO.test(p.repo))) return 'bad-repo';
  if ('runAttempt' in p && !(typeof p.runAttempt === 'string' && ATTEMPT.test(p.runAttempt))) return 'bad-attempt';
  return null;
}

/**
 * @param {{api: {listDeployments: (env: string, page: number) => Promise<any[]>, listStatuses: (id: number) => Promise<any[]>},
 *          app: string}} opts
 * @returns {Promise<{status: 'found', sha: string, kind: string, deploymentId: number} | {status: 'none', ignored: Record<string, number>}>}
 */
export async function lastGood({ api, app }) {
  if (!APPS.includes(app)) throw new TrackingError('bad-app', `unknown app "${app}"`);
  const { ordered, exhausted } = await listOrdered({ api, app });
  const ignored = {};
  for (const deployment of ordered) {
    const why = validRecord(deployment, app);
    if (why) {
      ignored[why] = (ignored[why] ?? 0) + 1;
      continue;
    }
    if (deployment.payload.phase === 'intent') {
      // An intent record only says "a deploy was attempted". Even a (buggy or forged) success status on it is never a base.
      ignored['intent-record'] = (ignored['intent-record'] ?? 0) + 1;
      continue;
    }
    if (await hasSuccess(api, deployment)) {
      return { status: 'found', sha: deployment.payload.sha, kind: deployment.payload.kind, deploymentId: deployment.id };
    }
  }
  if (!exhausted) throw new TrackingError('unreadable', `more than ${MAX_PAGES * PAGE_SIZE} deployments: refusing to guess`);
  return { status: 'none', ignored };
}

const TERMINAL_STATES = ['success', 'failure', 'error', 'inactive'];

/**
 * Everything rollback needs from the record, read completely or not at all (fail closed). Only valid records of ours count.
 *
 *   records[]      newest first: { deploymentId, sha, kind, versionId?, success, settled }
 *   last           newest record that ever had a success status (the diff base), or null
 *   newest         newest record of any outcome, or null. `settled` is false for an interrupted run
 *   verified       Map versionId -> sha for records that reached success (the only possible rollback targets)
 *   newerVersions  Set of versionIds of records NEWER than `last` that did not succeed (a failed deploy or rollback may or
 *                  may not have gone live, so these are the other versions the Worker is allowed to be running)
 *
 * A versionId tied to two different SHAs anywhere in the history is ambiguous and aborts the read: the version identity is
 * the whole point of the record, so it must be one-to-one.
 */
export async function rollbackHistory({ api, app }) {
  if (!APPS.includes(app)) throw new TrackingError('bad-app', `unknown app "${app}"`);
  const { ordered, exhausted } = await listOrdered({ api, app });
  if (!exhausted) throw new TrackingError('unreadable', `more than ${MAX_PAGES * PAGE_SIZE} deployments: refusing to guess`);
  const records = [];
  for (const deployment of ordered) {
    if (validRecord(deployment, app)) continue;
    const statuses = await readStatuses(api, deployment);
    records.push({
      deploymentId: deployment.id,
      sha: deployment.payload.sha,
      kind: deployment.payload.kind,
      versionId: deployment.payload.versionId,
      phase: deployment.payload.phase,
      descriptions: statuses.map((x) => String(x.description ?? '')),
      success: deployment.payload.phase !== 'intent' && statuses.some((s) => s.state === 'success'),
      settled: statuses.some((s) => TERMINAL_STATES.includes(s.state))
    });
  }
  const shaOf = new Map();
  for (const r of records) {
    if (r.versionId === undefined) continue;
    if (shaOf.has(r.versionId) && shaOf.get(r.versionId) !== r.sha) {
      throw new TrackingError('ambiguous-version', `version ${r.versionId} is recorded for two different commits (${shaOf.get(r.versionId).slice(0, 12)} and ${r.sha.slice(0, 12)})`);
    }
    shaOf.set(r.versionId, r.sha);
  }
  const lastIndex = records.findIndex((r) => r.success);
  const last = lastIndex === -1 ? null : records[lastIndex];
  const verified = new Map(records.filter((r) => r.success && r.versionId !== undefined).map((r) => [r.versionId, r.sha]));
  const newerVersions = new Set(records.slice(0, lastIndex === -1 ? 0 : lastIndex).filter((r) => r.versionId !== undefined).map((r) => r.versionId));
  return { records, last, newest: records[0] ?? null, verified, newerVersions };
}

/**
 * Valid records of ours that never reached a final state (an interrupted run). Read completely or not at all. A deploy
 * that holds the per-app lock may close these as `error`, so a killed run cannot block rollback or hide behind a later one.
 */
export async function unsettledRecords({ api, app }) {
  if (!APPS.includes(app)) throw new TrackingError('bad-app', `unknown app "${app}"`);
  const { ordered, exhausted } = await listOrdered({ api, app });
  if (!exhausted) throw new TrackingError('unreadable', `more than ${MAX_PAGES * PAGE_SIZE} deployments: refusing to guess`);
  const out = [];
  for (const deployment of ordered) {
    if (validRecord(deployment, app)) continue;
    const statuses = await readStatuses(api, deployment);
    if (!statuses.some((s) => TERMINAL_STATES.includes(s.state))) out.push({ deploymentId: deployment.id, sha: deployment.payload.sha, kind: deployment.payload.kind, phase: deployment.payload.phase });
  }
  return out;
}

async function hasSuccess(api, deployment) {
  // auto_inactive turns an old success into "inactive" once a newer success exists, so look at the whole history.
  return (await readStatuses(api, deployment)).some((s) => s.state === 'success');
}

async function readStatuses(api, deployment) {
  let statuses;
  try {
    statuses = await api.listStatuses(deployment.id);
  } catch (err) {
    throw new TrackingError('unreadable', `cannot read statuses of deployment ${deployment.id}: ${err.message}`);
  }
  if (!Array.isArray(statuses)) throw new TrackingError('unreadable', `statuses of deployment ${deployment.id} are not a list`);
  return statuses;
}

async function listOrdered({ api, app }) {
  const environment = ENVIRONMENTS[app];
  const all = [];
  let exhausted = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let batch;
    try {
      batch = await api.listDeployments(environment, page);
    } catch (err) {
      throw new TrackingError('unreadable', `cannot list deployments: ${err.message}`);
    }
    if (!Array.isArray(batch)) throw new TrackingError('unreadable', 'deployments response is not a list');
    all.push(...batch);
    if (batch.length < PAGE_SIZE) {
      exhausted = true;
      break;
    }
  }
  const ordered = [...all].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
  return { ordered, exhausted };
}

/**
 * The Cloudflare version id a `wrangler deploy` produced, from the NDJSON file wrangler writes when
 * WRANGLER_OUTPUT_FILE_PATH is set (entry `{type: "deploy", worker_name, version_id}`; read from wrangler 4.147.0 source:
 * `version_id` is null when wrangler aborted or ran with --dry-run). Exactly one `deploy` entry with a UUID is required;
 * zero, several, null, malformed, or another Worker's entry is an error: the id is the identity of the record.
 * Nothing calls this yet (the deploy workflow does not exist); it pins the capture contract. [assumption] unproven live.
 */
export function versionIdFromWranglerOutput(text, workerName) {
  const deploys = [];
  for (const line of String(text ?? '').split(/\r?\n/).filter((l) => l.trim())) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      throw new TrackingError('bad-output', 'wrangler output file contains a line that is not JSON');
    }
    if (entry?.type === 'deploy') deploys.push(entry);
  }
  if (deploys.length !== 1) throw new TrackingError('bad-output', `expected exactly one deploy entry in the wrangler output, found ${deploys.length}`);
  const [d] = deploys;
  if (d.worker_name !== null && d.worker_name !== undefined && d.worker_name !== workerName) throw new TrackingError('bad-output', `the deploy entry is for Worker "${d.worker_name}", not "${workerName}"`);
  if (typeof d.version_id !== 'string' || !VERSION_ID.test(d.version_id)) throw new TrackingError('bad-output', 'the deploy entry has no valid version_id (wrangler aborted or ran a dry run)');
  return d.version_id;
}

/** Exit code 0 -> true, 1 -> false. Anything else (unknown commit, shallow clone, not a repo) throws. */
export function gitIsAncestor(cwd, ancestor, descendant) {
  for (const sha of [ancestor, descendant]) if (!FULL_SHA.test(sha)) throw new TrackingError('bad-sha', `not a full commit SHA: ${sha}`);
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd, stdio: 'ignore' });
    return true;
  } catch (err) {
    if (err.status === 1) return false;
    throw new TrackingError('git-error', `cannot compare ${ancestor.slice(0, 12)} with ${descendant.slice(0, 12)} (is the clone complete?)`);
  }
}

/**
 * Pure decision. `last` comes from lastGood(); `isAncestor(a, b)` from gitIsAncestor(); `deployableApps` is the result
 * of the classifier run with --base <last.sha> --head <sha>. Never returns "deploy" without a verified reason.
 *
 * @returns {{action: 'deploy'|'skip'|'fail', code: string, reason: string, base: string|null}}
 */
export function decide({ app, sha, last, isAncestor, deployableApps = [], bootstrap = false }) {
  if (!APPS.includes(app)) return { action: 'fail', code: 'bad-app', reason: `unknown app "${app}"`, base: null };
  if (!FULL_SHA.test(sha ?? '')) return { action: 'fail', code: 'bad-sha', reason: 'the commit to deploy is not a full SHA', base: null };
  if (!last || (last.status !== 'found' && last.status !== 'none')) return { action: 'fail', code: 'unreadable', reason: 'the last good SHA could not be determined', base: null };
  if (last.status === 'none') {
    return bootstrap
      ? { action: 'deploy', code: 'bootstrap', reason: 'no verified deployment record exists; explicit bootstrap requested', base: null }
      : { action: 'fail', code: 'no-baseline', reason: 'no verified deployment record exists; run an explicit bootstrap instead of guessing', base: null };
  }
  if (bootstrap) return { action: 'fail', code: 'bootstrap-not-needed', reason: `a verified record already exists (${last.sha.slice(0, 12)}); bootstrap refused`, base: last.sha };
  if (last.sha === sha) return { action: 'skip', code: 'already-deployed', reason: 'this commit is already the last verified deployment', base: last.sha };
  let descendant;
  try {
    descendant = isAncestor(last.sha, sha);
  } catch (err) {
    return { action: 'fail', code: 'git-error', reason: err.message, base: last.sha };
  }
  if (!descendant) {
    let older;
    try {
      older = isAncestor(sha, last.sha);
    } catch (err) {
      return { action: 'fail', code: 'git-error', reason: err.message, base: last.sha };
    }
    return older
      ? { action: 'skip', code: 'superseded', reason: 'a newer commit is already deployed; never going backwards', base: last.sha }
      : { action: 'fail', code: 'diverged', reason: `last good ${last.sha.slice(0, 12)} is not an ancestor of ${sha.slice(0, 12)}`, base: last.sha };
  }
  return deployableApps.includes(app)
    ? { action: 'deploy', code: 'changed', reason: `${app} is affected between ${last.sha.slice(0, 12)} and ${sha.slice(0, 12)}`, base: last.sha }
    : { action: 'skip', code: 'unchanged', reason: `${app} is not affected between ${last.sha.slice(0, 12)} and ${sha.slice(0, 12)}`, base: last.sha };
}

/** Minimal GitHub REST adapter. Nothing else in this module touches the network. */
export function githubApi({ repo, token, fetchImpl = fetch, apiUrl = 'https://api.github.com' }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '')) throw new TrackingError('bad-repo', 'repo must be owner/name');
  const call = async (method, route, body) => {
    const res = await fetchImpl(`${apiUrl}/repos/${repo}${route}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'rms-deploy-tracking/1',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`GitHub API ${method} ${route.split('?')[0]} -> HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  };
  return {
    listDeployments: (environment, page) => call('GET', `/deployments?environment=${encodeURIComponent(environment)}&per_page=${PAGE_SIZE}&page=${page}`),
    listStatuses: (id) => call('GET', `/deployments/${id}/statuses?per_page=100`),
    getEnvironment: (name) => call('GET', `/environments/${encodeURIComponent(name)}`),
    listBranchPolicies: (name) => call('GET', `/environments/${encodeURIComponent(name)}/deployment-branch-policies?per_page=100`),
    createDeployment: ({ sha, environment, payload, description }) =>
      call('POST', '/deployments', { ref: sha, environment, auto_merge: false, required_contexts: [], payload, description, transient_environment: false, production_environment: true }),
    createStatus: (id, { state, description, logUrl }) => call('POST', `/deployments/${id}/statuses`, { state, description, log_url: logUrl, auto_inactive: true })
  };
}

/** Writers for a future deploy job. A record is `success` only after the smoke test passed. */
export async function createRecord(api, { app, sha, runId, runUrl, kind, versionId, phase, repo, runAttempt }) {
  const payload = recordPayload({ app, sha, runId, runUrl, kind, versionId, phase, repo, runAttempt });
  const deployment = await api.createDeployment({ sha, environment: ENVIRONMENTS[app], payload, description: `${kind} ${app} @ ${sha.slice(0, 12)}` });
  if (!deployment?.id) throw new TrackingError('write-failed', 'GitHub did not return a deployment id');
  return deployment.id;
}

export async function setStatus(api, deploymentId, { state, description, logUrl }) {
  if (!['in_progress', 'success', 'failure', 'error', 'inactive'].includes(state)) throw new TrackingError('bad-state', `unsupported state ${state}`);
  await api.createStatus(deploymentId, { state, description: String(description ?? '').slice(0, 140), logUrl });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (command !== 'last-good') throw new Error('usage: deploy-tracking.mjs last-good --app <web|admin|student> [--repo owner/name]');
  const repo = opts.repo ?? process.env.GITHUB_REPOSITORY ?? 'engineering102/RMS-Careers';
  const api = githubApi({ repo, token: process.env.GITHUB_TOKEN });
  const result = await lastGood({ api, app: opts.app });
  process.stdout.write(`${JSON.stringify({ app: opts.app, environment: ENVIRONMENTS[opts.app], ...result }, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error title=${err.code ?? 'error'}::${err.message}\n`);
    process.exit(1);
  });
}
