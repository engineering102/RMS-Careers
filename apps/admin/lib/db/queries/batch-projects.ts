import 'server-only';

import {
  db,
  assignmentSubmissions,
  assignments,
  tutors,
  type DbClient,
  type SubmissionStatusEnum
} from '@rms/db';
import { eq, and } from 'drizzle-orm';
import { awardActivityXp, type ExecutingClient } from '@rms/db/xp-ledger';
import { adminScope } from '@rms/academic/scope';
import {
  computeAllowedTransitions,
  getBatchProjectsOverview as academicGetBatchProjectsOverview,
  getBatchProjectSubmissions as academicGetBatchProjectSubmissions,
  getBatchProjectSubmissionDetails as academicGetBatchProjectSubmissionDetails,
  type BatchProjectOverviewItem,
  type ProjectSubmissionListItem,
  type ProjectSubmissionInspectorDetails,
  type ProjectSubmissionFilters
} from '@rms/academic/projects';

export type {
  RubricCriterion,
  BatchProjectOverviewItem,
  ProjectSubmissionListItem,
  ProjectSubmissionInspectorDetails,
  ProjectSubmissionFilters
} from '@rms/academic/projects';

const PROJECT_APPROVAL_XP = 100;

export interface UpdateReviewStatusInput {
  batchId: string;
  submissionId: string;
  newStatus: SubmissionStatusEnum;
  score?: number | null;
  feedback?: string | null;
  tutorUserId?: string;
}

/**
 * Aggregated overview of the project assignments placed in a batch (see @rms/academic/projects).
 */
export async function getBatchProjectsOverview(
  batchId: string,
  client: DbClient = db
): Promise<BatchProjectOverviewItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchProjectsOverview(client, adminScope(), batchId);
}

/**
 * Project submissions of a batch with operational filters (see @rms/academic/projects).
 */
export async function getBatchProjectSubmissions(
  batchId: string,
  filters: ProjectSubmissionFilters = {},
  client: DbClient = db
): Promise<ProjectSubmissionListItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  return academicGetBatchProjectSubmissions(client, adminScope(), batchId, filters);
}

/**
 * Full details of one submission, only if it belongs to batchId (see @rms/academic/projects).
 */
export async function getBatchProjectSubmissionDetails(
  batchId: string,
  submissionId: string,
  client: DbClient = db
): Promise<ProjectSubmissionInspectorDetails | null> {
  if (!process.env.POSTGRES_URL) return null;
  return academicGetBatchProjectSubmissionDetails(client, adminScope(), batchId, submissionId);
}

/**
 * Updates submission review status, scores, and evaluator feedback according to domain lifecycle rules.
 * Strictly checks batch ownership and valid state transitions.
 */
export async function updateSubmissionReviewStatus(
  input: UpdateReviewStatusInput,
  client: DbClient = db
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!process.env.POSTGRES_URL) {
      return { success: false, error: 'Database connection unavailable.' };
    }

    const { batchId, submissionId, newStatus, score, feedback, tutorUserId } = input;

    // 1. Fetch current submission with strict batch isolation
    const [submission] = await client
      .select({
        id: assignmentSubmissions.id,
        batchId: assignmentSubmissions.batchId,
        assignmentId: assignmentSubmissions.assignmentId,
        studentId: assignmentSubmissions.studentId,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        tutorFeedback: assignmentSubmissions.tutorFeedback,
        reviewedByTutorId: assignmentSubmissions.reviewedByTutorId,
        maxScore: assignments.maxScore
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(
        and(
          eq(assignmentSubmissions.id, submissionId),
          eq(assignmentSubmissions.batchId, batchId)
        )
      )
      .limit(1);

    if (!submission) {
      return {
        success: false,
        error: 'Submission not found or does not belong to this batch context.'
      };
    }

    // 2. Validate state machine transition
    const allowed = computeAllowedTransitions(submission.status);
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from "${submission.status}" to "${newStatus}".`
      };
    }

    // 3. Validation for specific status transitions
    if (newStatus === 'resubmission_requested') {
      if (!feedback || feedback.trim().length === 0) {
        return {
          success: false,
          error: 'Structured feedback is required when requesting changes / resubmission.'
        };
      }
    }

    if (newStatus === 'approved') {
      const maxScore = submission.maxScore || 100;
      if (score !== undefined && score !== null) {
        if (score < 0 || score > maxScore) {
          return {
            success: false,
            error: `Score must be between 0 and ${maxScore}.`
          };
        }
      }
    }

    // 4. Resolve evaluator tutor ID if available
    let resolvedTutorId: string | null = submission.reviewedByTutorId;
    if (tutorUserId) {
      const [tutor] = await client
        .select({ id: tutors.id })
        .from(tutors)
        .where(eq(tutors.userId, tutorUserId))
        .limit(1);

      if (tutor) {
        resolvedTutorId = tutor.id;
      }
    }

    const now = new Date();

    // 5. Update submission
    await client
      .update(assignmentSubmissions)
      .set({
        status: newStatus,
        score: score !== undefined ? score : submission.score,
        tutorFeedback: feedback !== undefined ? feedback : submission.tutorFeedback,
        reviewedByTutorId: resolvedTutorId,
        reviewedAt: now,
        updatedAt: now
      })
      .where(eq(assignmentSubmissions.id, submissionId));

    // 6. Approval XP through the shared ledger (audit F-07): idempotent per submission, IST activity
    // day, and student_stats/streak updated in the same statement. Best effort: the review itself is
    // already saved, so a ledger failure is logged rather than reported as a failed review.
    if (newStatus === 'approved') {
      try {
        await awardActivityXp(
          {
            studentId: submission.studentId,
            batchId,
            activityType: 'assignment_approved',
            referenceId: submission.id,
            xp: PROJECT_APPROVAL_XP,
            now
          },
          client as unknown as ExecutingClient
        );
      } catch (actErr) {
        console.warn('Failed to record assignment_approved activity ledger:', actErr);
      }
    }

    return {
      success: true,
      message: `Project submission updated to "${newStatus}".`
    };
  } catch (error: any) {
    console.error('Error updating submission review status:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update submission review status.'
    };
  }
}
