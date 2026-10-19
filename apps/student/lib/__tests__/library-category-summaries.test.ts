import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { getLibraryCategorySummaries } from '../db/queries/library';

vi.mock('server-only', () => ({}));

/**
 * The My Library hub counts must follow the same entitlement rules as getLibraryItems:
 * published only, no external tests, and scoped to enrolled programs / batches.
 */

const dialect = new PgDialect();
let captured: { sql: string; params: unknown[] } | null = null;
let groupedBy = false;
let rows: { contentType: string; itemCount: number; topicCount: number }[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: (where: SQL) => {
            captured = dialect.sqlToQuery(where);
            return {
              groupBy: () => {
                groupedBy = true;
                return Promise.resolve(rows);
              }
            };
          }
        })
      })
    }
  };
});

describe('getLibraryCategorySummaries', () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    captured = null;
    groupedBy = false;
    rows = [];
  });

  it('returns nothing (and runs no query) without enrollments', async () => {
    const result = await getLibraryCategorySummaries({ enrolledProgramIds: [], enrolledBatchIds: [] });
    expect(result).toEqual([]);
    expect(captured).toBeNull();
  });

  it('scopes counts to published, entitled, non-external-test content grouped by type', async () => {
    rows = [
      { contentType: 'lecture', itemCount: 5, topicCount: 2 },
      { contentType: 'dsa_sheet', itemCount: 3, topicCount: 3 }
    ];

    const result = await getLibraryCategorySummaries({
      enrolledProgramIds: [16],
      enrolledBatchIds: ['batch-mine']
    });

    expect(result).toEqual(rows);
    expect(groupedBy).toBe(true);
    expect(captured!.sql).toContain('"is_published"');
    expect(captured!.sql).toContain('"content_type" <>');
    expect(captured!.params).toContain('external_test');
    expect(captured!.params).toContain(16);
    expect(captured!.params).toContain('batch-mine');
  });
});
