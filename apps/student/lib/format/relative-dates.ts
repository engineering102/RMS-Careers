import { APP_TIME_ZONE, formatDate } from '@/lib/format/datetime';

/**
 * Calendar-day wording for deadlines and activity, counted in IST (the portal's time zone), so "Today" means the
 * student's today even when the server runs in UTC.
 */

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' of an instant, in IST. */
export function istDateKey(value: Date | string | number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

/** Whole calendar days from `from` to `to` (both 'YYYY-MM-DD'); negative when `to` is earlier. */
export function calendarDaysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export type DueTone = 'overdue' | 'soon' | 'later';

export interface DueLabel {
  /** Short, sentence case: "Overdue", "Today", "Tomorrow", "Thu 13 Nov", "29 Nov". */
  text: string;
  tone: DueTone;
}

/**
 * When something is due, relative to now. Past the due instant is "Overdue" even on the same day; today and
 * tomorrow are "soon"; within a week shows the weekday.
 */
export function dueLabel(dueAt: Date | string, now: Date = new Date()): DueLabel {
  const due = new Date(dueAt);
  if (due.getTime() < now.getTime()) return { text: 'Overdue', tone: 'overdue' };
  const days = calendarDaysBetween(istDateKey(now), istDateKey(due));
  if (days <= 0) return { text: 'Today', tone: 'soon' };
  if (days === 1) return { text: 'Tomorrow', tone: 'soon' };
  if (days < 7) return { text: formatDate(due, { weekday: 'short', day: 'numeric', month: 'short' }), tone: 'later' };
  return { text: formatDate(due, { day: 'numeric', month: 'short' }), tone: 'later' };
}

/** When an activity happened, from its IST date key: "Today", "Yesterday", "Monday", "3 Nov". */
export function activityDayLabel(activityDateIst: string, now: Date = new Date()): string {
  const days = calendarDaysBetween(activityDateIst, istDateKey(now));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(`${activityDateIst}T12:00:00+05:30`);
  if (days < 7) return formatDate(date, { weekday: 'long' });
  return formatDate(date, { day: 'numeric', month: 'short' });
}

/** "Good morning" / "Good afternoon" / "Good evening" for the current IST hour. */
export function greetingFor(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: APP_TIME_ZONE }).format(now));
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
