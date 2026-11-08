import { describe, expect, it } from 'vitest';

import {
  assessmentHref,
  buildAssessmentItems,
  buildAssessmentView,
  ordinal,
  parseAssessmentQuery,
  type AssessmentSources
} from '@/lib/services/assessment-hub';
import { paginationRange } from '@/lib/format/pagination';
import type { FormalAssessmentSummary, PracticeQuizSummary } from '@/lib/types/assessments';
import type { ExternalAssessmentRecord, ExternalTestSummary } from '@/lib/types/external-assessments';
import type { ProjectAssignmentCardData } from '@/lib/types/projects';
import type { AssessmentHubQuery } from '@/lib/types/assessment-hub';

const NOW = new Date('2026-11-08T06:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const BATCH_A = '11111111-1111-4111-8111-111111111111';
const BATCH_B = '22222222-2222-4222-8222-222222222222';

const formal = (patch: Partial<FormalAssessmentSummary>): FormalAssessmentSummary => ({
  id: 'f1',
  contentItemId: 'c-f1',
  programId: 1,
  programName: 'Full Stack',
  programCode: 'FS',
  batchId: BATCH_A,
  batchName: 'CSE 2026 A',
  title: 'Exam',
  slug: 'exam',
  description: null,
  timeLimitMinutes: 45,
  passingScorePercent: 60,
  questionCount: 20,
  totalPoints: 20,
  availableFrom: null,
  dueAt: null,
  status: 'available',
  attempt: null,
  ...patch
});

const practice = (patch: Partial<PracticeQuizSummary>): PracticeQuizSummary => ({
  id: 'p1',
  contentItemId: 'c-p1',
  programId: 1,
  programName: 'Full Stack',
  programCode: 'FS',
  title: 'Quiz',
  slug: 'quiz',
  description: null,
  quizType: 'practice',
  passingScorePercent: 60,
  questionCount: 10,
  totalPoints: 10,
  attemptCount: 0,
  bestScore: null,
  bestPercentage: null,
  isPassed: false,
  lastAttemptAt: null,
  ...patch
});

const project = (patch: Partial<ProjectAssignmentCardData>): ProjectAssignmentCardData => ({
  assignmentId: 'a1',
  contentItemId: 'c-pr1',
  title: 'Project',
  description: null,
  batchId: BATCH_A,
  batchName: 'CSE 2026 A',
  dueAt: null,
  maxScore: 100,
  submission: null,
  ...patch
});

const externalTest = (patch: Partial<ExternalTestSummary>): ExternalTestSummary => ({
  placementId: 1,
  contentItemId: 'c-x1',
  batchId: BATCH_A,
  batchName: 'CSE 2026 A',
  title: 'Aptitude 1',
  description: null,
  provider: 'QwikTest',
  codeKey: 'qt-apt1',
  url: null,
  durationMinutes: 60,
  availableFrom: null,
  dueAt: null,
  windowState: 'closed',
  result: null,
  ...patch
});

const report = (patch: Partial<ExternalAssessmentRecord>): ExternalAssessmentRecord => ({
  id: 1,
  assessmentCode: 'QT-APT1',
  assessmentName: 'Aptitude 1',
  provider: 'QwikTest',
  batchId: BATCH_A,
  batchName: 'CSE 2026 A',
  maxScore: 50,
  obtainedScore: 40,
  percentage: 80,
  percentile: 91,
  importedAt: at(-2),
  performanceTier: 'advanced',
  ...patch
});

const empty: AssessmentSources = { formal: [], practice: [], projects: [], externalTests: [], reports: [] };
const query = (patch: Partial<AssessmentHubQuery> = {}): AssessmentHubQuery => ({
  tab: 'all',
  status: 'all',
  q: '',
  batchId: null,
  page: 1,
  ...patch
});

describe('buildAssessmentItems', () => {
  it('maps formal statuses to buckets, urgency and actions', () => {
    const items = buildAssessmentItems(
      {
        ...empty,
        formal: [
          formal({ id: 'running', status: 'in_progress', dueAt: at(5) }),
          formal({ id: 'soon', status: 'available', dueAt: at(1) }),
          formal({ id: 'later', status: 'available', dueAt: at(10) }),
          formal({ id: 'locked', status: 'upcoming', availableFrom: at(4) }),
          formal({
            id: 'passed',
            status: 'submitted',
            attempt: { id: 'x', startedAt: at(-3), submittedAt: at(-3), score: 18, maxScore: 20, percentage: 90, isPassed: true, tabBlurCount: 0 }
          }),
          formal({ id: 'missed', status: 'closed', dueAt: at(-1) })
        ]
      },
      NOW
    );
    const byId = Object.fromEntries(items.map((i) => [i.key.split(':')[1], i]));

    expect(byId.running).toMatchObject({ bucket: 'todo', urgent: true, priority: 0, action: { label: 'Resume' } });
    expect(byId.soon).toMatchObject({ bucket: 'todo', urgent: true, action: { label: 'Start exam' } });
    expect(byId.later).toMatchObject({ bucket: 'todo', urgent: false });
    expect(byId.locked).toMatchObject({ bucket: 'upcoming', action: null });
    expect(byId.passed).toMatchObject({ bucket: 'done', score: '90%', percentage: 90, status: { label: 'Passed' } });
    expect(byId.missed).toMatchObject({ bucket: 'closed', status: { label: 'Missed' }, action: null });
    expect(byId.soon.action?.href).toBe(`/assessments/soon?batchId=${BATCH_A}`);
  });

  it('keeps unpassed practice in to do and passed practice in done', () => {
    const items = buildAssessmentItems(
      {
        ...empty,
        practice: [
          practice({ id: 'new' }),
          practice({ id: 'retry', attemptCount: 2, bestPercentage: 40, lastAttemptAt: at(-1) }),
          practice({ id: 'ok', attemptCount: 1, bestPercentage: 80, isPassed: true, lastAttemptAt: at(-1) })
        ]
      },
      NOW
    );
    expect(items.map((i) => [i.key, i.bucket, i.action?.label])).toEqual([
      ['practice:new', 'todo', 'Start'],
      ['practice:retry', 'todo', 'Try again'],
      ['practice:ok', 'done', 'Practice again']
    ]);
  });

  it('flags overdue and changes-requested projects', () => {
    const items = buildAssessmentItems(
      {
        ...empty,
        projects: [
          project({ contentItemId: 'late', dueAt: at(-1) }),
          project({
            contentItemId: 'revise',
            submission: { id: 's', status: 'resubmission_requested', score: null, submittedAt: at(-3), reviewedAt: at(-1) }
          }),
          project({
            contentItemId: 'good',
            submission: { id: 's2', status: 'approved', score: 85, submittedAt: at(-5), reviewedAt: at(-2) }
          })
        ]
      },
      NOW
    );
    expect(items[0]).toMatchObject({ bucket: 'todo', urgent: true, status: { label: 'Overdue', tone: 'destructive' } });
    expect(items[1]).toMatchObject({ bucket: 'todo', urgent: true, priority: 0, action: { label: 'Revise' } });
    expect(items[2]).toMatchObject({ bucket: 'done', score: '85 / 100', percentage: 85 });
  });

  it('folds a report card into the scored external test it belongs to', () => {
    const items = buildAssessmentItems(
      {
        ...empty,
        externalTests: [
          externalTest({
            result: { obtainedScore: 40, maxScore: 50, percentage: 80, importedAt: at(-2) }
          })
        ],
        reports: [report({}), report({ id: 2, assessmentCode: 'OTHER', assessmentName: 'Mock AMCAT' })]
      },
      NOW
    );
    expect(items.map((i) => i.key)).toEqual(['external:1', 'report:2']);
    expect(items[0].facts).toContain('91st percentile');
  });

  it('keeps a report card from another batch separate', () => {
    const items = buildAssessmentItems(
      {
        ...empty,
        externalTests: [externalTest({ result: { obtainedScore: 40, maxScore: 50, percentage: 80, importedAt: at(-2) } })],
        reports: [report({ batchId: BATCH_B })]
      },
      NOW
    );
    expect(items).toHaveLength(2);
  });

  it('only links an open external test, in a new tab', () => {
    const [open] = buildAssessmentItems(
      { ...empty, externalTests: [externalTest({ windowState: 'open', url: 'https://x.qwiktest.in/a', dueAt: at(2) })] },
      NOW
    );
    expect(open).toMatchObject({ bucket: 'todo', urgent: true, action: { external: true, href: 'https://x.qwiktest.in/a' } });
  });
});

describe('buildAssessmentView', () => {
  const sources: AssessmentSources = {
    ...empty,
    formal: [
      formal({ id: 'done', status: 'submitted', attempt: { id: 'x', startedAt: at(-3), submittedAt: at(-3), score: 10, maxScore: 20, percentage: 50, isPassed: false, tabBlurCount: 0 } }),
      formal({ id: 'later', status: 'available', dueAt: at(9) }),
      formal({ id: 'b-exam', status: 'available', dueAt: at(2), batchId: BATCH_B, batchName: 'ECE 2026' }),
      formal({ id: 'running', status: 'in_progress', dueAt: at(20) }),
      formal({ id: 'locked', status: 'upcoming', availableFrom: at(3) })
    ],
    practice: [
      practice({ id: 'quiz', title: 'Arrays warm-up', attemptCount: 1, bestPercentage: 30, lastAttemptAt: at(-1) })
    ]
  };
  const items = buildAssessmentItems(sources, NOW);

  it('sorts to do (in progress first, then soonest due, undated practice last), upcoming, then done', () => {
    const view = buildAssessmentView(items, query(), NOW);
    expect(view.items.map((i) => i.key.split(':')[1])).toEqual(['running', 'b-exam', 'later', 'quiz', 'locked', 'done']);
  });

  it('counts tabs and statuses and filters by status', () => {
    const view = buildAssessmentView(items, query({ tab: 'exams', status: 'todo' }), NOW);
    expect(view.tabCounts).toMatchObject({ all: 6, exams: 5, practice: 1, projects: 0, external: 0 });
    expect(view.statusCounts).toMatchObject({ all: 5, todo: 3, upcoming: 1, done: 1, closed: 0 });
    expect(view.items).toHaveLength(3);
  });

  it('filters by batch but keeps program-wide practice quizzes', () => {
    const view = buildAssessmentView(items, query({ batchId: BATCH_B }), NOW);
    expect(view.items.map((i) => i.key.split(':')[1])).toEqual(['b-exam', 'quiz']);
    expect(view.stats.total).toBe(2);
  });

  it('ignores an unknown batch id', () => {
    const view = buildAssessmentView(items, query({ batchId: 'not-mine' }), NOW);
    expect(view.query.batchId).toBeNull();
    expect(view.totalCount).toBe(6);
  });

  it('searches title, program code and batch name', () => {
    expect(buildAssessmentView(items, query({ q: 'arrays' }), NOW).totalCount).toBe(1);
    expect(buildAssessmentView(items, query({ q: 'ece' }), NOW).totalCount).toBe(1);
  });

  it('paginates and clamps an out-of-range page', () => {
    const view = buildAssessmentView(items, query({ page: 9 }), NOW, 4);
    expect(view.totalPages).toBe(2);
    expect(view.page).toBe(2);
    expect(view.items).toHaveLength(2);
  });

  it('derives stats from the same rows', () => {
    const { stats } = buildAssessmentView(items, query(), NOW);
    // exam 50% + practice best 30%
    expect(stats).toMatchObject({ todo: 4, upcoming: 1, done: 1, total: 6, averagePercentage: 40, scoredCount: 2 });
    expect(stats.dueSoon).toBe(2); // in progress + due in 2 days
    expect(stats.nextOpensAt).toEqual(at(3));
  });
});

describe('query parsing and links', () => {
  it('falls back to defaults for unknown values', () => {
    expect(parseAssessmentQuery({ type: 'bogus', status: 'nope', page: '-3', q: '  ' })).toEqual(query());
    expect(parseAssessmentQuery({ type: ['external', 'exams'], page: '3', batchId: BATCH_A })).toEqual(
      query({ tab: 'external', page: 3, batchId: BATCH_A })
    );
  });

  it('builds URLs that drop defaults', () => {
    expect(assessmentHref(query())).toBe('/assessments');
    expect(assessmentHref(query({ tab: 'exams', q: 'dbms' }), { page: 2 })).toBe('/assessments?type=exams&q=dbms&page=2');
  });
});

describe('ordinal', () => {
  it('suffixes percentiles', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 91, 99.6].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '91st', '100th'
    ]);
  });
});

describe('paginationRange', () => {
  it.each([
    [1, 1, [1]],
    [2, 5, [1, 2, 3, 4, 5]],
    [1, 8, [1, 2, 'gap', 8]],
    [6, 12, [1, 'gap', 5, 6, 7, 'gap', 12]],
    [12, 12, [1, 'gap', 11, 12]],
    [3, 7, [1, 2, 3, 4, 'gap', 7]]
  ])('page %i of %i', (page, total, expected) => {
    expect(paginationRange(page, total)).toEqual(expected);
  });
});
