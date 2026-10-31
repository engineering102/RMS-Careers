/**
 * Live-session rules shared by admin, student and tutor (tutor plan §6.2, D-4). Pure: no database, no clock of its
 * own (callers pass `now`), so every rule is unit-tested.
 *
 * Model: weekly recurrence on ISO weekdays (1 = Monday .. 7 = Sunday) at `start_time` (HH:MM) for
 * `duration_minutes`, optionally limited to [starts_on, ends_on]. A one-off session is starts_on = ends_on with that
 * date's weekday. Time zone is Asia/Kolkata only in v1 (fixed UTC+05:30, no daylight saving).
 * Deliberately NOT modelled: cancelling or moving a single occurrence, host/start links, non-weekly patterns,
 * "live now" status or attendance.
 */

export const LIVE_SESSION_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 480;
export const MAX_MEETING_URL_LENGTH = 2048;

export const WEEKDAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

export interface LiveSchedule {
  recurrenceDays: readonly number[];
  /** 'HH:MM' in Asia/Kolkata. */
  startTime: string;
  durationMinutes: number;
  /** 'YYYY-MM-DD' or null. */
  startsOn: string | null;
  endsOn: string | null;
}

// ---------------------------------------------------------------------------------------------------------------
// Zoom meeting URL
// ---------------------------------------------------------------------------------------------------------------

export type MeetingUrlResult = { ok: true; url: string } | { ok: false; reason: string };

const ZOOM_PATH = /^\/(j\/\d{9,11}|w\/\d{9,11}|my\/[A-Za-z0-9._-]{1,64})\/?$/;

/**
 * Accepts only https Zoom join links: zoom.us or a *.zoom.us subdomain, path /j/<9-11 digits>, /w/<digits> or
 * /my/<personal link>, no credentials, at most 2048 characters. Query parameters (e.g. the `pwd` passcode) are
 * kept. Returns the URL normalised by the URL parser. Never log the result: it may contain a passcode.
 */
export function parseZoomMeetingUrl(raw: string): MeetingUrlResult {
  const input = raw?.trim() ?? '';
  if (!input) return { ok: false, reason: 'Enter the Zoom meeting link.' };
  if (input.length > MAX_MEETING_URL_LENGTH) return { ok: false, reason: 'The meeting link is too long.' };
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'Enter a complete link starting with https://' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'The meeting link must start with https://' };
  if (url.username || url.password) return { ok: false, reason: 'The meeting link must not contain a username or password.' };
  const host = url.hostname.toLowerCase();
  if (host !== 'zoom.us' && !host.endsWith('.zoom.us')) return { ok: false, reason: 'Only Zoom meeting links (zoom.us) are supported.' };
  if (url.port) return { ok: false, reason: 'The meeting link must not contain a port.' };
  if (!ZOOM_PATH.test(url.pathname)) {
    return { ok: false, reason: 'Use a Zoom join link such as https://zoom.us/j/1234567890' };
  }
  return { ok: true, url: url.toString() };
}

