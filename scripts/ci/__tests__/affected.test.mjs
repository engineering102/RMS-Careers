// Run with: node --test scripts/ci/__tests__/   (or: pnpm test:ci-scripts)
// Pure path/graph tests: no database, no network, no Cloudflare. The real-workspace test shells out
// to `pnpm -r ls` and `git` locally; everything else uses an injected fixture workspace.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertGraphComplete,
  ciPlan,
  classifyFiles,
  classifyRootPackageJson,
  degradedResult,
  dependentsOf,
  detect,
  globToRegExp,
  loadWorkspace,
  parseArgs,
  workspaceFromPnpmJson
} from '../affected.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// Fixture graph mirroring the real one: db -> web/admin/student/auth, auth -> admin/student.
const R = 'C:/repo';
const proj = (name, rel, links = []) => ({
  name,
  path: rel ? `${R}/${rel}` : R,
  dependencies: Object.fromEntries(links.map((l) => [l, { version: `link:../${l}` }])),
  devDependencies: { vitest: { version: '2.0.0' } }
});
const FIXTURE = workspaceFromPnpmJson(
  [
    proj('rms-careers', ''),
    proj('@rms/web', 'apps/web', ['@rms/db']),
    proj('@rms/admin', 'apps/admin', ['@rms/db', '@rms/auth']),
    proj('@rms/student', 'apps/student', ['@rms/db', '@rms/auth']),
    proj('@rms/auth', 'packages/auth', ['@rms/db']),
    proj('@rms/db', 'packages/db')
  ],
  R
);
const ALL_APPS = ['admin', 'student', 'web'];

const run = (files, ctx) => classifyFiles(files, FIXTURE, ctx);

describe('workspace graph', () => {
  test('fixture graph is derived from pnpm-shaped JSON (link: edges only)', () => {
    assert.deepEqual([...dependentsOf(FIXTURE, '@rms/auth')].sort(), ['@rms/admin', '@rms/auth', '@rms/student']);
    assert.deepEqual([...dependentsOf(FIXTURE, '@rms/db')].sort(), [
      '@rms/admin',
      '@rms/auth',
      '@rms/db',
      '@rms/student',
      '@rms/web'
    ]);
  });

  test('the REAL workspace (pnpm) has the expected consumers: db -> all, auth -> admin+student, web !-> auth', () => {
    const ws = loadWorkspace(REPO_ROOT);
    const apps = (name) => [...dependentsOf(ws, name)].filter((n) => ws.projects.find((p) => p.name === n)?.kind === 'app').sort();
    assert.deepEqual(apps('@rms/db'), ['@rms/admin', '@rms/student', '@rms/web']);
    assert.deepEqual(apps('@rms/auth'), ['@rms/admin', '@rms/student']);
    const web = ws.projects.find((p) => p.name === '@rms/web');
    assert.ok(!web.deps.includes('@rms/auth'));
  });
});

