// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Tutor plan T-02, T-03, T-04: a tutor of batch A sees and acts on batch A only, also for a student enrolled in both
// A and B; foreign and unknown ids get the same answer. Plus the tutor review path end to end (XP and notification once).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  }
}));

import {
  db,
  activities,
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  batches,
  colleges,
  contentItems,
  enrollments,
  notifications,
  programs,
  quizAttempts,
  quizzes,
  students,
  tutorBatchAssignments,
  tutors,
  userRoles,
  users
} from '@rms/db';
import { and, eq, inArray } from 'drizzle-orm';
import { hashPassword } from '@rms/auth';
import { getReviewQueue, getReviewQueueCounts, getReviewSubmission } from '@rms/academic/tutor/review-queue';
import { getBatchRoster, getRosterStudent } from '@rms/academic/tutor/roster';
import { getQuizParticipation } from '@rms/academic/tutor/assessments';
import { getTutorOverviewMetrics } from '@rms/academic/tutor/overview';
import { getTutorContext, requireTutorBatch } from '../db/tutor-context';
import { reviewSubmissionAction } from '../../app/(dashboard)/reviews/[submissionId]/actions';

const DAY = 24 * 60 * 60 * 1000;

describe('tutor batch isolation on the test database', { timeout: 180000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  let collegeId: string;
  let programId: number;
  let batchA: string;
  let batchB: string;
  let tutorUserId: string;
  let tutorId: string;
  let studentUserId: string;
  let studentId: number;
  let projectItem: string;
  let quizItem: string;
  let lectureItem: string;
  let assignmentId: string;
  let quizId: string;
  let subA: string;
  let subB: string;

  const context = async () => {
    authMock.mockResolvedValue({ user: { id: tutorUserId, role: 'tutor', authTime: Date.now() } });
    const ctx = await getTutorContext();
    if (!ctx) throw new Error('tutor context missing');
    return ctx;
  };
  const statusOf = async (id: string) =>
    (await db.select({ status: assignmentSubmissions.status }).from(assignmentSubmissions).where(eq(assignmentSubmissions.id, id)))[0].status;

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `ISO College ${stamp}`, code: `ISO_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db.insert(programs).values({ name: `ISO P ${stamp}`, code: `ISO_P_${suffix}`, collegeId, status: 'active' }).returning();
    programId = program.id;
    [batchA, batchB] = (
      await db
        .insert(batches)
        .values([
          { name: `ISO A ${stamp}`, programId, collegeId, status: 'active' },
          { name: `ISO B ${stamp}`, programId, collegeId, status: 'active' }
        ])
        .returning()
    ).map((b) => b.id);

    const [tutorUser] = await db
      .insert(users)
      .values({ email: `iso.${stamp}.tutor@example.test`, name: 'Tutor', passwordHash: await hashPassword('irrelevant password'), status: 'active' })
      .returning();
    tutorUserId = tutorUser.id;
    await db.insert(userRoles).values({ userId: tutorUserId, role: 'tutor' });
    tutorId = (await db.insert(tutors).values({ userId: tutorUserId, fullName: `ISO Tutor ${stamp}` }).returning())[0].id;
    await db.insert(tutorBatchAssignments).values({ tutorId, batchId: batchA });

    const [studentUser] = await db
      .insert(users)
      .values({ email: `iso.${stamp}.student@example.test`, name: 'Student', passwordHash: 'x', status: 'active' })
      .returning();
    studentUserId = studentUser.id;
    studentId = (
      await db.insert(students).values({ userId: studentUserId, fullName: `ISO Student ${stamp}`, email: `iso.${stamp}.student@example.test`, collegeId }).returning()
    )[0].id;
    await db.insert(enrollments).values([
      { studentId, programId, batchId: batchA, status: 'active', createdAt: new Date(Date.now() - 30 * DAY) },
      { studentId, programId, batchId: batchB, status: 'active', createdAt: new Date(Date.now() - 30 * DAY) }
    ]);

    [projectItem, quizItem, lectureItem] = (
      await db
        .insert(contentItems)
        .values([
          { programId, title: `ISO Project ${stamp}`, slug: `iso-project-${stamp}`, contentType: 'project', isPublished: true },
          { programId, title: `ISO Quiz ${stamp}`, slug: `iso-quiz-${stamp}`, contentType: 'quiz', isPublished: true },
          { programId, title: `ISO Lecture ${stamp}`, slug: `iso-lecture-${stamp}`, contentType: 'lecture', isPublished: true }
        ])
        .returning()
    ).map((c) => c.id);
    assignmentId = (await db.insert(assignments).values({ contentItemId: projectItem, maxScore: 100 }).returning())[0].id;
    quizId = (await db.insert(quizzes).values({ contentItemId: quizItem, quizType: 'practice', showExplanations: 'never' }).returning())[0].id;
    await db.insert(batchCurriculum).values([
      { batchId: batchA, contentItemId: projectItem, weekNumber: 1 },
      { batchId: batchA, contentItemId: quizItem, weekNumber: 1 },
      { batchId: batchA, contentItemId: lectureItem, weekNumber: 1 },
      { batchId: batchB, contentItemId: projectItem, weekNumber: 1 },
      { batchId: batchB, contentItemId: quizItem, weekNumber: 1 }
    ]);

    [subA, subB] = (
      await db
        .insert(assignmentSubmissions)
        .values([
          { assignmentId, studentId, batchId: batchA, githubUrl: 'https://github.com/example/a', submittedAt: new Date(Date.now() - 3 * DAY) },
          { assignmentId, studentId, batchId: batchB, githubUrl: 'https://github.com/example/b' }
        ])
        .returning({ id: assignmentSubmissions.id })
    ).map((r) => r.id);
    await db.insert(quizAttempts).values([
      { quizId, studentId, batchId: batchA, score: 6, maxScore: 10, isPassed: true, startedAt: new Date(Date.now() - 3 * DAY), submittedAt: new Date(Date.now() - 3 * DAY) },
      { quizId, studentId, batchId: batchB, score: 2, maxScore: 10, isPassed: false, submittedAt: new Date() },
      { quizId, studentId, batchId: batchB, score: 3, maxScore: 10, isPassed: false, submittedAt: new Date() }
    ]);
    const twoDaysAgo = new Date(Date.now() - 2 * DAY);
    await db.insert(activities).values([
      { studentId, batchId: batchA, activityType: 'lecture_completed', referenceId: lectureItem, xpAwarded: 10, activityDateIst: '2026-10-01', createdAt: twoDaysAgo },
      { studentId, batchId: batchB, activityType: 'quiz_completed', referenceId: `iso-b-${stamp}`, xpAwarded: 10, activityDateIst: '2026-10-01' }
    ] as never);
  });

  afterAll(async () => {
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(users).where(inArray(users.id, [tutorUserId, studentUserId]));
    await db.delete(contentItems).where(inArray(contentItems.id, [projectItem, quizItem, lectureItem]));
    await db.delete(batches).where(inArray(batches.id, [batchA, batchB]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it('scopes the tutor to batch A', async () => {
    const ctx = await context();
    expect(ctx.batchIds).toEqual([batchA]);
    await expect(requireTutorBatch(batchA)).resolves.toBeTruthy();
    await expect(requireTutorBatch(batchB)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('queue, counts and overview contain batch A submissions only (T-02)', async () => {
    const { scope, userId } = await context();
    const page = await getReviewQueue(db, scope, { statuses: undefined });
    expect(page.rows.map((r) => r.submissionId)).toEqual([subA]);
    expect(await getReviewQueue(db, scope, { batchId: batchB })).toEqual({ rows: [], nextCursor: null });
    expect(await getReviewQueueCounts(db, scope)).toMatchObject({ submitted: 1, under_review: 0 });
    const metrics = await getTutorOverviewMetrics(db, scope, userId);
    expect([...metrics.byBatch.keys()]).toEqual([batchA]);
  });

  it('a foreign submission and an unknown one look the same (T-04)', async () => {
    const { scope } = await context();
    expect(await getReviewSubmission(db, scope, subA)).toMatchObject({ submissionId: subA, transitions: ['claim'] });
    expect(await getReviewSubmission(db, scope, subB)).toBeNull();
    expect(await getReviewSubmission(db, scope, '00000000-0000-4000-8000-000000000000')).toBeNull();

    const version = (await db.select({ v: assignmentSubmissions.updatedAt }).from(assignmentSubmissions).where(eq(assignmentSubmissions.id, subB)))[0].v;
    const foreign = await reviewSubmissionAction({ submissionId: subB, expectedVersion: String(version), transition: 'claim' });
    const unknown = await reviewSubmissionAction({ submissionId: '00000000-0000-4000-8000-000000000000', expectedVersion: 'x', transition: 'claim' });
    expect(foreign).toEqual(unknown);
    expect(foreign).toMatchObject({ success: false, code: 'not_found' });
    expect(await statusOf(subB)).toBe('submitted');
  });

  it('roster progress and activity come from batch A only, for a student in both batches (T-03)', async () => {
    const { scope } = await context();
    const roster = await getBatchRoster(db, scope, batchA);
    expect(roster?.students.map((s) => s.studentId)).toEqual([studentId]);
    const student = roster!.students[0];
    expect(Object.keys(student.progress.items).sort()).toEqual([projectItem, quizItem, lectureItem].sort());
    expect(student.progress.items[lectureItem].status).toBe('completed');
    expect(student.progress.items[projectItem].submissionStatus).toBe('submitted');
    // Last activity counts XP activity, submissions and quiz attempts of batch A only: the newest is the lecture two
    // days ago. Batch B's submission, attempts and activity are all newer and must not show.
    const idle = Date.now() - student.lastActivityAt!.getTime();
    expect(idle).toBeGreaterThan(2 * DAY - 60_000);
    expect(idle).toBeLessThan(2 * DAY + 60 * 60_000);
    expect(await getRosterStudent(db, scope, batchB, studentId)).toBeNull();
    expect(await getRosterStudent(db, scope, batchA, 2_000_000_000)).toBeNull();
  });

  it('assessment participation counts batch A attempts only', async () => {
    const { scope } = await context();
    const quiz = await getQuizParticipation(db, scope, batchA, quizId);
    expect(quiz?.participants).toEqual([expect.objectContaining({ studentId, attempts: 1, bestPercentage: 60, passed: true })]);
    expect(await getQuizParticipation(db, scope, batchB, quizId)).toBeNull();
  });

  it('claims and approves through the shared review: XP and notification exactly once, stale versions conflict', async () => {
    await context();
    let detail = (await getReviewSubmission(db, (await context()).scope, subA))!;
    const claimed = await reviewSubmissionAction({ submissionId: subA, expectedVersion: detail.version, transition: 'claim' });
    expect(claimed).toMatchObject({ success: true, status: 'under_review' });

    const stale = await reviewSubmissionAction({ submissionId: subA, expectedVersion: detail.version, transition: 'approve', score: 90 });
    expect(stale).toMatchObject({ success: false, code: 'conflict' });

    detail = (await getReviewSubmission(db, (await context()).scope, subA))!;
    expect(detail.transitions).toEqual(['approve', 'request_resubmission']);
    expect(detail.reviewedByUserId).toBe(tutorUserId);
    expect(await reviewSubmissionAction({ submissionId: subA, expectedVersion: detail.version, transition: 'approve', score: 90 })).toMatchObject({
      success: true,
      status: 'approved'
    });
    expect(await reviewSubmissionAction({ submissionId: subA, expectedVersion: detail.version, transition: 'approve', score: 90 })).toMatchObject({
      code: 'conflict'
    });

    const xp = await db
      .select({ id: activities.id })
      .from(activities)
      .where(and(eq(activities.studentId, studentId), eq(activities.activityType, 'assignment_approved'), eq(activities.referenceId, subA)));
    expect(xp).toHaveLength(1);
    const notes = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.userId, studentUserId));
    expect(notes).toHaveLength(1);

    // An approved submission offers a tutor nothing more (reopen and correct are admin-only).
    expect((await getReviewSubmission(db, (await context()).scope, subA))!.transitions).toEqual([]);
  });

  it('unassignment removes access on the next request (T-05)', async () => {
    await db.delete(tutorBatchAssignments).where(eq(tutorBatchAssignments.tutorId, tutorId));
    const { scope, batchIds } = await context();
    expect(batchIds).toEqual([]);
    expect((await getReviewQueue(db, scope)).rows).toEqual([]);
    expect(await getReviewSubmission(db, scope, subA)).toBeNull();
    expect(await getBatchRoster(db, scope, batchA)).toBeNull();
  });
});
