import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const gh = path.join(root, '.github');
const workflowDir = path.join(gh, 'workflows');
const workflows = fs.readdirSync(workflowDir).filter((f) => /\.ya?ml$/.test(f));
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const lines = (text) => text.split(/\r?\n/);
const nonComment = (text) => lines(text).filter((l) => !l.trim().startsWith('#'));

describe('workflow supply chain', () => {
  test('there is at least ci.yml and the artifact proof of concept', () => {
    for (const f of ['ci.yml', 'artifact-poc.yml', 'artifact-poc-app.yml']) assert.ok(workflows.includes(f), f);
  });

  test('every third-party action is pinned to a full commit SHA with a version comment', () => {
    for (const f of workflows) {
      for (const l of nonComment(read(workflowDir, f)).filter((x) => /^\s*-?\s*uses:/.test(x))) {
        if (/uses:\s+\.\//.test(l)) continue; // local reusable workflow: same commit as the caller
        assert.match(l, /uses:\s+[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40}\s+# v\d+(\.\d+){0,2}\s*$/, `${f}: ${l.trim()}`);
        assert.doesNotMatch(l, /@(v\d|main|master|latest)\b/, `${f}: ${l.trim()}`);
      }
    }
  });

  test('no workflow uses a docker:// action and container images are pinned by digest', () => {
    for (const f of workflows) {
      const code = nonComment(read(workflowDir, f)).join('\n');
      assert.doesNotMatch(code, /uses:\s+docker:\/\//, f);
      for (const m of code.matchAll(/docker run[^\n]*?\s([a-z0-9./_-]+\/[a-z0-9._-]+:[\w.-]+)(@sha256:[0-9a-f]{64})?/g)) {
        assert.ok(m[2], `${f}: image ${m[1]} must be pinned by digest`);
      }
    }
  });

  test('ci.yml keeps its gate and stays non-deploying', () => {
    const ci = nonComment(read(workflowDir, 'ci.yml')).join('\n');
    assert.match(ci, /^  ci-gate:\n/m);
    assert.match(ci, /needs: \[detect, check, integration, build, workflow-lint\]/);
    assert.match(ci, /^permissions:\n  contents: read\n/m);
    assert.doesNotMatch(ci, /^\s+environment:/m);
    assert.doesNotMatch(ci, /CLOUDFLARE_|CF_API|WRANGLER_|API_TOKEN/);
    assert.doesNotMatch(ci, /wrangler\s+(deploy|publish|versions)|opennextjs-cloudflare\s+(deploy|upload)|db:migrate|\bseed\b/);
    const secrets = [...ci.matchAll(/\$\{\{\s*secrets\.([A-Z_]+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(secrets)].sort(), ['TEST_DATABASE_ENDPOINT', 'TEST_DATABASE_URL']);
  });

  test('no workflow anywhere declares a production environment or Cloudflare credential, except the gated rollback and per-app deploy workflows', () => {
    for (const f of workflows) {
      const code = nonComment(read(workflowDir, f)).join('\n');
      if (f === 'rollback.yml') {
        // The single, reviewed exception (Phase 4, spec section 5): exactly one per-app Environment and exactly the two
        // Cloudflare names, nothing else. Its behaviour is pinned by rollback-workflow.test.mjs.
        assert.deepEqual(code.match(/^\s+environment:.*$/gm).map((l) => l.trim()), ['environment: production-${{ inputs.app }}'], f);
        const names = [...new Set(code.match(/CLOUDFLARE_[A-Z_]+|CF_API\w*|CF_ACCOUNT\w*|WRANGLER_\w+|\w*API_TOKEN/g))].sort();
        assert.deepEqual(names, ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'], f);
        // ...and only in the exact shape reviewed: manual trigger, one secret and one variable reference, each bound to its
        // own name, the only write scope being deployments, and the deploy lock group.
        assert.match(code, /^on:\n {2}workflow_dispatch:\n/m, f);
        assert.doesNotMatch(code, /^\s+(push|pull_request|pull_request_target|schedule|workflow_run|workflow_call|repository_dispatch):/m, f);
        assert.deepEqual(code.match(/\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/g), ['${{ secrets.CLOUDFLARE_API_TOKEN }}'], f);
        assert.deepEqual(code.match(/\$\{\{\s*vars\.[A-Z_]+\s*\}\}/g), ['${{ vars.CLOUDFLARE_ACCOUNT_ID }}'], f);
        assert.match(code, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/, f);
        assert.match(code, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/, f);
        assert.deepEqual(code.match(/^\s+[a-z-]+: write$/gm)?.map((l) => l.trim()), ['deployments: write'], f);
        assert.match(code, /group: deploy-\$\{\{ inputs\.app \}\}\n\s+cancel-in-progress: false/, f);
        continue;
      }
      if (f === 'deploy-app.yml') {
        // Second reviewed exception (Phase 4 deploy, on main): the per-app deploy job, reachable only as a reusable workflow
        // called from deploy.yml. One Environment, exactly the two Cloudflare names, one secret reference. Its behaviour is
        // pinned in depth by deploy-workflow.test.mjs.
        assert.deepEqual(code.match(/^\s+environment:.*$/gm).map((l) => l.trim()), ['environment: production-${{ inputs.app }}'], f);
        const names = [...new Set(code.match(/CLOUDFLARE_[A-Z_]+|CF_API\w*|CF_ACCOUNT\w*|WRANGLER_\w+|\w*API_TOKEN/g))].sort();
        assert.deepEqual(names, ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'], f);
        assert.match(code, /^on:\n {2}workflow_call:\n/m, f);
        assert.doesNotMatch(code, /^\s+(push|pull_request|pull_request_target|schedule|workflow_run|workflow_dispatch|repository_dispatch):/m, f);
        assert.deepEqual(code.match(/\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/g), ['${{ secrets.CLOUDFLARE_API_TOKEN }}'], f);
        continue;
      }
      assert.doesNotMatch(code, /^\s+environment:/m, f);
      assert.doesNotMatch(code, /CLOUDFLARE_|CF_API|CF_ACCOUNT|WRANGLER_|API_TOKEN/, f);
    }
  });
});

describe('CODEOWNERS', () => {
  const rules = nonComment(read(gh, 'CODEOWNERS'))
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/));

  test('covers every protected path', () => {
    const patterns = rules.map((r) => r[0]);
    for (const p of ['/.github/', '/scripts/ci/', '**/wrangler.jsonc', '/packages/db/drizzle/']) assert.ok(patterns.includes(p), `missing ${p}`);
  });

  test('every rule has at least one well-formed owner and no placeholder', () => {
    for (const [pattern, ...owners] of rules) {
      assert.ok(owners.length >= 1, `${pattern} has no owner`);
      for (const o of owners) assert.match(o, /^@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(\/[A-Za-z0-9_.-]+)?$/, `${pattern}: ${o}`);
    }
    assert.doesNotMatch(read(gh, 'CODEOWNERS'), /\bTODO\b|OWNER_|YOUR[-_ ]?USER|example\.com|@org\//i);
  });

  test('the file states honestly that it does not enforce anything by itself', () => {
    assert.match(read(gh, 'CODEOWNERS'), /ENFORCES NOTHING BY ITSELF/);
  });
});

describe('Dependabot', () => {
  const text = read(gh, 'dependabot.yml');

  test('exactly one ecosystem, github-actions, at the repository root (no duplicate or conflicting policy)', () => {
    assert.match(text, /^version: 2$/m);
    const ecosystems = [...nonComment(text).join('\n').matchAll(/package-ecosystem:\s*(\S+)/g)].map((m) => m[1]);
    assert.deepEqual(ecosystems, ['github-actions']);
    assert.match(text, /directory: \/\s*$/m);
  });
});

describe('documentation does not overstate the GitHub configuration', () => {
  const doc = read(root, 'docs', 'development', 'repository-security.md');

  test('lists the owner actions as not done and names the exact required check', () => {
    assert.match(doc, /Nothing under "Owner actions" has\s+been done/);
    assert.match(doc, /\*\*only\*\* `ci-gate`/);
    assert.match(doc, /production-web/);
    assert.match(doc, /production-admin/);
    assert.match(doc, /production-student/);
  });

  test('never claims that protection, Environments or enforcement are configured', () => {
    assert.doesNotMatch(doc, /(branch protection|rulesets?|environments?|code[- ]owner review|main)[^.\n]{0,40}\b(is|are|has been|have been)( now)? (configured|enabled|enforced|set up|protected)\b/i);
  });
});
