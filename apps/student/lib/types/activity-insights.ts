import type { ActivityType } from '@/lib/types/activity';

/**
 * Activity insights: fixed-size summaries of the `activities` ledger for the Overview page
 * (weekly XP trend + XP mix by activity type). They replace the old chronological activity log,
 * which grew without bound. All dates are Asia/Kolkata `YYYY-MM-DD` strings, weeks start Monday.
 */

export const INSIGHT_WEEKS = 12;
export const MIX_WINDOW_DAYS = 30;

/** One aggregated row from the ledger: XP and count for a (date, activity type) pair. */
export interface ActivityAggregateRow {
  activityDateIst: string;
  activityType: ActivityType;
  totalXp: number;
  count: number;
}

export interface WeeklyXpPoint {
  /** Monday of the week, YYYY-MM-DD (IST). */
  weekStartIst: string;
  xp: number;
  activityCount: number;
  isCurrentWeek: boolean;
}

export interface WeeklyXpSummary {
  weeks: WeeklyXpPoint[];
  thisWeekXp: number;
  lastWeekXp: number;
  /** Whole-number % change vs last week; null when last week had no XP (no meaningful baseline). */
  changePercent: number | null;
}

export interface XpMixSlice {
  activityType: ActivityType;
  label: string;
  xp: number;
  count: number;
  /** Whole-number share of the window's XP. Shares are rounded independently, so they may not sum to exactly 100. */
  percent: number;
}

export interface XpMixSummary {
  slices: XpMixSlice[];
  totalXp: number;
  totalCount: number;
  windowStartIst: string;
}

export interface ActivityInsightsData {
  weekly: WeeklyXpSummary;
  mix: XpMixSummary;
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  dsa_solved: 'DSA problems',
  quiz_completed: 'Quizzes',
  lecture_completed: 'Lectures',
  assignment_approved: 'Projects',
  external_assessment: 'External tests'
};

/** Stable display order, so a slice keeps its position and colour regardless of its size. */
export const ACTIVITY_TYPE_ORDER: ActivityType[] = [
  'dsa_solved',
  'quiz_completed',
  'lecture_completed',
  'assignment_approved',
  'external_assessment'
];

function parseIstDate(dateIst: string): Date {
  const [y, m, d] = dateIst.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysIst(dateIst: string, days: number): string {
  const date = parseIstDate(dateIst);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

/** Monday of the week containing `dateIst`. */
export function weekStartIst(dateIst: string): string {
  const day = parseIstDate(dateIst).getUTCDay(); // 0 = Sunday
  return addDaysIst(dateIst, -((day + 6) % 7));
}

/** First date the insights query must cover: the Monday `INSIGHT_WEEKS - 1` weeks before this week's Monday. */
export function insightsWindowStartIst(todayIst: string): string {
  const weeklyStart = addDaysIst(weekStartIst(todayIst), -7 * (INSIGHT_WEEKS - 1));
  const mixStart = mixWindowStartIst(todayIst);
  return weeklyStart < mixStart ? weeklyStart : mixStart;
}

/** First date of the XP-mix window: the last `MIX_WINDOW_DAYS` days including today. */
export function mixWindowStartIst(todayIst: string): string {
  return addDaysIst(todayIst, -(MIX_WINDOW_DAYS - 1));
}

export function buildWeeklyXp(rows: ActivityAggregateRow[], todayIst: string): WeeklyXpSummary {
  const currentWeek = weekStartIst(todayIst);
  const weekStarts = Array.from({ length: INSIGHT_WEEKS }, (_, i) =>
    addDaysIst(currentWeek, -7 * (INSIGHT_WEEKS - 1 - i))
  );
  const byWeek = new Map(weekStarts.map((w) => [w, { xp: 0, activityCount: 0 }]));

  for (const row of rows) {
    if (row.activityDateIst > todayIst) continue;
    const bucket = byWeek.get(weekStartIst(row.activityDateIst));
    if (!bucket) continue;
    bucket.xp += Number(row.totalXp) || 0;
    bucket.activityCount += Number(row.count) || 0;
  }

  const weeks = weekStarts.map((w) => ({
    weekStartIst: w,
    ...byWeek.get(w)!,
    isCurrentWeek: w === currentWeek
  }));

  const thisWeekXp = weeks[weeks.length - 1].xp;
  const lastWeekXp = weeks[weeks.length - 2]?.xp ?? 0;
  const changePercent = lastWeekXp > 0 ? Math.round(((thisWeekXp - lastWeekXp) / lastWeekXp) * 100) : null;

  return { weeks, thisWeekXp, lastWeekXp, changePercent };
}

export function buildXpMix(rows: ActivityAggregateRow[], todayIst: string): XpMixSummary {
  const windowStartIst = mixWindowStartIst(todayIst);
  const totals = new Map<ActivityType, { xp: number; count: number }>();

  for (const row of rows) {
    if (row.activityDateIst < windowStartIst || row.activityDateIst > todayIst) continue;
    const entry = totals.get(row.activityType) ?? { xp: 0, count: 0 };
    entry.xp += Number(row.totalXp) || 0;
    entry.count += Number(row.count) || 0;
    totals.set(row.activityType, entry);
  }

  const totalXp = Array.from(totals.values()).reduce((sum, t) => sum + t.xp, 0);
  const totalCount = Array.from(totals.values()).reduce((sum, t) => sum + t.count, 0);

  const slices = ACTIVITY_TYPE_ORDER.filter((type) => (totals.get(type)?.xp ?? 0) > 0).map((type) => {
    const { xp, count } = totals.get(type)!;
    return {
      activityType: type,
      label: ACTIVITY_TYPE_LABELS[type],
      xp,
      count,
      percent: totalXp > 0 ? Math.round((xp / totalXp) * 100) : 0
    };
  });

  return { slices, totalXp, totalCount, windowStartIst };
}

export function buildActivityInsights(rows: ActivityAggregateRow[], todayIst: string): ActivityInsightsData {
  return { weekly: buildWeeklyXp(rows, todayIst), mix: buildXpMix(rows, todayIst) };
}
