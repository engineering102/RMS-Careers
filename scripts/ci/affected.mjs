#!/usr/bin/env node
/**
 * Affected-app classifier (CI/CD Phase 1).
 *
 * Given a BASE and a HEAD commit, decides which workspace apps must be VALIDATED by CI
 * ("affected") and which must be DEPLOYED to production ("deployable"). The two are different:
 * a tests-only change affects an app (its tests must run) but never deploys it.
 *
 * Usage (run from a checkout of HEAD):
 *   node scripts/ci/affected.mjs --base <sha> --head <sha> [--pretty]
 *   node scripts/ci/affected.mjs --files-from <file|-> [--pretty]     # newline-separated paths, no git
 *   ... --github-output <path>   also append the CI plan as `key=json` lines (for $GITHUB_OUTPUT)
 *
 * BASE IS SUPPLIED BY THE CALLER. It is deliberately NOT defaulted to HEAD^. The right base differs
 * per use: a pull request wants `git merge-base origin/main HEAD`; a deploy on `main` wants the last
 * SUCCESSFULLY DEPLOYED commit of each app (a later phase), because "the previous commit" would
 * silently skip an app whose last deploy failed or was superseded.
 *
 * Output: one JSON document on stdout (schemaVersion 1):
 *   affectedApps      apps (dir name under apps/, e.g. "web") whose CI must run
 *   deployableApps    subset of apps whose production deploy is warranted
 *   affectedPackages  non-app workspace packages (pnpm names, e.g. "@rms/db") whose own CI must run
 *   ciInfra           true if CI/workflow tooling itself changed (.github/**, scripts/ci/**, ...)
 *   ciOnly            true if something needs CI but nothing deploys
 *   allApps           true if conservative all-app invalidation was applied (infra or unknown file)
 *   degraded / error  true / message if detection itself failed (output is then all-apps, fail closed)
 *   reasons           human-readable list of the rules that fired
 *
 * Exit codes: 0 = a result was produced (including a degraded, fail-closed one); 2 = bad usage.
 *
 * The workspace graph comes from pnpm (`pnpm -r ls --depth 0 --json`, workspace `link:` edges);
 * nothing in this file hard-codes which app uses which package. Only the path RULES below are ours.
 * Dependency-free (Node built-ins only).
 */
import { execFileSync, execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------------------------
// Path rules. Everything NOT matched by an "ignore"/"non-deploy" rule below defaults to the
// conservative class, so unknown files can only ever err toward more CI/deploy, never less.
// ---------------------------------------------------------------------------------------------

/** Files that can never change a build or a test (docs, templates). Checked inside projects. */
const DOC_GLOBS = ['**/*.md', '**/.env.example', '**/.dev.vars.example'];

/** Test files: they run in CI for their own project but are not shipped in any Worker bundle. */
const TEST_GLOBS = [
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/vitest.config.*',
  '**/vitest.*.config.*'
];

/**
 * Inside an APP: files that belong to the app's CI but are not part of its runtime bundle.
 * `scripts/**` are CLI seed/verify scripts (only a unit test imports them; no app/lib code does).
 */
const APP_NON_DEPLOY_GLOBS = ['scripts/**'];

/**
 * Inside a PACKAGE: files that are migrations / test tooling / CLI tooling and never reach a
 * Worker bundle, keyed by package directory. Their change still re-validates the package's
 * dependents (apps' integration suites use them) but does not deploy. A package NOT listed here
 * has no such exceptions: every non-test file in it is runtime, so its consumers deploy.
 *   packages/db/drizzle/**           SQL migrations (applied only by the explicit migration process)
 *   packages/db/scripts/**           test-DB bootstrap
 *   packages/db/src/testing/**       Vitest setup files used by the apps' vitest configs
 *   packages/db/src/guard-env.ts     imported only by seed scripts / test setup (not by app runtime code)
 *   packages/db/drizzle.config.ts    drizzle-kit config
 */
const PACKAGE_NON_DEPLOY = {
  'packages/db': ['drizzle/**', 'scripts/**', 'src/testing/**', 'src/guard-env.ts', 'drizzle.config.ts']
};

/** Root-level files (outside every workspace project). First match wins. */
const ROOT_CI_INFRA_GLOBS = ['.github/**', 'scripts/ci/**'];
const ROOT_IGNORE_GLOBS = [
  'docs/**',
  '**/*.md',
  '.agents/**',
  'skills-lock.json',
  '.gitignore',
  '**/.env.example',
  '**/.dev.vars.example'
];
/** Known build infrastructure: can change every bundle, so every app is affected AND deployable. */
const ROOT_DEPLOY_ALL_GLOBS = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/check-cloudflare-build-env.mjs',
  '.npmrc',
  '.nvmrc',
  '.node-version',
  'tsconfig*.json'
];
// Root package.json is special-cased (see classifyRootPackageJson). Anything else at the root
// (or under an unknown directory, e.g. a new scripts/foo.mjs) is UNKNOWN and fails closed.

