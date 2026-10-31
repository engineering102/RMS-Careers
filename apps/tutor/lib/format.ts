import { formatIstDate } from '@rms/academic/tutor/indicators';
import { formatIstDateTime } from '@rms/academic/live-sessions';

export { formatIstDate, formatIstDateTime };

/** "today", "1 day", "12 days": how long something has been waiting. */
export function waitingFor(since: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  return days === 1 ? '1 day' : `${days} days`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture',
  notes: 'Notes',
  resource: 'Resource',
  quiz: 'Quiz',
  project: 'Project',
  dsa_sheet: 'DSA problem',
  external_test: 'External test'
};

export const QUIZ_TYPE_LABELS: Record<string, string> = {
  practice: 'Practice',
  formal: 'Formal'
};
