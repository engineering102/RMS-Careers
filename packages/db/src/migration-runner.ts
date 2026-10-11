/**
 * Migration runner (audit PR-06). Pure: no fs, no network, no server-only; the CLI
 * (scripts/migrate.ts) supplies the files and a database executor, tests supply fakes.
 *
 * Why not `drizzle-kit migrate`: drizzle's migrator applies EVERY pending migration inside ONE
 * transaction. On an empty database that fails at 0002, which uses the enum value 'active' that 0001
 * adds with ALTER TYPE ... ADD VALUE ("unsafe use of new value ... New enum values must be committed
 * before they can be used"; reproduced on PostgreSQL 16, see docs/audits/production-readiness-audit.md).
 * This runner applies each migration in its OWN transaction, in journal order, and records it in
 * drizzle's own journal table (drizzle.__drizzle_migrations: hash, created_at = journal `when`), so
 * it stays interchangeable with drizzle tooling and with databases migrated by drizzle-kit before.
 *
 * Safety properties:
 *  - a session-level advisory lock prevents two runners from interleaving;
 *  - a database that has tables but no journal is refused (re-running 0000 would fail half-way);
 *  - a journal row whose file is missing (database ahead of this checkout), a file whose content no
 *    longer matches its recorded hash, and an unapplied migration older than the newest applied one
 *    (drizzle would silently skip it) are all refused;
 *  - a failing migration is rolled back on its own; earlier ones stay committed and recorded, so a
 *    re-run resumes at the failed migration;
 *  - plan mode (apply = false) reads only and creates nothing.
 * Error messages contain migration tags and PostgreSQL messages, never SQL text or connection details.
 */

export interface MigrationFile {
  tag: string;
  /** Journal `when` (ms); stored as created_at. */
  folderMillis: number;
  /** Raw file content; split on `--> statement-breakpoint`. */
  content: string;
}

export interface SqlExecutor {
  /** Runs one statement on a single dedicated connection and returns its rows. */
  query(text: string, params?: unknown[]): Promise<Array<Record<string, unknown>>>;
}

/** Same hash algorithm as drizzle (sha256 hex); injected so this module stays pure. */
export type Sha256Hex = (text: string) => string;

export interface MigrationRunOptions {
  apply: boolean;
  sha256: Sha256Hex;
  log?: (line: string) => void;
}

export interface MigrationRunResult {
  alreadyApplied: string[];
  pending: string[];
  applied: string[];
}

export class MigrationRunnerError extends Error {
  constructor(message: string) {
    super(`[migrate] ${message}`);
    this.name = 'MigrationRunnerError';
  }
}

export const JOURNAL_TABLE = 'drizzle.__drizzle_migrations';
/** Arbitrary constant key for pg_advisory_lock; identical in every runner instance. */
export const MIGRATION_LOCK_KEY = 72_331_406;

export function splitStatements(content: string): string[] {
  return content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
}

const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n');

/** Hash recorded for new applies: line-ending independent, so Windows and Linux checkouts agree. */
export function migrationHash(file: MigrationFile, sha256: Sha256Hex): string {
  return sha256(normalizeEol(file.content));
}

function matchesRecordedHash(file: MigrationFile, recorded: string, sha256: Sha256Hex): boolean {
  // drizzle-kit hashed the raw file as read on the machine that ran it (LF or CRLF).
  return recorded === migrationHash(file, sha256) || recorded === sha256(file.content) || recorded === sha256(file.content.replace(/\n/g, '\r\n'));
}

function pgMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message).split('\n')[0];
  return 'unknown error';
}

/**
 * Decides what to apply. Pure; exported for tests.
 * `applied` rows come from the journal table (created_at may arrive as string from bigint).
 */
export function planMigrations(
  files: readonly MigrationFile[],
  applied: ReadonlyArray<{ hash: string; created_at: unknown }>,
  sha256: Sha256Hex
): { alreadyApplied: MigrationFile[]; pending: MigrationFile[] } {
  const ordered = [...files].sort((a, b) => a.folderMillis - b.folderMillis);
  const seen = new Set<number>();
  for (const f of ordered) {
    if (seen.has(f.folderMillis)) throw new MigrationRunnerError(`two migrations share the journal time ${f.folderMillis}`);
    seen.add(f.folderMillis);
  }

  const appliedMillis = new Map<number, string>();
  for (const row of applied) appliedMillis.set(Number(row.created_at), row.hash);

  for (const [millis, hash] of appliedMillis) {
    const file = ordered.find((f) => f.folderMillis === millis);
    if (!file) {
      throw new MigrationRunnerError(
        `the database records a migration (created_at ${millis}) that this checkout does not have; ` +
          'the database is ahead of the code. Refusing.'
      );
    }
    if (!matchesRecordedHash(file, hash, sha256)) {
      throw new MigrationRunnerError(`migration ${file.tag} was modified after it was applied (hash mismatch). Refusing.`);
    }
  }

  const newestApplied = appliedMillis.size ? Math.max(...appliedMillis.keys()) : -Infinity;
  const alreadyApplied = ordered.filter((f) => appliedMillis.has(f.folderMillis));
  const pending = ordered.filter((f) => !appliedMillis.has(f.folderMillis));
  const outOfOrder = pending.find((f) => f.folderMillis < newestApplied);
  if (outOfOrder) {
    throw new MigrationRunnerError(
      `migration ${outOfOrder.tag} is older than the newest applied migration but was never applied ` +
        '(drizzle would skip it silently). Refusing; resolve by hand.'
    );
  }
  return { alreadyApplied, pending };
}

