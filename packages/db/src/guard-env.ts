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
  normalizeEndpoint,
  parseDatabaseUrl,
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

/* ------------------------------------------------------------------------------------------------
 * Migration / bootstrap targets (audit PR-06)
 *
 * Every command that changes a schema or creates the first admin must name its target explicitly with
 * `--target=`. There is no default, no environment-variable default and no env-file fallback, except
 * for `test`, which reuses the pinned TEST_DATABASE_URL rules above.
 *
 *   development  POSTGRES_URL from the SHELL only; database must be rms_dev*.
 *   test         TEST_DATABASE_URL (+ TEST_DATABASE_ENDPOINT pin), exactly as the integration tier.
 *   rehearsal    REHEARSAL_DATABASE_URL + REHEARSAL_DATABASE_ENDPOINT pin: a fresh, empty Neon branch
 *                used to rehearse the production path. Must not be the test, production or any app DB.
 *   production   PRODUCTION_DATABASE_URL + RMS_PRODUCTION_DB_ENDPOINT pin + --confirm-production=<pin>.
 *                Refused in CI and when the endpoint appears in any local env file or app variable.
 * Live checks after connecting (Neon endpoint id, database name, test sentinel) are done by the caller
 * with verifyLiveIdentity() from migration-runner.ts, using `live` below.
 * ---------------------------------------------------------------------------------------------- */

export type MigrationTarget = 'development' | 'test' | 'rehearsal' | 'production';

export interface ResolvedMigrationTarget {
  target: MigrationTarget;
  url: string;
  db: DatabaseTarget;
  /** Expectations for verifyLiveIdentity(). */
  live: {
    endpoint?: string;
    requireEndpointReport: boolean;
    database: string;
    sentinel: 'required' | 'forbidden' | 'any';
  };
}

export interface ResolveMigrationOptions {
  argv?: readonly string[];
  env?: Record<string, string | undefined>;
  root?: string;
}

function flagValue(argv: readonly string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function requireNeonPinned(url: string | undefined, pin: string | undefined, label: string): DatabaseTarget {
  const db = parseDatabaseUrl(url);
  if (!db) throw new DatabaseGuardError(`${label}: database URL is missing or could not be parsed.`, url ? 'invalid' : 'missing');
  const expected = normalizeEndpoint(pin);
  if (!expected) throw new DatabaseGuardError(`${label}: the endpoint pin is not set.`, 'unknown');
  if (!db.host.endsWith('.neon.tech')) throw new DatabaseGuardError(`${label}: not a Neon host.`, 'unknown');
  if (db.endpoint !== expected) throw new DatabaseGuardError(`${label}: URL endpoint does not match the pinned endpoint.`, 'unknown');
  return db;
}

/**
 * The runner relies on a session-level advisory lock and multi-statement transactions on ONE connection.
 * Neon's pooled host (`-pooler`, PgBouncer in transaction mode) does not support session-level advisory
 * locks, so two runners could interleave unnoticed. Schema changes must use the direct connection string.
 * Called after the identity checks so their (more specific) refusals win.
 */
function assertDirectHost(db: DatabaseTarget, label: string): void {
  if (db.host.split('.')[0].endsWith('-pooler')) {
    throw new DatabaseGuardError(`${label}: use the DIRECT (non-pooled) connection string; the "-pooler" host cannot hold the migration lock.`, 'unknown');
  }
}

export function resolveMigrationTarget(options: ResolveMigrationOptions = {}): ResolvedMigrationTarget {
  const argv = options.argv ?? process.argv;
  const env = options.env ?? process.env;
  const root = options.root ?? findRepoRoot();
  const target = flagValue(argv, 'target');
  const productionHosts = (env.RMS_PRODUCTION_DB_HOSTS ?? '').split(',');

  switch (target) {
    case 'development': {
      // Shell only: no .env.local fallback (that file pointed at a production-class database).
      const url = env.POSTGRES_URL;
      const db = assertDatabaseAllowed(url, 'dev-migrate', { productionHosts });
      return { target, url: url!, db, live: { requireEndpointReport: false, database: db.database, sentinel: 'forbidden' } };
    }
    case 'test': {
      const url = resolveTestDatabaseUrl(env, root);
      const pin = readTestDatabaseEndpoint(env, root);
      const db = assertDatabaseAllowed(url, 'test-migrate', { expectedTestEndpoint: pin, productionHosts });
      return { target, url, db, live: { endpoint: normalizeEndpoint(pin), requireEndpointReport: false, database: db.database, sentinel: 'any' } };
    }
    case 'rehearsal': {
      const url = env.REHEARSAL_DATABASE_URL;
      const db = requireNeonPinned(url, env.REHEARSAL_DATABASE_ENDPOINT, 'rehearsal');
      const forbidden = new Set(
        [readTestDatabaseEndpoint(env, root), env.RMS_PRODUCTION_DB_ENDPOINT, ...productionHosts]
          .map((v) => normalizeEndpoint(v))
          .filter(Boolean)
      );
      for (const ambient of collectAmbientDatabaseUrls(env, root)) {
        const other = parseDatabaseUrl(ambient);
        if (other) forbidden.add(other.endpoint);
      }
      if (forbidden.has(db.endpoint)) {
        throw new DatabaseGuardError('rehearsal: endpoint is the test, production or an application database. Use a fresh branch.', 'production');
      }
      assertDirectHost(db, 'rehearsal');
      return { target, url: url!, db, live: { endpoint: db.endpoint, requireEndpointReport: true, database: db.database, sentinel: 'forbidden' } };
    }
    case 'production': {
      if (env.CI) throw new DatabaseGuardError('production: refused in CI. Run deliberately from an operator machine.', 'production');
      const url = env.PRODUCTION_DATABASE_URL;
      const db = requireNeonPinned(url, env.RMS_PRODUCTION_DB_ENDPOINT, 'production');
      const confirm = normalizeEndpoint(flagValue(argv, 'confirm-production'));
      if (confirm !== db.endpoint) {
        throw new DatabaseGuardError('production: pass --confirm-production=<endpoint id> matching RMS_PRODUCTION_DB_ENDPOINT.', 'production');
      }
      if (db.endpoint === normalizeEndpoint(readTestDatabaseEndpoint(env, root))) {
        throw new DatabaseGuardError('production: endpoint is the pinned TEST endpoint. Refusing.', 'test');
      }
      // A production URL must never live in a developer env file or be exported as an app URL here:
      // the old production database is still referenced by apps/*/.env.local.
      for (const ambient of collectAmbientDatabaseUrls(env, root)) {
        if (parseDatabaseUrl(ambient)?.endpoint === db.endpoint) {
          throw new DatabaseGuardError(
            'production: this endpoint also appears in a local env file or POSTGRES_URL/DATABASE_URL. Refusing ' +
              '(it may be the retired database). Unset app URLs and remove it from local files.',
            'production'
          );
        }
      }
      assertDirectHost(db, 'production');
      return { target, url: url!, db, live: { endpoint: db.endpoint, requireEndpointReport: true, database: db.database, sentinel: 'forbidden' } };
    }
    default:
      throw new DatabaseGuardError(
        `A migration target is required: --target=development|test|rehearsal|production (got "${target ?? 'nothing'}").`,
        'unknown'
      );
  }
}
