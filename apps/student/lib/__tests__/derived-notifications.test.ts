import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// The planner is pure; keep the I/O modules (and their auth imports) out of the test.
vi.mock('@/lib/db/queries/progress', () => ({ getBatchProgressSummary: vi.fn() }));
vi.mock('@/lib/events/dispatcher', () => ({ inAppNotificationConsumer: { handle: vi.fn() } }));

import {
  planDerivedNotifications,
  reviewActionUrl,
  dueItemActionUrl,
  streakActionUrl,
  contentWatermarks,
  batchScope,
  programScope,
  REVIEW_LOOKBACK_MS,
  DUE_SOON_WINDOW_MS,
  CONTENT_LOOKBACK_MS,
  DEDUPE_LOOKBACK_MS,
  CONTENT_GROUP_THRESHOLD,
  type DerivedNotificationInput,
  type DueItemFact,
  type PublishedContentFact
} from '@/lib/services/derived-notifications';
import { withQueryParams } from '@/lib/content/content-href';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const BATCH_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ITEM = '33333333-3333-4333-8333-333333333333';
const QUIZ_ITEM = '44444444-4444-4444-8444-444444444444';
const TODAY = '2026-10-20';
const NOW = new Date('2026-10-20T06:00:00Z');
const HOUR = 60 * 60 * 1000;

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

const dueQuiz: DueItemFact = {
  batchId: BATCH_ID,
  contentItemId: QUIZ_ITEM,
  contentType: 'quiz',
  slug: 'arrays-checkpoint',
  title: 'Arrays Checkpoint',
  dueAt: new Date('2026-10-21T08:00:00Z')
};

function content(id: string, title: string, hoursAgo: number, overrides: Partial<PublishedContentFact> = {}): PublishedContentFact {
  return {
    scope: batchScope(BATCH_ID),
    scopeName: 'CSE 2026',
    batchId: BATCH_ID,
    contentItemId: id,
    contentType: 'lecture',
    slug: id,
    title,
    visibleAt: new Date(NOW.getTime() - hoursAgo * HOUR),
    ...overrides
  };
}

function input(overrides: Partial<DerivedNotificationInput> = {}): DerivedNotificationInput {
  return {
    studentId: 42,
    userId: USER_ID,
    now: NOW,
    reviewedSubmissions: [],
    dueItems: [],
    publishedContent: [],
    streak: null,
    todayIst: TODAY,
    existing: [],
    ...overrides
  };
}

