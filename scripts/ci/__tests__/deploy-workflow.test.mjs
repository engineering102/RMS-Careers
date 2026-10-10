import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replaceAll('\r\n', '\n');
const split = (text) => text.split('\n');
const strip = (text) => split(text).filter((l) => !l.trim().startsWith('#')).join('\n');

const deployRaw = read('.github', 'workflows', 'deploy.yml');
const appRaw = read('.github', 'workflows', 'deploy-app.yml');
const rollbackRaw = read('.github', 'workflows', 'rollback.yml');
const deploy = strip(deployRaw);
const app = strip(appRaw);
const rollback = strip(rollbackRaw);
const both = `${deploy}\n${app}`;

/** The text of one top-level job (from `  name:` to the next job). */
const job = (code, name) => {
  const lines = split(code);
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `job ${name} exists`);
  const end = lines.findIndex((l, i) => i > start && /^ {2}[a-z-]+:$/.test(l));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
};
const jobNames = (code) => {
  const lines = split(code);
  const from = lines.findIndex((l) => l === 'jobs:');
  return lines.slice(from + 1).filter((l) => /^ {2}[a-z-]+:$/.test(l)).map((l) => l.trim().slice(0, -1));
};
/** Shell text of every `run:` step (inline or block), so injection and forbidden commands can be checked on shell only. */
const runBodies = (code) => {
  const lines = split(code);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const body = [m[2]];
    for (let j = i + 1; j < lines.length && (lines[j].trim() === '' || lines[j].search(/\S/) > indent + (lines[i].trimStart().startsWith('- ') ? 2 : 0)); j++) body.push(lines[j]);
    out.push(body.join('\n'));
  }
  return out;
};
const step = (jobText, name) => {
  const i = jobText.indexOf(`- name: ${name}`);
  assert.ok(i >= 0, `step "${name}" exists`);
  const rest = jobText.slice(i + 1);
  const next = rest.search(/\n {6}- /);
  return jobText.slice(i, next === -1 ? undefined : i + 1 + next);
};

describe('deploy.yml: triggers', () => {
  test('exactly workflow_run (CI completed on main) and workflow_dispatch; nothing else', () => {
    assert.match(deploy, /^on:\n {2}workflow_run:\n {4}workflows: \[CI\]\n {4}types: \[completed\]\n {4}branches: \[main\]\n {2}workflow_dispatch:\n/m);
    assert.doesNotMatch(deploy, /^\s+(push|pull_request|pull_request_target|schedule|repository_dispatch|workflow_call):/m);
  });
  test('the workflow named in workflow_run is the real ci.yml workflow', () => assert.match(read('.github', 'workflows', 'ci.yml'), /^name: CI$/m));
  test('the dispatch rehearsal defaults to true, and bootstrap defaults to false', () => {
    assert.match(deploy, /dry_run:\n(?: {8}.+\n)*? {8}default: true/);
    assert.match(deploy, /bootstrap:\n(?: {8}.+\n)*? {8}default: false/);
    assert.match(deploy, /options: \[all, web, admin, student\]/);
  });
  test('deploy-app.yml is workflow_call only and defaults to a rehearsal', () => {
    assert.match(app, /^on:\n {2}workflow_call:\n/m);
    assert.doesNotMatch(app, /^\s+(push|pull_request|pull_request_target|schedule|workflow_run|workflow_dispatch|repository_dispatch):/m);
    assert.match(app, /dry_run:\n(?: {8}.+\n)*? {8}default: true/);
  });
});

