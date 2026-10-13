// Client-safe shapes and helpers for a batch's student roster (the query lives in
// lib/db/queries/batches.ts). Batch membership is an enrollment row with this batch's id.
import type { EnrollmentStatusEnum } from '@rms/db';

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
