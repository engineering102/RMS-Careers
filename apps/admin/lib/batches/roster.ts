// Client-safe shapes and helpers for a batch's student roster (the query lives in
// lib/db/queries/batches.ts). Batch membership is an enrollment row with this batch's id.
import type { EnrollmentStatusEnum } from '@rms/db';
import { csvCell } from '@/lib/csv/escape';

export interface BatchRosterEntry {
  enrollmentId: number;
  status: EnrollmentStatusEnum;
  enrolledAt: Date;
  confirmationSentAt: Date | null;
  student: {
    id: number;
    fullName: string;
    email: string;
    collegeRollNumber: string | null;
    branch: string | null;
    year: number | null;
  };
}

/** Statuses that give the student portal access (mirrors apps/student/lib/db/access-policy.ts). */
export const ACCESS_GRANTING_STATUSES: readonly EnrollmentStatusEnum[] = ['active', 'confirmed'];

export interface RosterSummary {
  /** Every enrollment row in the batch, whatever its status. */
  total: number;
  /** Active or confirmed: these students can use the portal. */
  withAccess: number;
  /** Registered but not yet confirmed: no portal access until an admin confirms. */
  pending: number;
  /** Every other status (waitlisted, cancelled, dropped, completed, ...). */
  other: number;
}

export function summarizeRoster(entries: readonly Pick<BatchRosterEntry, 'status'>[]): RosterSummary {
  const summary: RosterSummary = { total: entries.length, withAccess: 0, pending: 0, other: 0 };
  for (const entry of entries) {
    if (ACCESS_GRANTING_STATUSES.includes(entry.status)) summary.withAccess++;
    else if (entry.status === 'pending') summary.pending++;
    else summary.other++;
  }
  return summary;
}

/**
 * Roster export for external assessment platforms (e.g. QwikTest's per-test candidate import, which
 * takes `name, email`). Only students with portal access are exported, one row per email, because
 * results are later matched back to the batch by that same email (external-assessment-parser.ts).
 */
export function buildRosterExportCsv(entries: readonly Pick<BatchRosterEntry, 'status' | 'student'>[]): {
  csvContent: string;
  rowCount: number;
} {
  const row = (values: string[]) => values.map((v) => csvCell(v, 'minimal')).join(',');
  const seen = new Set<string>();
  const rows: string[] = [row(['name', 'email'])];
  for (const entry of entries) {
    if (!ACCESS_GRANTING_STATUSES.includes(entry.status)) continue;
    const email = entry.student.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    rows.push(row([entry.student.fullName.trim(), email]));
  }
  return { csvContent: rows.join('\n'), rowCount: rows.length - 1 };
}

/** `<batch-name>-roster-<yyyy-mm-dd>.csv`, filesystem-safe. */
export function rosterExportFilename(batchName: string, now: Date = new Date()): string {
  const slug =
    batchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'batch';
  return `${slug}-roster-${now.toISOString().slice(0, 10)}.csv`;
}
