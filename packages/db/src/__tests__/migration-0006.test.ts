import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { splitStatements } from '../migration-runner';
import { assignmentSubmissions, batchLiveSessions } from '../schema';

const drizzleDir = path.resolve(__dirname, '../../drizzle');
const journal = JSON.parse(readFileSync(path.join(drizzleDir, 'meta/_journal.json'), 'utf8')) as {
  entries: Array<{ idx: number; when: number; tag: string }>;
};
const TAG = '0006_tutor_review_attribution_live_sessions';
const sql = readFileSync(path.join(drizzleDir, `${TAG}.sql`), 'utf8');
const statements = splitStatements(sql);

describe('migration journal', () => {
  it('lists every migration once, in file order, with a file per entry', () => {
    journal.entries.forEach((entry, i) => {
      expect(entry.idx).toBe(i);
      expect(entry.tag.startsWith(String(i).padStart(4, '0') + '_')).toBe(true);
      expect(existsSync(path.join(drizzleDir, `${entry.tag}.sql`))).toBe(true);
    });
  });

  // The runner refuses an unapplied migration older than the newest applied one (drizzle would skip it).
  it('has strictly increasing `when` values', () => {
    for (let i = 1; i < journal.entries.length; i++) {
      expect(journal.entries[i].when).toBeGreaterThan(journal.entries[i - 1].when);
    }
  });

  it('ends with 0006', () => {
    expect(journal.entries.at(-1)?.tag).toBe(TAG);
  });
});

describe('0006 is additive and safe in one transaction', () => {
  it('creates no enum and drops, renames, retypes or rewrites nothing', () => {
    // Statements only (no comments), with foreign-key actions (ON DELETE/UPDATE ...) removed.
    const code = statements
      .join('\n')
      .replace(/^--.*$/gm, '')
      .replace(/ON (DELETE|UPDATE) (cascade|set null|no action|restrict)/gi, '');
    expect(code).not.toMatch(/\bCREATE TYPE\b|\bALTER TYPE\b/i);
    expect(code).not.toMatch(/\bDROP\b|\bRENAME\b|\bALTER COLUMN\b|\bTRUNCATE\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b/i);
  });

  it('adds reviewed_by_user_id as a nullable column with an ON DELETE SET NULL foreign key', () => {
    expect(sql).toContain('ALTER TABLE "assignment_submissions" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" uuid;');
    expect(sql).toMatch(/FOREIGN KEY \("reviewed_by_user_id"\) REFERENCES "public"\."users"\("id"\) ON DELETE set null/);
  });

  it('declares the four batch_live_sessions CHECK constraints', () => {
    for (const name of ['bls_duration_chk', 'bls_days_chk', 'bls_time_chk', 'bls_window_chk']) {
      expect(sql).toContain(`CONSTRAINT "${name}" CHECK`);
    }
  });

  it('splits into idempotent statements', () => {
    // table, column, 3 foreign keys, index
    expect(statements).toHaveLength(6);
    for (const s of statements) {
      expect(s).toMatch(/IF NOT EXISTS|EXCEPTION\s+WHEN duplicate_object/);
    }
  });
});

describe('schema.ts matches 0006', () => {
  it('maps reviewedByUserId to reviewed_by_user_id (nullable)', () => {
    const col = getTableConfig(assignmentSubmissions).columns.find((c) => c.name === 'reviewed_by_user_id');
    expect(col?.notNull).toBe(false);
  });

  it('defines batch_live_sessions with the columns created by the migration', () => {
    const config = getTableConfig(batchLiveSessions);
    expect(config.name).toBe('batch_live_sessions');
    const sqlColumns = [...sql.matchAll(/^\t"([a-z_]+)" /gm)].map((m) => m[1]).sort();
    expect(config.columns.map((c) => c.name).sort()).toEqual(sqlColumns);
    expect(config.indexes.map((i) => i.config.name)).toEqual(['batch_live_sessions_batch_pub_idx']);
  });
});
