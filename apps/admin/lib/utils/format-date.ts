/**
 * Deterministic date formatter for consistent SSR + client hydration output.
 *
 * Uses an explicit locale ("en-IN") and explicit format options so that
 * Node.js (server) and the browser always produce the same string regardless
 * of the host OS locale settings.
 *
 * Example output: "02 Oct 2026"
 */
const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/**
 * Format a date value to a deterministic, locale-stable string.
 *
 * @param date - A Date object, ISO string, or any value accepted by `new Date()`.
 * @returns Formatted string such as "02 Oct 2026", or an empty string for null/undefined.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return DATE_FORMATTER.format(d);
  } catch {
    return '';
  }
}
