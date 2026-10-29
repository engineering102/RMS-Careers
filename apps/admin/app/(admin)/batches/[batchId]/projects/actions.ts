'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, tutors } from '@rms/db';
import { dbTx } from '@rms/db/tx';
import { adminScope, restrictScope } from '@rms/academic/scope';
import { reviewSubmission, type ReviewResult } from '@rms/academic/review';
import { MAX_FEEDBACK_LENGTH, MAX_REASON_LENGTH } from '@rms/academic/review-rules';
import { requireAdmin } from '@/lib/authz';
import {
  getBatchById,
  getBatchProjectSubmissionDetails,
  type ProjectSubmissionInspectorDetails
} from '@/lib/db/queries';
import {
  verifyPublicGithubRepo,
  type GithubValidationResult
} from '@/lib/services/github-validator';

export async function getSubmissionDetailsAction(
  batchId: string,
  submissionId: string
): Promise<
  | { success: true; data: ProjectSubmissionInspectorDetails }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId || !submissionId) {
      return { success: false, error: 'Invalid batch or submission identifier.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found.' };
    }

    const details = await getBatchProjectSubmissionDetails(batchId, submissionId);
    if (!details) {
      return {
        success: false,
        error: 'Submission not found or does not belong to this batch context.'
      };
    }

    return {
      success: true,
      data: details
    };
  } catch (error: any) {
    console.error('Error in getSubmissionDetailsAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to retrieve submission inspection details.'
    };
  }
}

const reviewInputSchema = z.object({
  transition: z.enum(['claim', 'approve', 'request_resubmission', 'resume', 'reopen', 'correct']),
  expectedVersion: z.string().min(1).max(64),
  score: z.number().int().nullable().optional(),
  feedback: z.string().max(MAX_FEEDBACK_LENGTH).nullable().optional(),
  reason: z.string().max(MAX_REASON_LENGTH).nullable().optional()
});

export type SubmissionReviewInput = z.infer<typeof reviewInputSchema>;

type ReviewFailureCode = Extract<ReviewResult, { ok: false }>['code'] | 'invalid_input';

const REVIEW_ERRORS: Record<ReviewFailureCode, string> = {
  invalid_input: 'Invalid review request.',
  not_found: 'Submission not found or does not belong to this batch context.',
  conflict: 'This submission was changed by someone else. Reload it and try again.',
  forbidden_transition: 'Invalid status transition from the current state.',
  invalid_score: "Score must be a whole number between 0 and the project's maximum score.",
  feedback_required: 'Structured feedback is required when requesting changes / resubmission.',
  feedback_too_long: `Feedback must be at most ${MAX_FEEDBACK_LENGTH} characters.`,
  reason_required: `A reason (at most ${MAX_REASON_LENGTH} characters) is required to reopen an approved submission.`,
  nothing_to_correct: 'Change the score or the feedback to correct this review.'
};

const REVIEW_SUCCESS: Record<SubmissionReviewInput['transition'], string> = {
  claim: 'Review started. The submission is locked against student edits.',
  approve: 'Project approved.',
  request_resubmission: 'Changes requested from the student.',
  resume: 'Review re-opened.',
  reopen: 'Approval reopened for review. The XP already awarded is kept.',
  correct: 'Review corrected.'
};

/**
 * Applies one review transition through the shared atomic review (@rms/academic/review): status, reviewer
 * attribution, approval XP and the student's notification commit together. The scope is narrowed to the batch in the
 * URL, so a submission of another batch is "not found" here. `expectedVersion` is the details' `version`.
 */
export async function updateSubmissionReviewAction(
  batchId: string,
  submissionId: string,
  data: SubmissionReviewInput
): Promise<
  | { success: true; message: string; data: { status: string; version: string } }
  | { success: false; error: string; code: ReviewFailureCode | 'unauthorized' | 'failed' }
> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error, code: 'unauthorized' };

    const parsed = reviewInputSchema.safeParse(data);
    const ids = z.object({ batchId: z.string().uuid(), submissionId: z.string().uuid() }).safeParse({ batchId, submissionId });
    if (!parsed.success || !ids.success) {
      return { success: false, error: REVIEW_ERRORS.invalid_input, code: 'invalid_input' };
    }

    // The admin's own tutor profile, if any, keeps reviewed_by_tutor_id meaningful; reviewed_by_user_id is always set.
    const [tutor] = await db.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, authz.userId)).limit(1);

    const result = await dbTx.transaction((tx) =>
      reviewSubmission(
        tx,
        restrictScope(adminScope(), [batchId]),
        { userId: authz.userId, tutorId: tutor?.id ?? null, kind: 'admin' },
        { submissionId, ...parsed.data }
      )
    );

    if (!result.ok) return { success: false, error: REVIEW_ERRORS[result.code], code: result.code };

    try {
      revalidatePath(`/batches/${batchId}/projects`);
    } catch {
      // Safe fallback in test or CLI execution
    }

    return {
      success: true,
      message: REVIEW_SUCCESS[parsed.data.transition],
      data: { status: result.status, version: result.version }
    };
  } catch (error) {
    console.error('Error in updateSubmissionReviewAction:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to update submission review.', code: 'failed' };
  }
}

export async function validateGithubRepoAction(
  rawUrl: string
): Promise<
  | { success: true; data: GithubValidationResult }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!rawUrl || !rawUrl.trim()) {
      return { success: false, error: 'GitHub repository URL is required.' };
    }

    const result = await verifyPublicGithubRepo(rawUrl.trim());
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Error in validateGithubRepoAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to validate GitHub repository.'
    };
  }
}
