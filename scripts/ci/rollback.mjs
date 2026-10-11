#!/usr/bin/env node
/**
 * Phase 4 rollback of ONE Worker to a previously verified version (docs/plans/phase-4-production-deployment-spec.md §5).
 *
 *   node scripts/ci/rollback.mjs --app web --version-id <uuid> --reason "<why>" [--dry-run]
 *
 * It is the only code that can run `wrangler rollback`, and it is called only by .github/workflows/rollback.yml. It never
 * builds, never touches a database, and never runs a migration. A rollback restores Worker code and config only; it does
 * not restore Worker secrets or database state (spec §6), so a rollback across a contract migration is the operator's call.
 *
 * IDENTITY. The Cloudflare version id is the identity of a rollback target. It must be recorded (payload.versionId) on a
 * verified-successful deployment record of ours for THIS app; the commit SHA comes from that record. The Worker's own tag and
 * message are only a cross-check and must agree with the record; they are never trusted on their own.
 *
 * FAIL CLOSED. Nothing is changed unless every check below passes, in this order:
 *   1. inputs are well formed; real runs have both Cloudflare variables, dry runs have none
 *   2. the record is readable and complete, has a baseline, its NEWEST record reached a final state, no version id is tied
 *      to two commits, and the last good record carries a version id (else live state cannot be reconciled)
 *   3. the Worker's live deployment is readable and unambiguous (one version at 100%) and is a version the record
 *      allows: the last good version, or the version of a newer failed attempt. Anything else means the Worker was changed
 *      outside the pipeline (or the record is stale) => refuse
 *   4. the target version is not the live one, and has a verified-success record of ours
 *   5. the Worker agrees (version looked up by id under the expected Worker name; tag and message match the record)
 *   6. an `in_progress` rollback record is written BEFORE wrangler runs, then live state is re-read (TOCTOU); if either
 *      fails, nothing is rolled back
 * After wrangler the live version must equal the target AND the production smoke test must pass; only both together are
 * recorded as `rollback-recovered` (success). Every other outcome is a distinct non-success record:
 *   rollback-in-progress  in_progress   written before the change
 *   rollback-failed       failure       wrangler refused; the rollback was not applied
 *   rollback-unverified   failure       applied (or possibly applied) but live state or smoke does not confirm recovery
 *   rollback-aborted      error         stopped before changing anything (record/live-state problem)
 *
 * --dry-run is credential-free: it performs the GitHub reads and checks 1-2, and contacts neither Cloudflare nor
 * GitHub's write APIs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { credentialEnvNames } from './artifact.mjs';
import { APPS, VERSION_ID, createRecord, githubApi, rollbackHistory, setStatus } from './deploy-tracking.mjs';
import { PRODUCTION_URLS, runSmoke } from './smoke.mjs';

export const WORKERS = { web: 'rms-web', admin: 'rms-admin', student: 'rms-student' };
export const RECOVERY = {
  inProgress: 'rollback-in-progress',
  failed: 'rollback-failed',
  unverified: 'rollback-unverified',
  aborted: 'rollback-aborted',
  recovered: 'rollback-recovered'
};
const RUN_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+(\/attempts\/\d+)?$/;
const REASON_MAX = 100;

export class RollbackError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}

export function validateInputs({ app, versionId, reason }) {
  if (!APPS.includes(app)) throw new RollbackError('bad-app', `app must be one of ${APPS.join(', ')}`);
  if (!VERSION_ID.test(versionId ?? '')) throw new RollbackError('bad-version-id', 'version id must be a Worker version UUID (an explicit target is required; "previous" is never guessed)');
  const text = String(reason ?? '').trim();
  // eslint-disable-next-line no-control-regex
  if (text.length === 0 || text.length > REASON_MAX || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new RollbackError('bad-reason', `reason is required, single-line, at most ${REASON_MAX} characters`);
  }
  return { app, versionId, reason: text };
}

/** `wrangler versions view <id> --json`, pinned to the expected Worker name. Read-only. */
export function versionViewArgs(wranglerBin, { app, versionId }) {
  return [wranglerBin, 'versions', 'view', versionId, '--name', WORKERS[app], '--json'];
}

