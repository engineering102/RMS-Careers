import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { getLibraryItems } from '../db/queries/library';

vi.mock('server-only', () => ({}));

/**
 * Regression: content_items.program_id is nullable (central content is placed in batches via
 * batch_curriculum). The Library must not INNER JOIN programs, and entitlement must still come
 * only from the student's enrolled programs / batches.
 *
 * The db mock evaluates the REAL where-clause built by getLibraryItems: it renders the clause
 * with the Postgres dialect and derives the entitled program/batch IDs from the bound params.
 */

interface Item {
  id: string;
  programId: number | null;
  title: string;
  isPublished: boolean;
}

const PROGRAM_ID = 16;
const OTHER_PROGRAM_ID = 999;
const MY_BATCH = 'batch-mine';
const OTHER_BATCH = 'batch-other';

let items: Item[] = [];
let curriculum: { batchId: string; contentItemId: string }[] = [];
let programs: { id: number; name: string; code: string }[] = [];
let whereSql: string[] = [];
let joinKinds: string[] = [];
const dialect = new PgDialect();

function accessible(where: SQL): Item[] {
  const { sql, params } = dialect.sqlToQuery(where);
  whereSql.push(sql);
  const programIds = params.filter((p): p is number => typeof p === 'number');
  const batchIds = params.filter((p): p is string => typeof p === 'string' && p.startsWith('batch-'));
  return items.filter(
    (i) =>
      i.isPublished &&
      ((i.programId !== null && programIds.includes(i.programId)) ||
        curriculum.some((c) => c.contentItemId === i.id && batchIds.includes(c.batchId)))
  );
}

vi.mock('@rms/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rms/db')>();
  return {
    ...actual,
    db: {
      select: (fields?: any) => ({
        from: () => ({
          where: (clause: SQL) => {
            const rows = accessible(clause);
            if (fields?.total) return Promise.resolve([{ total: rows.length }]);
            return Promise.resolve([]); // topics query
          },
          // Only leftJoin exists: an innerJoin would throw and the query would return no rows.
          leftJoin: () => {
            joinKinds.push('left');
            return {
              where: (clause: SQL) => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () =>
                      Promise.resolve(
                        accessible(clause).map((i) => {
                          const p = programs.find((x) => x.id === i.programId);
                          return {
                            id: i.id,
                            programId: i.programId,
                            programName: p?.name ?? null,
                            programCode: p?.code ?? null,
                            title: i.title,
                            slug: i.id,
                            contentType: 'lecture',
                            description: null,
                            metadata: {},
                            isPublished: i.isPublished,
                            createdAt: new Date(),
                            updatedAt: new Date()
                          };
                        })
                      )
                  })
                })
              })
            };
          }
        })
      })
    }
  };
});

describe('getLibraryItems: program-independent (central) content', () => {
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://mock:mock@localhost:5432/mock';
    whereSql = [];
    joinKinds = [];
    programs = [
      { id: PROGRAM_ID, name: 'Career Readiness', code: 'CRP' },
      { id: OTHER_PROGRAM_ID, name: 'Other Program', code: 'OTH' }
    ];
    items = [
      { id: 'central-mine', programId: null, title: 'Central in my batch', isPublished: true },
      { id: 'central-other', programId: null, title: 'Central in another batch', isPublished: true },
      { id: 'central-orphan', programId: null, title: 'Central not in any batch', isPublished: true },
      { id: 'central-draft', programId: null, title: 'Unpublished central in my batch', isPublished: false },
      { id: 'linked-mine', programId: PROGRAM_ID, title: 'Program-linked in my program', isPublished: true },
      { id: 'linked-other', programId: OTHER_PROGRAM_ID, title: 'Program-linked elsewhere', isPublished: true }
    ];
    curriculum = [
      { batchId: MY_BATCH, contentItemId: 'central-mine' },
      { batchId: MY_BATCH, contentItemId: 'central-draft' },
      { batchId: OTHER_BATCH, contentItemId: 'central-other' }
    ];
  });

  const run = () =>
    getLibraryItems(12, { enrolledProgramIds: [PROGRAM_ID], enrolledBatchIds: [MY_BATCH] });

  it('shows null-program content reachable through the enrolled batch curriculum', async () => {
    const result = await run();
    const central = result.items.find((i) => i.id === 'central-mine');
    expect(central).toBeDefined();
    expect(central!.programId).toBeNull();
    expect(central!.programName).toBe('RMS Careers');
    expect(central!.programCode).toBe('RMS');
  });

  it('keeps unrelated content inaccessible', async () => {
    const ids = (await run()).items.map((i) => i.id);
    expect(ids).not.toContain('central-other'); // curriculum of a batch the student is not in
    expect(ids).not.toContain('central-orphan'); // published but in no enrolled batch/program
    expect(ids).not.toContain('central-draft'); // unpublished, even in my batch
    expect(ids).not.toContain('linked-other'); // different program
  });

  it('still returns program-linked content with its real program name and code', async () => {
    const linked = (await run()).items.find((i) => i.id === 'linked-mine');
    expect(linked).toBeDefined();
    expect(linked!.programName).toBe('Career Readiness');
    expect(linked!.programCode).toBe('CRP');
  });

  it('reports a total that matches the returned items', async () => {
    const result = await run();
    expect(result.items.map((i) => i.id).sort()).toEqual(['central-mine', 'linked-mine']);
    expect(result.totalCount).toBe(2);
  });

  it('returns nothing for a student whose only entitlement is another batch', async () => {
    const result = await getLibraryItems(12, { enrolledProgramIds: [], enrolledBatchIds: [OTHER_BATCH] });
    expect(result.items.map((i) => i.id)).toEqual(['central-other']);
  });

  it('builds an entitlement-restricted, published-only clause and uses a LEFT join', async () => {
    await run();
    expect(joinKinds).toEqual(['left']);
    const clause = whereSql[0];
    expect(clause).toContain('"is_published" = $');
    expect(clause).toContain('"program_id" in (');
    expect(clause).toContain('batch_curriculum');
    expect(clause).toMatch(/"batch_curriculum"\."batch_id" IN \(\$\d+\)/);
  });
});
