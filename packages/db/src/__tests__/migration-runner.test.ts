import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  JOURNAL_TABLE,
  MigrationRunnerError,
  migrationHash,
  planMigrations,
  runMigrations,
  splitStatements,
  verifyLiveIdentity,
  type MigrationFile,
  type SqlExecutor
} from '../migration-runner';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');
const file = (tag: string, when: number, stmts: string[]): MigrationFile => ({
  tag,
  folderMillis: when,
  content: stmts.join('\n--> statement-breakpoint\n')
});
const FILES = [
  file('0000_init', 1000, ['CREATE TYPE s AS ENUM (\'a\')', 'CREATE TABLE t (id int)']),
  file('0001_enum', 2000, ["ALTER TYPE s ADD VALUE 'b'"]),
  file('0002_use', 3000, ["CREATE INDEX i ON t (id) WHERE 'b'::s = 'b'"])
];

/** In-memory stand-in for one PostgreSQL connection: tracks the journal and transaction boundaries. */
class FakeDb implements SqlExecutor {
  log: string[] = [];
  journal: Array<{ hash: string; created_at: string }> | null = null;
  publicTables = 0;
  failOn?: string;
  private pendingJournal: Array<{ hash: string; created_at: string }> = [];
  private inTx = false;

  async query(text: string, params?: unknown[]) {
    this.log.push(text);
    if (text.startsWith('SELECT pg_advisory')) return [{}];
    if (text.startsWith('SELECT to_regclass')) return [{ present: this.journal !== null }];
    if (text.startsWith('SELECT count(*)::int AS n FROM information_schema.tables')) return [{ n: this.publicTables }];
    if (text.startsWith('SELECT hash, created_at')) return [...(this.journal ?? [])];
    if (text === 'CREATE SCHEMA IF NOT EXISTS drizzle') return [];
    if (text.startsWith('CREATE TABLE IF NOT EXISTS drizzle')) { this.journal ??= []; return []; }
    if (text === 'BEGIN') { this.inTx = true; this.pendingJournal = []; return []; }
    if (text === 'COMMIT') { this.journal!.push(...this.pendingJournal); this.inTx = false; return []; }
    if (text === 'ROLLBACK') { this.pendingJournal = []; this.inTx = false; return []; }
    if (text.startsWith(`INSERT INTO ${JOURNAL_TABLE}`)) {
      if (!this.inTx) throw new Error('journal insert outside a transaction');
      this.pendingJournal.push({ hash: String(params![0]), created_at: String(params![1]) });
      return [];
    }
    if (this.failOn && text.includes(this.failOn)) throw Object.assign(new Error('unsafe use of new value "b" of enum type s\nDETAIL: secret sql'), { code: '55P04' });
    return [];
  }
}