/** `wrangler deployments status --json`: the Worker's current deployment (version ids and traffic split). Read-only. */
export function liveStateArgs(wranglerBin, { app }) {
  return [wranglerBin, 'deployments', 'status', '--name', WORKERS[app], '--json'];
}

/**
 * The exact rollback command. Explicit version id and Worker name; no --env, --var, --routes or --domains.
 * `--config wrangler.jsonc` plus OPEN_NEXT_DEPLOY=true stop wrangler delegating to opennextjs-cloudflare.
 */
export function rollbackArgs(wranglerBin, { app, versionId, reason, runUrl }) {
  if (!RUN_URL.test(runUrl ?? '')) throw new RollbackError('bad-run-url', 'runUrl must be a GitHub Actions run URL');
  return [wranglerBin, 'rollback', versionId, '--name', WORKERS[app], '--config', 'wrangler.jsonc', '--message', `rollback: ${reason} (${runUrl})`, '--yes'];
}

/**
 * Environment for the wrangler child: only what it needs. GITHUB_TOKEN and every other variable stay out, and HOME
 * points at a throwaway directory so no stored login or config can be picked up.
 */
export function wranglerEnv(env, home) {
  const base = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), APPDATA: path.join(home, 'AppData'), WRANGLER_SEND_METRICS: 'false', WRANGLER_HIDE_BANNER: 'true', OPEN_NEXT_DEPLOY: 'true', CI: 'true' };
  for (const k of ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR']) if (env[k]) base[k] = env[k];
  for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) if (env[k]) base[k] = env[k];
  return base;
}

/**
 * The single live version of a Worker from `wrangler deployments status --json` (the latest deployment:
 * `{ versions: [{ version_id, percentage }], ... }`, shape read from wrangler 4.147.0). A gradual rollout (several
 * versions, or less than 100%) or any other shape is ambiguous: a problem, never a guess.
 */
export function parseLive(json) {
  const versions = json?.versions;
  if (!Array.isArray(versions) || versions.length === 0) return { problem: 'deployment has no versions list' };
  if (versions.length !== 1) return { problem: `traffic is split across ${versions.length} versions (gradual deployment): live version is ambiguous` };
  const [v] = versions;
  if (typeof v?.version_id !== 'string' || !VERSION_ID.test(v.version_id)) return { problem: 'live version id is missing or malformed' };
  if (v.percentage !== 100) return { problem: `live version receives ${v.percentage}% of traffic, not 100%` };
  return { versionId: v.version_id };
}

/**
 * Cross-check of the Worker's own metadata against the RECORD (never the other way round). `json` is the raw output of
 * `wrangler versions view --json` (`id` and `annotations`, shape read from wrangler 4.147.0). The record is authoritative:
 * the version id requested must be the id Cloudflare describes, and the tag/message written by `deployArgs`
 * (`sha-<12>`, `<run url> <full sha>`) must agree with the recorded SHA. Missing or ambiguous metadata is a problem.
 */
export function crossCheckVersion(json, versionId, recordedSha, repo) {
  if (!json || typeof json !== 'object') return { problem: 'unparsable version description' };
  if (json.id !== versionId) return { problem: `Cloudflare described version ${json.id ?? '(no id)'}, not ${versionId}` };
  const a = json.annotations ?? {};
  const message = typeof a['workers/message'] === 'string' ? a['workers/message'] : '';
  const tag = typeof a['workers/tag'] === 'string' ? a['workers/tag'] : '';
  const m = /^(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/actions\/runs\/\d+(?:\/attempts\/\d+)?) ([0-9a-f]{40})$/.exec(message);
  if (!m) return { problem: 'version message is not "<run url> <full sha>"' };
  if (repo && m[2].toLowerCase() !== repo.toLowerCase()) return { problem: `version was deployed by a run of ${m[2]}, not ${repo}` };
  if (tag !== `sha-${m[3].slice(0, 12)}`) return { problem: `version tag "${tag}" is missing or disagrees with the SHA in its message` };
  if (m[3] !== recordedSha) return { problem: `Worker metadata says ${m[3].slice(0, 12)} but the deployment record for this version says ${recordedSha.slice(0, 12)}` };
  return { ok: true };
}

