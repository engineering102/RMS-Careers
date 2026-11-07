/**
 * Calendar maths for the student Live Lectures page (Teams-style day / week / month views). Pure: no database and
 * no clock of its own (callers pass `today` / `now`), so every rule is unit-tested.
 *
 * All dates are IST calendar dates ('YYYY-MM-DD') and all times are minutes after IST midnight, matching the
 * live-session model in `@rms/academic/live-sessions` (Asia/Kolkata only, weekly recurrence). Weeks start on Monday.
 */
import { isoWeekday, istInstant, validateSchedule, type LiveSchedule } from '@rms/academic/live-sessions';

export const CALENDAR_VIEWS = ['day', 'week', 'month'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export const DEFAULT_CALENDAR_VIEW: CalendarView = 'week';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTES_PER_DAY = 24 * 60;

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

// ---------------------------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------------------------

export function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Monday of the week that contains `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function firstOfMonth(year: number, month: number): string {
  // Normalise month overflow (0 → December of the previous year, 13 → January of the next).
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toISOString().slice(0, 10);
}

function lastOfMonth(date: string): string {
  const { year, month } = parts(date);
  return addDays(firstOfMonth(year, month + 1), -1);
}

/** e.g. "Mon" */
export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[isoWeekday(date) - 1];
}

/** e.g. "Wed, 4 Nov" */
export function formatShortDate(date: string): string {
  const { month, day } = parts(date);
  return `${weekdayShort(date)}, ${day} ${MONTHS_SHORT[month - 1]}`;
}

/** e.g. "Wednesday, 4 November 2026" */
export function formatLongDate(date: string): string {
  const { year, month, day } = parts(date);
  return `${WEEKDAYS_LONG[isoWeekday(date) - 1]}, ${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

export function dayOfMonth(date: string): number {
  return parts(date).day;
}

// ---------------------------------------------------------------------------------------------------------------
// View, range and navigation
// ---------------------------------------------------------------------------------------------------------------

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads `?view=` and `?date=` from the URL. Anything unknown or malformed falls back to the week of `today`, so a
 * hand-edited URL never errors.
 */
export function parseCalendarParams(
  params: { view?: SearchParamValue; date?: SearchParamValue },
  today: string
): { view: CalendarView; anchor: string } {
  const rawView = first(params.view);
  const view = (CALENDAR_VIEWS as readonly string[]).includes(rawView ?? '') ? (rawView as CalendarView) : DEFAULT_CALENDAR_VIEW;
  const rawDate = first(params.date);
  const anchor = rawDate && isCalendarDate(rawDate) && rawDate >= '2000-01-01' && rawDate <= '2100-12-31' ? rawDate : today;
  return { view, anchor };
}

/** The days a view shows: one day, the Mon–Sun week, or whole Mon–Sun weeks covering the month. */
export function visibleDays(view: CalendarView, anchor: string): string[] {
  let from: string;
  let to: string;
  if (view === 'day') {
    from = to = anchor;
  } else if (view === 'week') {
    from = startOfWeek(anchor);
    to = addDays(from, 6);
  } else {
    const { year, month } = parts(anchor);
    from = startOfWeek(firstOfMonth(year, month));
    to = addDays(startOfWeek(lastOfMonth(anchor)), 6);
  }
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** The anchor one step back (-1) or forward (+1). Month steps land on the 1st. */
export function shiftAnchor(view: CalendarView, anchor: string, step: 1 | -1): string {
  if (view === 'day') return addDays(anchor, step);
  if (view === 'week') return addDays(anchor, 7 * step);
  const { year, month } = parts(anchor);
  return firstOfMonth(year, month + step);
}

/** Toolbar title, e.g. "Wednesday, 4 November 2026", "2 – 8 November 2026", "30 November – 6 December 2026". */
export function rangeLabel(view: CalendarView, anchor: string): string {
  if (view === 'day') return formatLongDate(anchor);
  if (view === 'month') {
    const { year, month } = parts(anchor);
    return `${MONTHS_LONG[month - 1]} ${year}`;
  }
  const start = parts(startOfWeek(anchor));
  const end = parts(addDays(startOfWeek(anchor), 6));
  if (start.year !== end.year) {
    return `${start.day} ${MONTHS_LONG[start.month - 1]} ${start.year} – ${end.day} ${MONTHS_LONG[end.month - 1]} ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${start.day} ${MONTHS_LONG[start.month - 1]} – ${end.day} ${MONTHS_LONG[end.month - 1]} ${end.year}`;
  }
  return `${start.day} – ${end.day} ${MONTHS_LONG[end.month - 1]} ${end.year}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Occurrences
// ---------------------------------------------------------------------------------------------------------------

export interface LectureOccurrence {
  /** Stable per session and day: `${sessionId}:${date}`. */
  key: string;
  sessionId: string;
  /** IST calendar date. */
  date: string;
  /** Minutes after IST midnight. */
  startMinutes: number;
  /** Minutes after IST midnight; may pass 1440 for a session that runs past midnight. */
  endMinutes: number;
  /** ISO instants. */
  start: string;
  end: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Every occurrence of the given sessions on the given days, ordered by start time. Invalid schedules are skipped. */
export function expandOccurrences(
  sessions: ReadonlyArray<LiveSchedule & { id: string }>,
  days: readonly string[]
): LectureOccurrence[] {
  const out: LectureOccurrence[] = [];
  for (const session of sessions) {
    if (validateSchedule(session)) continue;
    const startMinutes = toMinutes(session.startTime);
    for (const date of days) {
      if (session.startsOn && date < session.startsOn) continue;
      if (session.endsOn && date > session.endsOn) continue;
      if (!session.recurrenceDays.includes(isoWeekday(date))) continue;
      const start = istInstant(date, session.startTime);
      const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
      out.push({
        key: `${session.id}:${date}`,
        sessionId: session.id,
        date,
        startMinutes,
        endMinutes: startMinutes + session.durationMinutes,
        start: start.toISOString(),
        end: end.toISOString()
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.sessionId.localeCompare(b.sessionId));
}

/**
 * Hours the time grid shows: 8 am – 9 pm, widened to fit every valid session so the grid does not jump between
 * weeks.
 */
export function gridHours(sessions: ReadonlyArray<LiveSchedule>): { startHour: number; endHour: number } {
  let startHour = 8;
  let endHour = 21;
  for (const s of sessions) {
    if (validateSchedule(s)) continue;
    const start = toMinutes(s.startTime);
    startHour = Math.min(startHour, Math.floor(start / 60));
    endHour = Math.max(endHour, Math.ceil(Math.min(MINUTES_PER_DAY, start + s.durationMinutes) / 60));
  }
  return { startHour, endHour };
}

export interface PositionedItem<T> {
  item: T;
  /** 0-based column inside its overlap group. */
  lane: number;
  /** Columns in its overlap group. */
  lanes: number;
}

/** Side-by-side placement of overlapping lectures within one day column (as Teams / Outlook do). */
export function layoutDay<T extends { startMinutes: number; endMinutes: number }>(items: readonly T[]): PositionedItem<T>[] {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);
  const result: PositionedItem<T>[] = [];
  let group: PositionedItem<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    for (const placed of group) placed.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.startMinutes >= groupEnd) {
      flush();
      groupEnd = item.endMinutes;
    } else {
      groupEnd = Math.max(groupEnd, item.endMinutes);
    }
    let lane = laneEnds.findIndex((end) => end <= item.startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMinutes);
    } else {
      laneEnds[lane] = item.endMinutes;
    }
    group.push({ item, lane, lanes: 0 });
  }
  flush();
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------------------------------------------

/** e.g. 1140 → "7:00 pm"; wraps past midnight. */
export function formatMinutes(minutes: number): string {
  const total = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** e.g. 19 → "7 pm" (time-grid gutter). */
export function formatHour(hour: number): string {
  const h = hour % 24;
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`;
}
