import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Shared atomic review (@rms/academic/review, tutor plan §9): real transactions, row locks and the XP ledger.
vi.mock('server-only', () => ({}));

import {
  db,
  colleges,
  programs,
  batches,
  users,
  tutors,
  students,
  studentStats,
  contentItems,
  assignments,
  assignmentSubmissions,
  activities,
  notifications,
  type SubmissionStatusEnum
} from '@rms/db';
import { dbTx } from '@rms/db/tx';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { adminScope, tutorScope } from '@rms/academic/scope';
import { reviewSubmission, PROJECT_APPROVAL_XP, type ReviewActor, type ReviewInput } from '@rms/academic/review';

describe('shared atomic review on the test database', { timeout: 120000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  let collegeId: string;
  let programId: number;
  let batchA: string;
  let batchB: string;
  let studentUserId: string;
  let adminUserId: string;
  let tutorUserId: string;
  let tutorId: string;
  let studentId: number;
  let contentItemId: string;
  let assignmentId: string;
  let submissionId: string;
  let admin: ReviewActor;
  let tutor: ReviewActor;

  const run = (actor: ReviewActor, input: Omit<ReviewInput, 'submissionId'>, scope = adminScope()) =>
    dbTx.transaction((tx) => reviewSubmission(tx, scope, actor, { submissionId, ...input }));

  const row = async () => {
    const [r] = await db
      .select({
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        tutorFeedback: assignmentSubmissions.tutorFeedback,
        reviewedByUserId: assignmentSubmissions.reviewedByUserId,
        reviewedByTutorId: assignmentSubmissions.reviewedByTutorId,
        version: sql<string>`${assignmentSubmissions.updatedAt}::text`
      })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.id, submissionId));
    return r;
  };
  const xpRows = () =>
    db
      .select({ xp: activities.xpAwarded })
      .from(activities)
      .where(and(eq(activities.studentId, studentId), eq(activities.activityType, 'assignment_approved'), eq(activities.referenceId, submissionId)));
  const totalXp = async () =>
    (await db.select({ xp: studentStats.totalXp }).from(studentStats).where(eq(studentStats.studentId, studentId)))[0]?.xp ?? 0;
  const studentNotifications = () =>
    db.select({ title: notifications.title, body: notifications.body, actionUrl: notifications.actionUrl, type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, studentUserId));

  /** Puts the submission in `status` with no review data, and clears the ledger, stats and notifications. */
  const reset = async (status: SubmissionStatusEnum) => {
    await db.delete(notifications).where(eq(notifications.userId, studentUserId));
    await db.delete(activities).where(eq(activities.studentId, studentId));
    await db.delete(studentStats).where(eq(studentStats.studentId, studentId));
    await db
      .update(assignmentSubmissions)
      .set({ status, score: null, tutorFeedback: null, reviewedByUserId: null, reviewedByTutorId: null, reviewedAt: null, updatedAt: new Date() })
      .where(eq(assignmentSubmissions.id, submissionId));
    return (await row()).version;
  };

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `REV College ${stamp}`, code: `REV_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `REV Program ${stamp}`, code: `REV_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const created = await db
      .insert(batches)
      .values([
        { name: `REV Batch A ${stamp}`, programId, collegeId },
        { name: `REV Batch B ${stamp}`, programId, collegeId }
      ])
      .returning();
    [batchA, batchB] = [created[0].id, created[1].id];
    const people = await db
      .insert(users)
      .values([
        { email: `rev.student.${stamp}@example.test`, passwordHash: 'not-a-hash', name: 'REV Student' },
        { email: `rev.admin.${stamp}@example.test`, passwordHash: 'not-a-hash', name: 'REV Admin' },
        { email: `rev.tutor.${stamp}@example.test`, passwordHash: 'not-a-hash', name: 'REV Tutor' }
      ])
      .returning();
    [studentUserId, adminUserId, tutorUserId] = people.map((p) => p.id);
    const [tutorRow] = await db.insert(tutors).values({ userId: tutorUserId, fullName: 'REV Tutor Profile' }).returning();
    tutorId = tutorRow.id;
    const [student] = await db
      .insert(students)
      .values({ userId: studentUserId, fullName: `REV Student ${stamp}`, email: `rev.student.${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    const [item] = await db
      .insert(contentItems)
      .values({ programId, title: `REV Project ${stamp}`, slug: `rev-project-${stamp}`, contentType: 'project', isPublished: true })
      .returning();
    contentItemId = item.id;
    const [assignment] = await db.insert(assignments).values({ contentItemId, maxScore: 100 }).returning();
    assignmentId = assignment.id;
    const [submission] = await db
      .insert(assignmentSubmissions)
      .values({ assignmentId, studentId, batchId: batchA, githubUrl: 'https://github.com/example/rev' })
      .returning({ id: assignmentSubmissions.id });
    submissionId = submission.id;
    admin = { userId: adminUserId, tutorId: null, kind: 'admin' };
    tutor = { userId: tutorUserId, tutorId, kind: 'tutor' };
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, studentUserId));
    await db.delete(activities).where(eq(activities.studentId, studentId));
    await db.delete(studentStats).where(eq(studentStats.studentId, studentId));
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
    await db.delete(contentItems).where(eq(contentItems.id, contentItemId));
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(tutors).where(eq(tutors.id, tutorId));
    await db.delete(users).where(inArray(users.id, [studentUserId, adminUserId, tutorUserId]));
    await db.delete(batches).where(inArray(batches.id, [batchA, batchB]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  let version: string;
  beforeEach(async () => {
    version = await reset('submitted');
  });

  it('attributes the transition to the acting user and returns a new version', async () => {
    const result = await run(tutor, { transition: 'claim', expectedVersion: version });
    expect(result).toMatchObject({ ok: true, status: 'under_review', xpAwarded: false, notified: false });
    const after = await row();
    expect(after).toMatchObject({ status: 'under_review', reviewedByUserId: tutorUserId, reviewedByTutorId: tutorId });
    expect(result.ok && result.version).toBe(after.version);
    expect(after.version).not.toBe(version);
  });

  it('keeps the previous tutor id but records the admin user when an admin acts', async () => {
    const claimed = await run(tutor, { transition: 'claim', expectedVersion: version });
    const result = await run(admin, { transition: 'request_resubmission', expectedVersion: claimed.ok ? claimed.version : '', feedback: 'Add retries' });
    expect(result.ok).toBe(true);
    expect(await row()).toMatchObject({ status: 'resubmission_requested', reviewedByUserId: adminUserId, reviewedByTutorId: tutorId });
  });

  it('refuses a stale version and changes nothing', async () => {
    await run(tutor, { transition: 'claim', expectedVersion: version });
    const before = await row();
    const stale = await run(admin, { transition: 'approve', expectedVersion: version, score: 90 });
    expect(stale).toEqual({ ok: false, code: 'conflict' });
    expect(await row()).toEqual(before);
    expect(await xpRows()).toHaveLength(0);
  });

  it('lets exactly one of several simultaneous approvals win: one XP award, one notification', async () => {
    const claimed = await run(tutor, { transition: 'claim', expectedVersion: version });
    const seen = claimed.ok ? claimed.version : '';
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => run(i % 2 ? admin : tutor, { transition: 'approve', expectedVersion: seen, score: 80 + i }))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.code === 'conflict')).toBe(true);
    expect(await xpRows()).toEqual([{ xp: PROJECT_APPROVAL_XP }]);
    expect(await totalXp()).toBe(PROJECT_APPROVAL_XP);
    const sent = await studentNotifications();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'PROJECT_REVIEWED', actionUrl: `/batches/${batchA}` });
    expect(sent[0].title).toBe(`Project Review: REV Project ${stamp}`);
  });

  it('keeps the XP on reopen and never awards it twice on re-approval', async () => {
    const claimed = await run(tutor, { transition: 'claim', expectedVersion: version });
    const approved = await run(tutor, { transition: 'approve', expectedVersion: claimed.ok ? claimed.version : '', score: 70 });
    const reopened = await run(admin, { transition: 'reopen', expectedVersion: approved.ok ? approved.version : '', reason: 'Recheck tests' });
    expect(reopened).toMatchObject({ ok: true, status: 'under_review' });
    const again = await run(tutor, { transition: 'approve', expectedVersion: reopened.ok ? reopened.version : '', score: 75 });
    expect(again).toMatchObject({ ok: true, status: 'approved', xpAwarded: false });
    expect(await xpRows()).toEqual([{ xp: PROJECT_APPROVAL_XP }]);
    expect(await totalXp()).toBe(PROJECT_APPROVAL_XP);
    // approve, reopen, approve: claims send nothing
    expect((await studentNotifications()).map((n) => n.body.split('.')[0])).toEqual(
      expect.arrayContaining(['Your project submission was approved', 'Your approved project submission was reopened for review'])
    );
    expect(await studentNotifications()).toHaveLength(3);
  });

  it('lets only an admin correct an approved review, without touching XP', async () => {
    const claimed = await run(tutor, { transition: 'claim', expectedVersion: version });
    const approved = await run(tutor, { transition: 'approve', expectedVersion: claimed.ok ? claimed.version : '', score: 60 });
    const v = approved.ok ? approved.version : '';
    expect(await run(tutor, { transition: 'correct', expectedVersion: v, score: 65 })).toEqual({ ok: false, code: 'forbidden_transition' });
    expect(await run(admin, { transition: 'correct', expectedVersion: v, score: 65 })).toMatchObject({ ok: true, status: 'approved' });
    expect(await row()).toMatchObject({ score: 65, reviewedByUserId: adminUserId });
    expect(await totalXp()).toBe(PROJECT_APPROVAL_XP);
  });

  it('treats a submission outside a tutor scope as not found', async () => {
    expect(await run(tutor, { transition: 'claim', expectedVersion: version }, tutorScope([batchB]))).toEqual({ ok: false, code: 'not_found' });
    expect(await run(tutor, { transition: 'claim', expectedVersion: version }, tutorScope([]))).toEqual({ ok: false, code: 'not_found' });
    expect((await row()).status).toBe('submitted');
  });

  it('rolls back the status, XP and notification together when the transaction fails', async () => {
    const claimed = await run(tutor, { transition: 'claim', expectedVersion: version });
    const before = await row();
    await expect(
      dbTx.transaction(async (tx) => {
        const r = await reviewSubmission(tx, adminScope(), tutor, {
          submissionId,
          transition: 'approve',
          expectedVersion: claimed.ok ? claimed.version : '',
          score: 99
        });
        expect(r.ok).toBe(true);
        throw new Error('fail after the review');
      })
    ).rejects.toThrow('fail after the review');
    expect(await row()).toEqual(before);
    expect(await xpRows()).toHaveLength(0);
    expect(await totalXp()).toBe(0);
    expect(await studentNotifications()).toHaveLength(0);
  });
});