/** Display form that hides the meeting id and passcode, e.g. "zoom.us/j/••••7890". */
export function maskMeetingUrl(meetingUrl: string): string {
  try {
    const url = new URL(meetingUrl);
    const [, kind = '', id = ''] = url.pathname.split('/');
    return `${url.hostname}/${kind}/••••${id.slice(-4)}`;
  } catch {
    return '••••';
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------------------------------------------

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** IST calendar date ('YYYY-MM-DD') of an instant. */
export function istDateOf(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday .. 7 = Sunday) of an IST calendar date. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** The instant an IST date + 'HH:MM' denotes. */
export function istInstant(date: string, time: string): Date {
  return new Date(new Date(`${date}T${time}:00Z`).getTime() - IST_OFFSET_MS);
}

export type ScheduleError =
  | 'days_required'
  | 'invalid_day'
  | 'invalid_time'
  | 'invalid_duration'
  | 'invalid_date'
  | 'window_reversed'
  | 'no_occurrence_in_window';

/** Validates a schedule the way the database CHECK constraints do, plus "the window contains a session day". */
export function validateSchedule(s: LiveSchedule): ScheduleError | null {
  if (!s.recurrenceDays.length || s.recurrenceDays.length > 7) return 'days_required';
  if (new Set(s.recurrenceDays).size !== s.recurrenceDays.length) return 'invalid_day';
  if (s.recurrenceDays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return 'invalid_day';
  if (!TIME.test(s.startTime)) return 'invalid_time';
  if (!Number.isInteger(s.durationMinutes) || s.durationMinutes < MIN_DURATION_MINUTES || s.durationMinutes > MAX_DURATION_MINUTES) {
    return 'invalid_duration';
  }
  for (const d of [s.startsOn, s.endsOn]) {
    if (d !== null && (!DATE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`)) || istDateOf(new Date(`${d}T12:00:00Z`)) !== d)) {
      return 'invalid_date';
    }
  }
  if (s.startsOn && s.endsOn) {
    if (s.endsOn < s.startsOn) return 'window_reversed';
    // A window shorter than a week must still contain at least one selected weekday.
    let any = false;
    for (let d = s.startsOn, i = 0; d <= s.endsOn && i < 7; d = addDays(d, 1), i++) {
      if (s.recurrenceDays.includes(isoWeekday(d))) any = true;
    }
    if (!any) return 'no_occurrence_in_window';
  }
  return null;
}

/**
 * The current or next occurrence: the first session whose end is after `now`, within the window. A session in
 * progress is returned (so its Join link stays relevant), but no "live now" status is derived from it.
 * Returns null when the window has ended or the schedule is invalid.
 */
export function nextOccurrence(s: LiveSchedule, now: Date): { start: Date; end: Date } | null {
  if (validateSchedule(s)) return null;
  const today = istDateOf(now);
  let date = s.startsOn && s.startsOn > today ? s.startsOn : today;
  for (let i = 0; i < 8; i++, date = addDays(date, 1)) {
    if (s.endsOn && date > s.endsOn) return null;
    if (!s.recurrenceDays.includes(isoWeekday(date))) continue;
    const start = istInstant(date, s.startTime);
    const end = new Date(start.getTime() + s.durationMinutes * 60 * 1000);
    if (end > now) return { start, end };
  }
  return null;
}

/** True once the last possible session of a windowed schedule is over. */
export function hasEnded(s: LiveSchedule, now: Date): boolean {
  return s.endsOn !== null && nextOccurrence(s, now) === null;
}

function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function endClock(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return formatClock(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
}

/** e.g. "Every Mon, Wed, Fri · 7:00 pm – 8:30 pm IST"; "Every day · …"; one-off: "Once · Wed · 7:00 pm – 8:30 pm IST". */
export function describeSchedule(s: LiveSchedule): string {
  const sorted = [...s.recurrenceDays].sort((a, b) => a - b);
  const days = sorted.map((d) => WEEKDAY_LABELS[d]).join(', ');
  const time = `${formatClock(s.startTime)} – ${endClock(s.startTime, s.durationMinutes)} IST`;
  if (s.startsOn !== null && s.startsOn === s.endsOn) return `Once · ${days} · ${time}`;
  if (sorted.length === 7) return `Every day · ${time}`;
  return `Every ${days} · ${time}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** e.g. "Wed, 4 Nov 2026, 7:00 pm IST". Built by hand so it is identical on every runtime (no ICU differences). */
export function formatIstDateTime(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS).toISOString();
  const date = shifted.slice(0, 10);
  const [year, month, day] = date.split('-').map(Number);
  return `${WEEKDAY_LABELS[isoWeekday(date)]}, ${day} ${MONTHS[month - 1]} ${year}, ${formatClock(shifted.slice(11, 16))} IST`;
}
