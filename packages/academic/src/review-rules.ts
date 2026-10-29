/**
 * Project-review transition rules (tutor plan §9.1). Pure: no database, so every rule is unit-tested here and the
 * transaction in review.ts only applies what planReview() decided.
 *
 *   claim                 submitted              -> under_review             tutor or admin
 *   approve               under_review           -> approved                 tutor or admin; score 0..max (optional, as before)
 *   request_resubmission  under_review           -> resubmission_requested   tutor or admin; feedback required
 *   resume                resubmission_requested -> under_review             tutor or admin
 *   reopen                approved               -> under_review             admin only; reason required; XP is kept
 *   correct               approved               -> approved                 admin only; new score and/or feedback
 *
 * Score and feedback are carried over unless the transition sets them (the previous behaviour of the admin review).
 */
import type { SubmissionStatusEnum } from '@rms/db/schema';

export type ReviewTransition = 'claim' | 'approve' | 'request_resubmission' | 'resume' | 'reopen' | 'correct';

export const REVIEW_TRANSITIONS: Record<
  ReviewTransition,
  { from: SubmissionStatusEnum; to: SubmissionStatusEnum; adminOnly: boolean }
> = {
  claim: { from: 'submitted', to: 'under_review', adminOnly: false },
  approve: { from: 'under_review', to: 'approved', adminOnly: false },
  request_resubmission: { from: 'under_review', to: 'resubmission_requested', adminOnly: false },
  resume: { from: 'resubmission_requested', to: 'under_review', adminOnly: false },
  reopen: { from: 'approved', to: 'under_review', adminOnly: true },
  correct: { from: 'approved', to: 'approved', adminOnly: true }
};

export const MAX_FEEDBACK_LENGTH = 5000;
export const MAX_REASON_LENGTH = 500;

export type ReviewActorKind = 'tutor' | 'admin';

export type ReviewRuleError =
  | 'forbidden_transition'
  | 'invalid_score'
  | 'feedback_required'
  | 'feedback_too_long'
  | 'reason_required'
  | 'nothing_to_correct';

export interface ReviewPlanInput {
  transition: ReviewTransition;
  score?: number | null;
  feedback?: string | null;
  reason?: string | null;
}

export interface CurrentReviewState {
  status: SubmissionStatusEnum;
  score: number | null;
  tutorFeedback: string | null;
  maxScore: number;
}

export type ReviewPlan =
  | { ok: true; status: SubmissionStatusEnum; score: number | null; tutorFeedback: string | null }
  | { ok: false; code: ReviewRuleError };

/** Transitions this actor may take from `status` (drives which controls the UI shows). */
export function availableTransitions(status: SubmissionStatusEnum, actor: ReviewActorKind): ReviewTransition[] {
  return (Object.keys(REVIEW_TRANSITIONS) as ReviewTransition[]).filter((t) => {
    const rule = REVIEW_TRANSITIONS[t];
    return rule.from === status && (!rule.adminOnly || actor === 'admin');
  });
}

function normalizedFeedback(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export function planReview(current: CurrentReviewState, actor: ReviewActorKind, input: ReviewPlanInput): ReviewPlan {
  const rule = REVIEW_TRANSITIONS[input.transition];
  if (!rule || rule.from !== current.status || (rule.adminOnly && actor !== 'admin')) {
    return { ok: false, code: 'forbidden_transition' };
  }

  const feedback = normalizedFeedback(input.feedback);
  if (feedback && feedback.length > MAX_FEEDBACK_LENGTH) return { ok: false, code: 'feedback_too_long' };

  const setsScore = input.transition === 'approve' || input.transition === 'correct';
  if (setsScore && input.score !== undefined && input.score !== null) {
    const maxScore = current.maxScore || 100;
    if (!Number.isInteger(input.score) || input.score < 0 || input.score > maxScore) {
      return { ok: false, code: 'invalid_score' };
    }
  }

  const score = setsScore && input.score !== undefined && input.score !== null ? input.score : current.score;
  const tutorFeedback = feedback !== undefined ? feedback : current.tutorFeedback;

  if (input.transition === 'request_resubmission' && !feedback) return { ok: false, code: 'feedback_required' };

  if (input.transition === 'reopen') {
    const reason = input.reason?.trim() ?? '';
    if (!reason || reason.length > MAX_REASON_LENGTH) return { ok: false, code: 'reason_required' };
  }

  if (input.transition === 'correct' && score === current.score && tutorFeedback === current.tutorFeedback) {
    return { ok: false, code: 'nothing_to_correct' };
  }

  return { ok: true, status: rule.to, score, tutorFeedback };
}
