// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// getContentItem authorizes with SQL subqueries over the student's enrollments (one round-trip). The unit tests mock
// drizzle chains and cannot evaluate WHERE clauses, so this runs the real query: program access, batch-only global
// content, release dates, completed enrollments, unpublished / foreign / unplaced items, and the batch context.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));

import { db, activities, batchCurriculum, batches, colleges, contentItems, enrollments, programs, students } from '@rms/db';
import { eq, inArray } from 'drizzle-orm';
import { getContentItem } from '@/lib/db/queries/content';

describe('getContentItem against the database', { timeout: 180000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  let collegeId: string;
  let programId: number;
  let foreignProgramId: number;
  let batchId: string;
  let otherBatchId: string;
  const studentIds: Record<'active' | 'completed' | 'none', number> = { active: 0, completed: 0, none: 0 };
  const itemIds: Record<string, string> = {};

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `CPI College ${stamp}`, code: `CPI_${suffix}` }).returning();
    collegeId = college.id;
    const [program, foreign] = await db
      .insert(programs)
      .values([
        { name: `CPI P ${stamp}`, code: `CPI_P_${suffix}`, collegeId, status: 'active' },
        { name: `CPI Q ${stamp}`, code: `CPI_Q_${suffix}`, collegeId, status: 'active' }
      ])
      .returning();
    programId = program.id;
    foreignProgramId = foreign.id;
    [batchId, otherBatchId] = (
      await db
        .insert(batches)
        .values([
          { name: `CPI Batch ${stamp}`, programId, collegeId, status: 'active' },
          { name: `CPI Other ${stamp}`, programId, collegeId, status: 'active' }
        ])
        .returning()
    ).map((b) => b.id);

    const defs: { key: string; programId: number | null; published?: boolean }[] = [
      { key: 'program', programId },
      { key: 'global', programId: null },
      { key: 'locked', programId: null },
      { key: 'foreign', programId: foreignProgramId },
      { key: 'draft', programId, published: false },
      { key: 'otherBatch', programId: null }
    ];
    for (const d of defs) {
      const [row] = await db
        .insert(contentItems)
        .values({
          programId: d.programId,
          title: `CPI ${d.key}`,
          slug: `cpi-${d.key}-${stamp}`,
          contentType: 'lecture',
          metadata: {},
          isPublished: d.published ?? true
        })
        .returning();
      itemIds[d.key] = row.id;
    }
    await db.insert(batchCurriculum).values([
      { batchId, contentItemId: itemIds.global, weekNumber: 1, sequenceOrder: 1, availableFrom: past },
      { batchId, contentItemId: itemIds.locked, weekNumber: 1, sequenceOrder: 2, availableFrom: future },
      { batchId: otherBatchId, contentItemId: itemIds.otherBatch, weekNumber: 1, sequenceOrder: 1 }
    ]);

    for (const key of ['active', 'completed', 'none'] as const) {
      const [s] = await db
        .insert(students)
        .values({ fullName: `CPI Student ${key}`, email: `cpi.${stamp}.${key}@example.test`, collegeId })
        .returning();
      studentIds[key] = s.id;
    }
    await db.insert(enrollments).values([
      { studentId: studentIds.active, programId, batchId, status: 'active' },
      { studentId: studentIds.completed, programId, batchId, status: 'completed' }
    ]);
    await db.insert(activities).values({
      studentId: studentIds.active,
      batchId,
      activityType: 'lecture_completed',
      referenceId: itemIds.global,
      xpAwarded: 5,
      activityDateIst: '2026-10-01'
    });
  });

  afterAll(async () => {
    // Tolerates a fixture that failed part-way: only delete what was created.
    const ids = Object.values(studentIds).filter(Boolean);
    const items = Object.values(itemIds);
    const batchIds = [batchId, otherBatchId].filter(Boolean);
    const programIds = [programId, foreignProgramId].filter(Boolean);
    if (ids.length > 0) {
      await db.delete(enrollments).where(inArray(enrollments.studentId, ids));
      await db.delete(students).where(inArray(students.id, ids));
    }
    if (items.length > 0) await db.delete(contentItems).where(inArray(contentItems.id, items));
    if (batchIds.length > 0) await db.delete(batches).where(inArray(batches.id, batchIds));
    if (programIds.length > 0) await db.delete(programs).where(inArray(programs.id, programIds));
    if (collegeId) await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it('serves program content to an enrolled student, without batch context when it is not placed in the batch', async () => {
    const item = await getContentItem(studentIds.active, itemIds.program, batchId);
    expect(item.id).toBe(itemIds.program);
    expect(item.programCode).toBe(`CPI_P_${suffix}`);
    expect(item.isCompleted).toBe(false);
    expect(item.relatedBatchContext).toBeNull();
  });

  it('serves batch-only global content with completion and the batch context', async () => {
    const item = await getContentItem(studentIds.active, itemIds.global, batchId);
    expect(item.id).toBe(itemIds.global);
    expect(item.programCode).toBe('RMS');
    expect(item.isCompleted).toBe(true);
    expect(item.completedAt).toBeInstanceOf(Date);
    expect(item.relatedBatchContext).toEqual({ batchId, batchName: `CPI Batch ${stamp}` });

    const withoutBatch = await getContentItem(studentIds.active, itemIds.global);
    expect(withoutBatch.relatedBatchContext).toBeNull();
  });

  it('ignores a batch the student is not enrolled in', async () => {
    const item = await getContentItem(studentIds.active, itemIds.global, otherBatchId);
    expect(item.relatedBatchContext).toBeNull();
  });

  it('keeps read-only access for a completed enrollment', async () => {
    const item = await getContentItem(studentIds.completed, itemIds.global, batchId);
    expect(item.id).toBe(itemIds.global);
  });

  it('hides unreleased, unpublished, foreign and unplaced content, and everything from an unenrolled student', async () => {
    await expect(getContentItem(studentIds.active, itemIds.locked, batchId)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(getContentItem(studentIds.active, itemIds.locked)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(getContentItem(studentIds.active, itemIds.draft)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(getContentItem(studentIds.active, itemIds.foreign)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(getContentItem(studentIds.active, itemIds.otherBatch)).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(getContentItem(studentIds.none, itemIds.program)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
