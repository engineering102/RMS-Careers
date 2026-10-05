export interface StudentStatsOverview {
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  dsaSolvedCount: number;
  lastActivityDateIst: string | null;
}

export type DeadlineContentType =
  | 'lecture'
  | 'notes'
  | 'dsa_sheet'
  | 'quiz'
  | 'project'
  | 'resource';

export interface StudentDeadlineItem {
  id: number;
  batchId: string;
  batchName: string;
  contentItemId: string;
  title: string;
  contentType: DeadlineContentType;
  weekNumber: number;
  dueAt: Date;
  isCompleted: boolean;
}

export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDay {
  date: string; // 'YYYY-MM-DD'
  formattedDate: string; // 'Oct 5, 2026'
  count: number;
  xp: number;
  intensity: HeatmapIntensity;
}

export interface StudentOverviewData {
  stats: StudentStatsOverview;
  deadlines: StudentDeadlineItem[];
  heatmap: {
    days: HeatmapDay[];
    totalActiveDays: number;
    totalPeriodXp: number;
    startDate: string;
    endDate: string;
  };
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getTodayDateIst(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(referenceDate);
}

/**
 * Generates an array of exactly 30 dates in YYYY-MM-DD format ending on reference date (in Asia/Kolkata).
 */
export function getLast30DaysIst(referenceDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const todayStr = formatter.format(referenceDate);
  const [y, m, d] = todayStr.split('-').map(Number);

  for (let i = 29; i >= 0; i--) {
    // 12:00:00 PM IST is 06:30 UTC, avoiding day-boundary jitter
    const targetUtc = new Date(Date.UTC(y, m - 1, d - i, 6, 30, 0));
    dates.push(formatter.format(targetUtc));
  }

  return dates;
}

/**
 * Formats a YYYY-MM-DD date into a readable string (e.g. "Oct 5, 2026").
 */
export function formatIstDateReadable(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Computes intensity level (0-4) based on activity XP and count.
 */
export function calculateHeatmapIntensity(xp: number, count: number): HeatmapIntensity {
  if (xp <= 0 && count <= 0) return 0;
  if (xp <= 25) return 1;
  if (xp <= 50) return 2;
  if (xp <= 100) return 3;
  return 4;
}
