import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { computeBatchProgress, dsaSlugOf, externalCodeOf, type CompletionSources, type CurriculumItem } from '../tutor/progress';

const now = new Date('2026-10-30T12:00:00Z');
const past = new Date('2026-10-01T00:00:00Z');
const future = new Date('2026-12-01T00:00:00Z');

const item = (id: string, contentType: string, extra: Partial<CurriculumItem> = {}): CurriculumItem => ({
  contentItemId: id,
  title: id,
  slug: `${id}-slug`,
  contentType,
  metadata: {},
  weekNumber: 1,
  sequenceOrder: 0,
  isRequired: true,
  availableFrom: null,
  dueAt: null,
  ...extra
});

const curriculum: CurriculumItem[] = [
  item('lec', 'lecture'),
  item('notes', 'notes'),
  item('res', 'resource', { isRequired: false }),
  item('quiz', 'quiz', { dueAt: past }),
  item('proj', 'project', { dueAt: past }),
  item('dsa', 'dsa_sheet', { metadata: { slug: 'two-sum' } }),
  item('ext', 'external_test', { metadata: { assessmentCode: ' QT-01 ' }, dueAt: future })
];

const empty: CompletionSources = { lectures: [], quizAttempts: [], projects: [], dsa: [], external: [] };

describe('computeBatchProgress (student portal rules, T-17 unit side)', () => {
  it('gives every requested student an entry, all not started', () => {
    const result = computeBatchProgress(curriculum, empty, [1, 2], now);
    expect([...result.keys()]).toEqual([1, 2]);
    const p = result.get(1)!;
    expect(p).toMatchObject({ totalRequired: 6, completedRequired: 0, percentage: 0, needsRevision: 0 });
    expect(Object.values(p.items).every((i) => i.status === 'not_started')).toBe(true);
    // quiz and project are required and past due.
    expect(p.overdueRequired).toBe(2);
  });

  it('applies each content type rule', () => {
    const sources: CompletionSources = {
      lectures: [
        { studentId: 1, referenceId: 'lec', createdAt: past },
        { studentId: 1, referenceId: 'res', createdAt: past }
      ],
      quizAttempts: [
        { studentId: 1, contentItemId: 'quiz', isPassed: false, score: 2, maxScore: 10, submittedAt: past },
        { studentId: 1, contentItemId: 'quiz', isPassed: true, score: 8, maxScore: 10, submittedAt: now }
      ],
      projects: [{ studentId: 1, contentItemId: 'proj', status: 'approved', score: 90, submittedAt: past, reviewedAt: now }],
      dsa: [{ studentId: 1, problemSlug: 'two-sum', isCompleted: true, completedAt: past }],
      external: [{ studentId: 1, codeKey: 'qt-01', obtainedScore: 40, maxScore: 50, importedAt: now }]
    };
    const p = computeBatchProgress(curriculum, sources, [1], now).get(1)!;
    expect(p.items.lec.status).toBe('completed');
    expect(p.items.notes.status).toBe('not_started');
    expect(p.items.res.status).toBe('completed'); // optional: completes but does not count
    expect(p.items.quiz).toMatchObject({ status: 'completed', score: 8, maxScore: 10, completedAt: now });
    expect(p.items.proj).toMatchObject({ status: 'completed', score: 90, completedAt: now, submissionStatus: 'approved' });
    expect(p.items.dsa.status).toBe('completed');
    expect(p.items.ext).toMatchObject({ status: 'completed', score: 40, maxScore: 50 });
    // 5 of 6 required (notes missing): Math.round(83.33) = 83, as the student portal rounds.
    expect(p).toMatchObject({ totalRequired: 6, completedRequired: 5, percentage: 83, overdueRequired: 0 });
  });

  it('quiz attempts without a pass are in progress and show the first attempt', () => {
    const sources = { ...empty, quizAttempts: [{ studentId: 1, contentItemId: 'quiz', isPassed: false, score: 3, maxScore: 10, submittedAt: null }] };
    expect(computeBatchProgress(curriculum, sources, [1], now).get(1)!.items.quiz).toMatchObject({ status: 'in_progress', score: 3, completedAt: null });
  });

  it.each([
    ['submitted', 'in_progress'],
    ['under_review', 'in_progress'],
    ['resubmission_requested', 'needs_revision'],
    ['approved', 'completed']
  ])('project %s → %s', (submission, expected) => {
    const sources = { ...empty, projects: [{ studentId: 1, contentItemId: 'proj', status: submission, score: null, submittedAt: past, reviewedAt: null }] };
    const p = computeBatchProgress(curriculum, sources, [1], now).get(1)!;
    expect(p.items.proj.status).toBe(expected);
    expect(p.needsRevision).toBe(expected === 'needs_revision' ? 1 : 0);
  });

  it('keeps students apart', () => {
    const sources = { ...empty, lectures: [{ studentId: 2, referenceId: 'lec', createdAt: past }] };
    const result = computeBatchProgress(curriculum, sources, [1, 2], now);
    expect(result.get(1)!.items.lec.status).toBe('not_started');
    expect(result.get(2)!.items.lec.status).toBe('completed');
  });

  it('has no required items → 0%', () => {
    expect(computeBatchProgress([item('o', 'lecture', { isRequired: false })], empty, [1], now).get(1)!.percentage).toBe(0);
  });

  it('reads the DSA slug and external code like the student portal', () => {
    expect(dsaSlugOf({ metadata: { slug: 'x' }, slug: 'item' })).toBe('x');
    expect(dsaSlugOf({ metadata: {}, slug: 'item' })).toBe('item');
    expect(externalCodeOf({ metadata: { assessmentCode: '  AbC ' } })).toBe('abc');
    expect(externalCodeOf({ metadata: null })).toBe('');
  });
});
