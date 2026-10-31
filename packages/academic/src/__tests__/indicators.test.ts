import { describe, it, expect } from 'vitest';
import { computeIndicators, formatIstDate, INACTIVITY_DAYS, type IndicatorInput } from '../tutor/indicators';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-30T06:30:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const base: IndicatorInput = { batchStatus: 'active', enrolledAt: daysAgo(60), lastActivityAt: daysAgo(1), overdueRequired: 0, needsRevision: 0, now };
const kinds = (input: Partial<IndicatorInput>) => computeIndicators({ ...base, ...input }).map((i) => i.kind);

describe('tutoring signals (T-18)', () => {
  it('flags inactivity from 7 days, not at 6', () => {
    expect(INACTIVITY_DAYS).toBe(7);
    expect(kinds({ lastActivityAt: daysAgo(6) })).toEqual([]);
    expect(kinds({ lastActivityAt: new Date(daysAgo(7).getTime() + 60_000) })).toEqual([]);
    expect(kinds({ lastActivityAt: daysAgo(7) })).toEqual(['inactive']);
    const [signal] = computeIndicators({ ...base, lastActivityAt: daysAgo(12) });
    expect(signal).toMatchObject({ kind: 'inactive', label: 'Inactive 12 days' });
    expect(signal.evidence).toMatch(/^Last activity \d{1,2} [A-Z][a-z]{2} 2026$/);
  });

  it('flags a student who never did anything, once settled in', () => {
    expect(kinds({ lastActivityAt: null, enrolledAt: daysAgo(10) })).toEqual(['never_active']);
  });

  it('leaves new enrollees alone for their first week', () => {
    expect(kinds({ lastActivityAt: null, enrolledAt: daysAgo(6) })).toEqual([]);
    expect(kinds({ lastActivityAt: daysAgo(30), enrolledAt: daysAgo(3) })).toEqual([]);
    expect(kinds({ lastActivityAt: null, enrolledAt: daysAgo(7) })).toEqual(['never_active']);
  });

  it('shows no signals for a completed batch', () => {
    expect(kinds({ batchStatus: 'completed', lastActivityAt: null, overdueRequired: 3, needsRevision: 1 })).toEqual([]);
  });

  it('reports overdue items and returned projects with counts', () => {
    const signals = computeIndicators({ ...base, overdueRequired: 2, needsRevision: 1 });
    expect(signals.map((s) => s.kind)).toEqual(['overdue', 'needs_revision']);
    expect(signals[0]).toMatchObject({ label: '2 overdue', evidence: '2 required items are past the due date' });
    expect(signals[1].evidence).toBe('1 project was returned for changes');
  });

  it('formats dates in IST regardless of the server zone', () => {
    // 20:00 UTC on 31 Oct is 01:30 IST on 1 Nov.
    expect(formatIstDate(new Date('2026-10-31T20:00:00Z'))).toBe('1 Nov 2026');
    expect(formatIstDate(new Date('2026-10-12T05:00:00Z'))).toBe('12 Oct 2026');
  });
});