describe('migration runner (audit PR-06)', () => {
  it('splits on drizzle breakpoints and drops blanks', () => {
    expect(splitStatements('a;\n--> statement-breakpoint\n\n--> statement-breakpoint\nb;')).toEqual(['a;', 'b;']);
  });

  it('plan mode on an empty database reads only and lists every migration', async () => {
    const db = new FakeDb();
    const result = await runMigrations(db, FILES, { apply: false, sha256 });
    expect(result).toEqual({ alreadyApplied: [], pending: ['0000_init', '0001_enum', '0002_use'], applied: [] });
    expect(db.log.some((q) => /^(CREATE|BEGIN|INSERT)/.test(q))).toBe(false);
  });

  it('applies each migration in its own transaction with its journal row inside it', async () => {
    const db = new FakeDb();
    const result = await runMigrations(db, FILES, { apply: true, sha256 });
    expect(result.applied).toEqual(['0000_init', '0001_enum', '0002_use']);
    const boundaries = db.log.filter((q) => q === 'BEGIN' || q === 'COMMIT' || q.startsWith('INSERT INTO'));
    expect(boundaries).toEqual(['BEGIN', expect.stringMatching(/^INSERT/), 'COMMIT', 'BEGIN', expect.stringMatching(/^INSERT/), 'COMMIT', 'BEGIN', expect.stringMatching(/^INSERT/), 'COMMIT']);
    // The enum value added by 0001 is committed before 0002 uses it.
    const commitAfter0001 = db.log.indexOf("ALTER TYPE s ADD VALUE 'b'") < db.log.lastIndexOf('COMMIT', db.log.findIndex((q) => q.includes("'b'::s")));
    expect(commitAfter0001).toBe(true);
    expect(db.journal!.map((r) => Number(r.created_at))).toEqual([1000, 2000, 3000]);
  });

  it('is idempotent: a second run applies nothing', async () => {
    const db = new FakeDb();
    await runMigrations(db, FILES, { apply: true, sha256 });
    const again = await runMigrations(db, FILES, { apply: true, sha256 });
    expect(again).toEqual({ alreadyApplied: ['0000_init', '0001_enum', '0002_use'], pending: [], applied: [] });
  });

  it('rolls back only the failing migration, keeps earlier ones, and resumes there on re-run', async () => {
    const db = new FakeDb();
    db.failOn = "'b'::s";
    await expect(runMigrations(db, FILES, { apply: true, sha256 })).rejects.toThrow(
      /0002_use failed and was rolled back \(unsafe use of new value "b" of enum type s\)\. Applied before it: 0000_init, 0001_enum\./
    );
    expect(db.log).toContain('ROLLBACK');
    expect(db.log.at(-1)).toMatch(/pg_advisory_unlock/);
    expect(db.journal!.length).toBe(2);
    db.failOn = undefined;
    expect((await runMigrations(db, FILES, { apply: true, sha256 })).applied).toEqual(['0002_use']);
  });

  it('never puts SQL detail lines in the error', async () => {
    const db = new FakeDb();
    db.failOn = "'b'::s";
    await expect(runMigrations(db, FILES, { apply: true, sha256 })).rejects.not.toThrow(/secret sql/);
  });

  it('refuses a database that has tables but no journal', async () => {
    const db = new FakeDb();
    db.publicTables = 22;
    await expect(runMigrations(db, FILES, { apply: true, sha256 })).rejects.toThrow(/tables but no migration journal/);
    expect(db.log.some((q) => q === 'BEGIN')).toBe(false);
  });

  it('refuses a modified, a missing (database ahead) and an out-of-order migration', () => {
    const rows = (f: MigrationFile) => ({ hash: migrationHash(f, sha256), created_at: String(f.folderMillis) });
    expect(() => planMigrations(FILES, [{ hash: 'deadbeef', created_at: '1000' }], sha256)).toThrow(MigrationRunnerError);
    expect(() => planMigrations(FILES, [{ hash: 'x', created_at: '9999' }], sha256)).toThrow(/database is ahead/);
    expect(() => planMigrations(FILES, [rows(FILES[0]), rows(FILES[2])], sha256)).toThrow(/0001_enum is older than the newest applied/);
    expect(() => planMigrations([FILES[0], { ...FILES[1], folderMillis: 1000 }], [], sha256)).toThrow(/share the journal time/);
  });

  it('accepts journal rows written by drizzle-kit from a CRLF or LF checkout', () => {
    const f = FILES[0];
    for (const hash of [sha256(f.content), sha256(f.content.replace(/\n/g, '\r\n'))]) {
      expect(planMigrations(FILES, [{ hash, created_at: '1000' }], sha256).pending.map((p) => p.tag)).toEqual(['0001_enum', '0002_use']);
    }
    expect(migrationHash({ ...f, content: f.content.replace(/\n/g, '\r\n') }, sha256)).toBe(migrationHash(f, sha256));
  });
});

describe('verifyLiveIdentity', () => {
  const exec = (row: Record<string, unknown>): SqlExecutor => ({ query: async () => [row] });
  const base = { endpoint: 'ep-prod-1', requireEndpointReport: true, database: 'neondb', sentinel: 'forbidden' as const };

  it('passes for the expected Neon endpoint and database', async () => {
    await expect(verifyLiveIdentity(exec({ endpoint: 'ep-prod-1', database: 'neondb', sentinel: false }), base)).resolves.toBeUndefined();
  });

  it.each([
    [{ endpoint: 'ep-other', database: 'neondb', sentinel: false }, /does not match the expected endpoint/],
    [{ endpoint: null, database: 'neondb', sentinel: false }, /did not report a Neon endpoint/],
    [{ endpoint: 'ep-prod-1', database: 'otherdb', sentinel: false }, /database name does not match/],
    [{ endpoint: 'ep-prod-1', database: 'neondb', sentinel: true }, /TEST sentinel/]
  ])('refuses %j', async (row, message) => {
    await expect(verifyLiveIdentity(exec(row), base)).rejects.toThrow(message);
  });

  it('requires the sentinel for a test target when asked to', async () => {
    await expect(
      verifyLiveIdentity(exec({ endpoint: null, database: 'neondb', sentinel: false }), { ...base, requireEndpointReport: false, sentinel: 'required' })
    ).rejects.toThrow(/sentinel table is missing/);
  });
});
