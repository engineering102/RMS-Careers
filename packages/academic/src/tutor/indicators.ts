/**
 * Tutoring signals for the roster (tutor plan §11 "Tutoring signals (not grades)", T-18). Pure: every rule and
 * boundary is unit-tested. Each signal carries its evidence so the UI can say why it is shown.
 *
 *   inactive        last batch activity 7 or more days ago (6 days is not flagged)
 *   never_active    no batch activity at all, enrolled 7 or more days ago
 *   overdue         at least one required item past its due date and not completed
 *   needs_revision  at least one project returned for changes
 *
 * New enrollees (enrolled less than 7 days ago) are never flagged for inactivity. A completed batch shows no
 * signals: nothing more is expected of its students.
 */

export const INACTIVITY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type IndicatorKind = 'inactive' | 'never_active' | 'overdue' | 'needs_revision';

export interface Indicator {
  kind: IndicatorKind;
  label: string;
  evidence: string;
}

export interface IndicatorInput {
  batchStatus: string;
  enrolledAt: Date;
  lastActivityAt: Date | null;
  overdueRequired: number;
  needsRevision: number;
  now: Date;
}

/** "12 Oct 2026" in IST, built by hand so server and tests agree regardless of ICU data. */
export function formatIstDate(instant: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ist = new Date(instant.getTime() + 330 * 60 * 1000);
  return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/** Whole days between two instants, rounded down. */
export function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

export function computeIndicators(input: IndicatorInput): Indicator[] {
  if (input.batchStatus === 'completed') return [];
  const signals: Indicator[] = [];
  const settledIn = daysBetween(input.enrolledAt, input.now) >= INACTIVITY_DAYS;

  if (input.lastActivityAt) {
    const idle = daysBetween(input.lastActivityAt, input.now);
    if (idle >= INACTIVITY_DAYS && settledIn) {
      signals.push({ kind: 'inactive', label: `Inactive ${idle} days`, evidence: `Last activity ${formatIstDate(input.lastActivityAt)}` });
    }
  } else if (settledIn) {
    signals.push({ kind: 'never_active', label: 'No activity yet', evidence: `Enrolled ${formatIstDate(input.enrolledAt)}, no activity in this batch since` });
  }

  if (input.overdueRequired > 0) {
    signals.push({
      kind: 'overdue',
      label: `${input.overdueRequired} overdue`,
      evidence: `${input.overdueRequired} required ${input.overdueRequired === 1 ? 'item is' : 'items are'} past the due date`
    });
  }
  if (input.needsRevision > 0) {
    signals.push({
      kind: 'needs_revision',
      label: 'Changes requested',
      evidence: `${input.needsRevision} ${input.needsRevision === 1 ? 'project was' : 'projects were'} returned for changes`
    });
  }
  return signals;
}
