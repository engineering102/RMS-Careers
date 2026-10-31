'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dbTx } from '@rms/db/tx';
import { reviewSubmission, type ReviewResult } from '@rms/academic/review';
import { MAX_FEEDBACK_LENGTH } from '@rms/academic/review-rules';
import { getTutorContext } from '@/lib/db/tutor-context';
import { logTutorEvent } from '@/lib/observability';

/**
 * Tutor review transitions (tutor plan §8, §9). Tutors may claim, approve, request changes and resume; the admin
 * overrides (reopen, correct) are not accepted here and are refused again by the shared rules for a tutor actor.
 * Authorization is the tutor's scope inside the transaction: a submission of another batch is "not found".
 */
const inputSchema = z.object({
  submissionId: z.string().uuid(),
  expectedVersion: z.string().min(1).max(64),
  transition: z.enum(['claim', 'approve', 'request_resubmission', 'resume']),
  score: z.number().int().nullable().optional(),
  feedback: z.string().max(MAX_FEEDBACK_LENGTH).nullable().optional()
});

export type TutorReviewInput = z.infer<typeof inputSchema>;
type FailureCode = Extract<ReviewResult, { ok: false }>['code'] | 'invalid_input' | 'unauthorized' | 'failed';

export type TutorReviewResult =
  | { success: true; message: string; status: string; version: string }
  | { success: false; error: string; code: FailureCode };

const ERRORS: Record<FailureCode, string> = {
  invalid_input: 'Check the score and feedback, then try again.',
  unauthorized: 'Your session has ended. Sign in again to continue.',
  not_found: 'This submission is not available to you.',
  conflict: 'This submission changed. Reload to see the latest.',
  forbidden_transition: 'That action is no longer available for this submission. Reload to see the latest.',
  invalid_score: 'Enter a whole-number score between 0 and the maximum.',
  feedback_required: 'Write feedback telling the student what to change.',
  feedback_too_long: `Feedback must be at most ${MAX_FEEDBACK_LENGTH} characters.`,
  reason_required: 'That action is not available to tutors.',
  nothing_to_correct: 'That action is not available to tutors.',
  failed: 'The review could not be saved. Please try again.'
};

const SUCCESS: Record<TutorReviewInput['transition'], string> = {
  claim: 'You are reviewing this submission. The student cannot change it while it is in review.',
  approve: 'Project approved. The student has been notified.',
  request_resubmission: 'Changes requested. The student has been notified.',
  resume: 'Review resumed.'
};

export async function reviewSubmissionAction(input: TutorReviewInput): Promise<TutorReviewResult> {
  const started = Date.now();
  const tutor = await getTutorContext();
  if (!tutor) return { success: false, error: ERRORS.unauthorized, code: 'unauthorized' };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: ERRORS.invalid_input, code: 'invalid_input' };
  // Approving from the tutor UI always records a score (plan §9.1); the shared rule keeps it optional for admin.
  if (parsed.data.transition === 'approve' && (parsed.data.score === null || parsed.data.score === undefined)) {
    return { success: false, error: ERRORS.invalid_score, code: 'invalid_score' };
  }

  const { submissionId, transition } = parsed.data;
  try {
    const result = await dbTx.transaction((tx) =>
      reviewSubmission(tx, tutor.scope, { userId: tutor.userId, tutorId: tutor.tutorId, kind: 'tutor' }, parsed.data)
    );
    const ms = Date.now() - started;
    if (!result.ok) {
      logTutorEvent({ evt: 'tutor.review', outcome: 'rejected', code: result.code, transition, submissionId, tutorId: tutor.tutorId, ms });
      if (result.code === 'not_found') {
        logTutorEvent({ evt: 'tutor.authz_denied', resource: 'submission', id: submissionId, tutorId: tutor.tutorId });
      }
      return { success: false, error: ERRORS[result.code], code: result.code };
    }
    logTutorEvent({ evt: 'tutor.review', outcome: 'ok', transition, submissionId, tutorId: tutor.tutorId, ms });

    try {
      revalidatePath(`/reviews/${submissionId}`);
      revalidatePath('/reviews');
    } catch {
      // Outside a request (tests).
    }
    return { success: true, message: SUCCESS[transition], status: result.status, version: result.version };
  } catch (error) {
    logTutorEvent({ evt: 'tutor.review', outcome: 'error', code: error instanceof Error ? error.name : 'unknown', transition, submissionId, tutorId: tutor.tutorId, ms: Date.now() - started });
    return { success: false, error: ERRORS.failed, code: 'failed' };
  }
}
