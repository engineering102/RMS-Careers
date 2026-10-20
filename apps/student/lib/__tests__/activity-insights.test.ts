import { describe, it, expect } from 'vitest';
import {
  weekStartIst,
  addDaysIst,
  insightsWindowStartIst,
  mixWindowStartIst,
  buildWeeklyXp,
  buildXpMix,
  INSIGHT_WEEKS,
  type ActivityAggregateRow
} from '@/lib/types/activity-insights';

// 2026-10-20 is a Tuesday.
const TODAY = '2026-10-20';

function row(activityDateIst: string, activityType: ActivityAggregateRow['activityType'], totalXp: number, count = 1): ActivityAggregateRow {
  return { activityDateIst, activityType, totalXp, count };
}

describe('activity insights date helpers (IST, Monday weeks)', () => {
  it('finds the Monday of a week, including on Sunday and across month boundaries', () => {
    expect(weekStartIst('2026-10-20')).toBe('2026-10-19'); // Tue → Mon
    expect(weekStartIst('2026-10-19')).toBe('2026-10-19'); // Mon stays
    expect(weekStartIst('2026-10-25')).toBe('2026-10-19'); // Sun belongs to the week before it
    expect(weekStartIst('2026-11-01')).toBe('2026-10-26');
    expect(addDaysIst('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('query window covers both the 12-week trend and the 30-day mix', () => {
    const start = insightsWindowStartIst(TODAY);
    expect(start).toBe(addDaysIst('2026-10-19', -7 * (INSIGHT_WEEKS - 1)));
    expect(start <= mixWindowStartIst(TODAY)).toBe(true);
    expect(mixWindowStartIst(TODAY)).toBe('2026-09-21');
  });
});

describe('buildWeeklyXp', () => {
  it('always returns exactly 12 weeks, oldest first, ending with the current week', () => {
    const { weeks } = buildWeeklyXp([], TODAY);
    expect(weeks).toHaveLength(INSIGHT_WEEKS);
    expect(weeks[weeks.length - 1]).toMatchObject({ weekStartIst: '2026-10-19', isCurrentWeek: true, xp: 0 });
    expect(weeks.filter((w) => w.isCurrentWeek)).toHaveLength(1);
    expect(weeks[0].weekStartIst < weeks[1].weekStartIst).toBe(true);
  });

  it('sums XP and activity counts per IST week across activity types', () => {
    const summary = buildWeeklyXp(
      [
        row('2026-10-19', 'dsa_solved', 25, 1),
        row('2026-10-20', 'lecture_completed', 10, 2),
        row('2026-10-12', 'quiz_completed', 20, 1),
        row('2026-10-18', 'dsa_solved', 50, 1) // Sunday → previous week
      ],
      TODAY
    );
    expect(summary.thisWeekXp).toBe(35);
    expect(summary.lastWeekXp).toBe(70);
    expect(summary.weeks[summary.weeks.length - 1].activityCount).toBe(3);
    expect(summary.changePercent).toBe(-50);
  });

  it('reports no % change when last week had no XP, and ignores rows outside the window', () => {
    const summary = buildWeeklyXp([row('2026-10-20', 'dsa_solved', 10), row('2025-01-01', 'dsa_solved', 999)], TODAY);
    expect(summary.changePercent).toBeNull();
    expect(summary.weeks.reduce((s, w) => s + w.xp, 0)).toBe(10);
  });
});

describe('buildXpMix', () => {
  it('breaks the last 30 days of XP down by activity type in a stable order', () => {
    const mix = buildXpMix(
      [
        row('2026-10-20', 'lecture_completed', 15, 3),
        row('2026-10-01', 'dsa_solved', 75, 3),
        row('2026-09-21', 'quiz_completed', 10, 1), // first day of the window, included
        row('2026-09-20', 'assignment_approved', 150, 1) // one day too old
      ],
      TODAY
    );
    expect(mix.totalXp).toBe(100);
    expect(mix.totalCount).toBe(7);
    expect(mix.slices.map((s) => s.activityType)).toEqual(['dsa_solved', 'quiz_completed', 'lecture_completed']);
    expect(mix.slices.map((s) => s.percent)).toEqual([75, 10, 15]);
    expect(mix.slices[0].label).toBe('DSA problems');
  });

  it('is empty (no slices, no division by zero) for a student with no recent activity', () => {
    const mix = buildXpMix([], TODAY);
    expect(mix.slices).toEqual([]);
    expect(mix.totalXp).toBe(0);
  });
});
