/**
 * Database target safety guard (Slice 0).
 *
 * Pure and dependency-free (no fs, no server-only) so it can be imported by the db client, the
 * test setup files and the CLI scripts alike. Everything here FAILS CLOSED: anything that is not
 * positively identified as an allowed target is rejected. Connection strings and credentials are
 * never included in a thrown message.
 *
 * Identity model (Neon): the database NAME proves nothing (production and test are both "neondb"
 * in different Neon projects). The strongest static identity is the Neon ENDPOINT id in the host
 * name (ep-xxx[-pooler].<region>.aws.neon.tech); every Neon branch has its own endpoint, so it
 * identifies project + branch. A database is "test" only when ALL hold:
 *   - its endpoint equals the explicitly pinned TEST_DATABASE_ENDPOINT, on a *.neon.tech host;
 *   - that endpoint is not on RMS_PRODUCTION_DB_HOSTS and matches no ambient application URL
 *     (POSTGRES_URL / DATABASE_URL in the shell or in local env files).
 * Runtime then adds two live proofs (setup-int / bootstrap): Neon's own endpoint id (when the
 * server reports it) matches the pin, and the bootstrap-created sentinel table exists.
 * "rms_dev*" databases are the only accepted development targets; anything else is unknown.
 */

export type DatabaseClassification =
  | 'test'
  | 'development'
  | 'production'
  | 'unknown'
  | 'missing'
  | 'invalid';

/** Operations that touch a database from tooling. Each declares which classes it may run against. */
export type GuardedOperation =
  | 'test-run'
  | 'test-seed'
  | 'test-reset'
  | 'test-cleanup'
  | 'dev-seed';

const ALLOWED_CLASSES: Record<GuardedOperation, readonly DatabaseClassification[]> = {
  'test-run': ['test'],
  'test-seed': ['test'],
  'test-reset': ['test'],
  'test-cleanup': ['test'],
  'dev-seed': ['development']
};

export class DatabaseGuardError extends Error {
  readonly classification: DatabaseClassification;
  constructor(message: string, classification: DatabaseClassification) {
    super(`[db-guard] ${message}`);
    this.name = 'DatabaseGuardError';
    this.classification = classification;
  }
}

export interface DatabaseTarget {
  host: string;
  /** Neon endpoint id: first host label with any "-pooler" suffix removed. */
  endpoint: string;
  database: string;
}

