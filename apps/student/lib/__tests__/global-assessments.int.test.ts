// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Regression: global quizzes (content_items.program_id = NULL, placed via batch_curriculum) were listed in
// the library but missing from /assessments because the list queries inner-joined programs. Only a real
// Postgres join shows this; the unit tier mocks drizzle chains.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: async () => null, signIn: async () => undefined, signOut: async () => undefined }));

import { db } from '@rms/db';
import * as schema from '@rms/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getStudentFormalAssessments, getStudentPracticeQuizzes } from '@/lib/db/queries/assessments';
import { DEFAULT_PROGRAM_CODE, DEFAULT_PROGRAM_NAME } from '@/lib/db/queries/library';

describe('global (program-less) quizzes on /assessments (live test database)', () => {
  const stamp = `${Date.now()}`.slice(-8);
  let collegeId: string;
  let programId: number;
  let batchId: string;
  let studentId: number;
  const contentIds: string[] = [];
  let practiceQuizId: string;
  let formalQuizId: string;

  beforeAll(async () => {
    const [college] = await db.insert(schema.colleges).values({ name: `GQ ${stamp}`, code: `GQ_${stamp}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(schema.programs)
      .values({ name: `GQ P ${stamp}`, code: `GQ_P_${stamp}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const [batch] = await db.insert(schema.batches).values({ programId, collegeId, name: `GQ B ${stamp}` }).returning();
    batchId = batch.id;
    const [student] = await db
      .insert(schema.students)
      .values({ fullName: 'Global Quiz Student', email: `gq_${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    await db.insert(schema.enrollments).values({ studentId, programId, batchId, status: 'active' });

    // Global content: no programId, reachable only through this batch's curriculum.
    for (const kind of ['practice', 'formal'] as const) {
      const [content] = await db
        .insert(schema.contentItems)
        .values({ title: `GQ ${kind} ${stamp}`, slug: `gq-${kind}-${stamp}`, contentType: 'quiz', isPublished: true, programId: null })
        .returning();
      contentIds.push(content.id);
      const [quiz] = await db
        .insert(schema.quizzes)
        .values({
          contentItemId: content.id,
          quizType: kind,
          timeLimitMinutes: kind === 'formal' ? 30 : null,
          showExplanations: kind === 'formal' ? 'after_deadline' : 'immediate'
        })
        .returning();
      if (kind === 'practice') practiceQuizId = quiz.id;
      else formalQuizId = quiz.id;
      await db.insert(schema.batchCurriculum).values({ batchId, contentItemId: content.id, weekNumber: 1 });
    }
  });

  afterAll(async () => {
    if (contentIds.length) {
      await db.delete(schema.batchCurriculum).where(inArray(schema.batchCurriculum.contentItemId, contentIds));
      await db.delete(schema.contentItems).where(inArray(schema.contentItems.id, contentIds));
    }
    if (studentId) await db.delete(schema.enrollments).where(eq(schema.enrollments.studentId, studentId));
    if (batchId) await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
    if (studentId) await db.delete(schema.students).where(eq(schema.students.id, studentId));
    if (programId) await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    if (collegeId) await db.delete(schema.colleges).where(eq(schema.colleges.id, collegeId));
  });

  it('lists a global practice quiz placed in the student batch', async () => {
    const quizzes = await getStudentPracticeQuizzes(studentId);
    const found = quizzes.find((q) => q.id === practiceQuizId);
    expect(found).toBeDefined();
    expect(found?.programId).toBeNull();
    expect(found?.programName).toBe(DEFAULT_PROGRAM_NAME);
    expect(found?.programCode).toBe(DEFAULT_PROGRAM_CODE);
  });

  it('lists a global formal assessment placed in the student batch', async () => {
    const assessments = await getStudentFormalAssessments(studentId);
    const found = assessments.find((a) => a.id === formalQuizId);
    expect(found).toBeDefined();
    expect(found?.batchId).toBe(batchId);
    expect(found?.programName).toBe(DEFAULT_PROGRAM_NAME);
  });
});