/** What the DB would hold after the planned events were inserted. */
function asExisting(events: ReturnType<typeof planDerivedNotifications>) {
  return events.map((e) => ({ type: e.type, actionUrl: (e as { actionUrl?: string }).actionUrl ?? null }));
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
      input({ reviewedSubmissions: [rereview], existing: [{ type: 'PROJECT_REVIEWED', actionUrl: reviewActionUrl(review) }] })
    );
    expect(events).toHaveLength(1);
  });

  describe('deadlines', () => {
    it('alerts for a quiz, a project and an external test that are due soon', () => {
      const project: DueItemFact = { ...dueQuiz, contentItemId: PROJECT_ITEM, contentType: 'project', title: 'URL Shortener' };
      const external: DueItemFact = { ...dueQuiz, contentItemId: 'ext-1', contentType: 'external_test', title: 'Aptitude Test' };
      const events = planDerivedNotifications(input({ dueItems: [dueQuiz, project, external] }));
      expect(events.map((e) => e.type)).toEqual(['ASSESSMENT_DUE_SOON', 'ASSESSMENT_DUE_SOON', 'ASSESSMENT_DUE_SOON']);
      expect(events.map((e) => (e as { contentType?: string }).contentType)).toEqual(['quiz', 'project', 'external_test']);
    });

    it('links to the item and keeps an external-test #fragment at the end', () => {
      expect(dueItemActionUrl(dueQuiz)).toBe(
        `/assessments?batchId=${BATCH_ID}&item=${QUIZ_ITEM}&due=${dueQuiz.dueAt.getTime()}`
      );
      const external = dueItemActionUrl({ ...dueQuiz, contentType: 'external_test', contentItemId: 'ext-1' });
      expect(external.startsWith('/assessments?item=ext-1&due=')).toBe(true);
      expect(external.endsWith('#external-tests')).toBe(true);
    });

    it('announces a moved deadline again, but never the same deadline twice', () => {
      const first = planDerivedNotifications(input({ dueItems: [dueQuiz] }));
      expect(planDerivedNotifications(input({ dueItems: [dueQuiz], existing: asExisting(first) }))).toEqual([]);

      const moved = { ...dueQuiz, dueAt: new Date('2026-10-21T12:00:00Z') };
      expect(planDerivedNotifications(input({ dueItems: [moved], existing: asExisting(first) }))).toHaveLength(1);
    });
  });

  describe('published content', () => {
    it('announces a single new curriculum item with a link to it', () => {
      const [event] = planDerivedNotifications(input({ publishedContent: [content('lec-1', 'Hash Maps', 2)] }));
      expect(event).toMatchObject({
        type: 'CONTENT_PUBLISHED',
        scopeName: 'CSE 2026',
        itemCount: 1,
        itemTitle: 'Hash Maps',
        contentType: 'lecture'
      });
      const url = (event as { actionUrl: string }).actionUrl;
      expect(url.startsWith(`/content/lec-1?batchId=${BATCH_ID}&item=lec-1&scope=`)).toBe(true);
    });

    it(`groups more than ${CONTENT_GROUP_THRESHOLD} new items in one batch into one notification`, () => {
      const facts = [1, 2, 3, 4, 5].map((n) => content(`lec-${n}`, `Lecture ${n}`, 10 - n));
      const events = planDerivedNotifications(input({ publishedContent: facts }));
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: 'CONTENT_PUBLISHED', itemCount: 5, itemTitle: 'Lecture 5' });
      expect((events[0] as { actionUrl: string }).actionUrl.startsWith(`/batches/${BATCH_ID}?scope=`)).toBe(true);
    });

    it('never announces the same content twice: later runs only pick up items added after the watermark', () => {
      const first = planDerivedNotifications(input({ publishedContent: [content('lec-1', 'Hash Maps', 2)] }));
      const later = new Date(NOW.getTime() + HOUR);
      const added = { ...content('lec-2', 'Tries', 0), visibleAt: new Date(NOW.getTime() + 30 * 60 * 1000) };

      const second = planDerivedNotifications(
        input({ now: later, existing: asExisting(first), publishedContent: [content('lec-1', 'Hash Maps', 2), added] })
      );
      expect(second).toHaveLength(1);
      expect(second[0]).toMatchObject({ itemTitle: 'Tries' });

      const third = planDerivedNotifications(
        input({
          now: later,
          existing: [...asExisting(first), ...asExisting(second)],
          publishedContent: [content('lec-1', 'Hash Maps', 2), added]
        })
      );
      expect(third).toEqual([]);
    });

    it('ignores content older than the lookback and items not visible yet (available_from in the future)', () => {
      const old = content('old', 'Old lecture', CONTENT_LOOKBACK_MS / HOUR + 1);
      const future = { ...content('soon', 'Next week', 0), visibleAt: new Date(NOW.getTime() + HOUR) };
      expect(planDerivedNotifications(input({ publishedContent: [old, future] }))).toEqual([]);
    });

    it('keeps batch and program-library content in separate scopes', () => {
      const library = content('lib-1', 'System Design Notes', 1, {
        scope: programScope(7),
        scopeName: 'Career Readiness',
        batchId: undefined,
        contentType: 'notes'
      });
      const events = planDerivedNotifications(input({ publishedContent: [content('lec-1', 'Hash Maps', 2), library] }));
      expect(events.map((e) => (e as { scopeName: string }).scopeName)).toEqual(['CSE 2026', 'Career Readiness']);
      expect((events[1] as { actionUrl: string }).actionUrl.startsWith('/content/lib-1?item=lib-1&scope=program%3A7')).toBe(true);
    });

    it('reads watermarks back from stored actionUrls, including ones with a #fragment', () => {
      const at = NOW.getTime();
      const marks = contentWatermarks([
        { type: 'CONTENT_PUBLISHED', actionUrl: withQueryParams('/batches/b1', { scope: 'batch:b1', at: String(at - 5) }) },
        { type: 'CONTENT_PUBLISHED', actionUrl: withQueryParams('/batches/b1', { scope: 'batch:b1', at: String(at) }) },
        { type: 'CONTENT_PUBLISHED', actionUrl: withQueryParams('/assessments#external-tests', { scope: 'batch:b2', at: '7' }) },
        { type: 'ASSESSMENT_DUE_SOON', actionUrl: '/assessments?scope=batch:b3&at=1' },
        { type: 'CONTENT_PUBLISHED', actionUrl: null }
      ]);
      expect(marks.get('batch:b1')).toBe(at);
      expect(marks.get('batch:b2')).toBe(7);
      expect(marks.has('batch:b3')).toBe(false);
    });
  });

  it('plans a STREAK_MILESTONE only on the day a milestone streak is reached', () => {
    const [event] = planDerivedNotifications(input({ streak: { currentStreak: 7, lastActivityDateIst: TODAY } }));
    expect(event).toMatchObject({ type: 'STREAK_MILESTONE', streakCount: 7, actionUrl: streakActionUrl(TODAY) });
    expect(planDerivedNotifications(input({ streak: { currentStreak: 8, lastActivityDateIst: TODAY } }))).toEqual([]);
    expect(
      planDerivedNotifications(input({ streak: { currentStreak: 7, lastActivityDateIst: '2026-10-19' } }))
    ).toEqual([]);
  });

  it('is idempotent across all kinds: a re-run after inserting plans nothing', () => {
    const facts = input({
      reviewedSubmissions: [review],
      dueItems: [dueQuiz],
      publishedContent: [content('lec-1', 'Hash Maps', 2)],
      streak: { currentStreak: 3, lastActivityDateIst: TODAY }
    });
    const first = planDerivedNotifications(facts);
    expect(first.map((e) => e.type)).toEqual([
      'PROJECT_REVIEWED',
      'ASSESSMENT_DUE_SOON',
      'CONTENT_PUBLISHED',
      'STREAK_MILESTONE'
    ]);
    expect(planDerivedNotifications({ ...facts, existing: asExisting(first) })).toEqual([]);
  });

  it('dedupe lookback covers every fact window', () => {
    expect(DEDUPE_LOOKBACK_MS).toBeGreaterThanOrEqual(REVIEW_LOOKBACK_MS);
    expect(DEDUPE_LOOKBACK_MS).toBeGreaterThanOrEqual(DUE_SOON_WINDOW_MS);
    expect(DEDUPE_LOOKBACK_MS).toBeGreaterThanOrEqual(CONTENT_LOOKBACK_MS);
  });
});
