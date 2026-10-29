import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SubmissionStatusEnum } from '@rms/db/schema';
import {
  availableTransitions,
  planReview,
  REVIEW_TRANSITIONS,
  MAX_FEEDBACK_LENGTH,
  type CurrentReviewState,
  type ReviewTransition
} from '../review-rules';
import { computeAllowedTransitions } from '../projects';

const state = (status: SubmissionStatusEnum, overrides: Partial<CurrentReviewState> = {}): CurrentReviewState => ({
  status,
  score: null,
  tutorFeedback: null,
  maxScore: 100,
  ...overrides
});

const ALL_STATUSES: SubmissionStatusEnum[] = ['submitted', 'under_review', 'resubmission_requested', 'approved'];
const ALL_TRANSITIONS = Object.keys(REVIEW_TRANSITIONS) as ReviewTransition[];

describe('transition table', () => {
  it('allows each transition only from its source status', () => {
    for (const transition of ALL_TRANSITIONS) {
      for (const status of ALL_STATUSES) {
        const plan = planReview(state(status, { score: 50, tutorFeedback: 'old' }), 'admin', {
          transition,
          score: 60,
          feedback: 'new',
          reason: 'regraded'
        });
        expect(plan.ok, `${transition} from ${status}`).toBe(status === REVIEW_TRANSITIONS[transition].from);
      }
    }
  });

  it('moves to the documented target status', () => {
    expect(planReview(state('submitted'), 'tutor', { transition: 'claim' })).toMatchObject({ ok: true, status: 'under_review' });
    expect(planReview(state('under_review'), 'tutor', { transition: 'approve', score: 80 })).toMatchObject({ ok: true, status: 'approved' });
    expect(planReview(state('under_review'), 'tutor', { transition: 'request_resubmission', feedback: 'Add tests' })).toMatchObject({
      ok: true,
      status: 'resubmission_requested'
    });
    expect(planReview(state('resubmission_requested'), 'tutor', { transition: 'resume' })).toMatchObject({ ok: true, status: 'under_review' });
    expect(planReview(state('approved'), 'admin', { transition: 'reopen', reason: 'Plagiarism check' })).toMatchObject({
      ok: true,
      status: 'under_review'
    });
    expect(planReview(state('approved', { score: 70 }), 'admin', { transition: 'correct', score: 75 })).toMatchObject({
      ok: true,
      status: 'approved'
    });
  });

  it('keeps the standard transitions in line with the inspector state machine', () => {
    for (const status of ALL_STATUSES) {
      const targets = availableTransitions(status, 'tutor').map((t) => REVIEW_TRANSITIONS[t].to);
      expect([...targets].sort(), status).toEqual([...computeAllowedTransitions(status)].sort());
    }
  });
});

describe('admin-only overrides', () => {
  it.each(['reopen', 'correct'] as const)('refuses %s for a tutor', (transition) => {
    expect(planReview(state('approved', { score: 70 }), 'tutor', { transition, score: 80, reason: 'x' })).toEqual({
      ok: false,
      code: 'forbidden_transition'
    });
  });

  it('lists overrides for admins only', () => {
    expect(availableTransitions('approved', 'admin')).toEqual(['reopen', 'correct']);
    expect(availableTransitions('approved', 'tutor')).toEqual([]);
  });

  it('requires a reason to reopen', () => {
    expect(planReview(state('approved'), 'admin', { transition: 'reopen' })).toEqual({ ok: false, code: 'reason_required' });
    expect(planReview(state('approved'), 'admin', { transition: 'reopen', reason: '   ' })).toEqual({ ok: false, code: 'reason_required' });
    expect(planReview(state('approved'), 'admin', { transition: 'reopen', reason: 'x'.repeat(501) })).toEqual({
      ok: false,
      code: 'reason_required'
    });
  });

  it('keeps score and feedback when reopening', () => {
    expect(planReview(state('approved', { score: 88, tutorFeedback: 'Good' }), 'admin', { transition: 'reopen', reason: 'Recheck' })).toEqual({
      ok: true,
      status: 'under_review',
      score: 88,
      tutorFeedback: 'Good'
    });
  });

  it('refuses a correction that changes nothing', () => {
    const current = state('approved', { score: 70, tutorFeedback: 'Fine' });
    expect(planReview(current, 'admin', { transition: 'correct' })).toEqual({ ok: false, code: 'nothing_to_correct' });
    expect(planReview(current, 'admin', { transition: 'correct', score: 70, feedback: ' Fine ' })).toEqual({
      ok: false,
      code: 'nothing_to_correct'
    });
    expect(planReview(current, 'admin', { transition: 'correct', feedback: 'Fine, see notes' })).toEqual({
      ok: true,
      status: 'approved',
      score: 70,
      tutorFeedback: 'Fine, see notes'
    });
  });
});

describe('score and feedback rules', () => {
  it.each([-1, 101, 2.5, Number.NaN])('rejects score %s on approval', (score) => {
    expect(planReview(state('under_review'), 'tutor', { transition: 'approve', score })).toEqual({ ok: false, code: 'invalid_score' });
  });

  it('accepts the bounds and uses the project maximum', () => {
    expect(planReview(state('under_review'), 'tutor', { transition: 'approve', score: 0 })).toMatchObject({ ok: true, score: 0 });
    expect(planReview(state('under_review'), 'tutor', { transition: 'approve', score: 100 })).toMatchObject({ ok: true, score: 100 });
    expect(planReview(state('under_review', { maxScore: 50 }), 'tutor', { transition: 'approve', score: 51 })).toEqual({
      ok: false,
      code: 'invalid_score'
    });
  });

  it('keeps the previous score when approval gives none (unchanged admin behaviour)', () => {
    expect(planReview(state('under_review', { score: 40 }), 'tutor', { transition: 'approve' })).toMatchObject({ ok: true, score: 40 });
  });

  it('ignores a score sent with transitions that do not set one', () => {
    expect(planReview(state('submitted', { score: 40 }), 'tutor', { transition: 'claim', score: 99 })).toMatchObject({ ok: true, score: 40 });
  });

  it('requires feedback to request changes', () => {
    for (const feedback of [undefined, null, '', '   ']) {
      expect(planReview(state('under_review'), 'tutor', { transition: 'request_resubmission', feedback })).toEqual({
        ok: false,
        code: 'feedback_required'
      });
    }
  });

  it('rejects feedback over the limit', () => {
    expect(
      planReview(state('under_review'), 'tutor', { transition: 'request_resubmission', feedback: 'x'.repeat(MAX_FEEDBACK_LENGTH + 1) })
    ).toEqual({ ok: false, code: 'feedback_too_long' });
  });

  it('trims feedback, clears it when blank, and keeps it when not sent', () => {
    expect(planReview(state('under_review'), 'tutor', { transition: 'approve', score: 5, feedback: '  Nice  ' })).toMatchObject({
      tutorFeedback: 'Nice'
    });
    expect(planReview(state('under_review', { tutorFeedback: 'Old' }), 'tutor', { transition: 'approve', score: 5, feedback: '' })).toMatchObject({
      tutorFeedback: null
    });
    expect(planReview(state('submitted', { tutorFeedback: 'Old' }), 'tutor', { transition: 'claim' })).toMatchObject({
      tutorFeedback: 'Old'
    });
  });
});