describe('required edge cases', () => {
  test('1. web source change', () => {
    const r = run(['apps/web/app/page.tsx']);
    assert.deepEqual(r.affectedApps, ['web']);
    assert.deepEqual(r.deployableApps, ['web']);
    assert.equal(r.ciOnly, false);
    assert.equal(r.allApps, false);
  });

  test('2. admin source change', () => {
    const r = run(['apps/admin/lib/db/queries/batches.ts']);
    assert.deepEqual(r.affectedApps, ['admin']);
    assert.deepEqual(r.deployableApps, ['admin']);
  });

  test('3. student source change', () => {
    const r = run(['apps/student/components/Button.tsx']);
    assert.deepEqual(r.affectedApps, ['student']);
    assert.deepEqual(r.deployableApps, ['student']);
  });

  test('4. shared @rms/auth source -> admin + student only (never web)', () => {
    const r = run(['packages/auth/src/rbac.ts']);
    assert.deepEqual(r.affectedApps, ['admin', 'student']);
    assert.deepEqual(r.deployableApps, ['admin', 'student']);
    assert.deepEqual(r.affectedPackages, ['@rms/auth']);
    assert.equal(r.allApps, false);
  });

  test('5. shared @rms/db runtime source -> web + admin + student (and auth package CI)', () => {
    for (const f of ['packages/db/src/schema.ts', 'packages/db/src/index.ts', 'packages/db/src/tx.ts', 'packages/db/package.json']) {
      const r = run([f]);
      assert.deepEqual(r.affectedApps, ALL_APPS, f);
      assert.deepEqual(r.deployableApps, ALL_APPS, f);
      assert.deepEqual(r.affectedPackages, ['@rms/auth', '@rms/db'], f);
      assert.equal(r.allApps, false, f);
    }
  });

  test('6. app test changes: CI for the app, NEVER deploy', () => {
    for (const f of [
      'apps/student/foo.test.ts',
      'apps/student/lib/__tests__/overview.test.ts',
      'apps/admin/lib/__tests__/batch-management.int.test.ts',
      'apps/web/lib/__tests__/helper.ts',
      'apps/student/vitest.config.ts',
      'apps/admin/vitest.int.config.ts'
    ]) {
      const r = run([f]);
      assert.equal(r.affectedApps.length, 1, f);
      assert.deepEqual(r.deployableApps, [], f);
      assert.equal(r.ciOnly, true, f);
    }
    assert.deepEqual(run(['apps/student/foo.test.ts']).affectedApps, ['student']);
  });

  test('app seed/verify scripts are CI-only (not shipped in the Worker)', () => {
    const r = run(['apps/student/scripts/seed-student.ts', 'apps/admin/scripts/seed-admin.ts']);
    assert.deepEqual(r.affectedApps, ['admin', 'student']);
    assert.deepEqual(r.deployableApps, []);
  });

  test('7. CI workflow change: CI-only, no deploy', () => {
    const r = run(['.github/workflows/ci.yml']);
    assert.equal(r.ciInfra, true);
    assert.equal(r.ciOnly, true);
    assert.deepEqual(r.deployableApps, []);
    assert.equal(r.allApps, false);
  });

  test('8. scripts/ci change: CI-only, no deploy', () => {
    for (const f of ['scripts/ci/affected.mjs', 'scripts/ci/__tests__/affected.test.mjs', 'scripts/ci/smoke.mjs']) {
      const r = run([f]);
      assert.equal(r.ciInfra, true, f);
      assert.equal(r.ciOnly, true, f);
      assert.deepEqual(r.deployableApps, [], f);
    }
  });

  test('9. documentation change: nothing to build or deploy', () => {
    const r = run(['docs/development/testing.md', 'README.md', 'CLAUDE.md', 'AGENTS.md', 'docs/audits/x.md', 'apps/web/README.md', '.agents/skills/x/SKILL.md', 'skills-lock.json', '.gitignore', '.env.example', 'apps/admin/.env.example']);
    assert.deepEqual(r.affectedApps, []);
    assert.deepEqual(r.deployableApps, []);
    assert.deepEqual(r.affectedPackages, []);
    assert.equal(r.ciOnly, false);
    assert.equal(r.ciInfra, false);
    assert.equal(r.allApps, false);
  });

  test('10. lockfile change: conservative all apps', () => {
    const r = run(['pnpm-lock.yaml']);
    assert.equal(r.allApps, true);
    assert.deepEqual(r.deployableApps, ALL_APPS);
    assert.deepEqual(r.affectedPackages, ['@rms/auth', '@rms/db']);
  });

  test('11. root package.json: scripts-only is CI-infra; anything else is all apps; unverifiable fails closed', () => {
    const base = { name: 'rms-careers', packageManager: 'pnpm@9.15.4', scripts: { test: 'a' } };
    const scriptsOnly = { ...base, scripts: { test: 'b', 'test:int': 'c' } };
    const dep = { ...base, pnpm: { overrides: { next: '15.5.27' } } };
    const deepDep = { ...dep, pnpm: { overrides: { next: '15.5.28' } } };

    let r = run(['package.json'], { baseRootPackageJson: base, headRootPackageJson: scriptsOnly });
    assert.equal(r.ciInfra, true);
    assert.deepEqual(r.deployableApps, []);
    assert.equal(r.allApps, false);

    r = run(['package.json'], { baseRootPackageJson: base, headRootPackageJson: dep });
    assert.equal(r.allApps, true);
    assert.deepEqual(r.deployableApps, ALL_APPS);

    // nested value change must be seen (guards against a shallow comparison)
    assert.equal(classifyRootPackageJson(dep, deepDep), 'deploy-all');
    // key order is irrelevant
    assert.equal(classifyRootPackageJson({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), 'ci-infra');

    assert.equal(run(['package.json']).allApps, true); // no contents available -> fail closed
    assert.equal(run(['package.json'], { baseRootPackageJson: null, headRootPackageJson: base }).allApps, true);
  });

  test('12. unknown root/other files fail closed', () => {
    for (const f of ['mystery.config.js', 'scripts/new-tool.mjs', 'Dockerfile', 'tools/x.sh', 'apps/newapp/package.json', 'packages/newpkg/src/a.ts', '.nvmrc', 'tsconfig.base.json']) {
      const r = run([f]);
      assert.equal(r.allApps, true, f);
      assert.deepEqual(r.deployableApps, ALL_APPS, f);
    }
  });

  test('build guard script is infra: all apps', () => {
    const r = run(['scripts/check-cloudflare-build-env.mjs']);
    assert.equal(r.allApps, true);
    assert.deepEqual(r.deployableApps, ALL_APPS);
  });

  test('13. multiple apps changed', () => {
    const r = run(['apps/web/app/page.tsx', 'apps/student/app/layout.tsx']);
    assert.deepEqual(r.affectedApps, ['student', 'web']);
    assert.deepEqual(r.deployableApps, ['student', 'web']);
  });

  test('14. mixed source + test changes: tests do not hide or add deployment', () => {
    const r = run(['apps/student/lib/x.ts', 'apps/student/lib/__tests__/x.test.ts', 'apps/admin/lib/__tests__/y.test.ts']);
    assert.deepEqual(r.affectedApps, ['admin', 'student']);
    assert.deepEqual(r.deployableApps, ['student']); // admin only has a test change
    assert.equal(r.ciOnly, false);
  });

  test('15. mixed app + docs changes: docs add nothing', () => {
    const r = run(['apps/web/app/page.tsx', 'docs/x.md', 'README.md']);
    assert.deepEqual(r.affectedApps, ['web']);
    assert.deepEqual(r.deployableApps, ['web']);
  });

  test('16. migration-only / db tooling changes: CI for consumers, NO deploy', () => {
    for (const f of [
      'packages/db/drizzle/0005_new.sql',
      'packages/db/drizzle/meta/_journal.json',
      'packages/db/scripts/test-db-bootstrap.ts',
      'packages/db/src/testing/setup-int.ts',
      'packages/db/src/guard-env.ts',
      'packages/db/drizzle.config.ts'
    ]) {
      const r = run([f]);
      assert.deepEqual(r.affectedApps, ALL_APPS, f);
      assert.deepEqual(r.deployableApps, [], f);
      assert.equal(r.ciOnly, true, f);
      assert.equal(r.allApps, false, f);
    }
  });

  test('migration + app change together: only the app deploys', () => {
    const r = run(['packages/db/drizzle/0005_new.sql', 'apps/web/app/page.tsx']);
    assert.deepEqual(r.deployableApps, ['web']);
    assert.deepEqual(r.affectedApps, ALL_APPS);
  });

  test('17. package tests: CI for that package only, no deploy, consumers untouched', () => {
    let r = run(['packages/db/src/__tests__/guard.test.ts']);
    assert.deepEqual(r.affectedPackages, ['@rms/db']);
    assert.deepEqual(r.affectedApps, []);
    assert.deepEqual(r.deployableApps, []);
    assert.equal(r.ciOnly, true);

    r = run(['packages/auth/src/__tests__/rbac.test.ts', 'packages/auth/vitest.config.ts']);
    assert.deepEqual(r.affectedPackages, ['@rms/auth']);
    assert.deepEqual(r.deployableApps, []);
  });

  test('18. package source consumed by multiple apps', () => {
    const r = run(['packages/auth/src/passwords.ts', 'packages/db/src/schema.ts']);
    assert.deepEqual(r.deployableApps, ALL_APPS);
    const auth = run(['packages/auth/src/passwords.ts']);
    assert.deepEqual(auth.deployableApps, ['admin', 'student']);
  });
});

describe('robustness', () => {
  test('empty change set is an explicit empty result, not an error', () => {
    const r = run([]);
    assert.deepEqual(r.affectedApps, []);
    assert.equal(r.degraded, false);
    assert.equal(r.ciOnly, false);
  });

  test('output is deterministic: order and duplicates do not matter', () => {
    const a = run(['apps/web/a.ts', 'packages/auth/src/x.ts', 'docs/a.md', 'apps/web/a.ts']);
    const b = run(['docs/a.md', 'packages/auth/src/x.ts', 'apps/web/a.ts']);
    assert.deepEqual(a, b);
  });

  test('Windows-style paths and ./ prefixes are normalized', () => {
    const r = run(['.\\apps\\web\\app\\page.tsx', './docs/a.md']);
    assert.deepEqual(r.deployableApps, ['web']);
  });

  test('a rename out of an app counts both paths (old app still affected)', () => {
    const r = run(['apps/admin/lib/a.ts', 'apps/student/lib/a.ts']);
    assert.deepEqual(r.deployableApps, ['admin', 'student']);
  });

  test('app-looking lookalike prefixes do not match another project', () => {
    const r = run(['apps/web-extra/x.ts']);
    assert.equal(r.allApps, true); // not apps/web -> unknown -> fail closed
  });

  test('degraded result is fail-closed: everything affected and deployable', () => {
    const r = degradedResult(FIXTURE, new Error('boom'));
    assert.equal(r.degraded, true);
    assert.equal(r.allApps, true);
    assert.deepEqual(r.deployableApps, ALL_APPS);
    assert.equal(r.ciOnly, false);
    assert.match(r.error, /boom/);
    const noWs = degradedResult(null, 'no pnpm');
    assert.deepEqual(noWs.deployableApps, ALL_APPS);
  });

  test('glob matcher semantics', () => {
    assert.ok(globToRegExp('**/__tests__/**').test('lib/__tests__/a/b.ts'));
    assert.ok(globToRegExp('**/__tests__/**').test('__tests__/a.ts'));
    assert.ok(!globToRegExp('**/__tests__/**').test('lib/tests/a.ts'));
    assert.ok(globToRegExp('**/*.test.*').test('a/b/c.int.test.ts'));
    assert.ok(!globToRegExp('*.md').test('docs/a.md'));
    assert.ok(globToRegExp('tsconfig*.json').test('tsconfig.base.json'));
    assert.ok(!globToRegExp('src/guard-env.ts').test('src/guard-envXts'));
  });

  test('CLI argument parsing: base is required and never defaulted', () => {
    assert.throws(() => parseArgs([]), /--base/);
    assert.throws(() => parseArgs(['--head', 'abc']), /--base/);
    assert.throws(() => parseArgs(['--bogus']), /unknown argument/);
    assert.throws(() => parseArgs(['--base']), /requires a value/);
    assert.throws(() => parseArgs(['--base', 'a', '--files-from', 'x']), /either/);
    assert.deepEqual(parseArgs(['--base', 'a', '--head', 'b', '--pretty']), { pretty: true, base: 'a', head: 'b' });
    assert.equal(parseArgs(['--files-from', '-']).filesFrom, '-');
  });
});

describe('git integration (temporary repository)', () => {
  const git = (cwd, ...args) =>
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], {
      cwd,
      encoding: 'utf8'
    }).trim();

  function makeRepo() {
    const dir = mkdtempSync(path.join(tmpdir(), 'affected-'));
    git(dir, 'init', '-q');
    const put = (rel, content = 'x') => {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), content);
    };
    put('package.json', JSON.stringify({ name: 'root', scripts: { a: '1' } }));
    put('apps/web/app/page.tsx');
    put('apps/admin/app/page.tsx');
    put('docs/a.md');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', 'base');
    return { dir, put };
  }

  test('diffs a real base/head pair and classifies it (injected workspace)', () => {
    const { dir, put } = makeRepo();
    try {
      const base = git(dir, 'rev-parse', 'HEAD');
      put('apps/web/app/page.tsx', 'changed');
      put('apps/admin/lib/__tests__/a.test.ts', 't');
      put('docs/a.md', 'changed');
      git(dir, 'add', '-A');
      git(dir, 'commit', '-qm', 'change');
      const head = git(dir, 'rev-parse', 'HEAD');
      const r = detect({ root: dir, base, head, workspace: FIXTURE });
      assert.deepEqual(r.affectedApps, ['admin', 'web']);
      assert.deepEqual(r.deployableApps, ['web']);
      assert.equal(r.degraded, false);
      assert.equal(r.base, base);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('root package.json scripts-only edit read from git is CI-infra; a dependency edit is all-apps', () => {
    const { dir, put } = makeRepo();
    try {
      const base = git(dir, 'rev-parse', 'HEAD');
      put('package.json', JSON.stringify({ name: 'root', scripts: { a: '2' } }));
      git(dir, 'commit', '-qam', 'scripts');
      const mid = git(dir, 'rev-parse', 'HEAD');
      let r = detect({ root: dir, base, head: mid, workspace: FIXTURE });
      assert.equal(r.ciInfra, true);
      assert.deepEqual(r.deployableApps, []);

      put('package.json', JSON.stringify({ name: 'root', scripts: { a: '2' }, dependencies: { left: '1.0.0' } }));
      git(dir, 'commit', '-qam', 'dep');
      r = detect({ root: dir, base: mid, head: git(dir, 'rev-parse', 'HEAD'), workspace: FIXTURE });
      assert.equal(r.allApps, true);
      assert.deepEqual(r.deployableApps, ALL_APPS);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('base == head yields an explicit empty result; HEAD^ is not assumed', () => {
    const { dir } = makeRepo();
    try {
      const sha = git(dir, 'rev-parse', 'HEAD');
      const r = detect({ root: dir, base: sha, head: sha, workspace: FIXTURE });
      assert.deepEqual(r.deployableApps, []);
      assert.equal(r.degraded, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('unknown/unreachable base fails closed (all apps), never an empty result', () => {
    const { dir } = makeRepo();
    try {
      const r = detect({ root: dir, base: '0'.repeat(40), head: 'HEAD', workspace: FIXTURE });
      assert.equal(r.degraded, true);
      assert.equal(r.allApps, true);
      assert.deepEqual(r.deployableApps, ALL_APPS);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('workspace discovery failure fails closed', () => {
    const { dir } = makeRepo(); // not a pnpm workspace
    try {
      const r = detect({ root: dir, base: 'HEAD', head: 'HEAD' });
      assert.equal(r.degraded, true);
      assert.deepEqual(r.deployableApps, ALL_APPS);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('graph completeness (uninstalled checkout must not look harmless)', () => {
  test('declared workspace deps missing from the pnpm graph throw', () => {
    const empty = workspaceFromPnpmJson(
      [proj('rms-careers', ''), proj('@rms/web', 'apps/web'), proj('@rms/db', 'packages/db')],
      R
    ); // no link: edges, as pnpm reports before `pnpm install`
    assert.throws(() => assertGraphComplete(empty, { '@rms/web': ['@rms/db'] }), /incomplete/);
    assert.doesNotThrow(() => assertGraphComplete(FIXTURE, { '@rms/web': ['@rms/db'], '@rms/auth': ['@rms/db'] }));
  });

  test('detect() on a checkout with no installed dependencies degrades to all apps', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'noinstall-'));
    try {
      for (const [rel, pj] of [
        ['package.json', { name: 'root' }],
        ['apps/web/package.json', { name: '@rms/web', dependencies: { '@rms/db': 'workspace:*' } }],
        ['packages/db/package.json', { name: '@rms/db' }]
      ]) {
        mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        writeFileSync(path.join(dir, rel), JSON.stringify(pj));
      }
      writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
      const r = detect({ root: dir, files: ['packages/db/src/x.ts'] });
      assert.equal(r.degraded, true);
      assert.deepEqual(r.deployableApps, ALL_APPS);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('ciPlan (job inputs)', () => {
  const plan = (files, ctx) => ciPlan(run(files, ctx));
  const ALL_WS = ['@rms/admin', '@rms/auth', '@rms/db', '@rms/student', '@rms/web'];

  test('docs-only: nothing runs', () => {
    assert.deepEqual(plan(['docs/a.md']), { anyCi: false, checkWorkspaces: [], buildApps: [], runIntegration: false, deployApps: [] });
  });

  test('web-only: web checks (+db scan), web build, no integration', () => {
    const p = plan(['apps/web/app/page.tsx']);
    assert.deepEqual(p.checkWorkspaces, ['@rms/db', '@rms/web']);
    assert.deepEqual(p.buildApps, ['web']);
    assert.equal(p.runIntegration, false);
  });

  test('student-only: student build + integration', () => {
    const p = plan(['apps/student/lib/x.ts']);
    assert.deepEqual(p.buildApps, ['student']);
    assert.equal(p.runIntegration, true);
  });

  test('tests-only student change: checks and integration run, no build', () => {
    const p = plan(['apps/student/lib/__tests__/x.test.ts']);
    assert.deepEqual(p.buildApps, []);
    assert.equal(p.runIntegration, true);
    assert.deepEqual(p.checkWorkspaces, ['@rms/db', '@rms/student']);
  });

  test('migration-only: all workspaces checked, integration runs, no build', () => {
    const p = plan(['packages/db/drizzle/0005.sql']);
    assert.deepEqual(p.checkWorkspaces, ALL_WS);
    assert.equal(p.runIntegration, true);
    assert.deepEqual(p.buildApps, []);
    assert.deepEqual(p.deployApps, []);
  });

  test('auth source: admin+student build, web not built', () => {
    const p = plan(['packages/auth/src/rbac.ts']);
    assert.deepEqual(p.buildApps, ['admin', 'student']);
    assert.ok(!p.checkWorkspaces.includes('@rms/web'));
  });

  test('workflow change: everything is exercised (checks, integration, all cf:builds) but nothing deploys', () => {
    const p = plan(['.github/workflows/ci.yml']);
    assert.deepEqual(p.checkWorkspaces, ALL_WS);
    assert.deepEqual(p.buildApps, ALL_APPS);
    assert.equal(p.runIntegration, true);
    assert.deepEqual(p.deployApps, []);
  });

  test('lockfile / unknown file / degraded: everything, including deploy set', () => {
    for (const r of [run(['pnpm-lock.yaml']), run(['mystery.txt']), degradedResult(FIXTURE, 'x')]) {
      const p = ciPlan(r);
      assert.deepEqual(p.checkWorkspaces, ALL_WS);
      assert.deepEqual(p.buildApps, ALL_APPS);
      assert.deepEqual(p.deployApps, ALL_APPS);
      assert.equal(p.runIntegration, true);
    }
  });
});

describe('CLI', () => {
  const cli = path.join(REPO_ROOT, 'scripts', 'ci', 'affected.mjs');

  test('prints one JSON document; --files-from works against the real workspace', () => {
    const out = execFileSync('node', [cli, '--files-from', '-'], {
      cwd: REPO_ROOT,
      input: 'packages/auth/src/rbac.ts\ndocs/a.md\n',
      encoding: 'utf8'
    });
    const r = JSON.parse(out);
    assert.equal(r.schemaVersion, 1);
    assert.deepEqual(r.deployableApps, ['admin', 'student']);
    assert.equal(r.degraded, false);
  });

  test('exits 2 with usage when --base is missing', () => {
    assert.throws(
      () => execFileSync('node', [cli], { cwd: REPO_ROOT, stdio: 'pipe' }),
      (e) => e.status === 2 && /--base/.test(String(e.stderr))
    );
  });
});

describe('CLI --github-output', () => {
  test('appends key=json lines usable as $GITHUB_OUTPUT', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ghout-'));
    const out = path.join(dir, 'out.txt');
    try {
      execFileSync('node', [path.join(REPO_ROOT, 'scripts', 'ci', 'affected.mjs'), '--files-from', '-', '--github-output', out], {
        cwd: REPO_ROOT,
        input: 'apps/web/app/page.tsx\n',
        encoding: 'utf8'
      });
      const lines = Object.fromEntries(
        readFileSync(out, 'utf8').trim().split('\n').map((l) => [l.slice(0, l.indexOf('=')), JSON.parse(l.slice(l.indexOf('=') + 1))])
      );
      assert.deepEqual(lines.build_apps, ['web']);
      assert.deepEqual(lines.deploy_apps, ['web']);
      assert.equal(lines.run_integration, false);
      assert.equal(lines.degraded, false);
      assert.deepEqual(lines.check_workspaces, ['@rms/db', '@rms/web']);
      assert.equal(lines.result.schemaVersion, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
