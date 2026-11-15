import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { CONTENT_SUBJECT_RULES } from '@rms/db/content-subjects';
import { getLibrarySubjectCounts } from '../db/queries/library';
import { getLibrarySubject, LIBRARY_SUBJECTS, librarySubjectHref } from '../data/library-subjects';

vi.mock('server-only', () => ({}));

/**
 * Subject counts drive the My Library subject links. They must follow the same entitlement rules as the item
 * list, and classify in SQL with the same rules resolveContentSubject applies in JavaScript.
 */

const dialect = new PgDialect();
let where: { sql: string; params: unknown[] } | null = null;
let groupBy: { sql: string; params: unknown[] } | null = null;
let rows: { subject: string; itemCount: number }[] = [];

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: (clause: SQL) => {
            where = dialect.sqlToQuery(clause);
            return {
              groupBy: (expr: SQL) => {
                groupBy = dialect.sqlToQuery(expr);
                return Promise.resolve(rows);
              }
            };
          }
        })
      })
    }
  };
});

describe('getLibrarySubjectCounts', () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    where = null;
    groupBy = null;
    rows = [];
  });

  it('returns nothing (and runs no query) without enrollments', async () => {
    expect(await getLibrarySubjectCounts({ enrolledProgramIds: [], enrolledBatchIds: [] })).toEqual([]);
    expect(where).toBeNull();
  });

  it('scopes to published, entitled, non-external-test content of the open category', async () => {
    await getLibrarySubjectCounts({
      enrolledProgramIds: [16],
      enrolledBatchIds: ['batch-mine'],
      contentType: 'lecture'
    });

    expect(where!.sql).toContain('"is_published"');
    expect(where!.sql).toContain('"content_type" <>');
    expect(where!.params).toEqual(expect.arrayContaining(['external_test', 16, 'batch-mine', 'lecture']));
  });

  it('groups by a subject expression with no bound parameters, carrying every keyword rule', async () => {
    await getLibrarySubjectCounts({ enrolledProgramIds: [16], enrolledBatchIds: [] });

    // Bound parameters would be numbered differently in SELECT and GROUP BY, which PostgreSQL rejects.
    expect(groupBy!.params).toEqual([]);
    expect(groupBy!.sql).toContain(`->>'subject'`);
    expect(groupBy!.sql).toContain(`ELSE 'general' END`);
    for (const rule of CONTENT_SUBJECT_RULES) {
      expect(groupBy!.sql).toContain(`~ '${rule.pattern}' THEN '${rule.slug}'`);
    }
  });

  it('returns subjects in display order and drops unknown or empty ones', async () => {
    rows = [
      { subject: 'general', itemCount: 2 },
      { subject: 'system-design', itemCount: 3 },
      { subject: 'not-a-subject', itemCount: 9 },
      { subject: 'programming-fundamentals', itemCount: 4 },
      { subject: 'dsa', itemCount: 0 }
    ];

    const result = await getLibrarySubjectCounts({ enrolledProgramIds: [16], enrolledBatchIds: [] });

    expect(result).toEqual([
      { subject: 'programming-fundamentals', itemCount: 4 },
      { subject: 'system-design', itemCount: 3 },
      { subject: 'general', itemCount: 2 }
    ]);
  });
});

describe('library subjects', () => {
  it('lists General last and resolves only known slugs', () => {
    expect(LIBRARY_SUBJECTS[LIBRARY_SUBJECTS.length - 1].slug).toBe('general');
    expect(getLibrarySubject('system-design')?.label).toBe('System Design');
    expect(getLibrarySubject('nope')).toBeNull();
    expect(getLibrarySubject(undefined)).toBeNull();
  });

  it('builds links that keep the open category', () => {
    expect(librarySubjectHref({ type: 'lecture', subject: 'dsa' })).toBe('/library?type=lecture&subject=dsa');
    expect(librarySubjectHref({ subject: 'dsa' })).toBe('/library?subject=dsa');
    expect(librarySubjectHref({ type: 'notes' })).toBe('/library?type=notes');
    expect(librarySubjectHref({})).toBe('/library');
  });
});