// ---------------------------------------------------------------------------------------------
// Tiny glob matcher: `**` (any depth), `*` (no slash), `?` (one non-slash char).
// ---------------------------------------------------------------------------------------------
const globCache = new Map();
export function globToRegExp(glob) {
  if (globCache.has(glob)) return globCache.get(glob);
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  const compiled = new RegExp(`^${re}$`);
  globCache.set(glob, compiled);
  return compiled;
}
export const matchesAny = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

const toPosix = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');
const sorted = (set) => [...set].sort();

// ---------------------------------------------------------------------------------------------
// Workspace graph (from pnpm)
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ name: string, dir: string, kind: 'root'|'app'|'package', id: string, deps: string[] }} Project
 * @typedef {{ projects: Project[] }} Workspace
 */

/** Build a Workspace from the JSON printed by `pnpm -r ls --depth 0 --json`. Pure, for tests. */
export function workspaceFromPnpmJson(json, root) {
  const raw = Array.isArray(json) ? json : [];
  const names = new Set(raw.map((p) => p.name));
  const projects = raw.map((p) => {
    const rel = toPosix(path.relative(root, p.path));
    const dir = rel === '' ? '' : rel;
    const kind = dir === '' ? 'root' : dir.startsWith('apps/') ? 'app' : 'package';
    const deps = new Set();
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [dep, info] of Object.entries(p[group] ?? {})) {
        // A workspace edge is a local link to another project of this workspace.
        if (names.has(dep) && String(info?.version ?? '').startsWith('link:')) deps.add(dep);
      }
    }
    return {
      name: p.name,
      dir,
      kind,
      id: kind === 'app' ? dir.slice('apps/'.length) : p.name,
      deps: [...deps].sort()
    };
  });
  return { projects };
}

/**
 * Guard against a silently empty graph. `pnpm ls` reports workspace edges from node_modules, so on
 * a checkout where dependencies are not installed it returns NO edges, which would make every
 * shared-package change look harmless. Every `workspace:` dependency declared in a package.json
 * must therefore appear as an edge; otherwise detection fails closed (the caller degrades).
 * @param {Workspace} ws
 * @param {Record<string, string[]>} declared project name -> workspace dependencies from package.json
 */
export function assertGraphComplete(ws, declared) {
  const missing = [];
  for (const p of ws.projects) {
    for (const dep of declared[p.name] ?? []) {
      if (!p.deps.includes(dep)) missing.push(`${p.name} -> ${dep}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `pnpm workspace graph is incomplete (missing: ${missing.join(', ')}); run \`pnpm install\` before detection`
    );
  }
}

/** Workspace dependencies as DECLARED in package.json (`workspace:` specifiers), per project. */
function declaredWorkspaceDeps(ws, root) {
  const declared = {};
  for (const p of ws.projects) {
    const pj = JSON.parse(readFileSync(path.join(root, p.dir, 'package.json'), 'utf8'));
    declared[p.name] = [];
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [dep, spec] of Object.entries(pj[group] ?? {})) {
        if (String(spec).startsWith('workspace:')) declared[p.name].push(dep);
      }
    }
  }
  return declared;
}

export function loadWorkspace(root) {
  const out = execSync('pnpm -r ls --depth 0 --json', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024
  });
  const ws = workspaceFromPnpmJson(JSON.parse(out), root);
  if (!ws.projects.some((p) => p.kind === 'app')) throw new Error('pnpm reported no apps/* workspace projects');
  assertGraphComplete(ws, declaredWorkspaceDeps(ws, root));
  return ws;
}

