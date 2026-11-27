/**
 * Reporting periods for student analytics, resolved in India Standard Time.
 *
 * Every period is a whole number of IST calendar days, inclusive at both ends, expressed two ways:
 * - `from` / `to` as 'YYYY-MM-DD' IST dates, which match `activities.activity_date_ist`;
 * - `startUtc` / `endUtcExclusive`, the UTC instants for comparing timestamp columns.
 *
 * Periods never extend past today: "This week" on a Wednesday covers Monday to Wednesday. The previous
 * period is the window of the same length that ends the day before `from`, so the two are comparable.
 */

export const PERIOD_KEYS = [
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'last_30_days',
  'custom'
] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_week: 'This week',
  last_week: 'Last week',
  this_month: 'This month',
  last_month: 'Last month',
  last_30_days: 'Last 30 days',
  custom: 'Custom range'
};

export const MAX_PERIOD_DAYS = 366;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateWindow {
  /** First IST day, inclusive. */
  from: string;
  /** Last IST day, inclusive. */
  to: string;
  days: number;
  startUtc: Date;
  endUtcExclusive: Date;
}

export interface ResolvedPeriod extends DateWindow {
  key: PeriodKey;
  label: string;
  previous: DateWindow;
}

/** Days since the epoch for an IST calendar date string. */
function toDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function istToday(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  return fromDayNumber(toDayNumber(value)) === value;
}

/** Builds a window from two inclusive IST dates. */
export function makeWindow(from: string, to: string): DateWindow {
  const fromDay = toDayNumber(from);
  const toDay = toDayNumber(to);
  return {
    from,
    to,
    days: toDay - fromDay + 1,
    startUtc: new Date(fromDay * DAY_MS - IST_OFFSET_MS),
    endUtcExclusive: new Date((toDay + 1) * DAY_MS - IST_OFFSET_MS)
  };
}

export function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === 'string' && (PERIOD_KEYS as readonly string[]).includes(value);
}

/**
 * Resolves a period key to concrete windows. A custom range with missing or invalid dates, a reversed
 * range, or one longer than MAX_PERIOD_DAYS falls back to 'this_week'. Custom ranges ending after today
 * are clamped to today.
 */
export function resolvePeriod(
  key: PeriodKey,
  now: Date,
  custom?: { from?: string | null; to?: string | null }
): ResolvedPeriod {
  const today = istToday(now);
  const todayDay = toDayNumber(today);
  let fromDay: number;
  let toDay: number;
  let resolvedKey: PeriodKey = key;

  // ISO weekday of today, 1 = Monday .. 7 = Sunday.
  const weekday = ((new Date(todayDay * DAY_MS).getUTCDay() + 6) % 7) + 1;
  const [y, m] = today.split('-').map(Number);

  switch (key) {
    case 'last_week':
      fromDay = todayDay - (weekday - 1) - 7;
      toDay = fromDay + 6;
      break;
    case 'this_month':
      fromDay = Math.floor(Date.UTC(y, m - 1, 1) / DAY_MS);
      toDay = todayDay;
      break;
    case 'last_month':
      fromDay = Math.floor(Date.UTC(y, m - 2, 1) / DAY_MS);
      toDay = Math.floor(Date.UTC(y, m - 1, 1) / DAY_MS) - 1;
      break;
    case 'last_30_days':
      fromDay = todayDay - 29;
      toDay = todayDay;
      break;
    case 'custom': {
      const from = custom?.from;
      const to = custom?.to;
      if (isValidIsoDate(from) && isValidIsoDate(to)) {
        const f = toDayNumber(from);
        const t = Math.min(toDayNumber(to), todayDay);
        if (f <= t && t - f + 1 <= MAX_PERIOD_DAYS) {
          fromDay = f;
          toDay = t;
          break;
        }
      }
      resolvedKey = 'this_week';
      fromDay = todayDay - (weekday - 1);
      toDay = todayDay;
      break;
    }
    case 'this_week':
    default:
      resolvedKey = 'this_week';
      fromDay = todayDay - (weekday - 1);
      toDay = todayDay;
  }

  const current = makeWindow(fromDayNumber(fromDay), fromDayNumber(toDay));
  const length = toDay - fromDay + 1;
  const previous = makeWindow(fromDayNumber(fromDay - length), fromDayNumber(fromDay - 1));

  return { ...current, key: resolvedKey, label: PERIOD_LABELS[resolvedKey], previous };
}
