// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Audit F-01/F-07/F-08: the database-level guarantees the unit tier can only model.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// entitlements.ts imports Auth.js for its session helpers; next-auth's `next/server` import cannot be
// resolved by Node ESM under Vitest, so the file failed to load. These tests only use the
// database-backed access checks, never the session (audit PR-15).
vi.mock('@/lib/auth', () => ({ auth: async () => null, signIn: async () => undefined, signOut: async () => undefined }));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { awardActivityXp } from '@/lib/services/xp-ledger';
import { createFormalAssessmentRepository } from '@/lib/db/queries/formal-assessments';

describe('assessment and XP concurrency (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  let collegeId: string;
  let studentId: number;
  let contentItemId: string;
  let quizId: string;
  let batchId: string;
  let programId: number;

  beforeAll(async () => {
    const [college] = await db.insert(schema.colleges).values({ name: `CC ${stamp}`, code: `CC_${stamp}` }).returning();
    collegeId = college.id;
    const [program] = await db.insert(schema.programs).values({ name: `CC P ${stamp}`, code: `CC_P_${stamp}`, collegeId, status: 'active' }).returning();
    programId = program.id;
    const [batch] = await db.insert(schema.batches).values({ programId, collegeId, name: `CC B ${stamp}` }).returning();
    batchId = batch.id;
    const [student] = await db
      .insert(schema.students)
      .values({ fullName: 'Concurrency Student', email: `cc_${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    await db.insert(schema.studentStats).values({ studentId, collegeId, totalXp: 0 });
    const [content] = await db
      .insert(schema.contentItems)
      .values({ title: 'CC Quiz', slug: `cc-quiz-${stamp}`, contentType: 'quiz', isPublished: true, programId })
      .returning();
    contentItemId = content.id;
    const [quiz] = await db
      .insert(schema.quizzes)
      .values({ contentItemId, quizType: 'formal', timeLimitMinutes: 30, showExplanations: 'after_deadline' })
      .returning();
    quizId = quiz.id;
    await db.insert(schema.batchCurriculum).values({ batchId, contentItemId, weekNumber: 1 });
  });

  afterAll(async () => {
    if (studentId) {
      await db.delete(schema.activities).where(eq(schema.activities.studentId, studentId));
      await db.delete(schema.quizAttempts).where(eq(schema.quizAttempts.studentId, studentId));
      await db.delete(schema.studentStats).where(eq(schema.studentStats.studentId, studentId));
    }
    if (contentItemId) await db.delete(schema.contentItems).where(eq(schema.contentItems.id, contentItemId));
    if (batchId) await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
    if (studentId) await db.delete(schema.students).where(eq(schema.students.id, studentId));
    if (programId) await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    if (collegeId) await db.delete(schema.colleges).where(eq(schema.colleges.id, collegeId));
  });

  const totalXp = async () =>
    (await db.select({ xp: schema.studentStats.totalXp }).from(schema.studentStats).where(eq(schema.studentStats.studentId, studentId)))[0].xp;

  it('awards XP once for concurrent duplicate requests', async () => {
    const before = await totalXp();
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        awardActivityXp({ studentId, batchId, activityType: 'quiz_completed', referenceId: `dup-${stamp}`, xp: 20 })
      )
    );
    expect(results.filter((r: { awarded: boolean }) => r.awarded)).toHaveLength(1);
    expect((await totalXp()) - before).toBe(20);
    const rows = await db
      .select()
      .from(schema.activities)
      .where(and(eq(schema.activities.studentId, studentId), eq(schema.activities.referenceId, `dup-${stamp}`)));
    expect(rows).toHaveLength(1);
  });

  it('does not lose updates for concurrent distinct awards', async () => {
    const before = await totalXp();
    const refs = Array.from({ length: 6 }, (_, i) => `distinct-${stamp}-${i}`);
    await Promise.all(refs.map((ref) => awardActivityXp({ studentId, batchId, activityType: 'lecture_completed', referenceId: ref, xp: 5 })));
    expect((await totalXp()) - before).toBe(30);
    await db.delete(schema.activities).where(inArray(schema.activities.referenceId, refs));
  });

  it('creates a single formal attempt for concurrent starts and finalises it once', async () => {
    const repo = createFormalAssessmentRepository();
    const create = () =>
      repo.withStartLock(quizId, studentId, async (locked) => {
        const existing = await locked.findAttemptForQuiz(quizId, studentId);
        if (existing) return existing.id;
        return (await locked.createAttempt({ quizId, studentId, batchId, maxScore: 0, startedAt: new Date() })).id;
      });
    const ids = await Promise.all([create(), create(), create()]);
    expect(new Set(ids).size).toBe(1);

    const finalize = () =>
      repo.finalizeAttempt({
        attemptId: ids[0],
        studentId,
        score: 1,
        maxScore: 1,
        isPassed: true,
        responses: {},
        tabBlurCount: 0,
        submittedAt: new Date()
      });
    const outcomes = await Promise.all([finalize(), finalize(), finalize()]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
  });
});
