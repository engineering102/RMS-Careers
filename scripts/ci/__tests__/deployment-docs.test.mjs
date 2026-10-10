import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS, WORKER_NAMES } from '../deploy-tracking.mjs';

// Pins the readiness documentation to the behaviour the code actually has, so the runbook cannot drift back into
// requiring something the executors refuse (e.g. a green rollback rehearsal before any deployment record exists).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replaceAll('\r\n', '\n');
const runbook = read('docs', 'development', 'deployment.md');
const spec = read('docs', 'plans', 'phase-4-production-deployment-spec.md');

const section = (text, startHeading, endHeading) => {
  const a = text.indexOf(startHeading);
  assert.ok(a >= 0, `${startHeading} exists`);
  const b = endHeading ? text.indexOf(endHeading, a + 1) : -1;
  assert.ok(endHeading === undefined || b > a, `${endHeading} follows`);
  return text.slice(a, b === -1 ? undefined : b);
};
const partA = section(runbook, '### 7A.', '### 7B.');
const partB = section(runbook, '### 7B.', '### 7C.');
const partC = section(runbook, '### 7C.', '## 8.');

/** wrangler.jsonc has only whole-line comments; strip them and parse. */
const wrangler = (app) => JSON.parse(read('apps', app, 'wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''));

describe('runbook checklist: structure and the production boundary', () => {
  test('three parts in order: A (no deploy), B (changes production), C (after)', () => {
    const order = ['### 7A.', '### 7B.', '### 7C.'].map((h) => runbook.indexOf(h));
    assert.ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2]);
    assert.match(partB, /CHANGES PRODUCTION; only after an explicit human decision/);
  });
  test('nothing before part B unticks dry_run or sets the master switch to true', () => {
    assert.doesNotMatch(partA, /`dry_run` \*\*unticked\*\*|to exactly `true`/);
    assert.match(partA, /`PRODUCTION_DEPLOY_ENABLED` is \*\*unset\*\* \(or `false`\) throughout this part/);
    assert.match(partB, /to exactly `true`/);
    assert.match(partB, /`dry_run` \*\*unticked\*\* \(only now\)/);
  });
  test('part B bootstraps exactly one app per dispatch, web first, and switches off again afterwards', () => {
    assert.match(partB, /\*\*exactly one\*\* app, `bootstrap` ticked/);
    assert.match(partB, /`web`, then `admin`, then `student`/);
    assert.match(partB, /back to unset or `false`/);
  });
  test('part C verifies the evidence record, live version, custom domains, smoke and health, and keeps the recovery references', () => {
    for (const re of [/evidence record/, /wrangler deployments status/, /custom domain/, /smoke test/, /version id you recorded in 7A/]) assert.match(partC, re);
  });
});