/** Checks 2 of the header: everything decidable from GitHub alone. Returns null when the history is usable. */
export function checkHistory(history) {
  if (!history?.last) return { code: 'no-baseline', reason: 'no verified deployment record exists for this app; use the manual emergency rollback' };
  if (!history.newest?.settled) {
    return { code: 'unsettled-history', reason: `the newest deployment record (${history.newest?.kind} ${history.newest?.sha?.slice(0, 12)}, id ${history.newest?.deploymentId}) never reached a final state: a deploy or rollback may have been interrupted, so what is live is unknown` };
  }
  if (history.last.versionId === undefined) return { code: 'unreconcilable', reason: 'the last good record carries no Worker version id, so the live state cannot be reconciled with it; use the manual emergency rollback' };
  return null;
}

/**
 * Pure decision (checks 3-4). `history` from rollbackHistory(); `liveVersionId` from parseLive(). Never returns ok
 * without a live version the record accounts for and a target the record verified.
 */
export function decideRollback({ history, liveVersionId, targetVersionId }) {
  const refusal = checkHistory(history);
  if (refusal) return { ok: false, ...refusal };
  if (!VERSION_ID.test(liveVersionId ?? '')) return { ok: false, code: 'live-unknown', reason: 'the live version is not known' };
  const allowed = new Set([history.last.versionId, ...history.newerVersions]);
  if (!allowed.has(liveVersionId)) {
    return { ok: false, code: 'live-mismatch', reason: `the Worker is running version ${liveVersionId}, which the deployment record does not account for (changed outside the pipeline, or the record is stale)` };
  }
  if (targetVersionId === liveVersionId) return { ok: false, code: 'already-live', reason: `version ${targetVersionId} is already the live version` };
  const sha = history.verified.get(targetVersionId);
  if (!sha) return { ok: false, code: 'unverified-target', reason: `version ${targetVersionId} has no verified-successful deployment record for this app; refusing to roll back to it` };
  return { ok: true, code: 'rollback', sha, reason: `live ${liveVersionId} -> ${targetVersionId} (${sha.slice(0, 12)})` };
}

