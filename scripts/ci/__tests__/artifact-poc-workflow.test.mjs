import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (name) => fs.readFileSync(path.join(root, '.github', 'workflows', name), 'utf8');
const caller = read('artifact-poc.yml');
const app = read('artifact-poc-app.yml');
const split = (text) => text.split(/\r?\n/);
const strip = (text) => split(text).filter((l) => !l.trim().startsWith('#')).join('\n');
const callerCode = strip(caller);
const appCode = strip(app);
const both = `${callerCode}\n${appCode}`;

const jobBlock = (text, name) => {
  const lines = split(text);
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `job ${name} exists`);
  const end = lines.findIndex((l, i) => i > start && /^  [a-z-]+:$/.test(l));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};

describe('artifact PoC workflows: triggers and permissions', () => {
  test('the caller is manually triggered only; the per-app workflow is workflow_call only', () => {
    assert.match(callerCode, /^on:\n  workflow_dispatch:\n/m);
    assert.match(appCode, /^on:\n  workflow_call:\n/m);
    for (const code of [callerCode, appCode]) {
      assert.doesNotMatch(code, /^\s+(push|pull_request|schedule|workflow_run|pull_request_target|repository_dispatch):/m);
    }
    assert.doesNotMatch(appCode, /workflow_dispatch/);
  });

  test('read-only token everywhere; no write scopes', () => {
    for (const code of [callerCode, appCode]) {
      assert.match(code, /^permissions:\n  contents: read\n/m);
      assert.doesNotMatch(code, /(id-token|deployments|packages|actions|pull-requests|checks|contents):\s*write/);
    }
  });
});

describe('artifact PoC workflows: nothing can deploy', () => {
  test('no environments, secrets, secret inheritance or Cloudflare/production credentials', () => {
    assert.doesNotMatch(both, /^\s+environment:/m);
    assert.doesNotMatch(both, /\$\{\{\s*secrets\./);
    assert.doesNotMatch(both, /secrets:\s*inherit/);
    assert.doesNotMatch(both, /^\s+secrets:/m);
    assert.doesNotMatch(both, /CLOUDFLARE_|CF_API|CF_ACCOUNT|WRANGLER_|TEST_DATABASE|API_TOKEN/);
    assert.match(appCode, /POSTGRES_URL: ''/);
    assert.match(appCode, /DATABASE_URL: ''/);
  });

  test('no wrangler deploy/publish/upload, no opennext deploy/upload, no migrations or seeds', () => {
    assert.doesNotMatch(both, /wrangler\s+(deploy|publish|versions|rollback|secret|d1|r2|kv)/);
    assert.doesNotMatch(both, /opennextjs-cloudflare\s+(deploy|upload|populateCache|preview)/);
    assert.doesNotMatch(both, /pnpm\b[^\n]*\b(run\s+)?(deploy|preview)\b/);
    assert.doesNotMatch(both, /db:(migrate|push|generate)|\b(admin|student):seed|drizzle/);
    // the only wrangler contact is the guarded dry-run subcommand
    assert.match(appCode, /artifact\.mjs dry-run/);
  });

  test('every action is pinned to a full commit SHA with a version comment', () => {
    const uses = split(app).filter((l) => /^\s*-?\s*uses:/.test(l));
    assert.ok(uses.length >= 8);
    for (const l of uses) assert.match(l, /uses:\s+[\w.-]+\/[\w.-]+@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+$/, l);
    // the caller only uses the local reusable workflow (a path, not a third-party ref)
    for (const l of split(caller).filter((x) => /^\s*uses:/.test(x))) assert.match(l, /uses: \.\/\.github\/workflows\/artifact-poc-app\.yml$/);
  });

  test('the header does not claim the workflow has run on GitHub', () => {
    assert.match(caller, /has NOT yet been run on GitHub Actions/);
    assert.match(app, /has NOT yet been run on GitHub Actions/);
  });
});

describe('artifact PoC workflows: explicit per-application digest hand-off', () => {
  test('the caller has exactly web, admin and student, each passing its OWN app name', () => {
    const jobs = [...callerCode.matchAll(/^  ([a-z-]+):\n    uses: (\S+)\n    with:\n      app: (\S+)\n/gm)];
    assert.deepEqual(jobs.map((m) => m[1]), ['web', 'admin', 'student']);
    for (const [, id, uses, appName] of jobs) {
      assert.equal(appName, id, `job ${id} must pass app: ${id}`);
      assert.equal(uses, './.github/workflows/artifact-poc-app.yml');
    }
    assert.doesNotMatch(callerCode, /needs:/);
    assert.doesNotMatch(callerCode, /strategy:|matrix:/);
  });

  test('there is no matrix anywhere, so no shared output map exists', () => {
    assert.doesNotMatch(both, /strategy:|matrix\./);
    assert.doesNotMatch(both, /outputs\[/);
    assert.doesNotMatch(both, /digest_(web|admin|student)/);
  });

  test('build publishes ONE digest output; verify consumes exactly that and only that', () => {
    const build = jobBlock(app, 'build');
    const verify = jobBlock(app, 'verify');
    assert.match(build, /outputs:\n      digest: \$\{\{ steps\.package\.outputs\.digest \}\}/);
    assert.match(build, /id: package/);
    assert.match(verify, /needs: build\n/);
    assert.match(verify, /EXPECT_MANIFEST_SHA256: \$\{\{ needs\.build\.outputs\.digest \}\}/);
    assert.match(verify, /--expect-manifest-sha256 "\$EXPECT_MANIFEST_SHA256"/);
    assert.match(verify, /--expect-sha "\$GITHUB_SHA"/);
    assert.match(verify, /--expect-run-id "\$GITHUB_RUN_ID"/);
    assert.doesNotMatch(verify, /allow-missing-expectations/);
    assert.equal([...appCode.matchAll(/needs\.[a-z-]+\.outputs/g)].length, 1, 'the only cross-job value is the digest');
  });

  test('the artifact name and paths are derived from the same single app input', () => {
    assert.match(app, /name: open-next-\$\{\{ inputs\.app \}\}/);
    assert.equal([...app.matchAll(/open-next-\$\{\{ inputs\.app \}\}/g)].length, 2, 'upload and download use the same name');
    assert.doesNotMatch(app, /open-next-(web|admin|student)\b/);
  });
});

describe('artifact PoC workflows: build/verify separation', () => {
  test('build builds and uploads; verify never builds', () => {
    const build = jobBlock(app, 'build');
    const verify = jobBlock(app, 'verify');
    assert.match(build, /run cf:build/);
    assert.match(build, /upload-artifact@/);
    assert.match(build, /include-hidden-files: true/);
    assert.match(build, /overwrite: true/);
    assert.match(build, /if-no-files-found: error/);
    assert.doesNotMatch(verify, /cf:build|next build|opennextjs-cloudflare|pnpm[^\n]*\bbuild\b/);
    assert.match(verify, /download-artifact@/);
    assert.match(verify, /digest-mismatch: error/);
    assert.match(verify, /negative-tests/);
    assert.match(verify, /Assert no build output exists/);
  });
});

describe('artifact PoC workflows: isolation from CI', () => {
  test('ci.yml and ci-gate do not reference the proof of concept', () => {
    const ci = read('ci.yml');
    assert.doesNotMatch(ci, /artifact-poc|artifact\.mjs/);
  });
});
