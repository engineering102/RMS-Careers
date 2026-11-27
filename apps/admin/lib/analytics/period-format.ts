import { formatDate } from '@/lib/utils/format-date';
import type { PeriodKey } from './periods';

/** 'YYYY-MM-DD' IST day -> "02 Oct 2026". Noon IST keeps the formatter on the same calendar day. */
export function formatIstDay(day: string | null): string {
  return day ? formatDate(`${day}T12:00:00+05:30`) : '';
}

/** Query string for a period, as read by resolvePeriod() on the server. */
export function periodQuery(period: { key: PeriodKey; from: string; to: string }): string {
  const params = new URLSearchParams({ period: period.key });
  if (period.key === 'custom') {
    params.set('from', period.from);
    params.set('to', period.to);
  }
  return params.toString();
}