function resolveWranglerBin(repoRoot, app) {
  const appDir = path.join(repoRoot, 'apps', app);
  const req = createRequire(path.join(appDir, 'package.json'));
  const bin = path.join(path.dirname(req.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  if (!fs.existsSync(bin)) throw new RollbackError('wrangler-missing', 'installed wrangler binary not found');
  return { appDir, bin };
}

/** Default wrangler runner. `args` already contains the wrangler entry point as first element. */
function spawnWrangler({ appDir, env }) {
  return (args) => {
    const res = spawnSync(process.execPath, args, { cwd: appDir, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
    return { status: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  };
}

function readJson(run, args, what) {
  const res = run(args);
  if (res.status !== 0) throw new RollbackError('cloudflare-unreadable', `${what}: wrangler exited with ${res.status}`);
  try {
    return JSON.parse(res.stdout);
  } catch {
    throw new RollbackError('cloudflare-unreadable', `${what}: wrangler did not return JSON`);
  }
}

function readLive(run, wranglerBin, app) {
  const live = parseLive(readJson(run, liveStateArgs(wranglerBin, { app }), 'live deployment'));
  if (live.problem) throw new RollbackError('live-ambiguous', live.problem);
  return live.versionId;
}

/**
 * @param {object} p
 * @param {'web'|'admin'|'student'} p.app
 * @param {string} p.versionId         the rollback target (Cloudflare version id)
 * @param {string} p.reason
 * @param {boolean} p.dryRun           only an explicit `false` is a real run
 * @param {string} p.runUrl            GitHub Actions run URL (recorded in the Worker message and the deployment status)
 * @param {string} p.runId
 * @param {object} p.api               deploy-tracking API adapter
 * @param {NodeJS.ProcessEnv} p.env
 * @param {string} [p.repo]            owner/name; the Worker message must name a run of this repository
 * @param {(args: string[]) => {status: number, stdout: string, stderr: string}} [p.runWrangler]
 * @param {string} [p.wranglerBin]
 * @param {typeof runSmoke} [p.smoke]
 */
export async function runRollback({ app, versionId, reason, dryRun, runUrl, runId, api, env, repo, runWrangler, wranglerBin = '<wrangler>', smoke = runSmoke, smokeOptions = {} }) {
  const input = validateInputs({ app, versionId, reason });
  // Fail safe: only an explicit `false` is a real run. Missing, undefined, 'false', 0 ... all mean rehearsal.
  const real = dryRun === false;
  const present = credentialEnvNames(env);
  if (!real) {
    if (present.length) throw new RollbackError('credentials-present', `refusing a dry run: Cloudflare/Wrangler variables are set (${present.join(', ')}). The rehearsal must be credential-free.`);
  } else if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new RollbackError('missing-credentials', 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are both required for a real rollback');
  }
  const command = rollbackArgs(wranglerBin, { ...input, runUrl });

  // History checks that need no Cloudflare access. The rehearsal runs exactly these, so a green rehearsal means the
  // GitHub side of a real run can pass; it cannot say anything about the live state or the target version.
  const history = await rollbackHistory({ api, app });
  const refusal = checkHistory(history);
  if (refusal) throw new RollbackError(refusal.code, refusal.reason);
  if (!real) {
    return {
      ok: true, dryRun: true, app, last: history.last, newest: history.newest, verifiedVersions: history.verified.size, targetRecorded: history.verified.has(versionId), command: command.slice(1),
      note: 'Cloudflare was not contacted: the live-state reconciliation, the version cross-check and the rollback itself need the token and were skipped.'
    };
  }

  const liveBefore = readLive(runWrangler, wranglerBin, app);
  const decision = decideRollback({ history, liveVersionId: liveBefore, targetVersionId: versionId });
  if (!decision.ok) throw new RollbackError(decision.code, decision.reason);
  const targetSha = decision.sha;
  const check = crossCheckVersion(readJson(runWrangler, versionViewArgs(wranglerBin, input), 'target version'), versionId, targetSha, repo);
  if (check.problem) throw new RollbackError('metadata-mismatch', check.problem);

  // The record is written BEFORE the change. If it cannot be, nothing is rolled back.
  const deploymentId = await createRecord(api, { app, sha: targetSha, runId, runUrl, kind: 'rollback', versionId });
  const short = targetSha.slice(0, 12);
  // From here every failure is written to the record on a best-effort basis; the original error is never masked.
  const settle = async (state, description) => {
    try {
      await setStatus(api, deploymentId, { state, description, logUrl: runUrl });
      return '';
    } catch (err) {
      return ` (and the "${state}" record could not be written: ${err.message})`;
    }
  };
  const abort = async (code, message) => {
    throw new RollbackError(code, `${message}${await settle('error', `${RECOVERY.aborted}: ${message}`)}`);
  };
  try {
    await setStatus(api, deploymentId, { state: 'in_progress', description: `${RECOVERY.inProgress}: ${app} to ${short} (${versionId})`, logUrl: runUrl });
  } catch (err) {
    await abort('record-failed', `cannot write the in_progress record; nothing was rolled back: ${err.message}`);
  }

  // Re-read live state now that the record exists (the lock prevents our own deploys; this narrows the window for anything else).
  let liveNow;
  try {
    liveNow = readLive(runWrangler, wranglerBin, app);
  } catch (err) {
    await abort('live-unreadable', `${err.message}; nothing was rolled back`);
  }
  if (liveNow !== liveBefore) await abort('live-changed', `the live version changed from ${liveBefore} to ${liveNow} while the rollback was being prepared; nothing was rolled back`);

  const rolled = runWrangler(command);
  if (rolled.status !== 0) {
    throw new RollbackError('rollback-failed', `wrangler rollback exited with ${rolled.status}; the rollback was not applied${await settle('failure', `${RECOVERY.failed}: wrangler exited with ${rolled.status}`)}`);
  }

  // Applied. From here a non-success is "unverified", never "failed": the Worker may be running the target.
  let liveAfter;
  try {
    liveAfter = readLive(runWrangler, wranglerBin, app);
  } catch (err) {
    throw new RollbackError('rollback-unverified', `${err.message}${await settle('failure', `${RECOVERY.unverified}: live state unreadable after rollback`)}`);
  }
  if (liveAfter !== versionId) {
    throw new RollbackError('rollback-unverified', `after the rollback the live version is ${liveAfter}, not ${versionId}${await settle('failure', `${RECOVERY.unverified}: live is ${liveAfter}`)}`);
  }
  let result;
  try {
    result = await smoke({ app, baseUrl: PRODUCTION_URLS[app], ...smokeOptions });
  } catch (err) {
    throw new RollbackError('rollback-unverified', `the smoke test could not run after the rollback: ${err.message}${await settle('failure', `${RECOVERY.unverified}: smoke test could not run`)}`);
  }
  // success moves the diff base to the rolled-back commit; a failed smoke leaves the base where it was (safe, conservative).
  await setStatus(api, deploymentId, result.ok
    ? { state: 'success', description: `${RECOVERY.recovered}: ${app} is on ${short} (${versionId}); live version and smoke verified`, logUrl: runUrl }
    : { state: 'failure', description: `${RECOVERY.unverified}: ${app} is on ${short}; SMOKE FAILED`, logUrl: runUrl });
  return { ok: result.ok, dryRun: false, app, from: liveBefore, to: versionId, sha: targetSha, deploymentId, smoke: result };
}

const VALUE_OPTIONS = ['app', 'version-id', 'reason'];
const FLAG_OPTIONS = ['dry-run'];

/** Strict: value options always consume the next argument (even one starting with "--"); unknown options are errors. */
export function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const key = a.slice(2);
    if (FLAG_OPTIONS.includes(key)) opts[key] = 'true';
    else if (VALUE_OPTIONS.includes(key)) {
      if (i + 1 >= argv.length) throw new Error(`--${key} needs a value`);
      opts[key] = argv[++i];
    } else throw new Error(`unknown option ${a}`);
  }
  return opts;
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const opts = parseArgs(process.argv.slice(2));
  // The CLI is a real run only when --dry-run is absent; runRollback itself treats anything but an explicit false as a rehearsal.
  const dryRun = opts['dry-run'] === 'true';
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (!repo || !runId) throw new RollbackError('not-in-actions', 'GITHUB_REPOSITORY and GITHUB_RUN_ID are required (this runs in GitHub Actions only)');
  const attempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
  const runUrl = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repo}/actions/runs/${runId}/attempts/${attempt}`;
  const api = githubApi({ repo, token: process.env.GITHUB_TOKEN });
  const { appDir, bin } = resolveWranglerBin(repoRoot, opts.app);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-rollback-home-'));
  try {
    const result = await runRollback({
      app: opts.app, versionId: opts['version-id'], reason: opts.reason, dryRun, runUrl, runId, api, env: process.env, wranglerBin: bin,
      repo, runWrangler: spawnWrangler({ appDir, env: wranglerEnv(process.env, home) })
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.dryRun
        ? `### ${opts.app}: rollback rehearsal ok\n- recorded last good: \`${result.last.sha}\`${result.last.versionId ? ` (version \`${result.last.versionId}\`)` : ''}; newest record settled\n- ${result.verifiedVersions} verified version(s); requested version ${result.targetRecorded ? 'has' : 'has NO'} a verified record\n- ${result.note}\n- nothing was changed\n`
        : `### ${opts.app}: rollback ${result.ok ? RECOVERY.recovered : `${RECOVERY.unverified} (smoke failed)`}\n- live \`${result.from}\` -> \`${result.to}\` (commit \`${result.sha}\`)\n`);
    }
    if (!result.ok) process.exitCode = 1;
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error title=${err.code ?? 'error'}::${String(err.message).replace(/\r?\n/g, ' ')}\n`);
    process.exit(1);
  });
}
