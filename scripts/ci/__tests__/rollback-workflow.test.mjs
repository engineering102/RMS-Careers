import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const raw = fs.readFileSync(path.join(root, '.github', 'workflows', 'rollback.yml'), 'utf8');
const lines = raw.split(/\r?\n/);
const code = lines.filter((l) => !l.trim().startsWith('#')).join('\n');

const jobBlock = (name) => {
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `job ${name} exists`);
  const end = lines.findIndex((l, i) => i > start && /^  [a-z-]+:$/.test(l));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};
const rehearse = jobBlock('rehearse');
const rollback = jobBlock('rollback');
const refuse = jobBlock('refuse-non-main');

describe('rollback.yml: trigger and token scope', () => {
  test('manual only; no automatic triggers', () => {
    assert.match(code, /^on:\n  workflow_dispatch:\n/m);
    assert.doesNotMatch(code, /^\s+(push|pull_request|pull_request_target|schedule|workflow_run|workflow_call|repository_dispatch):/m);
  });
  test('default token is empty; each job asks for the least it needs', () => {
    assert.match(code, /^permissions: \{\}$/m);
    assert.match(rehearse, /permissions:\n {6}contents: read\n {6}deployments: read\n/);
    assert.doesNotMatch(rehearse, /write/);
    assert.match(rollback, /permissions:\n {6}contents: read\n {6}deployments: write\n/);
    assert.doesNotMatch(code, /(id-token|packages|actions|pull-requests|checks|statuses|contents):\s*write/);
  });
  test('dry_run defaults to true; the app is a closed choice; version id and reason are required', () => {
    assert.match(code, /dry_run:\n(?: {8}.+\n)*? {8}default: true/);
    assert.match(code, /options: \[web, admin, student\]/);
    assert.match(code, /version_id:\n(?: {8}.+\n)*? {8}required: true/);
    assert.match(code, /reason:\n(?: {8}.+\n)*? {8}required: true/);
  });
});

describe('rollback.yml: the rehearsal can touch nothing', () => {
  test('no Environment, no secret, no variable, no Cloudflare name', () => {
    assert.doesNotMatch(rehearse, /^\s+environment:/m);
    assert.doesNotMatch(rehearse, /secrets\.|vars\./);
    assert.doesNotMatch(rehearse, /CLOUDFLARE|CF_|WRANGLER/);
    assert.match(rehearse, /if: \$\{\{ inputs\.dry_run \}\}/);
    assert.match(rehearse, /rollback\.mjs [^\n]*--dry-run/);
  });
  test('it does not take the production lock', () => assert.doesNotMatch(rehearse, /concurrency:/));
});

describe('rollback.yml: the real job is gated', () => {
  test('runs only when dry_run is false and the workflow is dispatched from main', () => {
    assert.match(rollback, /if: \$\{\{ !inputs\.dry_run && github\.ref == 'refs\/heads\/main' \}\}/);
  });
  test('a real run from another branch fails loudly instead of silently skipping, with no token and no Environment', () => {
    assert.match(refuse, /if: \$\{\{ !inputs\.dry_run && github\.ref != 'refs\/heads\/main' \}\}/);
    assert.match(refuse, /permissions: \{\}/);
    assert.match(refuse, /exit 1/);
    assert.doesNotMatch(refuse, /environment:|secrets\.|vars\.|checkout|pnpm|node /);
    const jobsSection = code.slice(code.indexOf('\njobs:\n'));
    assert.deepEqual([...jobsSection.matchAll(/^  ([a-z-]+):$/gm)].map((m) => m[1]), ['rehearse', 'refuse-non-main', 'rollback'], 'exactly these jobs');
  });
  test('per-app Environment and the same per-app lock as the deploy workflow, never cancelled mid-flight', () => {
    assert.match(rollback, /environment: production-\$\{\{ inputs\.app \}\}/);
    assert.match(rollback, /concurrency:\n {6}group: deploy-\$\{\{ inputs\.app \}\}\n {6}cancel-in-progress: false/);
  });
  test('the Cloudflare credential appears once, in the rollback step only, after dependencies are installed', () => {
    assert.equal([...code.matchAll(/secrets\./g)].length, 1);
    assert.equal([...code.matchAll(/vars\./g)].length, 1);
    assert.match(rollback, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
    assert.match(rollback, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/);
    const i = rollback.indexOf('secrets.CLOUDFLARE_API_TOKEN');
    assert.ok(i > rollback.indexOf('pnpm install'));
    // the job-level env block (before `steps:`) must not carry the credential
    assert.ok(rollback.indexOf('steps:') < i);
    assert.doesNotMatch(code, /secrets:\s*inherit/);
  });
  test('inputs reach the script through environment variables, never interpolated into the shell', () => {
    for (const job of [rehearse, rollback]) {
      for (const step of job.split(/\n {6}- /).filter((s) => /\brun:/.test(s))) assert.doesNotMatch(step.replace(/^[^\n]*\n/, ''), /\$\{\{\s*inputs\./, 'inputs must not be expanded inside run:');
      assert.match(job, /--app "\$APP" --version-id "\$VERSION_ID"/);
    }
    assert.match(code, /--reason "\$REASON"/);
  });
});

describe('rollback.yml: it cannot build, deploy or migrate', () => {
  test('no build, no artifact, no wrangler/opennext call in YAML, no migration or seed, no production database', () => {
    assert.doesNotMatch(code, /cf:build|next build|opennextjs-cloudflare|pnpm[^\n]*\bbuild\b/);
    assert.doesNotMatch(code, /upload-artifact|download-artifact/);
    const runLines = lines.filter((l) => /^\s*(- )?run:/.test(l)).join('\n');
    assert.doesNotMatch(runLines, /wrangler/, 'wrangler is only ever run by rollback.mjs');
    assert.doesNotMatch(code, /db:(migrate|push|generate)|\b(admin|student):seed|drizzle|POSTGRES_URL|DATABASE_URL/);
  });
  test('every action is pinned to a full commit SHA with a version comment', () => {
    const uses = lines.filter((l) => /^\s*-?\s*uses:/.test(l));
    assert.ok(uses.length >= 6);
    for (const l of uses) assert.match(l, /uses:\s+[\w.-]+\/[\w.-]+@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+$/, l);
    assert.equal([...code.matchAll(/persist-credentials: false/g)].length, 2);
  });
  test('the header does not claim the workflow has run on GitHub', () => assert.match(raw, /has NOT yet been run on GitHub Actions/));
});

describe('rollback.yml: isolation', () => {
  test('ci.yml does not reference rollback', () => assert.doesNotMatch(fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8'), /rollback/));
  test('the Phase 3 PoC workflows still have no deployments scope or rollback', () => {
    for (const f of ['artifact-poc.yml', 'artifact-poc-app.yml']) assert.doesNotMatch(fs.readFileSync(path.join(root, '.github', 'workflows', f), 'utf8'), /rollback\.mjs|deployments:/);
  });
});
