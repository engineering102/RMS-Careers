/**
 * Per-student activity metrics for a reporting period, and the risk flags derived from them.
 *
 * Pure functions over plain rows: the query layer (lib/db/queries/student-period-analytics.ts) fetches
 * the rows, this module does every calculation, so the admin screen and the CSV export always agree.
 *
 * Definitions (shown to admins and colleges, keep in sync with the UI copy):
 * - Active day: an IST day with at least one learning action attributed to this batch: a lecture
 *   completed, a DSA problem solved or a quiz completed. Project approvals and external-test imports are
 *   left out because their date is when staff acted, not when the student worked.
 * - Due item: a required curriculum item (lecture, quiz, project) whose due date has passed and falls
 *   on or before the end of the period. Whether it is done is judged as of now, not as of the period end.
 */
import { csvCell } from '@/lib/csv/escape';
import type { ResolvedPeriod } from './periods';

export type DueItemKind = 'lecture' | 'quiz' | 'project';

export interface StudentIdentityRow {
  studentId: number;
  fullName: string;
  email: string;
  collegeRollNumber: string | null;
  branch: string | null;
  lastLoginAt: Date | null;
}

/** Batch-attributed activity aggregates for one student. */
export interface StudentActivityAggregate {
  studentId: number;
  activeDays: number;
  prevActiveDays: number;
  lecturesCompleted: number;
  dsaSolved: number;
  xp: number;
  prevXp: number;
  lastActiveDate: string | null;
}

/** A submitted quiz attempt inside the period. */
export interface PeriodQuizAttemptRow {
  studentId: number;
  score: number;
  maxScore: number;
  isPassed: boolean;
}

/** A project submission that was submitted, or approved, inside the period. */
export interface PeriodSubmissionRow {
  studentId: number;
  submittedInPeriod: boolean;
  approvedInPeriod: boolean;
}

export interface DueItem {
  kind: DueItemKind;
  /** contentItemId for lectures, quizId for quizzes, assignmentId for projects. */
  refId: string;
  title: string;
  weekNumber: number;
  dueAt: Date;
}

export type RiskFlagCode =
  | 'inactive'
  | 'low_engagement'
  | 'sharp_drop'
  | 'falling_behind'
  | 'overdue_quiz'
  | 'overdue_project'
  | 'failing_quizzes';

export interface RiskFlag {
  code: RiskFlagCode;
  severity: 'high' | 'medium';
  label: string;
  detail: string;
}

export type Trend = 'up' | 'down' | 'flat';

export interface StudentPeriodRow extends StudentIdentityRow {
  activeDays: number;
  prevActiveDays: number;
  /** Active days as a share of the period's days, 0-100. */
  engagementPercent: number;
  trend: Trend;
  lecturesCompleted: number;
  dsaSolved: number;
  xp: number;
  prevXp: number;
  quizzesSubmitted: number;
  quizzesPassed: number;
  quizAveragePercent: number | null;
  projectsSubmitted: number;
  projectsApproved: number;
  dueItemsTotal: number;
  dueItemsDone: number;
  overdueItems: Array<Pick<DueItem, 'kind' | 'title' | 'weekNumber' | 'dueAt'>>;
  lastActiveDate: string | null;
  flags: RiskFlag[];
}

export interface PeriodSummary {
  enrolledStudents: number;
  activeStudents: number;
  prevActiveStudents: number;
  /** Students with at least one active day, as a share of enrolled, 0-100. */
  engagementRate: number;
  averageActiveDays: number;
  lecturesCompleted: number;
  dsaSolved: number;
  xp: number;
  quizzesSubmitted: number;
  quizAveragePercent: number | null;
  projectsSubmitted: number;
  projectsApproved: number;
  studentsFlaggedHigh: number;
  studentsFlagged: number;
}

export interface StudentPeriodReport {
  summary: PeriodSummary;
  rows: StudentPeriodRow[];
}

