import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({
  enrollments: [] as unknown[],
  placements: [] as unknown[],
  results: [] as unknown[]
}));

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');
  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: unknown) => {
          if (table === actual.enrollments) return { where: () => Promise.resolve(state.enrollments) };
          if (table === actual.externalAssessmentRecords) return { where: () => Promise.resolve(state.results) };
          // batch_curriculum placements: innerJoin x2, where, orderBy
          const chain = {
            innerJoin: () => chain,
            where: () => chain,
            orderBy: () => Promise.resolve(state.placements)
          };
          return chain;
        }
      })
    }
  };
});

import { getStudentExternalTests } from '@/lib/db/queries/external-tests';
import { externalTestWindowState, readExternalTestMetadata } from '@/lib/services/external-test';

const BATCH_A = '11111111-1111-4111-8111-111111111111';
const BATCH_B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-25T06:00:00Z');

const placement = (patch: Record<string, unknown>) => ({
  placementId: 1,
  contentItemId: 'c1',
  batchId: BATCH_A,
  batchName: 'CSE 2026',
  title: 'Aptitude test 1',
  description: 'Sign in with your RMS email.',
  metadata: {
    externalProvider: 'QwikTest',
    externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
    assessmentCode: 'QT-CSE26-APT1',
    durationMinutes: 60
  },
  availableFrom: new Date('2026-10-25T04:30:00Z'),
  dueAt: new Date('2026-10-25T08:30:00Z'),
  ...patch
});

describe('readExternalTestMetadata', () => {
  it('reads provider, https link, lower-cased code and duration', () => {
    expect(
      readExternalTestMetadata({
        externalProvider: ' QwikTest ',
        externalUrl: 'https://rms-careers.qwiktest.in/a',
        assessmentCode: ' QT-CSE26-APT1 ',
        durationMinutes: 45
      })
    ).toEqual({ provider: 'QwikTest', url: 'https://rms-careers.qwiktest.in/a', codeKey: 'qt-cse26-apt1', durationMinutes: 45 });
  });

  it('never returns a non-https link and falls back for missing values', () => {
    expect(readExternalTestMetadata({ externalUrl: 'javascript:alert(1)' }).url).toBeNull();
    expect(readExternalTestMetadata({ externalUrl: 'http://x.io/t' }).url).toBeNull();
    expect(readExternalTestMetadata(null)).toEqual({
      provider: 'External platform',
      url: null,
      codeKey: '',
      durationMinutes: null
    });
  });
});

describe('externalTestWindowState', () => {
  const from = new Date('2026-10-25T04:30:00Z');
  const due = new Date('2026-10-25T08:30:00Z');
  it('is upcoming before, open during and closed after the batch window', () => {
    expect(externalTestWindowState(from, due, new Date('2026-10-25T04:00:00Z'))).toBe('upcoming');
    expect(externalTestWindowState(from, due, NOW)).toBe('open');
    expect(externalTestWindowState(from, due, new Date('2026-10-25T09:00:00Z'))).toBe('closed');
    expect(externalTestWindowState(null, null, NOW)).toBe('open');
  });
});

describe('getStudentExternalTests', () => {
  const original = process.env.POSTGRES_URL;
  beforeEach(() => {
    process.env.POSTGRES_URL = 'postgres://localhost/unit';
    state.enrollments = [{ batchId: BATCH_A }, { batchId: BATCH_B }];
    state.placements = [];
    state.results = [];
  });
  afterEach(() => {
    process.env.POSTGRES_URL = original;
  });

  it('returns nothing without enrollments or placements', async () => {
    state.enrollments = [];
    expect(await getStudentExternalTests(7, NOW)).toEqual([]);
    state.enrollments = [{ batchId: BATCH_A }];
    expect(await getStudentExternalTests(7, NOW)).toEqual([]);
  });

  it('shows the link only while the window is open', async () => {
    state.placements = [
      placement({ placementId: 1 }),
      placement({ placementId: 2, availableFrom: new Date('2026-10-26T04:30:00Z'), dueAt: null }),
      placement({ placementId: 3, availableFrom: null, dueAt: new Date('2026-10-24T08:30:00Z') })
    ];
    const tests = await getStudentExternalTests(7, NOW);
    expect(tests.map((t) => [t.placementId, t.windowState, t.url])).toEqual([
      [1, 'open', 'https://rms-careers.qwiktest.in/assessment-1'],
      [2, 'upcoming', null],
      [3, 'closed', null]
    ]);
  });

  it('attaches the imported result for the same batch and code, case-insensitively', async () => {
    state.placements = [placement({ placementId: 1 }), placement({ placementId: 2, batchId: BATCH_B, batchName: 'ECE 2026' })];
    state.results = [
      { batchId: BATCH_A, codeKey: 'qt-cse26-apt1', obtainedScore: 42, maxScore: 50, importedAt: new Date('2026-10-26') }
    ];
    const [a, b] = await getStudentExternalTests(7, NOW);
    expect(a.result).toEqual({ obtainedScore: 42, maxScore: 50, percentage: 84, importedAt: new Date('2026-10-26') });
    // Same code in another batch is a different placement: no result leaks across batches.
    expect(b.result).toBeNull();
  });

  it('never matches results when the item has no assessment code', async () => {
    state.placements = [placement({ metadata: { externalUrl: 'https://x.qwiktest.in/a' } })];
    state.results = [{ batchId: BATCH_A, codeKey: '', obtainedScore: 1, maxScore: 1, importedAt: new Date() }];
    const [t] = await getStudentExternalTests(7, NOW);
    expect(t.result).toBeNull();
  });
});