async function journalExists(exec: SqlExecutor): Promise<boolean> {
  const rows = await exec.query(`SELECT to_regclass('${JOURNAL_TABLE}') IS NOT NULL AS present`);
  return rows[0]?.present === true;
}

async function publicTableCount(exec: SqlExecutor): Promise<number> {
  const rows = await exec.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_rms_test_sentinel'"
  );
  return Number(rows[0]?.n ?? 0);
}

export async function runMigrations(
  exec: SqlExecutor,
  files: readonly MigrationFile[],
  options: MigrationRunOptions
): Promise<MigrationRunResult> {
  const log = options.log ?? (() => undefined);
  await exec.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
  try {
    const hasJournal = await journalExists(exec);
    const appliedRows = hasJournal
      ? ((await exec.query(`SELECT hash, created_at FROM ${JOURNAL_TABLE} ORDER BY created_at`)) as Array<{ hash: string; created_at: unknown }>)
      : [];

    if (appliedRows.length === 0 && (await publicTableCount(exec)) > 0) {
      throw new MigrationRunnerError(
        'the database already has tables but no migration journal. Refusing: re-running from 0000 would fail ' +
          'part-way. Baseline it deliberately (see the runbook) or use an empty database.'
      );
    }

    const plan = planMigrations(files, appliedRows, options.sha256);
    const result: MigrationRunResult = {
      alreadyApplied: plan.alreadyApplied.map((f) => f.tag),
      pending: plan.pending.map((f) => f.tag),
      applied: []
    };
    log(`already applied: ${result.alreadyApplied.length}; pending: ${result.pending.join(', ') || 'none'}`);
    if (!options.apply || plan.pending.length === 0) return result;

    await exec.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await exec.query(`CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`);

    for (const file of plan.pending) {
      const statements = splitStatements(file.content);
      await exec.query('BEGIN');
      try {
        for (const statement of statements) await exec.query(statement);
        await exec.query(`INSERT INTO ${JOURNAL_TABLE} (hash, created_at) VALUES ($1, $2)`, [migrationHash(file, options.sha256), file.folderMillis]);
        await exec.query('COMMIT');
      } catch (error) {
        await exec.query('ROLLBACK').catch(() => undefined);
        throw new MigrationRunnerError(
          `${file.tag} failed and was rolled back (${pgMessage(error)}). Applied before it: ${result.applied.join(', ') || 'none'}.`
        );
      }
      result.applied.push(file.tag);
      log(`applied ${file.tag} (${statements.length} statements)`);
    }
    return result;
  } finally {
    await exec.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => undefined);
  }
}

export interface LiveIdentityExpectation {
  /** Neon endpoint id that must be reported by the server; required for production and rehearsal. */
  endpoint?: string;
  requireEndpointReport: boolean;
  database: string;
  sentinel: 'required' | 'forbidden' | 'any';
}

/** Proves, after connecting and before changing anything, that the server is the intended database. */
export async function verifyLiveIdentity(exec: SqlExecutor, expected: LiveIdentityExpectation): Promise<void> {
  const rows = await exec.query(
    "SELECT current_setting('neon.endpoint_id', true) AS endpoint, current_database() AS database, " +
      "to_regclass('public._rms_test_sentinel') IS NOT NULL AS sentinel"
  );
  const live = rows[0] ?? {};
  const liveEndpoint = typeof live.endpoint === 'string' && live.endpoint ? live.endpoint.toLowerCase() : null;
  if (expected.requireEndpointReport && !liveEndpoint) {
    throw new MigrationRunnerError('the server did not report a Neon endpoint id; cannot prove its identity. Refusing.');
  }
  if (expected.endpoint && liveEndpoint && liveEndpoint !== expected.endpoint.toLowerCase()) {
    throw new MigrationRunnerError('the live Neon endpoint does not match the expected endpoint. Refusing.');
  }
  if (String(live.database ?? '').toLowerCase() !== expected.database.toLowerCase()) {
    throw new MigrationRunnerError('the live database name does not match the URL. Refusing.');
  }
  if (expected.sentinel === 'forbidden' && live.sentinel === true) {
    throw new MigrationRunnerError('this database carries the TEST sentinel table; it is not a production/rehearsal target. Refusing.');
  }
  if (expected.sentinel === 'required' && live.sentinel !== true) {
    throw new MigrationRunnerError('the test sentinel table is missing; not a bootstrapped test database. Refusing.');
  }
}