/** Project plus everything that (transitively) depends on it. */
export function dependentsOf(ws, name) {
  const result = new Set([name]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of ws.projects) {
      if (!result.has(p.name) && p.deps.some((d) => result.has(d))) {
        result.add(p.name);
        grew = true;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------------------------

/**
 * Decide the effect of a root package.json change. Only a change confined to the `scripts` block
 * cannot alter a build (production builds use each app's own scripts), so it is CI-infra only.
 * Any other key (dependencies, packageManager, overrides, pnpm settings, ...) or an unreadable
 * side is treated as build-affecting.
 */
export function classifyRootPackageJson(baseJson, headJson) {
  if (!baseJson || !headJson) return 'deploy-all';
  // Canonical (key-sorted, recursive) JSON so key order never matters but nested edits always do.
  const canonical = (v) =>
    Array.isArray(v)
      ? `[${v.map(canonical).join(',')}]`
      : v && typeof v === 'object'
        ? `{${Object.keys(v)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
            .join(',')}}`
        : JSON.stringify(v);
  const strip = (j) => {
    const { scripts: _scripts, ...rest } = j;
    return canonical(rest);
  };
  try {
    return strip(baseJson) === strip(headJson) ? 'ci-infra' : 'deploy-all';
  } catch {
    return 'deploy-all';
  }
}

/** @returns {{kind: string, project?: Project, rule: string}} */
export function classifyFile(file, ws, ctx = {}) {
  // Longest matching project directory wins (no nesting today, but be correct).
  const owner = ws.projects
    .filter((p) => p.kind !== 'root' && (file === p.dir || file.startsWith(`${p.dir}/`)))
    .sort((a, b) => b.dir.length - a.dir.length)[0];

  if (owner) {
    const rel = file === owner.dir ? '' : file.slice(owner.dir.length + 1);
    if (matchesAny(rel, DOC_GLOBS)) return { kind: 'ignore', rule: `docs:${owner.dir}` };
    if (matchesAny(rel, TEST_GLOBS)) {
      return owner.kind === 'app'
        ? { kind: 'app-ci', project: owner, rule: `app-tests:${owner.id}` }
        : { kind: 'package-own-ci', project: owner, rule: `package-tests:${owner.name}` };
    }
    if (owner.kind === 'app') {
      if (matchesAny(rel, APP_NON_DEPLOY_GLOBS)) return { kind: 'app-ci', project: owner, rule: `app-tooling:${owner.id}` };
      return { kind: 'app-runtime', project: owner, rule: `app-source:${owner.id}` };
    }
    if (matchesAny(rel, PACKAGE_NON_DEPLOY[owner.dir] ?? [])) {
      return { kind: 'package-ci', project: owner, rule: `package-tooling:${owner.name}` };
    }
    return { kind: 'package-runtime', project: owner, rule: `package-source:${owner.name}` };
  }

  // Outside every workspace project.
  if (file === 'package.json') {
    const verdict = classifyRootPackageJson(ctx.baseRootPackageJson, ctx.headRootPackageJson);
    return verdict === 'ci-infra'
      ? { kind: 'ci-infra', rule: 'root-package-json:scripts-only' }
      : { kind: 'deploy-all', rule: 'root-package-json:build-affecting-or-unverifiable' };
  }
  if (matchesAny(file, ROOT_CI_INFRA_GLOBS)) return { kind: 'ci-infra', rule: 'ci-infra' };
  if (matchesAny(file, ROOT_IGNORE_GLOBS)) return { kind: 'ignore', rule: 'docs-or-tooling' };
  if (matchesAny(file, ROOT_DEPLOY_ALL_GLOBS)) return { kind: 'deploy-all', rule: `build-infra:${file}` };
  return { kind: 'deploy-all', rule: 'unknown-file(fail-closed)' };
}

/**
 * Classify a list of changed files into the result document. Pure: no git, no pnpm, no I/O.
 * @param {string[]} files repo-relative paths (forward slashes)
 * @param {Workspace} ws
 * @param {{baseRootPackageJson?: object, headRootPackageJson?: object, base?: string, head?: string}} [ctx]
 */
export function classifyFiles(files, ws, ctx = {}) {
  const apps = ws.projects.filter((p) => p.kind === 'app');
  const packages = ws.projects.filter((p) => p.kind === 'package');
  const affectedApps = new Set();
  const deployableApps = new Set();
  const affectedPackages = new Set();
  let ciInfra = false;
  let allApps = false;
  const byRule = new Map();

  const markCi = (name, deploy) => {
    for (const depName of dependentsOf(ws, name)) {
      const p = ws.projects.find((x) => x.name === depName);
      if (!p || p.kind === 'root') continue;
      if (p.kind === 'app') {
        affectedApps.add(p.id);
        if (deploy) deployableApps.add(p.id);
      } else {
        affectedPackages.add(p.name);
      }
    }
  };

  for (const file of [...new Set(files.map(toPosix))].filter(Boolean).sort()) {
    const c = classifyFile(file, ws, ctx);
    byRule.set(c.rule, [...(byRule.get(c.rule) ?? []), file]);
    switch (c.kind) {
      case 'ignore':
        break;
      case 'ci-infra':
        ciInfra = true;
        break;
      case 'deploy-all':
        allApps = true;
        break;
      case 'app-runtime':
        affectedApps.add(c.project.id);
        deployableApps.add(c.project.id);
        break;
      case 'app-ci':
        affectedApps.add(c.project.id);
        break;
      case 'package-runtime':
        markCi(c.project.name, true);
        break;
      case 'package-ci':
        markCi(c.project.name, false);
        break;
      case 'package-own-ci':
        affectedPackages.add(c.project.name);
        break;
      default:
        allApps = true; // unreachable; fail closed
    }
  }

  if (allApps) {
    for (const a of apps) {
      affectedApps.add(a.id);
      deployableApps.add(a.id);
    }
    for (const p of packages) affectedPackages.add(p.name);
  }

  const reasons = [...byRule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rule, list]) => `${rule}: ${list.length} file(s), e.g. ${list.slice(0, 3).join(', ')}`);

  const needsCi = affectedApps.size > 0 || affectedPackages.size > 0 || ciInfra;
  return {
    schemaVersion: SCHEMA_VERSION,
    base: ctx.base ?? null,
    head: ctx.head ?? null,
    changedFiles: byRule.size === 0 ? 0 : [...byRule.values()].reduce((n, l) => n + l.length, 0),
    affectedApps: sorted(affectedApps),
    deployableApps: sorted(deployableApps),
    affectedPackages: sorted(affectedPackages),
    affectedWorkspaces: sorted(
      new Set([...apps.filter((a) => affectedApps.has(a.id)).map((a) => a.name), ...affectedPackages])
    ),
    knownApps: sorted(apps.map((a) => a.id)),
    knownWorkspaces: sorted(ws.projects.filter((p) => p.kind !== 'root').map((p) => p.name)),
    ciInfra,
    ciOnly: deployableApps.size === 0 && needsCi,
    allApps,
    degraded: false,
    error: null,
    reasons
  };
}

/** Fail-closed result used when detection itself fails: everything is affected and deployable. */
export function degradedResult(ws, error, ctx = {}) {
  const base = ws
    ? classifyFiles(['<detection-failed>'], ws, ctx)
    : {
        schemaVersion: SCHEMA_VERSION,
        base: ctx.base ?? null,
        head: ctx.head ?? null,
        changedFiles: 0,
        affectedApps: ['admin', 'student', 'web'],
        deployableApps: ['admin', 'student', 'web'],
        affectedPackages: ['@rms/auth', '@rms/db'],
        affectedWorkspaces: ['@rms/admin', '@rms/auth', '@rms/db', '@rms/student', '@rms/web'],
        knownApps: ['admin', 'student', 'web'],
        knownWorkspaces: ['@rms/admin', '@rms/auth', '@rms/db', '@rms/student', '@rms/web'],
        ciInfra: true,
        ciOnly: false,
        allApps: true,
        reasons: []
      };
  return {
    ...base,
    ciInfra: true,
    ciOnly: false,
    allApps: true,
    degraded: true,
    error: String(error?.message ?? error),
    reasons: [`detection failed (fail-closed, all apps): ${String(error?.message ?? error)}`]
  };
}


// ---------------------------------------------------------------------------------------------
// CI plan: turns a result into the exact job inputs the workflow needs (policy lives here, not YAML)
// ---------------------------------------------------------------------------------------------

/** Apps whose integration suites (`*.int.test.ts`) exist today. Integration also runs for infra/all-app changes. */
const INTEGRATION_APPS = ['admin', 'student'];

/**
 * @param {ReturnType<typeof classifyFiles>} r
 * @returns {{anyCi: boolean, checkWorkspaces: string[], buildApps: string[], runIntegration: boolean, deployApps: string[]}}
 */
export function ciPlan(r) {
  const full = r.allApps || r.ciInfra; // CI-infra changes exercise everything (still no deploy)
  const anyCi = full || r.affectedApps.length > 0 || r.affectedPackages.length > 0;
  // `@rms/db` hosts the repo-wide test-config scan, so it always runs when any CI runs.
  const checkWorkspaces = !anyCi
    ? []
    : full
      ? [...r.knownWorkspaces]
      : [...new Set([...r.affectedWorkspaces, '@rms/db'].filter((w) => r.knownWorkspaces.includes(w)))].sort();
  // Only a changed bundle needs `cf:build`; CI-infra changes build everything to exercise the pipeline.
  const buildApps = r.ciInfra ? [...r.knownApps] : [...r.deployableApps];
  const runIntegration = full || r.affectedApps.some((a) => INTEGRATION_APPS.includes(a));
  return { anyCi, checkWorkspaces, buildApps, runIntegration, deployApps: [...r.deployableApps] };
}

// ---------------------------------------------------------------------------------------------
// Git + CLI
// ---------------------------------------------------------------------------------------------

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

export function changedFilesBetween(root, base, head) {
  for (const ref of [base, head]) git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  // --no-renames: a rename counts as a delete plus an add, so BOTH paths are classified.
  return git(root, ['diff', '--name-only', '--no-renames', '-z', base, head])
    .split('\0')
    .filter(Boolean)
    .map(toPosix);
}

function readJsonAtRef(root, ref) {
  try {
    return JSON.parse(git(root, ['show', `${ref}:package.json`]));
  } catch {
    return null;
  }
}

/**
 * Library entry point. Never throws: failures become a degraded, fail-closed result.
 * @param {{root: string, base?: string, head?: string, files?: string[], workspace?: Workspace,
 *          readRootPackageJson?: (ref: string) => object|null}} opts
 */
export function detect(opts) {
  const { root, base, head } = opts;
  let ws = opts.workspace;
  try {
    ws ??= loadWorkspace(root);
  } catch (err) {
    return degradedResult(null, `workspace discovery failed: ${err.message}`, { base, head });
  }
  try {
    const files = opts.files ?? changedFilesBetween(root, base, head);
    const read = opts.readRootPackageJson ?? ((ref) => readJsonAtRef(root, ref));
    const touchesRootPkg = files.map(toPosix).includes('package.json');
    const ctx = { base, head };
    if (touchesRootPkg && base && head) {
      ctx.baseRootPackageJson = read(base);
      ctx.headRootPackageJson = read(head);
    }
    return classifyFiles(files, ws, ctx);
  } catch (err) {
    return degradedResult(ws, err.message, { base, head });
  }
}

export function parseArgs(argv) {
  const args = { pretty: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pretty') args.pretty = true;
    else if (['--base', '--head', '--root', '--files-from', '--github-output'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} requires a value`);
      args[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    } else throw new Error(`unknown argument: ${a}`);
  }
  if (!args.filesFrom && !args.base) throw new Error('--base <sha> is required (it is never defaulted to HEAD^)');
  if (args.filesFrom && args.base) throw new Error('use either --base/--head or --files-from, not both');
  return args;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`affected.mjs: ${err.message}\n`);
    process.stderr.write('usage: node scripts/ci/affected.mjs --base <sha> [--head <sha>] [--pretty]\n');
    process.stderr.write('       node scripts/ci/affected.mjs --files-from <file|-> [--pretty]\n');
    process.exit(2);
  }
  const root = path.resolve(args.root ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
  let result;
  if (args.filesFrom) {
    let files;
    try {
      files = readFileSync(args.filesFrom === '-' ? 0 : args.filesFrom, 'utf8').split(/\r?\n/).filter(Boolean);
    } catch (err) {
      result = degradedResult(null, `cannot read file list: ${err.message}`);
    }
    result ??= detect({ root, files });
  } else {
    result = detect({ root, base: args.base, head: args.head ?? 'HEAD' });
  }
  if (args.githubOutput) {
    const plan = ciPlan(result);
    const lines = [
      ['result', result],
      ['any_ci', plan.anyCi],
      ['check_workspaces', plan.checkWorkspaces],
      ['build_apps', plan.buildApps],
      ['run_integration', plan.runIntegration],
      ['deploy_apps', plan.deployApps],
      ['degraded', result.degraded]
    ].map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    appendFileSync(args.githubOutput, `${lines.join('\n')}\n`);
  }
  process.stdout.write(`${JSON.stringify(result, null, args.pretty ? 2 : 0)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
