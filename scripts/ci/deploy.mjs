#!/usr/bin/env node
/**
 * Phase 4 production deploy of ONE app's already-built, already-verified artifact
 * (docs/plans/phase-4-production-deployment-spec.md sections 2-5). Called only by .github/workflows/deploy-app.yml.
 *
 *   node scripts/ci/deploy.mjs plan --app web --sha <full sha> [--bootstrap]
 *   node scripts/ci/deploy.mjs run  --app web --sha <full sha> --mode deploy|bootstrap --artifact-dir <dir>
 *                                   --expect-manifest-sha256 <app:hex> [--dry-run]
 *
 * It never builds (no cf:build, no `opennextjs-cloudflare`, no `pnpm deploy`), never touches a database and never runs a
 * migration. The only thing it can change on Cloudflare is the one `wrangler deploy` of the extracted artifact.
 *
 * FAIL CLOSED. `run` changes nothing unless, in order:
 *   1. inputs are well formed; real runs have both Cloudflare variables, rehearsals have none
 *   2. the artifact is re-verified HERE against values from outside the artifact (manifest digest, commit, run id, worker)
 *      and its extracted tree still matches the inventory exactly
 *   3. under the per-app lock the deploy decision is made again from the record: readable history, a baseline (or an
 *      explicit bootstrap), the recorded last good SHA is a strict ancestor of this commit, and the app is affected
 *      between the two ("superseded" and "unchanged" succeed without deploying)
 *   4. interrupted records are closed, then an INTENT record is written (no version id) and set in_progress BEFORE wrangler
 * After `wrangler deploy`, an exit code of zero proves nothing by itself. The deployment is only CONFIRMED when
 *   a. wrangler's output file holds exactly one deploy entry with a valid version id
 *   b. Cloudflare reports exactly that version live at 100% (`wrangler deployments status --json`)
 *   c. the version's own tag/message match this commit and run (`wrangler versions view --json`)
 * and only then is the EVIDENCE record (carrying the verified version id) written, the intent record closed as
 * `inactive`, and the production smoke test run. Evidence is `success` only if the smoke test passes. Any earlier failure
 * leaves NO evidence record and closes the intent as failure/error: a version that could not be verified is never claimed.
 *
 * --dry-run is credential-free and writes nothing: it performs steps 1-3, builds the exact deploy command, and runs
 * `wrangler deploy --dry-run` on the extracted tree.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { credentialEnvNames, deployArgs, dryRunDeploy, parseExpectedDigest, verifyExtractedTree } from './artifact.mjs';
import { detect } from './affected.mjs';
import { deploySwitch } from './deploy-gate.mjs';
import { APPS, ENVIRONMENTS, WORKER_NAMES, createRecord, decide, githubApi, gitIsAncestor, lastGood, rollbackHistory, setStatus, unsettledRecords, versionIdFromWranglerOutput } from './deploy-tracking.mjs';
import { crossCheckVersion, liveStateArgs, parseLive, versionViewArgs, wranglerEnv } from './rollback.mjs';
import { PRODUCTION_URLS, runSmoke } from './smoke.mjs';

/** Status description prefixes: how a record is told apart without parsing prose. */
export const DEPLOY = {
  intent: 'deploy-intent',
  evidence: 'deploy-evidence',
  failed: 'deploy-failed',
  unverified: 'deploy-unverified',
  superseded: 'deploy-superseded',
  interrupted: 'deploy-interrupted',
  smokeFailed: 'deploy-smoke-failed',
  verified: 'deploy-verified'
};
const FULL_SHA = /^[0-9a-f]{40}$/;
const REPO = /^[\w.-]+\/[\w.-]+$/;
const MODES = ['deploy', 'bootstrap'];

export class DeployError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}

/** Remove any secret value from text that is about to be logged. */
export function redact(text, secrets) {
  let out = String(text ?? '');
  for (const s of secrets) if (s && String(s).length >= 8) out = out.split(String(s)).join('***');
  return out;
}

const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Re-verify the downloaded artifact in THIS job against values that come from outside it. Throws on any difference.
 * The extracted tree is re-scanned against the inventory, so a change made after `artifact.mjs verify` is caught here.
 */
