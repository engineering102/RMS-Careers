// Deterministic date/number formatting for the student portal.
//
// `Date#toLocaleDateString()` with no locale/time zone formats with whatever the runtime defaults to: the
// Cloudflare Worker (UTC, en-US) and the student's browser (IST, often en-IN/en-GB) produce different strings
// for the same instant ("9/11/2026" vs "11/9/2026", or even a different day across midnight UTC). In client
// components that mismatch also breaks React hydration. Every user-facing date and number goes through here so
// server and browser render the exact same text, in the platform's convention (en-IN, Asia/Kolkata).
//
// Client-safe: no server-only imports.

export const APP_LOCALE = 'en-IN';
export const APP_TIME_ZONE = 'Asia/Kolkata';

export type DateInput = Date | string | number;

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Date (optionally with time fields) in IST, e.g. "12 Oct 2026". Pass options to choose fields. */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS): string {
  return new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE }).format(toDate(value));
}

/** Time of day in IST, e.g. "07:30 am". */
export function formatTime(value: DateInput, options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS): string {
  return new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE }).format(toDate(value));
}

/** Grouped integer/decimal in the platform locale, e.g. 1,605. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(APP_LOCALE).format(value);
}
