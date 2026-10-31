// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Tutor plan T-17: the tutor portal's set-based progress (@rms/academic/tutor/progress) must give every student the
// same completion as the student portal's resolveBatchProgressSummary, over all seven content types.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

import {
  db,
  activities,
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  batches,
  colleges,
  contentItems,
  externalAssessmentRecords,
  programs,
  quizAttempts,
  quizzes,
  studentDsaProgress,
  students
} from '@rms/db';
import { eq, inArray } from 'drizzle-orm';
import { tutorScope } from '@rms/academic/scope';
import { getBatchProgress } from '@rms/academic/tutor/progress';
import { resolveBatchProgressSummary } from '@/lib/db/queries/progress';

describe('tutor progress parity with the student portal (T-17)', { timeout: 180000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  let collegeId: string;
  let programId: number;
  let batchId: string;
  let otherBatchId: string;
  const studentIds: number[] = [];
  const itemIds: Record<string, string> = {};

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `PAR College ${stamp}`, code: `PAR_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db.insert(programs).values({ name: `PAR P ${stamp}`, code: `PAR_P_${suffix}`, collegeId, status: 'active' }).returning();
    programId = program.id;
    [batchId, otherBatchId] = (
      await db
        .insert(batches)
        .values([
          { name: `PAR Batch ${stamp}`, programId, collegeId, status: 'active' },
          { name: `PAR Other ${stamp}`, programId, collegeId, status: 'active' }
        ])
        .returning()
    ).map((b) => b.id);

    const defs: { key: string; type: 'lecture' | 'notes' | 'resource' | 'quiz' | 'project' | 'dsa_sheet' | 'external_test'; metadata?: object; published?: boolean }[] = [
      { key: 'lecture', type: 'lecture' },
      { key: 'notes', type: 'notes' },
      { key: 'resource', type: 'resource' },
      { key: 'quiz', type: 'quiz' },
      { key: 'quiz2', type: 'quiz' },
      { key: 'project', type: 'project' },
      { key: 'project2', type: 'project' },
      { key: 'dsa', type: 'dsa_sheet', metadata: { slug: `par-two-sum-${stamp}` } },
      { key: 'dsaOwnSlug', type: 'dsa_sheet' },
      { key: 'external', type: 'external_test', metadata: { assessmentCode: ` PAR-${suffix} ` } },
      { key: 'draft', type: 'lecture', published: false }
    ];
    for (const d of defs) {
      const [row] = await db
        .insert(contentItems)
        .values({ programId, title: `PAR ${d.key}`, slug: `par-${d.key}-${stamp}`, contentType: d.type, metadata: d.metadata ?? {}, isPublished: d.published ?? true })
        .returning();
      itemIds[d.key] = row.id;
    }
    await db.insert(batchCurriculum).values(
      defs.map((d, i) => ({
        batchId,
        contentItemId: itemIds[d.key],
        weekNumber: 1 + (i % 3),
        sequenceOrder: i,
        isRequired: d.key !== 'resource',
        dueAt: d.key === 'project2' ? past : null
      }))
    );

    const quizRows = await db
      .insert(quizzes)
      .values([
        { contentItemId: itemIds.quiz, quizType: 'practice', showExplanations: 'never' },
        { contentItemId: itemIds.quiz2, quizType: 'formal', showExplanations: 'never' }
      ])
      .returning();
    const quizId = (key: string) => quizRows.find((q) => q.contentItemId === itemIds[key])!.id;
    const [a1, a2] = await db
      .insert(assignments)
      .values([{ contentItemId: itemIds.project, maxScore: 100 }, { contentItemId: itemIds.project2, maxScore: 50 }])
      .returning();

    for (let i = 0; i < 4; i++) {
      const [s] = await db.insert(students).values({ fullName: `PAR Student ${i}`, email: `par.${stamp}.${i}@example.test`, collegeId }).returning();
      studentIds.push(s.id);
    }
    const [s0, s1, s2] = studentIds; // s3 has done nothing

    await db.insert(activities).values([
      { studentId: s0, batchId, activityType: 'lecture_completed', referenceId: itemIds.lecture, xpAwarded: 10, activityDateIst: '2026-10-01' },
      { studentId: s0, batchId, activityType: 'lecture_completed', referenceId: itemIds.notes, xpAwarded: 10, activityDateIst: '2026-10-01' },
      { studentId: s0, batchId, activityType: 'lecture_completed', referenceId: itemIds.resource, xpAwarded: 10, activityDateIst: '2026-10-01' },
      // Completion of a lecture is global to the student, as in the student portal (here recorded under another batch).
      { studentId: s1, batchId: otherBatchId, activityType: 'lecture_completed', referenceId: itemIds.lecture, xpAwarded: 10, activityDateIst: '2026-10-01' },
      { studentId: s2, batchId, activityType: 'lecture_completed', referenceId: itemIds.draft, xpAwarded: 10, activityDateIst: '2026-10-01' }
    ]);
    await db.insert(quizAttempts).values([
      { quizId: quizId('quiz'), studentId: s0, batchId, score: 4, maxScore: 10, isPassed: false, submittedAt: past },
      { quizId: quizId('quiz'), studentId: s0, batchId, score: 9, maxScore: 10, isPassed: true, submittedAt: new Date() },
      { quizId: quizId('quiz2'), studentId: s0, batchId, score: 1, maxScore: 10, isPassed: false, submittedAt: null },
      { quizId: quizId('quiz'), studentId: s1, batchId: otherBatchId, score: 7, maxScore: 10, isPassed: true, submittedAt: past },
      { quizId: quizId('quiz2'), studentId: s2, batchId, score: 2, maxScore: 10, isPassed: false, submittedAt: past }
    ]);
    await db.insert(assignmentSubmissions).values([
      { assignmentId: a1.id, studentId: s0, batchId, githubUrl: 'https://github.com/x/1', status: 'approved', score: 88, reviewedAt: new Date() },
      { assignmentId: a2.id, studentId: s0, batchId, githubUrl: 'https://github.com/x/2', status: 'resubmission_requested' },
      { assignmentId: a1.id, studentId: s1, batchId, githubUrl: 'https://github.com/x/3', status: 'under_review' },
      // Project submissions are batch-scoped: this one belongs to the other batch and must not count here.
      { assignmentId: a2.id, studentId: s1, batchId: otherBatchId, githubUrl: 'https://github.com/x/4', status: 'approved' },
      { assignmentId: a1.id, studentId: s2, batchId, githubUrl: 'https://github.com/x/5', status: 'submitted' }
    ]);
    await db.insert(studentDsaProgress).values([
      { studentId: s0, problemSlug: `par-two-sum-${stamp}`, isCompleted: true, completedAt: new Date() },
      { studentId: s1, problemSlug: `par-dsaOwnSlug-${stamp}`, isCompleted: true, completedAt: new Date() },
      { studentId: s2, problemSlug: `par-two-sum-${stamp}`, isCompleted: false }
    ]);
    await db.insert(externalAssessmentRecords).values([
      { studentId: s0, batchId, assessmentCode: `par-${suffix}`, assessmentName: 'PAR', provider: 'QwikTest', maxScore: 50, obtainedScore: 41 },
      { studentId: s1, batchId: otherBatchId, assessmentCode: `PAR-${suffix}`, assessmentName: 'PAR', provider: 'QwikTest', maxScore: 50, obtainedScore: 30 }
    ]);
  });

  afterAll(async () => {
    await db.delete(studentDsaProgress).where(inArray(studentDsaProgress.studentId, studentIds));
    await db.delete(students).where(inArray(students.id, studentIds));
    await db.delete(contentItems).where(inArray(contentItems.id, Object.values(itemIds)));
    await db.delete(batches).where(inArray(batches.id, [batchId, otherBatchId]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it('matches resolveBatchProgressSummary for every student and item', async () => {
    const { curriculum, progress } = await getBatchProgress(db, tutorScope([batchId]), batchId, studentIds);
    // Unpublished items are left out by both sides.
    expect(curriculum.map((c) => c.contentItemId)).not.toContain(itemIds.draft);

    for (const studentId of studentIds) {
      const student = await resolveBatchProgressSummary(studentId, batchId, 'PAR', curriculum);
      const tutor = progress.get(studentId)!;
      expect({ total: tutor.totalRequired, done: tutor.completedRequired, pct: tutor.percentage }, `student ${studentId}`).toEqual({
        total: student.totalRequiredItems,
        done: student.completedRequiredItems,
        pct: student.overallPercentage
      });
      for (const item of curriculum) {
        const s = student.itemsMap[item.contentItemId];
        const t = tutor.items[item.contentItemId];
        expect({ status: t.status, score: t.score }, `student ${studentId} ${item.title}`).toEqual({ status: s.status, score: s.score });
      }
    }

    // The fixture exercises real differences between students.
    const pcts = studentIds.map((id) => progress.get(id)!.percentage);
    expect(new Set(pcts).size).toBeGreaterThan(2);
  });
});
