import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

vi.mock('server-only', () => ({}));

import { buildAwardXpStatement, awardActivityXp } from '../services/xp-ledger';

/**
 * Audit F-07 (unit tier): shape of the single-statement XP award. The behaviour against a real
 * Postgres (idempotency and concurrent awards) is covered by xp-ledger.int.test.ts.
 */
const dialect = new PgDialect();
const render = (input: Parameters<typeof buildAwardXpStatement>[0]) => {
  const q = dialect.sqlToQuery(buildAwardXpStatement(input, '2026-10-10', '2026-10-09'));
  return { text: q.sql.replace(/\s+/g, ' '), params: q.params };
};

const base = { studentId: 7, batchId: 'b1', activityType: 'quiz_completed' as const, referenceId: 'q1', xp: 20 };

describe('awardActivityXp statement', () => {
  it('inserts the ledger row idempotently on the activity_idempotency_idx key', () => {
    const { text } = render(base);
    expect(text).toContain('INSERT INTO activities');
    expect(text).toContain('ON CONFLICT (student_id, activity_type, reference_id) DO NOTHING');
  });

  it('drives the stats change from the inserted ledger row only', () => {
    const { text } = render(base);
    expect(text).toMatch(/INSERT INTO student_stats .* FROM ins JOIN students/);
  });

  it('updates XP relative to the current row so concurrent awards do not overwrite each other', () => {
    const { text } = render(base);
    expect(text).toContain('total_xp = student_stats.total_xp + EXCLUDED.total_xp');
    expect(text).not.toMatch(/total_xp = \$\d+/);
  });

  it('binds all values as parameters', () => {
    const { params } = render(base);
    expect(params).toEqual(expect.arrayContaining([7, 'b1', 'quiz_completed', 'q1', 20, '2026-10-10', '2026-10-09']));
  });

  it('counts DSA solves only for dsa_solved', () => {
    expect(render({ ...base, activityType: 'dsa_solved' }).params).toContain(1);
    expect(render(base).params).not.toContain(1);
  });

  it('reports awarded only when the ledger row was inserted', async () => {
    const client = (rows: unknown[]) => ({ execute: vi.fn().mockResolvedValue({ rows }) }) as any;
    await expect(awardActivityXp(base, client([{ inserted: 1 }]))).resolves.toEqual({ awarded: true, xpAwarded: 20 });
    await expect(awardActivityXp(base, client([{ inserted: 0 }]))).resolves.toEqual({ awarded: false, xpAwarded: 0 });
  });

  it('rejects negative or fractional XP', async () => {
    await expect(awardActivityXp({ ...base, xp: -5 }, {} as any)).rejects.toThrow();
    await expect(awardActivityXp({ ...base, xp: 1.5 }, {} as any)).rejects.toThrow();
  });
});
