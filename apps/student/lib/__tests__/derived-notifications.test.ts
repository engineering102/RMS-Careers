import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// The planner is pure; keep the I/O modules (and their auth imports) out of the test.
vi.mock('@/lib/db/queries/progress', () => ({ getBatchProgressSummary: vi.fn() }));
vi.mock('@/lib/events/dispatcher', () => ({ inAppNotificationConsumer: { handle: vi.fn() } }));

import {
  planDerivedNotifications,
  reviewActionUrl,
  dueQuizActionUrl,
  streakActionUrl,
  REVIEW_LOOKBACK_MS,
  DUE_SOON_WINDOW_MS,
  DEDUPE_LOOKBACK_MS,
  type DerivedNotificationInput
} from '@/lib/services/derived-notifications';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const BATCH_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ITEM = '33333333-3333-4333-8333-333333333333';
const QUIZ_ITEM = '44444444-4444-4444-8444-444444444444';
const TODAY = '2026-10-20';

const review = {
  submissionId: 'sub-1',
  batchId: BATCH_ID,
  contentItemId: PROJECT_ITEM,
  assignmentTitle: 'URL Shortener',
  status: 'approved' as const,
  score: 88,
  tutorFeedback: 'Clean code',
  reviewedAt: new Date('2026-10-19T10:00:00Z')
};

const dueQuiz = {
  batchId: BATCH_ID,
  batchName: 'CSE 2026',
  contentItemId: QUIZ_ITEM,
  quizTitle: 'Arrays Checkpoint',
  dueAt: new Date('2026-10-21T08:00:00Z')
};

function input(overrides: Partial<DerivedNotificationInput> = {}): DerivedNotificationInput {
  return {
    studentId: 42,
    userId: USER_ID,
    reviewedSubmissions: [],
    dueQuizzes: [],
    streak: null,
    todayIst: TODAY,
    existingActionUrls: new Set(),
    ...overrides
  };
}

describe('derived notifications planner', () => {
  it('plans nothing when there are no facts', () => {
    expect(planDerivedNotifications(input())).toEqual([]);
  });

  it('turns a tutor review into a PROJECT_REVIEWED notification for the student', () => {
    const [event] = planDerivedNotifications(input({ reviewedSubmissions: [review] }));
    expect(event).toMatchObject({
      type: 'PROJECT_REVIEWED',
      userId: USER_ID,
      studentId: 42,
      assignmentTitle: 'URL Shortener',
      status: 'approved',
      score: 88,
      tutorFeedback: 'Clean code',
      actionUrl: reviewActionUrl(review)
    });
  });

  it('maps a null score/feedback to absent fields rather than null', () => {
    const [event] = planDerivedNotifications(
      input({ reviewedSubmissions: [{ ...review, status: 'resubmission_requested', score: null, tutorFeedback: null }] })
    );
    expect(event).toMatchObject({ type: 'PROJECT_REVIEWED', status: 'resubmission_requested' });
    expect((event as { score?: number }).score).toBeUndefined();
    expect((event as { tutorFeedback?: string }).tutorFeedback).toBeUndefined();
  });

  it('notifies again when the same submission is re-reviewed (new reviewedAt)', () => {
    const rereview = { ...review, reviewedAt: new Date('2026-10-20T09:00:00Z') };
    const events = planDerivedNotifications(
      input({ reviewedSubmissions: [rereview], existingActionUrls: new Set([reviewActionUrl(review)]) })
    );
    expect(events).toHaveLength(1);
    expect(reviewActionUrl(rereview)).not.toBe(reviewActionUrl(review));
  });

  it('plans ASSESSMENT_DUE_SOON for an incomplete quiz due in the window', () => {
    const [event] = planDerivedNotifications(input({ dueQuizzes: [dueQuiz] }));
    expect(event).toMatchObject({
      type: 'ASSESSMENT_DUE_SOON',
      quizTitle: 'Arrays Checkpoint',
      dueAt: dueQuiz.dueAt,
      actionUrl: `/assessments?batchId=${BATCH_ID}&quiz=${QUIZ_ITEM}`
    });
  });

  it('plans a STREAK_MILESTONE only on the day a milestone streak is reached', () => {
    const [event] = planDerivedNotifications(
      input({ streak: { currentStreak: 7, lastActivityDateIst: TODAY } })
    );
    expect(event).toMatchObject({ type: 'STREAK_MILESTONE', streakCount: 7, actionUrl: streakActionUrl(TODAY) });

    // Not a milestone
    expect(planDerivedNotifications(input({ streak: { currentStreak: 8, lastActivityDateIst: TODAY } }))).toEqual([]);
    // Milestone value but not active today (stale streak)
    expect(
      planDerivedNotifications(input({ streak: { currentStreak: 7, lastActivityDateIst: '2026-10-19' } }))
    ).toEqual([]);
  });

  it('is idempotent: anything already notified (by actionUrl) is skipped', () => {
    const facts = input({
      reviewedSubmissions: [review],
      dueQuizzes: [dueQuiz],
      streak: { currentStreak: 3, lastActivityDateIst: TODAY }
    });
    const first = planDerivedNotifications(facts);
    expect(first.map((e) => e.type)).toEqual(['PROJECT_REVIEWED', 'ASSESSMENT_DUE_SOON', 'STREAK_MILESTONE']);

    const sent = new Set(first.map((e) => (e as { actionUrl: string }).actionUrl));
    expect(planDerivedNotifications({ ...facts, existingActionUrls: sent })).toEqual([]);
  });

  it('collapses duplicate facts within one run', () => {
    const events = planDerivedNotifications(input({ dueQuizzes: [dueQuiz, { ...dueQuiz }] }));
    expect(events).toHaveLength(1);
  });

  it('dedupe lookback covers every fact window', () => {
    expect(DEDUPE_LOOKBACK_MS).toBeGreaterThanOrEqual(REVIEW_LOOKBACK_MS);
    expect(DEDUPE_LOOKBACK_MS).toBeGreaterThanOrEqual(DUE_SOON_WINDOW_MS);
  });

  it('builds dedupe keys that are valid in-app links', () => {
    expect(reviewActionUrl(review)).toBe(
      `/content/${PROJECT_ITEM}?batchId=${BATCH_ID}&review=${review.reviewedAt.getTime()}`
    );
    expect(dueQuizActionUrl(dueQuiz).startsWith('/assessments?')).toBe(true);
    expect(streakActionUrl(TODAY)).toBe('/overview?streakDay=2026-10-20');
  });
});