export async function recheckArtifact({ app, sha, runId, runAttempt, repo, artifactDir, appDir, root, expectDigest, verifyTree = verifyExtractedTree }) {
  const parsed = parseExpectedDigest(app, expectDigest);
  if (parsed.problem) throw new DeployError(parsed.problem.code, parsed.problem.message);
  let manifestText;
  let inventoryText;
  try {
    manifestText = fs.readFileSync(path.join(artifactDir, 'manifest.json'));
    inventoryText = fs.readFileSync(path.join(artifactDir, 'inventory.json'));
  } catch (err) {
    throw new DeployError('unreadable-artifact', `cannot read manifest/inventory: ${err.message}`);
  }
  if (sha256Hex(manifestText) !== parsed.manifestSha256) throw new DeployError('expected-digest-mismatch', 'manifest.json does not match the digest handed over by the build job');
  let manifest;
  let inventory;
  try {
    manifest = JSON.parse(manifestText.toString('utf8'));
    inventory = JSON.parse(inventoryText.toString('utf8'));
  } catch {
    throw new DeployError('unreadable-artifact', 'manifest/inventory are not JSON');
  }
  if (manifest.app !== app) throw new DeployError('app-mismatch', `artifact is for "${manifest.app}", not "${app}"`);
  if (manifest.worker !== WORKER_NAMES[app]) throw new DeployError('worker-name-mismatch', `artifact targets "${manifest.worker}", expected ${WORKER_NAMES[app]}`);
  if (manifest.source?.sha !== sha) throw new DeployError('source-sha-mismatch', `artifact was built from ${manifest.source?.sha}, not ${sha}`);
  if (String(manifest.source?.runId) !== String(runId)) throw new DeployError('run-id-mismatch', `artifact was built in run ${manifest.source?.runId}, not ${runId}`);
  if (repo !== undefined && String(manifest.source?.repository ?? '').toLowerCase() !== String(repo).toLowerCase()) throw new DeployError('repository-mismatch', `artifact was built by repository "${manifest.source?.repository}", not "${repo}"`);
  if (runAttempt !== undefined) {
    // A re-run of only the deploy job reuses the build of an earlier attempt, so the build attempt may be older, never newer.
    const built = Number(manifest.source?.runAttempt);
    if (!Number.isInteger(built) || built < 1 || built > Number(runAttempt)) throw new DeployError('run-attempt-mismatch', `artifact was built on attempt "${manifest.source?.runAttempt}", which is not an attempt of this run (now on ${runAttempt})`);
  }
  if (sha256Hex(inventoryText) !== manifest.inventory?.sha256) throw new DeployError('inventory-digest-mismatch', 'inventory.json does not match the manifest');
  const tree = await verifyTree({ appDir, repoRoot: root, manifest, inventory });
  if (tree.problems.length) {
    throw new DeployError('artifact-tree-changed', `the extracted tree no longer matches the inventory: ${tree.problems.slice(0, 5).map((p) => p.code).join(', ')}${tree.problems.length > 5 ? ', ...' : ''}`);
  }
  return { manifest, inventory };
}

/**
 * A job that names a GitHub Environment which does not exist makes GitHub create it WITHOUT protection, and repository code
 * cannot tell from inside the job whether an approval happened. So before anything privileged, read the Environment and
 * refuse unless it has (1) at least one required-reviewers rule and (2) a custom deployment-branch policy that allows
 * exactly `main`. A missing or unreadable Environment is a refusal, never a pass. Needs the token scope `actions: read`.
 * [assumption] the REST shapes (protection_rules[].type/reviewers, deployment_branch_policy.custom_branch_policies,
 * branch_policies[].name) are the documented ones and are unproven against the live API until a first run.
 */
