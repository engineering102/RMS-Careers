/**
 * Pure helpers for the student report card and the college rollup. The query layer
 * (lib/db/queries/student-report-card.ts, college-analytics.ts) fetches rows; everything that turns
 * them into numbers lives here so it can be unit-tested.
 */
import { csvCell } from '@/lib/csv/escape';
import type { DateWindow, ResolvedPeriod } from './periods';
import {
  completionKey,
  type DueItemKind,
  type PeriodSummary,
  type StudentPeriodReport,
  type StudentPeriodRow
} from './student-period-metrics';

// ---------------------------------------------------------------------------------------------
// Activity over time
// ---------------------------------------------------------------------------------------------

export interface DailyActivityRow {
  /** IST day, 'YYYY-MM-DD'. */
  date: string;
  activityType: string;
  count: number;
}

export interface ActivityBucket {
  from: string;
  to: string;
  lectures: number;
  dsa: number;
  quizzes: number;
  activeDays: number;
}

/** Up to this many days, buckets are single days; longer periods are grouped by Monday-start week. */
export const DAILY_BUCKET_MAX_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const LEARNING_TYPES = new Set(['lecture_completed', 'dsa_solved', 'quiz_completed']);

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}
function isoFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function bucketActivity(rows: DailyActivityRow[], period: DateWindow): ActivityBucket[] {
  const start = dayNumber(period.from);
  const end = dayNumber(period.to);
  const daily = period.days <= DAILY_BUCKET_MAX_DAYS;

  const buckets: ActivityBucket[] = [];
  const indexOfDay = new Map<number, number>();
  let cursor = start;
  while (cursor <= end) {
    // ISO weekday 1..7 of cursor; weekly buckets end on Sunday or the period end.
    const weekday = ((new Date(cursor * DAY_MS).getUTCDay() + 6) % 7) + 1;
    const bucketEnd = daily ? cursor : Math.min(end, cursor + (7 - weekday));
    for (let d = cursor; d <= bucketEnd; d++) indexOfDay.set(d, buckets.length);
    buckets.push({ from: isoFromDay(cursor), to: isoFromDay(bucketEnd), lectures: 0, dsa: 0, quizzes: 0, activeDays: 0 });
    cursor = bucketEnd + 1;
  }

  const activeDaysSeen = new Set<number>();
  for (const row of rows) {
    const day = dayNumber(row.date);
    const idx = indexOfDay.get(day);
    if (idx === undefined) continue;
    const bucket = buckets[idx];
    if (row.activityType === 'lecture_completed') bucket.lectures += row.count;
    else if (row.activityType === 'dsa_solved') bucket.dsa += row.count;
    else if (row.activityType === 'quiz_completed') bucket.quizzes += row.count;
    if (LEARNING_TYPES.has(row.activityType) && row.count > 0 && !activeDaysSeen.has(day)) {
      activeDaysSeen.add(day);
      bucket.activeDays++;
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------------------------
// Curriculum progress by week
// ---------------------------------------------------------------------------------------------

export interface CurriculumItem {
  kind: DueItemKind;
  refId: string;
  title: string;
  weekNumber: number;
  dueAt: Date | null;
}

export interface WeekProgress {
  weekNumber: number;
  total: number;
  done: number;
  byKind: Record<DueItemKind, { total: number; done: number }>;
  pendingTitles: string[];
}

export function buildWeekProgress(
  studentId: number,
  items: CurriculumItem[],
  completions: Set<string>
): WeekProgress[] {
  const weeks = new Map<number, WeekProgress>();
  for (const item of items) {
    let week = weeks.get(item.weekNumber);
    if (!week) {
      week = {
        weekNumber: item.weekNumber,
        total: 0,
        done: 0,
        byKind: { lecture: { total: 0, done: 0 }, quiz: { total: 0, done: 0 }, project: { total: 0, done: 0 } },
        pendingTitles: []
      };
      weeks.set(item.weekNumber, week);
    }
    const done = completions.has(completionKey(studentId, item.kind, item.refId));
    week.total++;
    week.byKind[item.kind].total++;
    if (done) {
      week.done++;
      week.byKind[item.kind].done++;
    } else {
      week.pendingTitles.push(item.title);
    }
  }
  return [...weeks.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}

// ---------------------------------------------------------------------------------------------
// Student vs batch comparison
// ---------------------------------------------------------------------------------------------

export interface BatchAverages {
  activeDays: number;
  lecturesCompleted: number;
  dsaSolved: number;
  quizAveragePercent: number | null;
  xp: number;
}

export function batchAverages(report: StudentPeriodReport): BatchAverages {
  const n = report.rows.length;
  const avg = (pick: (r: StudentPeriodRow) => number) =>
    n > 0 ? Math.round((report.rows.reduce((t, r) => t + pick(r), 0) / n) * 10) / 10 : 0;
  return {
    activeDays: avg((r) => r.activeDays),
    lecturesCompleted: avg((r) => r.lecturesCompleted),
    dsaSolved: avg((r) => r.dsaSolved),
    quizAveragePercent: report.summary.quizAveragePercent,
    xp: avg((r) => r.xp)
  };
}

// ---------------------------------------------------------------------------------------------
// College rollup
// ---------------------------------------------------------------------------------------------

export interface CollegeBatchReport {
  batch: { id: string; name: string; status: string; programName: string | null };
  summary: PeriodSummary;
  rows: StudentPeriodRow[];
}

export interface CollegeTotals {
  batches: number;
  /** Distinct students across batches (a student in two batches counts once). */
  students: number;
  activeStudents: number;
  engagementRate: number;
  lecturesCompleted: number;
  dsaSolved: number;
  quizzesSubmitted: number;
  studentsFlagged: number;
  studentsFlaggedHigh: number;
}

export function collegeTotals(batches: CollegeBatchReport[]): CollegeTotals {
  const all = new Set<number>();
  const active = new Set<number>();
  const flagged = new Set<number>();
  const flaggedHigh = new Set<number>();
  let lectures = 0;
  let dsa = 0;
  let quizzes = 0;
  for (const b of batches) {
    lectures += b.summary.lecturesCompleted;
    dsa += b.summary.dsaSolved;
    quizzes += b.summary.quizzesSubmitted;
    for (const r of b.rows) {
      all.add(r.studentId);
      if (r.activeDays > 0) active.add(r.studentId);
      if (r.flags.length > 0) flagged.add(r.studentId);
      if (r.flags.some((f) => f.severity === 'high')) flaggedHigh.add(r.studentId);
    }
  }
  return {
    batches: batches.length,
    students: all.size,
    activeStudents: active.size,
    engagementRate: all.size > 0 ? Math.round((active.size / all.size) * 100) : 0,
    lecturesCompleted: lectures,
    dsaSolved: dsa,
    quizzesSubmitted: quizzes,
    studentsFlagged: flagged.size,
    studentsFlaggedHigh: flaggedHigh.size
  };
}

export interface AttentionEntry {
  batchId: string;
  batchName: string;
  row: StudentPeriodRow;
}

/** Flagged students across all batches, high severity first, then by number of flags. */
export function collegeAttentionList(batches: CollegeBatchReport[]): AttentionEntry[] {
  const entries: AttentionEntry[] = [];
  for (const b of batches) {
    for (const row of b.rows) {
      if (row.flags.length > 0) entries.push({ batchId: b.batch.id, batchName: b.batch.name, row });
    }
  }
  const high = (e: AttentionEntry) => (e.row.flags.some((f) => f.severity === 'high') ? 0 : 1);
  return entries.sort(
    (a, b) =>
      high(a) - high(b) ||
      b.row.flags.length - a.row.flags.length ||
      a.row.fullName.localeCompare(b.row.fullName)
  );
}

export function collegeReportCsv(
  batches: CollegeBatchReport[],
  meta: { collegeName: string; period: ResolvedPeriod }
): string {
  const cell = (v: unknown) => csvCell(v, 'minimal');
  const lines = [
    [cell('College'), cell(meta.collegeName)].join(','),
    [cell('Period'), cell(`${meta.period.label}: ${meta.period.from} to ${meta.period.to} (IST)`)].join(','),
    [
      cell('Active day'),
      cell('A day with a lecture completed, a DSA problem solved or a quiz completed in the batch')
    ].join(','),
    '',
    [
      'Batch',
      'Student Name',
      'Roll Number',
      'Email',
      'Branch',
      'Active Days',
      'Period Days',
      'Lectures Completed',
      'DSA Problems Solved',
      'Quizzes Submitted',
      'Quiz Average %',
      'Projects Submitted',
      'Due Items Done',
      'Due Items Total',
      'Last Active (IST)',
      'Flags'
    ]
      .map(cell)
      .join(',')
  ];
  for (const b of batches) {
    for (const r of b.rows) {
      lines.push(
        [
          b.batch.name,
          r.fullName,
          r.collegeRollNumber,
          r.email,
          r.branch,
          r.activeDays,
          meta.period.days,
          r.lecturesCompleted,
          r.dsaSolved,
          r.quizzesSubmitted,
          r.quizAveragePercent,
          r.projectsSubmitted,
          r.dueItemsDone,
          r.dueItemsTotal,
          r.lastActiveDate,
          r.flags.map((f) => `${f.label}: ${f.detail}`).join(' | ')
        ]
          .map(cell)
          .join(',')
      );
    }
  }
  return lines.join('\n');
}
