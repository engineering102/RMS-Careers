/**
 * Node-only half of the database guard (Slice 0): reads env files and resolves the database target
 * for tests and CLI tooling. Never imported by application code (it uses fs).
 *
 * Rules:
 *  - Tests/seeds never fall back to .env.local. The test target comes ONLY from TEST_DATABASE_URL
 *    (shell/CI secret) or the explicit, git-ignored <repo>/.env.test.local file.
 *  - Seeds must name their target (--target=test|development or RMS_DB_TARGET). There is no default
 *    and no "production" target.
 *  - Env files are only PARSED here (to detect collisions with the app database); they are never
 *    loaded into process.env except the explicit development seed path.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  DatabaseGuardError,
  assertDatabaseAllowed,
  type ClassifyContext,
  type DatabaseTarget
} from './guard';

const URL_KEYS = ['POSTGRES_URL', 'DATABASE_URL', 'POSTGRES_URL_NON_POOLING'];

export function findRepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

/** Parse KEY=VALUE lines. Returns only the requested keys; values are never logged. */
export function parseEnvFile(file: string, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || !keys.includes(m[1])) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Every database URL visible to this checkout: shell env plus local env files (parsed, not loaded). */
export function collectAmbientDatabaseUrls(
  env: Record<string, string | undefined> = process.env,
  root: string = findRepoRoot()
): string[] {
  const urls: string[] = [];
  for (const key of URL_KEYS) if (env[key]) urls.push(env[key]!);

  const dirs = [root, path.join(root, 'packages', 'db')];
  const appsDir = path.join(root, 'apps');
  if (existsSync(appsDir)) {
    for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(path.join(appsDir, entry.name));
    }
  }
  for (const dir of dirs) {
    for (const name of ['.env', '.env.local', '.env.development.local', '.env.production.local', '.dev.vars']) {
      const values = parseEnvFile(path.join(dir, name), URL_KEYS);
      urls.push(...Object.values(values));
    }
  }
  return urls.filter(Boolean);
}

export function classifyContext(
  env: Record<string, string | undefined> = process.env,
  root: string = findRepoRoot()
): ClassifyContext {
  return {
    ambientUrls: collectAmbientDatabaseUrls(env, root),
    productionHosts: (env.RMS_PRODUCTION_DB_HOSTS ?? '').split(',')
  };
}

/** TEST_DATABASE_URL from the shell, else from the explicit <repo>/.env.test.local (that key only). */
export function readTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
  root: string = findRepoRoot()
): string | undefined {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  return parseEnvFile(path.join(root, '.env.test.local'), ['TEST_DATABASE_URL']).TEST_DATABASE_URL;
}

/**
 * Resolve and validate the integration-test database. Throws unless it is positively a test DB
 * on an endpoint distinct from every ambient application URL.
 */
/** TEST_DATABASE_ENDPOINT (non-secret Neon endpoint id pin) from the shell or <repo>/.env.test.local. */
export function readTestDatabaseEndpoint(
  env: Record<string, string | undefined> = process.env,
  root: string = findRepoRoot()
): string | undefined {
  if (env.TEST_DATABASE_ENDPOINT) return env.TEST_DATABASE_ENDPOINT;
  return parseEnvFile(path.join(root, '.env.test.local'), ['TEST_DATABASE_ENDPOINT']).TEST_DATABASE_ENDPOINT;
}

export function resolveTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
  root: string = findRepoRoot()
): string {
  const url = readTestDatabaseUrl(env, root);
  // Ambient URLs are collected BEFORE anything is overwritten. The test URL is NOT excluded: if it also
  // appears as POSTGRES_URL/DATABASE_URL (shell or env file) it is an application URL, i.e. production.
  const ctx = classifyContext(env, root);
  ctx.expectedTestEndpoint = readTestDatabaseEndpoint(env, root);
  assertDatabaseAllowed(url, 'test-run', ctx);
  return url!;
}

export type SeedTarget = 'test' | 'development';

export interface PrepareSeedOptions {
  argv?: readonly string[];
  env?: Record<string, string | undefined>;
  root?: string;
  /** Loads the development env file into `env`. Injectable for tests. */
  loadDevelopmentEnv?: (env: Record<string, string | undefined>, root: string, cwd: string) => void;
}

function defaultLoadDevelopmentEnv(env: Record<string, string | undefined>, root: string, cwd: string): void {
  // Same candidate order the seed scripts always used, first existing file wins.
  const candidates = [
    path.join(cwd, '.env.local'),
    path.join(root, '.env.local'),
    path.join(root, 'apps', 'admin', '.env.local')
  ];
  const file = candidates.find((c) => existsSync(c));
  if (!file) return;
  const values = parseEnvFile(file, [
    'POSTGRES_URL',
    'ADMIN_INITIAL_EMAIL',
    'ADMIN_INITIAL_PASSWORD',
    'ADMIN_INITIAL_NAME'
  ]);
  for (const [k, v] of Object.entries(values)) if (env[k] === undefined) env[k] = v;
}

/**
 * Entry guard for every seed/verify script. Requires an explicit target, validates the resolved
 * database against the operation, then points POSTGRES_URL (in-process only) at it.
 * `production` is not a valid target.
 */
export function prepareSeedTarget(options: PrepareSeedOptions = {}): { target: SeedTarget; url: string; db: DatabaseTarget } {
  const argv = options.argv ?? process.argv;
  const env = options.env ?? process.env;
  const root = options.root ?? findRepoRoot();
  const loadDev = options.loadDevelopmentEnv ?? defaultLoadDevelopmentEnv;

  const flag = argv.find((a) => a.startsWith('--target='))?.slice('--target='.length);
  const target = flag ?? env.RMS_DB_TARGET;
  if (target !== 'test' && target !== 'development') {
    throw new DatabaseGuardError(
      `A seed target is required: pass --target=test or --target=development (got "${target ?? 'nothing'}"). ` +
        'Seeding production is not supported.',
      'unknown'
    );
  }

  let url: string | undefined;
  let db: DatabaseTarget;
  if (target === 'test') {
    // No env-file loading at all: only TEST_DATABASE_URL / .env.test.local.
    url = resolveTestDatabaseUrl(env, root);
    db = assertDatabaseAllowed(url, 'test-seed', { expectedTestEndpoint: readTestDatabaseEndpoint(env, root) });
  } else {
    loadDev(env, root, process.cwd());
    url = env.POSTGRES_URL;
    db = assertDatabaseAllowed(url, 'dev-seed', { productionHosts: (env.RMS_PRODUCTION_DB_HOSTS ?? '').split(',') });
  }

  env.POSTGRES_URL = url;
  delete env.DATABASE_URL;
  return { target, url: url!, db };
}