export async function checkEnvironment({ api, app }) {
  const name = ENVIRONMENTS[app];
  let env;
  try {
    env = await api.getEnvironment(name);
  } catch (err) {
    const hint = /HTTP 404/.test(err.message)
      ? 'it does not exist: create it with required reviewers and a main-only branch policy BEFORE deploying (a job that names a missing Environment would otherwise run unprotected)'
      : 'check that the token has "actions: read"';
    throw new DeployError('environment-unreadable', `cannot read GitHub Environment ${name}: ${err.message}; ${hint}`);
  }
  if (env?.name !== name) throw new DeployError('environment-unreadable', `GitHub returned Environment "${env?.name}", expected "${name}"`);
  const reviewerRules = (env.protection_rules ?? []).filter((r) => r?.type === 'required_reviewers' && Array.isArray(r.reviewers) && r.reviewers.length > 0);
  if (reviewerRules.length === 0) throw new DeployError('environment-unprotected', `Environment ${name} has no required reviewers: a deployment would not wait for approval`);
  if (env.deployment_branch_policy?.custom_branch_policies !== true) throw new DeployError('environment-branches', `Environment ${name} does not use a custom deployment-branch policy; restrict it to the single branch "main"`);
  let policies;
  try {
    policies = (await api.listBranchPolicies(name))?.branch_policies;
  } catch (err) {
    throw new DeployError('environment-unreadable', `cannot read the deployment-branch policies of ${name}: ${err.message}`);
  }
  const onlyMain = Array.isArray(policies) && policies.length === 1 && policies[0]?.name === 'main' && (policies[0].type === undefined || policies[0].type === 'branch');
  if (!onlyMain) throw new DeployError('environment-branches', `Environment ${name} must allow deployments from exactly one branch, "main" (found: ${Array.isArray(policies) ? policies.map((p) => p?.name).join(', ') || 'none' : 'unreadable'})`);
  return { name, reviewerRules: reviewerRules.length, canAdminsBypass: env.can_admins_bypass === true };
}

/**
 * The deploy decision, made from the record. Used twice: advisory in the plan job, authoritative under the lock.
 * Never returns "deploy" without a verified reason (see decide() in deploy-tracking.mjs).
 */
export async function planApp({ api, app, sha, bootstrap = false, root, isAncestor = gitIsAncestor, detectFn = detect }) {
  const last = await lastGood({ api, app });
  // A complete, unambiguous read of the whole history (fails closed on contradictory records), used to make surprises visible.
  const history = await rollbackHistory({ api, app });
  const warnings = [];
  const newest = history.newest;
  if (newest && !newest.settled) warnings.push(`the newest deployment record (${newest.kind} ${newest.sha.slice(0, 12)}, id ${newest.deploymentId}) never finished; a real deploy closes it as interrupted. What is live may differ from the record.`);
  // 'wrangler exited' (non-zero) and 'unverified' both leave the live state uncertain; 'nothing deployed' failures do not.
  if (newest?.descriptions.some((d) => d.startsWith(DEPLOY.unverified) || d.startsWith(`${DEPLOY.failed}: wrangler exited`))) warnings.push(`the previous deploy attempt (${newest.sha.slice(0, 12)}) ended with an uncertain live state (wrangler failed or the result could not be verified): a version it deployed may be live and is NOT recorded. Deploying again replaces it; until then a rollback refuses.`);
  let deployableApps = [];
  let degraded = false;
  if (last.status === 'found' && last.sha !== sha) {
    let result;
    try {
      result = detectFn({ root, base: last.sha, head: sha });
    } catch {
      result = { degraded: true, deployableApps: [...APPS] };
    }
    deployableApps = result.deployableApps ?? [...APPS];
    degraded = Boolean(result.degraded);
  }
  const decision = decide({ app, sha, last, isAncestor: (a, b) => isAncestor(root, a, b), deployableApps, bootstrap });
  return { decision, last, degraded, warnings };
}