export interface BuildStudentPeriodInput {
  period: ResolvedPeriod;
  now: Date;
  students: StudentIdentityRow[];
  activity: StudentActivityAggregate[];
  quizAttempts: PeriodQuizAttemptRow[];
  submissions: PeriodSubmissionRow[];
  dueItems: DueItem[];
  /** Keys from completionKey() for every due item a student has completed. */
  completions: Set<string>;
}

/** Periods shorter than this are too short to call a student inactive or disengaged. */
export const MIN_DAYS_FOR_ENGAGEMENT_FLAGS = 7;
export const LOW_ENGAGEMENT_SHARE = 0.25;
export const FALLING_BEHIND_SHARE = 0.5;
export const FALLING_BEHIND_MIN_LECTURES = 2;
export const FAILING_QUIZZES_MIN_ATTEMPTS = 2;

export function completionKey(studentId: number, kind: DueItemKind, refId: string): string {
  return `${studentId}:${kind}:${refId}`;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function computeRiskFlags(
  row: Omit<StudentPeriodRow, 'flags'>,
  periodDays: number
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const longEnough = periodDays >= MIN_DAYS_FOR_ENGAGEMENT_FLAGS;

  if (longEnough && row.activeDays === 0) {
    flags.push({
      code: 'inactive',
      severity: 'high',
      label: 'Inactive',
      detail: `No learning activity in ${periodDays} days.`
    });
  } else if (longEnough && row.activeDays / periodDays < LOW_ENGAGEMENT_SHARE) {
    flags.push({
      code: 'low_engagement',
      severity: 'medium',
      label: 'Low engagement',
      detail: `Active on ${row.activeDays} of ${periodDays} days.`
    });
  }

  if (row.activeDays > 0 && row.prevActiveDays >= 2 && row.activeDays * 2 <= row.prevActiveDays) {
    flags.push({
      code: 'sharp_drop',
      severity: 'medium',
      label: 'Sharp drop',
      detail: `Active days fell from ${row.prevActiveDays} to ${row.activeDays} against the previous period.`
    });
  }

  const overdueQuizzes = row.overdueItems.filter((i) => i.kind === 'quiz');
  const overdueProjects = row.overdueItems.filter((i) => i.kind === 'project');

  if (overdueQuizzes.length > 0) {
    flags.push({
      code: 'overdue_quiz',
      severity: 'high',
      label: overdueQuizzes.length === 1 ? 'Overdue quiz' : `${overdueQuizzes.length} overdue quizzes`,
      detail: overdueQuizzes.map((q) => q.title).join(', ')
    });
  }
  if (overdueProjects.length > 0) {
    flags.push({
      code: 'overdue_project',
      severity: 'high',
      label:
        overdueProjects.length === 1 ? 'Overdue project' : `${overdueProjects.length} overdue projects`,
      detail: overdueProjects.map((p) => p.title).join(', ')
    });
  }
  // falling_behind needs lecture totals, so buildStudentPeriodReport adds it.

  if (
    row.quizzesSubmitted >= FAILING_QUIZZES_MIN_ATTEMPTS &&
    row.quizzesPassed * 2 < row.quizzesSubmitted
  ) {
    flags.push({
      code: 'failing_quizzes',
      severity: 'medium',
      label: 'Failing quizzes',
      detail: `Passed ${row.quizzesPassed} of ${row.quizzesSubmitted} quiz attempts.`
    });
  }

  return flags;
}

function fallingBehindFlag(lecturesDue: number, lecturesDone: number): RiskFlag | null {
  if (lecturesDue < FALLING_BEHIND_MIN_LECTURES) return null;
  if (lecturesDone / lecturesDue >= FALLING_BEHIND_SHARE) return null;
  return {
    code: 'falling_behind',
    severity: 'high',
    label: 'Falling behind',
    detail: `Completed ${lecturesDone} of ${lecturesDue} lectures due so far.`
  };
}

const SEVERITY_RANK = { high: 0, medium: 1 } as const;

function sortRows(a: StudentPeriodRow, b: StudentPeriodRow): number {
  const rank = (r: StudentPeriodRow) =>
    r.flags.length === 0 ? 2 : Math.min(...r.flags.map((f) => SEVERITY_RANK[f.severity]));
  return (
    rank(a) - rank(b) ||
    b.flags.length - a.flags.length ||
    a.activeDays - b.activeDays ||
    a.fullName.localeCompare(b.fullName)
  );
}

export function buildStudentPeriodReport(input: BuildStudentPeriodInput): StudentPeriodReport {
  const { period, now, students, activity, quizAttempts, submissions, completions } = input;

  // Only items whose deadline has passed and falls on or before the period end.
  const cutoff = Math.min(now.getTime(), period.endUtcExclusive.getTime());
  const dueItems = input.dueItems.filter((i) => i.dueAt.getTime() < cutoff);

  const activityByStudent = new Map(activity.map((a) => [a.studentId, a]));
  const attemptsByStudent = new Map<number, PeriodQuizAttemptRow[]>();
  for (const a of quizAttempts) {
    const list = attemptsByStudent.get(a.studentId) ?? [];
    list.push(a);
    attemptsByStudent.set(a.studentId, list);
  }
  const submissionsByStudent = new Map<number, PeriodSubmissionRow[]>();
  for (const s of submissions) {
    const list = submissionsByStudent.get(s.studentId) ?? [];
    list.push(s);
    submissionsByStudent.set(s.studentId, list);
  }

  const rows: StudentPeriodRow[] = students.map((student) => {
    const act = activityByStudent.get(student.studentId);
    const attempts = attemptsByStudent.get(student.studentId) ?? [];
    const subs = submissionsByStudent.get(student.studentId) ?? [];

    const activeDays = act?.activeDays ?? 0;
    const prevActiveDays = act?.prevActiveDays ?? 0;

    let pctSum = 0;
    let pctCount = 0;
    for (const a of attempts) {
      if (a.maxScore > 0) {
        pctSum += (a.score / a.maxScore) * 100;
        pctCount++;
      }
    }

    let dueDone = 0;
    let lecturesDue = 0;
    let lecturesDone = 0;
    const overdueItems: StudentPeriodRow['overdueItems'] = [];
    for (const item of dueItems) {
      const done = completions.has(completionKey(student.studentId, item.kind, item.refId));
      if (item.kind === 'lecture') {
        lecturesDue++;
        if (done) lecturesDone++;
      }
      if (done) dueDone++;
      else
        overdueItems.push({
          kind: item.kind,
          title: item.title,
          weekNumber: item.weekNumber,
          dueAt: item.dueAt
        });
    }

    const base: Omit<StudentPeriodRow, 'flags'> = {
      ...student,
      activeDays,
      prevActiveDays,
      engagementPercent: pct(activeDays, period.days),
      trend: activeDays > prevActiveDays ? 'up' : activeDays < prevActiveDays ? 'down' : 'flat',
      lecturesCompleted: act?.lecturesCompleted ?? 0,
      dsaSolved: act?.dsaSolved ?? 0,
      xp: act?.xp ?? 0,
      prevXp: act?.prevXp ?? 0,
      quizzesSubmitted: attempts.length,
      quizzesPassed: attempts.filter((a) => a.isPassed).length,
      quizAveragePercent: pctCount > 0 ? Math.round(pctSum / pctCount) : null,
      projectsSubmitted: subs.filter((s) => s.submittedInPeriod).length,
      projectsApproved: subs.filter((s) => s.approvedInPeriod).length,
      dueItemsTotal: dueItems.length,
      dueItemsDone: dueDone,
      overdueItems,
      lastActiveDate: act?.lastActiveDate ?? null
    };

    const flags = computeRiskFlags(base, period.days);
    const behind = fallingBehindFlag(lecturesDue, lecturesDone);
    if (behind) flags.push(behind);
    flags.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

    return { ...base, flags };
  });

  rows.sort(sortRows);

  const enrolled = rows.length;
  const activeStudents = rows.filter((r) => r.activeDays > 0).length;
  let quizPctSum = 0;
  let quizPctCount = 0;
  for (const a of quizAttempts) {
    if (a.maxScore > 0) {
      quizPctSum += (a.score / a.maxScore) * 100;
      quizPctCount++;
    }
  }
  const sum = (pick: (r: StudentPeriodRow) => number) => rows.reduce((t, r) => t + pick(r), 0);

  return {
    rows,
    summary: {
      enrolledStudents: enrolled,
      activeStudents,
      prevActiveStudents: rows.filter((r) => r.prevActiveDays > 0).length,
      engagementRate: pct(activeStudents, enrolled),
      averageActiveDays: enrolled > 0 ? Math.round((sum((r) => r.activeDays) / enrolled) * 10) / 10 : 0,
      lecturesCompleted: sum((r) => r.lecturesCompleted),
      dsaSolved: sum((r) => r.dsaSolved),
      xp: sum((r) => r.xp),
      quizzesSubmitted: sum((r) => r.quizzesSubmitted),
      quizAveragePercent: quizPctCount > 0 ? Math.round(quizPctSum / quizPctCount) : null,
      projectsSubmitted: sum((r) => r.projectsSubmitted),
      projectsApproved: sum((r) => r.projectsApproved),
      studentsFlaggedHigh: rows.filter((r) => r.flags.some((f) => f.severity === 'high')).length,
      studentsFlagged: rows.filter((r) => r.flags.length > 0).length
    }
  };
}

const STUDENT_CSV_HEADER = [
  'Student Name',
  'Roll Number',
  'Email',
  'Branch',
  'Active Days',
  'Active Days (Previous Period)',
  'Engagement %',
  'Lectures Completed',
  'DSA Problems Solved',
  'Quizzes Submitted',
  'Quizzes Passed',
  'Quiz Average %',
  'Projects Submitted',
  'Projects Approved',
  'Due Items Done',
  'Due Items Total',
  'XP Earned',
  'Last Active (IST)',
  'Last Sign-in',
  'Flags'
];

/** CSV of the per-student period report. Every cell goes through csvCell (formula-safe). */
export function studentPeriodReportCsv(
  report: StudentPeriodReport,
  meta: { batchName: string; collegeName: string | null; period: ResolvedPeriod }
): string {
  const cell = (v: unknown) => csvCell(v, 'minimal');
  const lines: string[] = [];
  lines.push([cell('Batch'), cell(meta.batchName)].join(','));
  if (meta.collegeName) lines.push([cell('College'), cell(meta.collegeName)].join(','));
  lines.push(
    [cell('Period'), cell(`${meta.period.label}: ${meta.period.from} to ${meta.period.to} (IST)`)].join(',')
  );
  lines.push(
    [
      cell('Active day'),
      cell('A day with a lecture completed, a DSA problem solved or a quiz completed in this batch')
    ].join(',')
  );
  lines.push('');
  lines.push(STUDENT_CSV_HEADER.map(cell).join(','));
  for (const r of report.rows) {
    lines.push(
      [
        r.fullName,
        r.collegeRollNumber,
        r.email,
        r.branch,
        r.activeDays,
        r.prevActiveDays,
        r.engagementPercent,
        r.lecturesCompleted,
        r.dsaSolved,
        r.quizzesSubmitted,
        r.quizzesPassed,
        r.quizAveragePercent,
        r.projectsSubmitted,
        r.projectsApproved,
        r.dueItemsDone,
        r.dueItemsTotal,
        r.xp,
        r.lastActiveDate,
        r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
        r.flags.map((f) => `${f.label}: ${f.detail}`).join(' | ')
      ]
        .map(cell)
        .join(',')
    );
  }
  return lines.join('\n');
}