describe('deploy.yml: the gate', () => {
  const gate = job(deploy, 'gate');
  test('read-only token with exactly the scopes it needs; no Environment, no secret, no Cloudflare name', () => {
    assert.match(deploy, /^permissions: \{\}$/m);
    assert.match(gate, /permissions:\n {6}contents: read\n {6}actions: read\n/);
    assert.doesNotMatch(gate, /write|environment:|secrets\.|CLOUDFLARE|checks:/, 'workflow runs and jobs need actions: read; check runs are not read at all');
  });
  test('the gate runs only on main, and a dispatch from any other ref FAILS loudly (it never skips to green)', () => {
    assert.match(gate, /if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}/);
    const refuse = job(deploy, 'refuse-non-main');
    assert.match(refuse, /if: \$\{\{ github\.ref != 'refs\/heads\/main' \}\}/);
    assert.match(refuse, /permissions: \{\}/);
    assert.match(refuse, /exit 1/);
    assert.doesNotMatch(refuse, /environment:|secrets\.|vars\.|checkout|pnpm|node |uses:/);
    // the refusal and the gate are mutually exclusive, and the per-app jobs depend on the gate only
    assert.doesNotMatch(refuse, /needs:/);
    for (const a of ['web', 'admin', 'student']) assert.match(job(deploy, a), /needs: gate\n/);
  });
  test('the gate script reads workflow runs and the jobs of an attempt, not the unspecified check-runs/filter=latest', () => {
    const gateSrc = read('scripts', 'ci', 'deploy-gate.mjs');
    assert.match(gateSrc, /actions\/runs\/\$\{runId\}\/attempts\/\$\{attempt\}\/jobs/);
    assert.doesNotMatch(gateSrc.replace(/\/\*\*[\s\S]*?\*\//g, ''), /check-runs|filter=latest/);
  });
  test('the master switch is read by the gate and by the deploy step; the only other variable is the account id', () => {
    assert.deepEqual(both.match(/\$\{\{\s*vars\.[A-Z_]+\s*\}\}/g).sort(), ['${{ vars.CLOUDFLARE_ACCOUNT_ID }}', '${{ vars.PRODUCTION_DEPLOY_ENABLED }}', '${{ vars.PRODUCTION_DEPLOY_ENABLED }}']);
    assert.match(gate, /PRODUCTION_DEPLOY_ENABLED: \$\{\{ vars\.PRODUCTION_DEPLOY_ENABLED \}\}/);
  });
  test('inputs reach the script only through environment variables, with a full clone', () => {
    assert.match(gate, /fetch-depth: 0/);
    assert.match(gate, /INPUT_APP: \$\{\{ inputs\.app \}\}/);
    for (const body of runBodies(deploy)) assert.doesNotMatch(body, /\$\{\{/);
    assert.match(gate, /run: node scripts\/ci\/deploy-gate\.mjs/);
  });
  test('the gate checkout does not pick a commit from the event (the script decides, exactly)', () => {
    assert.doesNotMatch(gate, /ref:/);
    assert.doesNotMatch(deploy, /github\.event\.workflow_run\.head_sha|github\.sha/);
  });
});

describe('deploy.yml: per-app isolation (no matrix)', () => {
  const jobs = ['web', 'admin', 'student'];
  test('exactly gate + web + admin + student, no matrix, no shared output map', () => {
    assert.deepEqual(jobNames(deploy), ['refuse-non-main', 'gate', ...jobs]);
    assert.doesNotMatch(both, /strategy:|matrix\.|outputs\[/);
  });
  for (const a of jobs) {
    test(`${a} passes its OWN app, the gate's exact sha, and reaches deploy-app.yml with only the scopes it needs`, () => {
      const j = job(deploy, a);
      assert.match(j, /needs: gate\n/);
      assert.match(j, new RegExp(`contains\\(fromJSON\\(needs\\.gate\\.outputs\\.apps\\), '${a}'\\)`));
      assert.match(j, /needs\.gate\.outputs\.proceed == 'true'/);
      assert.match(j, /uses: \.\/\.github\/workflows\/deploy-app\.yml\n/);
      assert.match(j, new RegExp(`with:\\n {6}app: ${a}\\n {6}sha: \\$\\{\\{ needs\\.gate\\.outputs\\.sha \\}\\}\\n {6}bootstrap: \\$\\{\\{ needs\\.gate\\.outputs\\.bootstrap == 'true' \\}\\}\\n {6}dry_run: \\$\\{\\{ needs\\.gate\\.outputs\\.dry_run == 'true' \\}\\}`));
      assert.match(j, /permissions:\n {6}contents: read\n {6}deployments: write\n {6}actions: read\n/, 'a called workflow cannot hold a permission its caller did not grant');
      assert.doesNotMatch(j, /environment:/, 'the Environment lives in the deploy job only');
      // Without inheritance the called deploy job sees the Environment's variables but its secrets resolve empty (observed).
      assert.match(j, /\n {4}secrets: inherit(\n|$)/);
      assert.equal([...j.matchAll(/secrets/g)].length, 1, 'inherit only; no secret is named or passed explicitly');
    });
  }
  test('secrets are inherited only by the per-app callers in deploy.yml; deploy-app.yml forwards none', () => {
    assert.equal([...deploy.matchAll(/secrets/g)].length, 3);
    assert.doesNotMatch(app, /^\s+secrets:/m, 'deploy-app.yml passes no secret to artifact-poc-app.yml');
  });
});

describe('deploy-app.yml: jobs, permissions and credential scope', () => {
  const plan = job(app, 'plan');
  const artifact = job(app, 'artifact');
  const rehearse = job(app, 'rehearse');
  const deployJob = job(app, 'deploy');

  test('exactly plan -> artifact -> rehearse | deploy', () => assert.deepEqual(jobNames(app), ['plan', 'artifact', 'rehearse', 'deploy']));

  test('workflow-level token is read-only and the database variables are blanked', () => {
    assert.match(app, /^permissions:\n {2}contents: read\n/m);
    assert.match(app, /POSTGRES_URL: ''/);
    assert.match(app, /DATABASE_URL: ''/);
  });

  test('only the deploy job has an Environment, and it is the per-app protected one', () => {
    assert.deepEqual(app.match(/^\s+environment:.*$/gm).map((l) => l.trim()), ['environment: production-${{ inputs.app }}']);
    for (const j of [plan, artifact, rehearse]) assert.doesNotMatch(j, /environment:/);
    assert.match(deployJob, /environment: production-\$\{\{ inputs\.app \}\}\n/);
  });

  test('the per-app lock is deploy-<app> with cancel-in-progress false, identical to rollback.yml', () => {
    assert.match(deployJob, /concurrency:\n {6}group: deploy-\$\{\{ inputs\.app \}\}\n {6}cancel-in-progress: false\n/);
    assert.match(rollback, /concurrency:\n {6}group: deploy-\$\{\{ inputs\.app \}\}\n {6}cancel-in-progress: false\n/);
    assert.equal([...app.matchAll(/concurrency:/g)].length, 1, 'no other lock');
  });

  test('token scopes: plan/rehearse read deployments, only deploy writes them; nothing else is writable', () => {
    assert.match(plan, /permissions:\n {6}contents: read\n {6}deployments: read\n/);
    assert.doesNotMatch(plan, /actions:/);
    assert.match(rehearse, /permissions:\n {6}contents: read\n {6}deployments: read\n {6}actions: read\n/, 'actions: read lets the rehearsal check the Environment protection');
    assert.match(deployJob, /permissions:\n {6}contents: read\n {6}deployments: write\n {6}actions: read\n/);
    assert.deepEqual(app.match(/^\s+[a-z-]+: write$/gm).map((l) => l.trim()), ['deployments: write']);
    assert.deepEqual(app.match(/^\s+actions: \w+$/gm).map((l) => l.trim()), ['actions: read', 'actions: read']);
    assert.doesNotMatch(app, /id-token|packages:|checks:|pull-requests:|statuses:|contents: write/);
  });

  test('the Cloudflare credential appears exactly once: in the final "Deploy" step of the deploy job', () => {
    assert.equal([...app.matchAll(/secrets\./g)].length, 1);
    assert.equal([...app.matchAll(/vars\./g)].length, 2, 'the account id and the master switch');
    assert.equal([...app.matchAll(/CLOUDFLARE/g)].length, 4, 'two names, each as the variable and inside its reference');
    for (const j of [plan, artifact, rehearse]) assert.doesNotMatch(j, /CLOUDFLARE|secrets\.|vars\./);
    const deployStep = step(deployJob, 'Deploy');
    assert.match(deployStep, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
    assert.match(deployStep, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/);
    assert.match(deployStep, /PRODUCTION_DEPLOY_ENABLED: \$\{\{ vars\.PRODUCTION_DEPLOY_ENABLED \}\}/, 'the executor receives the master switch');
    assert.ok(deployJob.indexOf('secrets.CLOUDFLARE_API_TOKEN') > deployJob.indexOf('pnpm install'));
    assert.ok(deployJob.indexOf('secrets.CLOUDFLARE_API_TOKEN') > deployJob.indexOf('artifact.mjs verify'));
    // job-level env (before `steps:`) carries no credential
    assert.ok(deployJob.indexOf('steps:') < deployJob.indexOf('secrets.CLOUDFLARE_API_TOKEN'));
    assert.equal(deployJob.trimEnd().endsWith(deployStep.trimEnd()), true, 'Deploy is the last step');
  });

  test('the rehearsal and plan paths cannot reach Cloudflare: no credential, no Environment, deploy.mjs gets --dry-run', () => {
    assert.match(rehearse, /if: \$\{\{ inputs\.dry_run && needs\.plan\.outputs\.action == 'deploy' \}\}/);
    assert.match(rehearse, /--expect-manifest-sha256 "\$EXPECT_MANIFEST_SHA256" --dry-run\n/);
    assert.match(deployJob, /if: \$\{\{ !inputs\.dry_run && needs\.plan\.outputs\.action == 'deploy' \}\}/);
    assert.doesNotMatch(deployJob.replace(step(deployJob, 'Deploy'), ''), /deploy\.mjs run/);
    assert.doesNotMatch(step(deployJob, 'Deploy'), /--dry-run/);
  });
});

describe('deploy.mjs: privileged operations are ordered behind the switch and the Environment check', () => {
  const src = read('scripts', 'ci', 'deploy.mjs');
  const body = src.slice(src.indexOf('export async function runDeploy'));
  const at = (needle) => {
    const i = body.indexOf(needle);
    assert.ok(i >= 0, `runDeploy contains ${needle}`);
    return i;
  };
  test('credential check -> master switch -> Environment check -> artifact check -> decision, all before any record is written or wrangler is run', () => {
    const order = ['missing-credentials', 'deploySwitch(env.PRODUCTION_DEPLOY_ENABLED)', 'checkEnvironment({ api, app })', 'await recheck()', 'planApp(', 'unsettledRecords(', 'createRecord(', 'runWrangler(command'].map(at);
    assert.deepEqual(order, [...order].sort((x, y) => x - y));
  });
  test('the real-run decision is "dryRun === false" and nothing else', () => {
    assert.match(body, /const real = dryRun === false;/);
    assert.equal([...body.matchAll(/\breal\b/g)].length > 3, true);
    assert.doesNotMatch(body, /if \(dryRun\)|dryRun \? |!dryRun/);
  });
  test('wrangler deploy is built in exactly one place and only after the switch', () => assert.equal([...src.matchAll(/runWrangler\(command/g)].length, 1));
});

describe('deploy-app.yml: exact commit and immutable artifact promotion', () => {
  const deployJob = job(app, 'deploy');
  const rehearse = job(app, 'rehearse');
  test('every checkout is the exact sha input, full history, no persisted credentials', () => {
    const checkouts = [...app.matchAll(/actions\/checkout@[0-9a-f]{40}[^\n]*\n {8}with:\n {10}ref: \$\{\{ inputs\.sha \}\}\n {10}fetch-depth: 0\n {10}persist-credentials: false/g)];
    assert.equal(checkouts.length, 3, 'plan, rehearse and deploy');
    assert.equal([...app.matchAll(/actions\/checkout@/g)].length, 3);
    assert.doesNotMatch(app, /github\.sha|github\.event|workflow_run/);
  });
  test('the artifact comes from artifact-poc-app.yml at that exact sha (one build, separate verify), with no secret', () => {
    const artifact = job(app, 'artifact');
    assert.match(artifact, /needs: plan\n/);
    assert.match(artifact, /if: \$\{\{ needs\.plan\.outputs\.action == 'deploy' \}\}/);
    assert.match(artifact, /uses: \.\/\.github\/workflows\/artifact-poc-app\.yml\n {4}with:\n {6}app: \$\{\{ inputs\.app \}\}\n {6}sha: \$\{\{ inputs\.sha \}\}\n/);
    assert.doesNotMatch(artifact, /secrets|environment/);
  });
  test('the deploy job downloads with digest-mismatch: error and verifies AGAIN against the handed-over digest, sha and run id', () => {
    assert.match(deployJob, /name: open-next-\$\{\{ inputs\.app \}\}/);
    assert.match(deployJob, /digest-mismatch: error/);
    assert.match(deployJob, /EXPECT_MANIFEST_SHA256: \$\{\{ needs\.artifact\.outputs\.digest \}\}/);
    const verify = step(deployJob, 'Verify integrity, provenance and symlinks, then extract');
    assert.match(verify, /artifact\.mjs verify --app "\$APP"/);
    assert.match(verify, /--expect-sha "\$SHA" --expect-run-id "\$GITHUB_RUN_ID"/);
    assert.match(verify, /--expect-manifest-sha256 "\$EXPECT_MANIFEST_SHA256"/);
    assert.doesNotMatch(verify, /allow-missing-expectations/);
    assert.ok(deployJob.indexOf('download-artifact') < deployJob.indexOf('artifact.mjs verify'));
    assert.ok(deployJob.indexOf('artifact.mjs verify') < deployJob.indexOf('- name: Deploy'));
    assert.match(deployJob, /Assert no build output exists/);
    assert.match(rehearse, /artifact\.mjs verify/);
  });
  test('the deploy and rehearse jobs never build', () => {
    for (const j of [deployJob, rehearse]) {
      assert.doesNotMatch(j, /cf:build|next build|opennextjs-cloudflare|upload-artifact|pnpm[^\n]*\b(build|deploy|preview)\b/);
    }
    assert.doesNotMatch(app, /cf:build|next build|opennextjs-cloudflare|pnpm[^\n]*\bdeploy\b/, 'only artifact-poc-app.yml builds, and only once');
  });
  test('wrangler is never invoked from YAML; deploy.mjs is the only caller', () => {
    for (const body of [...runBodies(app), ...runBodies(deploy)]) assert.doesNotMatch(body, /wrangler/);
    assert.equal([...app.matchAll(/scripts\/ci\/deploy\.mjs (plan|run)/g)].length, 3);
  });
  test('inputs reach shell only through environment variables (no ${{ }} inside run:)', () => {
    for (const body of runBodies(app)) assert.doesNotMatch(body, /\$\{\{/);
  });
  test('the bootstrap mode is derived from the boolean input only', () => {
    assert.equal([...app.matchAll(/MODE: \$\{\{ inputs\.bootstrap && 'bootstrap' \|\| 'deploy' \}\}/g)].length, 2);
  });
});

describe('reusable-workflow contract: every input is passed and every output is consumed as declared', () => {
  /** Names declared under `<key>:` (an indented block of `name:` entries) inside the workflow_call trigger. */
  const declared = (code, key) => {
    const lines = split(code);
    const wc = lines.findIndex((l) => l === '  workflow_call:');
    assert.ok(wc >= 0, 'workflow_call exists');
    const start = lines.findIndex((l, i) => i > wc && l === `    ${key}:`);
    if (start < 0) return [];
    const names = [];
    // the block ends at the first non-blank line indented less than 6 spaces
    for (let i = start + 1; i < lines.length && (lines[i].trim() === '' || lines[i].search(/\S/) >= 6); i++) {
      const m = /^ {6}([a-z_]+):\s*$/.exec(lines[i]);
      if (m) names.push(m[1]);
    }
    return names;
  };
  const requiredInputs = (code) => {
    const lines = split(code);
    const out = [];
    for (const name of declared(code, 'inputs')) {
      const i = lines.findIndex((l) => l === `      ${name}:`);
      let j = i + 1;
      while (j < lines.length && lines[j].search(/\S/) >= 8) j++; // the entry's own properties (8+ spaces)
      if (lines.slice(i + 1, j).some((l) => l === '        required: true')) out.push(name);
    }
    return out;
  };
  const withKeys = (jobText) => {
    const m = /\n {4}with:\n((?: {6}.+\n?)+)/.exec(jobText);
    return m ? [...m[1].matchAll(/^ {6}([a-z_]+):/gm)].map((x) => x[1]) : [];
  };
  const poc = strip(read('.github', 'workflows', 'artifact-poc-app.yml'));

  test('deploy-app.yml declares app, sha, bootstrap and dry_run; app and sha are required', () => {
    assert.deepEqual(declared(app, 'inputs'), ['app', 'sha', 'bootstrap', 'dry_run']);
    assert.deepEqual(requiredInputs(app), ['app', 'sha']);
  });
  test('each per-app caller in deploy.yml passes exactly the declared inputs, no more and no fewer', () => {
    for (const a of ['web', 'admin', 'student']) assert.deepEqual(withKeys(job(deploy, a)), declared(app, 'inputs'), a);
  });
  test('artifact-poc-app.yml declares app and sha and the digest output; deploy-app.yml passes exactly app and sha', () => {
    assert.deepEqual(declared(poc, 'inputs'), ['app', 'sha']);
    assert.deepEqual(declared(poc, 'outputs'), ['digest']);
    assert.deepEqual(withKeys(job(app, 'artifact')), ['app', 'sha']);
  });
  test('every needs.<job>.outputs.<name> reference resolves to a declared output', () => {
    const outputsOf = (code, name) => [...(job(code, name).match(/\n {4}outputs:\n((?: {6}.+\n)+)/)?.[1] ?? '').matchAll(/^ {6}([a-z_]+):/gm)].map((m) => m[1]);
    const refs = (code) => [...code.matchAll(/needs\.([a-z-]+)\.outputs\.([a-z_]+)/g)].map((m) => [m[1], m[2]]);
    for (const [j, o] of refs(deploy)) assert.ok(outputsOf(deploy, j).includes(o), `deploy.yml: needs.${j}.outputs.${o}`);
    for (const [j, o] of refs(app)) {
      const known = j === 'artifact' ? declared(poc, 'outputs') : outputsOf(app, j);
      assert.ok(known.includes(o), `deploy-app.yml: needs.${j}.outputs.${o}`);
    }
  });
  test('the scripts write exactly the outputs the workflows read (gate: proceed, sha, apps, bootstrap, dry_run; plan: action)', () => {
    const gateSrc = read('scripts', 'ci', 'deploy-gate.mjs');
    for (const key of ['proceed', 'sha', 'apps', 'bootstrap', 'dry_run']) assert.match(gateSrc, new RegExp(`\\b${key}: `), `gate writes ${key}`);
    assert.deepEqual(split(job(deploy, 'gate')).filter((l) => /^ {6}[a-z_]+: \$\{\{ steps\.gate\.outputs\./.test(l)).map((l) => l.trim().split(':')[0]), ['proceed', 'sha', 'apps', 'bootstrap', 'dry_run']);
    assert.match(read('scripts', 'ci', 'deploy.mjs'), /action=\$\{decision\.action\}/);
    assert.match(job(app, 'plan'), /outputs:\n {6}action: \$\{\{ steps\.plan\.outputs\.action \}\}/);
  });
});

describe('deploy workflows: no migrations, seeds or database writes; pinned actions', () => {
  test('no migration, seed, drizzle or database credential anywhere', () => {
    assert.doesNotMatch(both, /db:(migrate|push|generate|studio)|\b(admin|student):seed|\bseed\b|drizzle|migrat/i);
    assert.doesNotMatch(both, /TEST_DATABASE|POSTGRES_URL: \$|DATABASE_URL: \$\{\{/);
    assert.doesNotMatch(both, /\bpsql\b|neon/i);
  });
  test('every action is pinned to a full commit SHA with a version comment', () => {
    for (const raw of [deployRaw, appRaw]) {
      const uses = split(raw).filter((l) => /^\s*-?\s*uses:/.test(l) && !/uses: \.\//.test(l));
      assert.ok(uses.length >= 2);
      for (const l of uses) assert.match(l, /uses:\s+[\w.-]+\/[\w.-]+@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+$/, l);
    }
    for (const l of split(deployRaw).filter((x) => /^\s*uses:/.test(x))) assert.match(l, /uses: \.\/\.github\/workflows\/deploy-app\.yml$/);
  });
  test('the headers claim only what has run on GitHub (the rehearsal path) and say the real-deploy path has not', () => {
    assert.match(deployRaw, /REHEARSAL path \(workflow_dispatch with dry_run\) has been run on GitHub Actions/);
    assert.match(deployRaw, /has NOT yet been run on GitHub Actions/);
    assert.match(appRaw, /plan, artifact and rehearse jobs have run on GitHub Actions/);
    assert.match(appRaw, /The deploy job has NOT yet been run on GitHub Actions/);
  });
  test('the comments do not say a rehearsal needs no Environment: it READS the protected Environment and fails closed', () => {
    for (const raw of [deployRaw, appRaw]) assert.doesNotMatch(raw, /no credential, no Environment[,)]/i);
    assert.match(deployRaw, /READS the Environment\n# through the API and fails closed/);
    assert.match(appRaw, /READS the production-<app> Environment through/);
    assert.match(deployRaw, /An app that is skipped \(already deployed, unchanged, superseded\) was NOT rehearsed/);
    assert.match(appRaw, /a skip is never rehearsal evidence/);
  });
  test('the rehearse job still names no Environment and holds no secret, even though deploy.mjs reads the Environment through the API', () => {
    const rehearse = job(app, 'rehearse');
    assert.doesNotMatch(rehearse, /^\s+environment:/m);
    assert.doesNotMatch(rehearse, /secrets\.|CLOUDFLARE/);
    assert.match(rehearse, /actions: read/, 'the Environment read needs actions: read');
  });
});

describe('deploy workflows: compatibility with the merged rollback and CI workflows', () => {
  test('ci.yml and the Phase 3 artifact workflows do not reference the deploy workflows', () => {
    for (const f of ['ci.yml', 'artifact-poc.yml', 'artifact-poc-app.yml']) assert.doesNotMatch(read('.github', 'workflows', f), /deploy\.yml|deploy-app\.yml|deploy\.mjs|deploy-gate/, f);
  });
  test('the Phase 3 artifact workflows still carry no Environment, secret, or deployments scope', () => {
    for (const f of ['artifact-poc.yml', 'artifact-poc-app.yml']) {
      const code = strip(read('.github', 'workflows', f));
      assert.doesNotMatch(code, /^\s+environment:|secrets\.|vars\.|deployments:|CLOUDFLARE/m, f);
    }
  });
  test('rollback.yml keeps its own safeguards: manual only, rehearsal default, main only, same Environment shape', () => {
    assert.match(rollback, /^on:\n {2}workflow_dispatch:\n/m);
    assert.match(rollback, /environment: production-\$\{\{ inputs\.app \}\}/);
    assert.match(rollback, /github\.ref == 'refs\/heads\/main'/);
    assert.match(rollback, /dry_run:\n(?: {8}.+\n)*? {8}default: true/);
  });
  test('the deploy-side record statuses are the ones the rollback reader understands', async () => {
    const { DEPLOY } = await import('../deploy.mjs');
    const { RECOVERY } = await import('../rollback.mjs');
    const all = [...Object.values(DEPLOY), ...Object.values(RECOVERY)];
    assert.equal(new Set(all).size, all.length, 'no description prefix is shared between deploy and rollback');
  });
});

describe('documentation states what is and is not implemented', () => {
  const runbook = read('docs', 'development', 'deployment.md');
  const spec = read('docs', 'plans', 'phase-4-production-deployment-spec.md');
  test('the runbook documents the trigger, exact-SHA gate, records, Environments, bootstrap, smoke and the unverified items', () => {
    for (const needle of ['workflow_run', 'head_sha', 'ci-gate', 'intent', 'evidence', 'production-web', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'PRODUCTION_DEPLOY_ENABLED', 'bootstrap', 'smoke', 'rollback']) {
      assert.ok(runbook.includes(needle), `runbook mentions ${needle}`);
    }
    assert.match(runbook, /not (yet )?(been )?(run|verified|operational)/i);
  });
  test('neither document claims a deployment has happened', () => {
    assert.doesNotMatch(runbook, /successfully deployed to production|deployed successfully|is live in production|pipeline (has )?deployed/i);
    assert.match(runbook, /Nothing has been deployed by this pipeline/);
    assert.match(spec, /No deployment has ever been performed/);
    assert.match(spec, /Production rollback is NOT operational yet/);
  });
});