export function parseDatabaseUrl(url: string | undefined | null): DatabaseTarget | null {
  if (!url || typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return null;
  const host = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  if (!host || !database) return null;
  const endpoint = host.split('.')[0].replace(/-pooler$/, '');
  return { host, endpoint, database };
}

export interface ClassifyContext {
  /** Other URLs present in the environment/local files. A target sharing an endpoint with one is rejected. */
  ambientUrls?: readonly (string | undefined)[];
  /** Extra endpoints/hosts known to be production (from RMS_PRODUCTION_DB_HOSTS). */
  productionHosts?: readonly string[];
  /** The one Neon endpoint id that may be a test target (TEST_DATABASE_ENDPOINT). Required for "test". */
  expectedTestEndpoint?: string;
}

export function normalizeEndpoint(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase().split('.')[0].replace(/-pooler$/, '');
}

export function classifyDatabaseUrl(
  url: string | undefined | null,
  ctx: ClassifyContext = {}
): { classification: DatabaseClassification; reason: string } {
  if (!url || !url.trim()) return { classification: 'missing', reason: 'no database URL provided' };
  const target = parseDatabaseUrl(url);
  if (!target) return { classification: 'invalid', reason: 'database URL could not be parsed' };

  const prodHosts = (ctx.productionHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
  const prodEndpoints = prodHosts.map((h) => h.split('.')[0].replace(/-pooler$/, ''));
  if (prodHosts.includes(target.host) || prodEndpoints.includes(target.endpoint)) {
    return { classification: 'production', reason: 'endpoint is on the production allow-list' };
  }
  for (const ambient of ctx.ambientUrls ?? []) {
    const other = parseDatabaseUrl(ambient);
    if (other && other.endpoint === target.endpoint) {
      return { classification: 'production', reason: 'endpoint is also used by an application database URL' };
    }
  }
  if (/(^|[_-])prod(uction)?($|[_-])/.test(target.database)) {
    return { classification: 'production', reason: 'database name marks production' };
  }
  const pin = normalizeEndpoint(ctx.expectedTestEndpoint);
  if (pin && target.endpoint === pin) {
    if (!target.host.endsWith('.neon.tech')) {
      return { classification: 'unknown', reason: 'pinned test endpoint is not a Neon host' };
    }
    return { classification: 'test', reason: 'endpoint matches the pinned TEST_DATABASE_ENDPOINT' };
  }
  if (/^rms_dev($|[_-])/.test(target.database)) {
    return { classification: 'development', reason: 'database name matches rms_dev*' };
  }
  return { classification: 'unknown', reason: 'not the pinned test endpoint and not an rms_dev* database (a database name such as neondb is never trusted)' };
}

/**
 * Throws unless `url` is positively classified as a class the operation allows.
 * production/unknown/missing/invalid are rejected for every operation, whatever the caller passes.
 */
export function assertDatabaseAllowed(
  url: string | undefined | null,
  operation: GuardedOperation,
  ctx: ClassifyContext = {}
): DatabaseTarget {
  const { classification, reason } = classifyDatabaseUrl(url, ctx);
  const allowed = ALLOWED_CLASSES[operation];
  if (!allowed || !allowed.includes(classification)) {
    throw new DatabaseGuardError(
      `Refusing "${operation}": database target classified as "${classification}" (${reason}). ` +
        `Allowed for this operation: ${allowed?.join(', ') ?? 'none'}.`,
      classification
    );
  }
  return parseDatabaseUrl(url)!;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Loopback, reserved-TLD, or single-label hosts cannot be a Neon endpoint (those always have dots). */
function isLocalOrReservedHost(host: string): boolean {
  return (
    LOOPBACK_HOSTS.has(host) ||
    !host.includes('.') ||
    host.endsWith('.invalid') ||
    host.endsWith('.test') ||
    host.endsWith('.localhost')
  );
}

/**
 * Last line of defence, called where the db clients are created. Only active inside Vitest
 * (VITEST is set by the runner). Under Vitest a client may point only at:
 *   - a local/reserved host (unit-test mocks such as postgres://mock:mock@localhost/mock), or
 *   - exactly the TEST_DATABASE_URL that the integration setup already validated, and that URL
 *     must itself classify as "test".
 * Anything else (a real POSTGRES_URL exported in the shell, a leaked env file, ...) throws.
 */
export function assertVitestConnectionSafe(
  url: string | undefined | null,
  env: Record<string, string | undefined>
): void {
  if (!env.VITEST) return;
  if (!url) return;
  const target = parseDatabaseUrl(url);
  if (!target) {
    throw new DatabaseGuardError('Refusing to connect under Vitest: unparseable database URL.', 'invalid');
  }
  if (isLocalOrReservedHost(target.host)) return;
  const sanctioned = env.TEST_DATABASE_URL;
  const ctx: ClassifyContext = {
    expectedTestEndpoint: env.TEST_DATABASE_ENDPOINT,
    productionHosts: (env.RMS_PRODUCTION_DB_HOSTS ?? '').split(',')
  };
  if (sanctioned && url === sanctioned && classifyDatabaseUrl(sanctioned, ctx).classification === 'test') return;
  throw new DatabaseGuardError(
    'Refusing to connect under Vitest: the database URL is neither local nor the validated TEST_DATABASE_URL. ' +
      'Tests must never reach a real database through POSTGRES_URL.',
    classifyDatabaseUrl(url).classification
  );
}
