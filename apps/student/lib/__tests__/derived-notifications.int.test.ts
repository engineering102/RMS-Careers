// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// The derived-notification queries (greatest() visibility, NOT IN batch curriculum, due windows) on real Postgres.
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
// Completion is covered by the progress query's own tests; here nothing is completed.
vi.mock('@/lib/db/queries/progress', () => ({
  getBatchProgressSummary: vi.fn(async () => ({ itemsMap: {} }))
}));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { syncDerivedNotifications } from '@/lib/services/derived-notifications';

const HOUR = 60 * 60 * 1000;

describe('derived notifications sync (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  const now = new Date();
  let collegeId = '';
  let programId = 0;
  let batchId = '';
  let userId = '';
  let studentId = 0;
  const contentIds: string[] = [];

  async function content(title: string, contentType: 'quiz' | 'lecture' | 'project' | 'notes', opts: { published?: boolean; createdAt?: Date } = {}) {
    const [row] = await db
      .insert(schema.contentItems)
      .values({
        programId,
        title,
        slug: `dn-${stamp}-${contentIds.length}`,
        contentType,
        isPublished: opts.published ?? true,
        ...(opts.createdAt ? { createdAt: opts.createdAt } : {})
      })
      .returning();
    contentIds.push(row.id);
    return row.id;
  }

  async function place(contentItemId: string, opts: { dueAt?: Date; availableFrom?: Date; createdAt?: Date } = {}) {
    await db.insert(schema.batchCurriculum).values({
      batchId,
      contentItemId,
      weekNumber: 1,
      dueAt: opts.dueAt ?? null,
      availableFrom: opts.availableFrom ?? null,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {})
    });
  }

  beforeAll(async () => {
    const [college] = await db.insert(schema.colleges).values({ name: `DN ${stamp}`, code: `DN_${stamp}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(schema.programs)
      .values({ name: `DN Program ${stamp}`, code: `DN_P_${stamp}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const [batch] = await db
      .insert(schema.batches)
      .values({ programId, collegeId, name: `DN Batch ${stamp}`, status: 'active' })
      .returning();
    batchId = batch.id;
    const [user] = await db
      .insert(schema.users)
      .values({ email: `dn_${stamp}@example.test`, passwordHash: 'x', status: 'active' })
      .returning();
    userId = user.id;
    const [student] = await db
      .insert(schema.students)
      .values({ userId, fullName: `DN ${stamp}`, email: `dn_${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;

    const old = new Date(now.getTime() - 20 * 24 * HOUR);

    // Deadlines: a quiz and a project due in 10h alert; an unpublished quiz, one due in 5 days, and a quiz that
    // only opens tomorrow do not.
    await place(await content('DN Due Quiz', 'quiz', { createdAt: old }), { dueAt: new Date(now.getTime() + 10 * HOUR), createdAt: old });
    await place(await content('DN Due Project', 'project', { createdAt: old }), { dueAt: new Date(now.getTime() + 10 * HOUR), createdAt: old });
    await place(await content('DN Draft Quiz', 'quiz', { published: false, createdAt: old }), {
      dueAt: new Date(now.getTime() + 10 * HOUR),
      createdAt: old
    });
    await place(await content('DN Later Quiz', 'quiz', { createdAt: old }), { dueAt: new Date(now.getTime() + 5 * 24 * HOUR), createdAt: old });
    await place(await content('DN Not Open Quiz', 'quiz', { createdAt: old }), {
      dueAt: new Date(now.getTime() + 30 * HOUR),
      availableFrom: new Date(now.getTime() + 24 * HOUR),
      createdAt: old
    });

    // Content: a lecture placed an hour ago (new), a lecture placed long ago that opened 2h ago (new, via
    // available_from), and a program-library note created an hour ago that is not in the batch (new, program scope).
    await place(await content('DN New Lecture', 'lecture', { createdAt: old }), { createdAt: new Date(now.getTime() - HOUR) });
    await place(await content('DN Opened Lecture', 'lecture', { createdAt: old }), {
      createdAt: old,
      availableFrom: new Date(now.getTime() - 2 * HOUR)
    });
    await content('DN Library Notes', 'notes', { createdAt: new Date(now.getTime() - HOUR) });
  });

  afterAll(async () => {
    if (userId) await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
    if (batchId) await db.delete(schema.batchCurriculum).where(eq(schema.batchCurriculum.batchId, batchId));
    if (contentIds.length) await db.delete(schema.contentItems).where(inArray(schema.contentItems.id, contentIds));
    if (studentId) await db.delete(schema.students).where(eq(schema.students.id, studentId));
    if (userId) await db.delete(schema.users).where(eq(schema.users.id, userId));
    if (batchId) await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
    if (programId) await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    if (collegeId) await db.delete(schema.colleges).where(eq(schema.colleges.id, collegeId));
  });

  it('creates deadline and published-content notifications once, then nothing on a re-run', async () => {
    const params = {
      studentId,
      userId,
      batchIds: [batchId],
      programs: [{ programId, programName: `DN Program ${stamp}` }],
      now
    };

    const created = await syncDerivedNotifications(params);
    const rows = await db
      .select({ type: schema.notifications.type, title: schema.notifications.title })
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId));
    const titles = rows.map((r) => r.title).sort();

    expect(created).toBe(rows.length);
    expect(titles).toEqual(
      [
        'Assessment Due Soon: DN Due Quiz',
        'Project Due Soon: DN Due Project',
        `New in DN Batch ${stamp}: DN New Lecture`,
        `New in DN Batch ${stamp}: DN Opened Lecture`,
        `New in DN Program ${stamp}: DN Library Notes`
      ].sort()
    );

    expect(await syncDerivedNotifications({ ...params, now: new Date(now.getTime() + 60_000) })).toBe(0);
  });
});