describe('runbook checklist: prerequisites reflect actual behaviour', () => {
  test('all three Environments, main-only, reviewers, no administrator bypass, and the Cloudflare credentials per Environment', () => {
    for (const app of APPS) assert.ok(partA.includes(`production-${app}`), app);
    assert.match(partA, /single deployment branch `main`/);
    assert.match(partA, /required-reviewers rule/);
    assert.match(partA, /administrators to bypass[^\n]*switched off/);
    assert.match(partA, /`CLOUDFLARE_API_TOKEN`[^\n]*`CLOUDFLARE_ACCOUNT_ID`[^\n]*neither exists at repository level/);
  });
  test('an unenforced ci-gate is a blocker to enabling the master switch unless the risk is explicitly accepted', () => {
    assert.match(partA, /blocker to enabling the switch/);
    assert.match(partA, /explicitly records that the risk is accepted/);
  });
  test('the rollback dry run is NOT a pre-bootstrap green criterion: it must fail closed with no-baseline', () => {
    assert.match(partA, /rollback dry run[^\n]*fails closed with `no-baseline`/);
    assert.match(partA, /a green result is impossible before the first verified deploy/);
    assert.doesNotMatch(runbook, /rollback\.yml` rehearsal and a `deploy\.yml` rehearsal[^\n]*run green/);
    assert.match(runbook, /cannot be rehearsed green before the first deploy/);
    assert.match(partC, /Rollback is \*\*not\*\* operational until that rehearsal succeeds/);
  });
  test('the bootstrap rehearsal is per app with bootstrap ticked, and a normal plan failing no-baseline is expected', () => {
    assert.match(partA, /one dispatch per app/);
    assert.match(partA, /`bootstrap` ticked, `dry_run` ticked/);
    assert.match(partA, /fails closed with `no-baseline` while no verified record exists/);
  });
  test('a skip is not a rehearsal, in the runbook and in the spec go criteria', () => {
    assert.match(runbook, /\*\*A `skip` is not a rehearsal\.\*\*/);
    for (const code of ['already-deployed', 'unchanged', 'superseded']) assert.ok(runbook.includes(code), code);
    assert.match(partA, /A run whose build and rehearse jobs are skipped \(a `skip`\)[^\n]*is not a rehearsal/);
    assert.match(spec, /a `skip` outcome, where the build and rehearsal jobs are skipped, is not a rehearsal/);
  });
  test('the rehearsal checks the Environment (it does not ask for approval), and the real deploy waits for approval', () => {
    assert.match(runbook, /the \*real\* deploy job names the Environment and waits for a reviewer's \*\*approval\*\*; the rehearsal only \*\*checks the Environment's protection\*\*/);
    assert.doesNotMatch(runbook, /`rehearse` \(`dry_run` true; no Environment, no credential\)/);
    assert.match(runbook, /3\. `rehearse` \(`dry_run` true; no credential, no approval, and no `environment:` key in the job\): first \*\*reads the `production-<app>` GitHub Environment/);
  });
  test('rollback dispatches are documented as main-only, rehearsal included', () => {
    assert.match(runbook, /any other ref is refused by the `refuse-non-main` job, dry run or not/);
    assert.match(spec, /every dispatch, rehearsal or real, only from `main`/);
  });
  test('the spec go criteria no longer require a green rollback rehearsal before the bootstrap', () => {
    const go = section(spec, '## 10. Go / no-go');
    assert.match(go, /The rollback dry run is NOT a pre-bootstrap criterion/);
    assert.match(go, /ONE app per dispatch/);
    assert.match(go, /branch protection for `ci-gate` is resolved or the risk of automatic deploys is explicitly accepted/);
  });
});

describe('runbook checklist: Worker facts match the repository configuration', () => {
  test('each Worker\'s expected runtime secret names are listed exactly as its wrangler.jsonc requires', () => {
    for (const app of APPS) {
      const cfg = wrangler(app);
      assert.equal(cfg.name, WORKER_NAMES[app]);
      const line = partA.split('\n').find((l) => l.includes('Expected names from each `wrangler.jsonc`'));
      assert.ok(line, 'secret list line exists');
      const entry = new RegExp(`\`${cfg.name}\`: ([^;.]+)`).exec(line);
      assert.ok(entry, `${cfg.name} is listed`);
      const documented = [...entry[1].matchAll(/`([A-Z_]+)`/g)].map((m) => m[1]).sort();
      assert.deepEqual(documented, [...cfg.secrets.required].sort(), `${cfg.name} secrets`);
    }
  });
  test('the admin CPU limit the runbook cites is the configured one, and no secret value is documented', () => {
    assert.equal(wrangler('admin').limits.cpu_ms, 300000);
    assert.match(partA, /`rms-admin` configures `limits\.cpu_ms` = 300000/);
    assert.doesNotMatch(runbook, /(?:AUTH_SECRET|POSTGRES_URL|CLOUDFLARE_API_TOKEN)\s*[=:]\s*[A-Za-z0-9+/_-]{12,}/);
  });
  test('live version ids are recorded manually, outside the pipeline, before the first deploy', () => {
    assert.match(partA, /current live version id is recorded manually, outside the pipeline/);
  });
});
