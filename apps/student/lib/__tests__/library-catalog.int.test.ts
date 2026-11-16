// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// The Library is opt-in and shared: an item is listed only when an admin switched "Show in the student Library" on,
// for every enrolled student (global content) or every student of its program, whatever their batch, and never
// while a batch release date still locks it. Those rules live in SQL (a JSON flag test and correlated subqueries
// on batch_curriculum), which the unit tier's mocked drizzle chains cannot evaluate. The content player must also
// open what the Library lists, and nothing more.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: async () => null, signIn: async () => undefined, signOut: async () => undefined }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  }
}));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getLibraryCatalog } from '@/lib/db/queries/library';
import { getContentItem } from '@/lib/db/queries/content';

describe('opt-in, shared Library (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  let collegeId: string;
  let programId: number;
  let otherProgramId: number;
  let batchId: string;
  let studentId: number;
  const ids: Record<string, string> = {};

  const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // name -> [program: 'mine' | 'other' | null (global), metadata, published, placement in my batch]
  const FIXTURES: Record<
    string,
    { program: 'mine' | 'other' | null; metadata: Record<string, unknown>; published?: boolean; placed?: Date | null | 'none' }
  > = {
    globalLibrary: { program: null, metadata: { inLibrary: true } },
    globalNoFlag: { program: null, metadata: {} },
    globalFlagFalse: { program: null, metadata: { inLibrary: false } },
    globalScheduledOnly: { program: null, metadata: {}, placed: null },
    globalLibraryReleased: { program: null, metadata: { inLibrary: true }, placed: PAST },
    globalLibraryLocked: { program: null, metadata: { inLibrary: true }, placed: FUTURE },
    globalLibraryDraft: { program: null, metadata: { inLibrary: true }, published: false },
    mineLibrary: { program: 'mine', metadata: { inLibrary: true } },
    mineNoFlag: { program: 'mine', metadata: {} },
    otherLibrary: { program: 'other', metadata: { inLibrary: true } }
  };

  beforeAll(async () => {
    const [college] = await db.insert(schema.colleges).values({ name: `LC ${stamp}`, code: `LC_${stamp}` }).returning();
    collegeId = college.id;
    const programs = await db
      .insert(schema.programs)
      .values([
        { name: `LC P ${stamp}`, code: `LC_P_${stamp}`, collegeId, status: 'active' as const },
        { name: `LC O ${stamp}`, code: `LC_O_${stamp}`, collegeId, status: 'active' as const }
      ])
      .returning();
    programId = programs[0].id;
    otherProgramId = programs[1].id;
    const [batch] = await db.insert(schema.batches).values({ programId, collegeId, name: `LC B ${stamp}` }).returning();
    batchId = batch.id;
    const [student] = await db
      .insert(schema.students)
      .values({ fullName: 'Library Catalog Student', email: `lc_${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    await db.insert(schema.enrollments).values({ studentId, programId, batchId, status: 'active' });

    for (const [name, f] of Object.entries(FIXTURES)) {
      const [content] = await db
        .insert(schema.contentItems)
        .values({
          title: `LC ${name} ${stamp}`,
          slug: `lc-${name.toLowerCase()}-${stamp}`,
          contentType: 'lecture',
          isPublished: f.published ?? true,
          programId: f.program === 'mine' ? programId : f.program === 'other' ? otherProgramId : null,
          metadata: f.metadata
        })
        .returning();
      ids[name] = content.id;
      if (f.placed !== undefined && f.placed !== 'none') {
        await db
          .insert(schema.batchCurriculum)
          .values({ batchId, contentItemId: content.id, weekNumber: 1, availableFrom: f.placed });
      }
    }
  });

  afterAll(async () => {
    const contentIds = Object.values(ids);
    if (contentIds.length) {
      await db.delete(schema.batchCurriculum).where(inArray(schema.batchCurriculum.contentItemId, contentIds));
      await db.delete(schema.contentItems).where(inArray(schema.contentItems.id, contentIds));
    }
    if (studentId) await db.delete(schema.enrollments).where(eq(schema.enrollments.studentId, studentId));
    if (batchId) await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
    if (studentId) await db.delete(schema.students).where(eq(schema.students.id, studentId));
    if (programId) await db.delete(schema.programs).where(inArray(schema.programs.id, [programId, otherProgramId]));
    if (collegeId) await db.delete(schema.colleges).where(eq(schema.colleges.id, collegeId));
  });

  const names = (found: { id: string }[]) =>
    Object.entries(ids)
      .filter(([, id]) => found.some((f) => f.id === id))
      .map(([name]) => name)
      .sort();

  it('lists exactly the opted-in content this student may have: global or own program, published, released', async () => {
    const catalog = await getLibraryCatalog({ enrolledProgramIds: [programId], enrolledBatchIds: [batchId] });
    // Other suites share this database, so judge only this suite's rows.
    expect(names(catalog)).toEqual(['globalLibrary', 'globalLibraryReleased', 'mineLibrary']);
  });

  it('gives a student of another batch the same global shelf: the Library does not depend on the batch', async () => {
    const catalog = await getLibraryCatalog({ enrolledProgramIds: [otherProgramId], enrolledBatchIds: [] });
    // No batch here, so nothing is release-locked for this student; the other program's item replaces mine.
    expect(names(catalog)).toEqual(['globalLibrary', 'globalLibraryLocked', 'globalLibraryReleased', 'otherLibrary']);
  });

  it('opens what the Library lists in the content player, including global content outside any batch', async () => {
    for (const name of ['globalLibrary', 'globalLibraryReleased', 'mineLibrary']) {
      const item = await getContentItem(studentId, ids[name]);
      expect(item.id, name).toBe(ids[name]);
    }
  });

  it('still opens curriculum content that is not in the Library, and nothing else', async () => {
    // Scheduled in my batch (no flag): reachable from the curriculum.
    expect((await getContentItem(studentId, ids.globalScheduledOnly)).id).toBe(ids.globalScheduledOnly);
    // Global with no flag and no placement, another program's Library item, a draft, and a locked item: refused.
    for (const name of ['globalNoFlag', 'globalFlagFalse', 'otherLibrary', 'globalLibraryDraft', 'globalLibraryLocked']) {
      await expect(getContentItem(studentId, ids[name]), name).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });
});
