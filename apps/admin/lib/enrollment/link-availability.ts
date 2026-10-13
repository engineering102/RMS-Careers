// Whether a program's public enrollment link (/enroll/[programCode]) currently accepts registrations.
// Mirrors, in order, the checks in app/(public)/enroll/[programCode]/page.tsx and its Server Action;
// it only explains them to admins and never changes what the public form does. Client-safe.
import type { Program } from '@rms/db';

export interface EnrollmentLinkAvailability {
  accepting: boolean;
  /** Why the form will not accept registrations right now (null when it does). */
  reason: string | null;
}

export function enrollmentLinkAvailability(
  program: Pick<Program, 'status' | 'endDate' | 'capacity'>,
  enrolledCount: number,
  now: Date = new Date()
): EnrollmentLinkAvailability {
  if (program.status === 'archived') {
    return { accepting: false, reason: 'The program is archived, so the form says registration is no longer available.' };
  }
  if (program.status !== 'active') {
    return {
      accepting: false,
      reason: `The program is ${program.status}, so the form says registration is not currently open.`
    };
  }
  if (program.endDate && new Date(program.endDate).getTime() < now.getTime()) {
    return { accepting: false, reason: "The program's end date has passed, so registrations are refused." };
  }
  if (program.capacity > 0 && enrolledCount >= program.capacity) {
    return {
      accepting: false,
      reason: `The program is full (${enrolledCount} of ${program.capacity} seats), so registrations are refused.`
    };
  }
  return { accepting: true, reason: null };
}

/** Path of the public program enrollment form. The code is encoded so a pasted link never breaks. */
export function enrollmentLinkPath(programCode: string): string {
  return `/enroll/${encodeURIComponent(programCode)}`;
}
