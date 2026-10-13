import 'server-only';

import { markEnrollmentConfirmationSent } from '../db/queries/enrollments';
import { sendEnrollmentConfirmationEmail, sendStudentActivationEmail } from '../email';
import { getStudentPortalUrl } from '../email/student-portal-url';
import type { EnrollmentWithProvisioningSuccess } from './enrollment-orchestration';

export interface EnrollmentEmailContext {
  program: { name: string; code: string; startDate: Date | null; endDate: Date | null };
  batch: { name: string; startDate: Date | null; endDate: Date | null };
}

export interface EnrollmentEmailOutcome {
  sent: number;
  failed: number;
}

/**
 * Post-commit emails for a new batch enrollment, the same steps the bulk import performs per row
 * (enrollments/import/actions.ts): an activation invitation for a newly provisioned student, then the
 * enrollment confirmation, stamping confirmation_sent_at on success. Never throws: an email failure
 * must not affect the committed enrollment. Without an email provider the senders report
 * `provider_not_configured`, which counts as failed.
 */
export async function sendNewEnrollmentEmails(
  result: EnrollmentWithProvisioningSuccess,
  { program, batch }: EnrollmentEmailContext
): Promise<EnrollmentEmailOutcome> {
  const outcome: EnrollmentEmailOutcome = { sent: 0, failed: 0 };
  try {
    if (result.isNewStudent && result.activation) {
      const activation = await sendStudentActivationEmail({
        studentName: result.student.fullName,
        studentEmail: result.student.email,
        activationUrl: new URL(`/activate?token=${result.activation.rawToken}`, getStudentPortalUrl()).toString(),
        expiresAt: result.activation.expiresAt
      });
      if (activation.success) outcome.sent++;
      else outcome.failed++;
    }

    const confirmation = await sendEnrollmentConfirmationEmail({
      studentName: result.student.fullName,
      studentEmail: result.student.email,
      programName: `${program.name} (${batch.name})`,
      programCode: program.code,
      startDate: batch.startDate || program.startDate,
      endDate: batch.endDate || program.endDate,
      status: 'pending'
    });
    if (confirmation.success) {
      outcome.sent++;
      await markEnrollmentConfirmationSent(result.enrollment.id);
    } else {
      outcome.failed++;
    }
  } catch (error) {
    console.error('[Add student] Email dispatch failed (enrollment preserved):', error);
    outcome.failed++;
  }
  return outcome;
}
