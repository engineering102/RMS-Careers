import 'server-only';

/**
 * Atomic project review (tutor plan §9.3), shared by apps/admin and apps/tutor. The caller opens the transaction
 * (`dbTx.transaction(tx => reviewSubmission(tx, ...))`) so the status change, the reviewer attribution, the approval
 * XP and the student's notification commit together or not at all.
 *
 * Concurrency: the row is locked (SELECT ... FOR UPDATE) and the caller must present the version it last saw
 * (`updated_at::text`, exact to the microsecond; a JS Date would drop the microseconds). A stale version, a second
 * click, or another reviewer acting first returns `conflict` and changes nothing. XP stays exactly-once through the
 * ledger's unique (student, activity type, reference) key, also when an approval is reopened and approved again.
 */
import { and, eq, sql } from 'drizzle-orm';
import {
  assignmentSubmissions,
  assignments,
  contentItems,
  notifications,
  students,
  type SubmissionStatusEnum
} from '@rms/db/schema';
import type { TxTransaction } from '@rms/db/tx';
import { awardActivityXp, type ExecutingClient } from '@rms/db/xp-ledger';
import { inScope, type AcademicScope } from './scope';
import { planReview, type ReviewActorKind, type ReviewRuleError, type ReviewTransition } from './review-rules';
import { buildProjectReviewedNotification } from './notifications';

/** XP for an approved project (unchanged from the admin review). */
export const PROJECT_APPROVAL_XP = 100;

export interface ReviewActor {
  /** users.id of the person acting; stored as reviewed_by_user_id. */
  userId: string;
  /** tutors.id when the actor has a tutor profile; stored as reviewed_by_tutor_id. */
  tutorId: string | null;
  kind: ReviewActorKind;
}

export interface ReviewInput {
  submissionId: string;
  /** The submission's `version` as last read by the caller. */
  expectedVersion: string;
  transition: ReviewTransition;
  score?: number | null;
  feedback?: string | null;
  /** Required for `reopen`; quoted in the student's notification. */
  reason?: string | null;
}

export type ReviewResult =
  | { ok: true; status: SubmissionStatusEnum; version: string; xpAwarded: boolean; notified: boolean }
  | { ok: false; code: 'not_found' | 'conflict' | ReviewRuleError };

export async function reviewSubmission(
  tx: TxTransaction,
  scope: AcademicScope,
  actor: ReviewActor,
  input: ReviewInput
): Promise<ReviewResult> {
  // Unknown and out-of-scope submissions are indistinguishable to the caller.
  const [current] = await tx
    .select({
      id: assignmentSubmissions.id,
      batchId: assignmentSubmissions.batchId,
      studentId: assignmentSubmissions.studentId,
      status: assignmentSubmissions.status,
      score: assignmentSubmissions.score,
      tutorFeedback: assignmentSubmissions.tutorFeedback,
      version: sql<string>`${assignmentSubmissions.updatedAt}::text`,
      maxScore: assignments.maxScore,
      projectTitle: contentItems.title,
      studentUserId: students.userId
    })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .where(and(eq(assignmentSubmissions.id, input.submissionId), inScope(assignmentSubmissions.batchId, scope)))
    .limit(1)
    .for('update', { of: assignmentSubmissions });

  if (!current) return { ok: false, code: 'not_found' };
  if (current.version !== input.expectedVersion) return { ok: false, code: 'conflict' };

  const plan = planReview(
    { status: current.status, score: current.score, tutorFeedback: current.tutorFeedback, maxScore: current.maxScore },
    actor.kind,
    input
  );
  if (!plan.ok) return plan;

  const now = new Date();
  const [updated] = await tx
    .update(assignmentSubmissions)
    .set({
      status: plan.status,
      score: plan.score,
      tutorFeedback: plan.tutorFeedback,
      reviewedByUserId: actor.userId,
      reviewedByTutorId: actor.tutorId ?? sql`${assignmentSubmissions.reviewedByTutorId}`,
      reviewedAt: now,
      updatedAt: now
    })
    .where(
      and(
        eq(assignmentSubmissions.id, current.id),
        sql`${assignmentSubmissions.updatedAt}::text = ${input.expectedVersion}`
      )
    )
    .returning({ version: sql<string>`${assignmentSubmissions.updatedAt}::text` });

  // Unreachable while the row lock is held; kept so a missing lock can never turn into a lost update.
  if (!updated) return { ok: false, code: 'conflict' };

  let xpAwarded = false;
  if (input.transition === 'approve') {
    const award = await awardActivityXp(
      {
        studentId: current.studentId,
        batchId: current.batchId,
        activityType: 'assignment_approved',
        referenceId: current.id,
        xp: PROJECT_APPROVAL_XP,
        now
      },
      tx as unknown as ExecutingClient
    );
    xpAwarded = award.awarded;
  }

  let notified = false;
  const content = buildProjectReviewedNotification({
    transition: input.transition,
    projectTitle: current.projectTitle,
    batchId: current.batchId,
    score: plan.score,
    maxScore: current.maxScore || 100,
    feedback: plan.tutorFeedback,
    reason: input.reason
  });
  if (content && current.studentUserId) {
    await tx.insert(notifications).values({ userId: current.studentUserId, ...content });
    notified = true;
  }

  return { ok: true, status: plan.status, version: updated.version, xpAwarded, notified };
}