function resolveWrangler(root, app) {
  const appDir = path.join(root, 'apps', app);
  const req = createRequire(path.join(appDir, 'package.json'));
  const bin = path.join(path.dirname(req.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  if (!fs.existsSync(bin)) throw new DeployError('wrangler-missing', 'installed wrangler binary not found');
  return { appDir, bin };
}

function spawnWrangler({ appDir, env }) {
  return (args, extraEnv = {}) => {
    const res = spawnSync(process.execPath, args, { cwd: appDir, env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    return { status: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  };
}

function readJson(run, args, what) {
  const res = run(args);
  if (res.status !== 0) throw new DeployError('cloudflare-unreadable', `${what}: wrangler exited with ${res.status}`);
  try {
    return JSON.parse(res.stdout);
  } catch {
    throw new DeployError('cloudflare-unreadable', `${what}: wrangler did not return JSON`);
  }
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {object} p
 * @param {string} p.app web | admin | student
 * @param {string} p.sha full commit SHA the artifact was built from
 * @param {'deploy'|'bootstrap'} p.mode
 * @param {boolean} p.dryRun only an explicit `false` is a real deploy
 * @param {object} p.api deploy-tracking API adapter (reads and writes)
 * @param {NodeJS.ProcessEnv} p.env
 * @param {string} p.root repository root (a full clone checked out at `sha`)
 * @param {string} p.repo owner/name
 * @param {string} p.runId
 * @param {string|number} p.runAttempt
 * @param {string} p.artifactDir directory the artifact was downloaded to
 * @param {string} p.expectDigest "<app>:<sha256 of manifest.json>" handed over by the build job
 */
export async function runDeploy({
  app, sha, mode = 'deploy', dryRun, api, env, root, repo, runId, runAttempt = 1, artifactDir, expectDigest,
  appDir = path.join(root, 'apps', app), wranglerBin = '<wrangler>', runWrangler, readOutput = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''),
  outputFile = path.join(os.tmpdir(), `wrangler-output-${process.pid}-${Date.now()}.ndjson`),
  verifyTree = verifyExtractedTree, isAncestor = gitIsAncestor, detectFn = detect, dryRunFn = dryRunDeploy, smoke = runSmoke, smokeOptions = {},
  sleep = sleepMs, liveAttempts = 3
}) {
  if (!APPS.includes(app)) throw new DeployError('bad-app', `unknown app "${app}"`);
  if (!FULL_SHA.test(sha ?? '')) throw new DeployError('bad-sha', 'the commit to deploy must be a full 40-character SHA');
  if (!MODES.includes(mode)) throw new DeployError('bad-mode', `mode must be one of ${MODES.join(', ')}`);
  if (!REPO.test(repo ?? '')) throw new DeployError('bad-repo', 'repo must be owner/name');
  if (!/^\d+$/.test(String(runId ?? ''))) throw new DeployError('bad-run-id', 'runId must be numeric');
  if (!/^[1-9]\d{0,3}$/.test(String(runAttempt))) throw new DeployError('bad-run-attempt', 'runAttempt must be a positive integer');
  // Fail safe: only an explicit `false` is a real deploy. Missing, undefined, 'false', 0 ... all mean rehearsal.
  const real = dryRun === false;
  const present = credentialEnvNames(env);
  if (!real) {
    if (present.length) throw new DeployError('credentials-present', `refusing a rehearsal: Cloudflare/Wrangler variables are set (${present.join(', ')}). It must be credential-free.`);
  } else if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new DeployError('missing-credentials', 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are both required for a real deploy');
  }
  if (real) {
    // The master switch is enforced HERE, in the executor, not only in a workflow condition. Only the exact string "true" enables.
    const sw = deploySwitch(env.PRODUCTION_DEPLOY_ENABLED);
    if (!sw.enabled) throw new DeployError('deploy-disabled', `refusing a real deploy: ${sw.reason}`);
  }
  const protection = await checkEnvironment({ api, app });
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}/attempts/${runAttempt}`;
  const command = deployArgs(wranglerBin, { sha, runUrl });
  const recheck = () => recheckArtifact({ app, sha, runId, runAttempt, repo, artifactDir, appDir, root, expectDigest, verifyTree });

  await recheck();
  const bootstrap = mode === 'bootstrap';
  const plan = await planApp({ api, app, sha, bootstrap, root, isAncestor, detectFn });
  if (plan.decision.action === 'fail') throw new DeployError(plan.decision.code, plan.decision.reason);
  const warnings = [...plan.warnings, ...(protection.canAdminsBypass ? [`Environment ${protection.name} lets repository admins bypass its required reviewers`] : [])];
  if (plan.decision.action === 'skip') return { ok: true, action: 'skip', code: plan.decision.code, reason: plan.decision.reason, dryRun: !real, warnings };
  if (!real) {
    const rehearsal = dryRunFn({ app, repoRoot: root, outDir: path.join(os.tmpdir(), `deploy-rehearsal-${app}-${process.pid}`), env });
    if (!rehearsal.ok) throw new DeployError('dry-run-failed', rehearsal.problems.map((x) => x.code).join(', '));
    return { ok: true, action: 'rehearsed', dryRun: true, decision: plan.decision, degraded: plan.degraded, command: command.slice(1), wranglerVersion: rehearsal.wranglerVersion, environment: protection, warnings };
  }

  // Everything above is read-only. From here the record is written BEFORE the change and every failure is written to it.
  for (const stale of await unsettledRecords({ api, app })) {
    await setStatus(api, stale.deploymentId, { state: 'error', description: `${DEPLOY.interrupted}: never finished; closed by run ${runId}`, logUrl: runUrl });
  }
  const recordBase = { app, sha, runId, runUrl, kind: mode, repo, runAttempt };
  const intentId = await createRecord(api, { ...recordBase, phase: 'intent' });
  const short = sha.slice(0, 12);
  const settle = async (id, state, description) => {
    try {
      await setStatus(api, id, { state, description, logUrl: runUrl });
      return '';
    } catch (err) {
      return ` (and the "${state}" record could not be written: ${err.message})`;
    }
  };
  try {
    await setStatus(api, intentId, { state: 'in_progress', description: `${DEPLOY.intent}: ${mode} ${app} @ ${short}`, logUrl: runUrl });
  } catch (err) {
    throw new DeployError('record-failed', `cannot write the in_progress intent record; nothing was deployed: ${err.message}${await settle(intentId, 'error', `${DEPLOY.failed}: intent record could not be written; nothing deployed`)}`);
  }

  try {
    await recheck(); // immediately before wrangler
  } catch (err) {
    throw new DeployError(err.code ?? 'artifact-invalid', `${err.message}; nothing was deployed${await settle(intentId, 'error', `${DEPLOY.failed}: artifact check failed; nothing deployed`)}`);
  }

  const secrets = [env.CLOUDFLARE_API_TOKEN, env.CLOUDFLARE_ACCOUNT_ID];
  const deployed = runWrangler(command, { WRANGLER_OUTPUT_FILE_PATH: outputFile });
  if (deployed.status !== 0) {
    const tail = redact(deployed.stderr, secrets).split(/\r?\n/).filter(Boolean).slice(-3).join(' | ').slice(0, 300);
    throw new DeployError('deploy-failed', `wrangler deploy exited with ${deployed.status}${tail ? `: ${tail}` : ''}. The Worker may or may not have changed.${await settle(intentId, 'failure', `${DEPLOY.failed}: wrangler exited with ${deployed.status}`)}`);
  }

  // Exit code zero is not evidence. Observe the version, then confirm it against Cloudflare itself.
  const unverified = async (code, message) => {
    throw new DeployError(code, `${message}. wrangler deploy succeeded, so the Worker may have changed: live state is UNVERIFIED, no evidence record was written.${await settle(intentId, 'error', `${DEPLOY.unverified}: ${message}`.slice(0, 140))}`);
  };
  let versionId;
  try {
    versionId = versionIdFromWranglerOutput(readOutput(outputFile), WORKER_NAMES[app]);
  } catch (err) {
    await unverified('version-unreadable', err.message);
  }
  let live;
  let liveProblem = 'live deployment never read';
  for (let attempt = 1; attempt <= liveAttempts; attempt++) {
    try {
      const parsed = parseLive(readJson(runWrangler, liveStateArgs(wranglerBin, { app }), 'live deployment'));
      live = parsed.versionId;
      liveProblem = parsed.problem ?? (live === versionId ? null : `live version is ${live}, not ${versionId}`);
    } catch (err) {
      live = undefined;
      liveProblem = err.message;
    }
    if (!liveProblem) break;
    if (attempt < liveAttempts) await sleep(2000);
  }
  if (liveProblem) await unverified('version-unverified', liveProblem);
  let described;
  try {
    described = readJson(runWrangler, versionViewArgs(wranglerBin, { app, versionId }), 'deployed version');
  } catch (err) {
    await unverified('version-unverified', err.message);
  }
  const meta = crossCheckVersion(described, versionId, sha, repo);
  if (meta.problem) await unverified('version-unverified', meta.problem);

  // Confirmed: now, and only now, the evidence record exists.
  let evidenceId;
  try {
    evidenceId = await createRecord(api, { ...recordBase, phase: 'evidence', versionId });
    await setStatus(api, evidenceId, { state: 'in_progress', description: `${DEPLOY.evidence}: ${app} @ ${short} is live as ${versionId}; smoke test pending`, logUrl: runUrl });
  } catch (err) {
    const evidenceNote = evidenceId ? await settle(evidenceId, 'error', `${DEPLOY.unverified}: evidence record could not be completed`) : '';
    throw new DeployError('record-failed', `the deployment is live and verified (version ${versionId}) but the evidence record could not be written: ${err.message}${evidenceNote}${await settle(intentId, 'error', `${DEPLOY.unverified}: evidence record could not be written (live as ${versionId})`.slice(0, 140))}`);
  }
  const closing = await settle(intentId, 'inactive', `${DEPLOY.superseded}: evidence record ${evidenceId}`);

  let result;
  try {
    result = await smoke({ app, baseUrl: PRODUCTION_URLS[app], ...smokeOptions });
  } catch (err) {
    throw new DeployError('smoke-error', `the smoke test could not run: ${err.message}${await settle(evidenceId, 'failure', `${DEPLOY.smokeFailed}: smoke test could not run`)}`);
  }
  if (!result.ok) {
    await setStatus(api, evidenceId, { state: 'failure', description: `${DEPLOY.smokeFailed}: ${app} is live as ${versionId} but the smoke test failed`.slice(0, 140), logUrl: runUrl });
    return { ok: false, action: 'deployed', dryRun: false, versionId, intentId, evidenceId, smoke: result, closing, warnings };
  }
  await setStatus(api, evidenceId, { state: 'success', description: `${DEPLOY.verified}: ${app} @ ${short} live as ${versionId}; version and smoke verified`.slice(0, 140), logUrl: runUrl });
  return { ok: true, action: 'deployed', dryRun: false, versionId, intentId, evidenceId, smoke: result, closing, warnings };
}

const VALUE_OPTIONS = ['app', 'sha', 'mode', 'artifact-dir', 'expect-manifest-sha256'];
const FLAG_OPTIONS = ['dry-run', 'bootstrap'];

/** Strict: value options always consume the next argument; unknown options are errors. */
export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const key = a.slice(2);
    if (FLAG_OPTIONS.includes(key)) opts[key] = 'true';
    else if (VALUE_OPTIONS.includes(key)) {
      if (i + 1 >= rest.length) throw new Error(`--${key} needs a value`);
      opts[key] = rest[++i];
    } else throw new Error(`unknown option ${a}`);
  }
  return { command, opts };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { command, opts } = parseArgs(process.argv.slice(2));
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new DeployError('not-in-actions', 'GITHUB_REPOSITORY is required (this runs in GitHub Actions only)');
  const api = githubApi({ repo, token: process.env.GITHUB_TOKEN });
  const summary = (md) => process.env.GITHUB_STEP_SUMMARY && fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  if (command === 'plan') {
    const { decision, last, degraded, warnings } = await planApp({ api, app: opts.app, sha: opts.sha, bootstrap: opts.bootstrap === 'true', root });
    process.stdout.write(`${JSON.stringify({ app: opts.app, sha: opts.sha, decision, last, degraded, warnings }, null, 2)}\n`);
    for (const w of warnings) process.stdout.write(`::warning title=deploy-plan::${w}\n`);
    summary(`### ${opts.app}: plan = ${decision.action} (${decision.code})\n- ${decision.reason}${degraded ? '\n- the change classifier degraded; the app was treated as affected (fail closed)' : ''}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `action=${decision.action}\ncode=${decision.code}\n`);
    if (decision.action === 'fail') throw new DeployError(decision.code, decision.reason);
    return;
  }
  if (command !== 'run') throw new Error('usage: deploy.mjs plan|run ...');
  if (!process.env.GITHUB_RUN_ID) throw new DeployError('not-in-actions', 'GITHUB_RUN_ID is required');
  const { appDir, bin } = resolveWrangler(root, opts.app);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-deploy-home-'));
  try {
    const result = await runDeploy({
      app: opts.app, sha: opts.sha, mode: opts.mode ?? 'deploy', dryRun: opts['dry-run'] === 'true', api, env: process.env, root, repo,
      runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? '1', artifactDir: path.resolve(opts['artifact-dir']), expectDigest: opts['expect-manifest-sha256'],
      appDir, wranglerBin: bin, runWrangler: spawnWrangler({ appDir, env: wranglerEnv(process.env, home) })
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    for (const w of result.warnings ?? []) process.stdout.write(`::warning title=deploy::${w}\n`);
    summary(result.action === 'skip' ? `### ${opts.app}: skipped (${result.code})\n- ${result.reason}`
      : result.action === 'rehearsed' ? `### ${opts.app}: deploy rehearsal ok\n- decision: ${result.decision.code}; nothing was changed, no credentials were used`
        : `### ${opts.app}: ${result.ok ? 'deployed and verified' : 'deployed but SMOKE FAILED'}\n- version \`${result.versionId}\`, intent record ${result.intentId}, evidence record ${result.evidenceId}`);
    if (!result.ok) process.exitCode = 1;
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error title=${err.code ?? 'error'}::${redact(String(err.message).replace(/\r?\n/g, ' '), [process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID])}\n`);
    process.exit(1);
  });
}
