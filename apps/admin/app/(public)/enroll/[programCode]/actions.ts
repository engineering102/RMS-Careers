'use server';

import { z } from 'zod';
import {
  getProgramByCode,
  getProgramEnrollmentCount,
  markEnrollmentConfirmationSent
} from '@/lib/db';
import { createEnrollmentWithStudentProvisioning } from '@/lib/services/enrollment-orchestration';
import { sendEnrollmentConfirmationEmail, sendStudentActivationEmail } from '@/lib/email';
import { getStudentPortalUrl } from '@/lib/email/student-portal-url';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { PUBLIC_FORM_LIMIT, accountKey, enforceRateLimit, ipKey, trustedClientIp } from '@/lib/security/request-limits';
import { generateToken, hashPassword } from '@rms/auth';

const phoneRegex = /^(?:\+?91[\-\s]?)?[6-9]\d{9}$/;

const enrollmentSubmissionSchema = z.object({
  programCode: z.string().min(1, 'Program code is required'),
  fullName: z
    .string()
    .min(2, 'Full Name must be at least 2 characters')
    .max(100, 'Full Name must be under 100 characters'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid 10-digit phone number'),
  collegeRollNumber: z
    .string()
    .min(1, 'College Roll Number is required')
    .max(50, 'Roll Number must be under 50 characters'),
  branch: z
    .string()
    .min(1, 'Branch is required')
    .max(100, 'Branch must be under 100 characters'),
  year: z.coerce
    .number()
    .min(1, 'Please select a valid year')
    .max(4, 'Please select a valid year')
});

export type EnrollmentActionResult =
  | {
      success: true;
      data: {
        studentName: string;
        studentEmail: string;
        programName: string;
        programCode: string;
        status: 'pending';
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

/**
 * Outcomes that must look identical to the requester: revealing them would confirm whether an email
 * already has a student record, an enrollment, or a staff account (audit F-02/F-26).
 */
const INDISTINGUISHABLE_OUTCOMES = new Set(['already_enrolled', 'privileged_identity', 'identity_conflict']);

/** Spends the same bcrypt work the new-account path spends, so response time does not reveal it. */
async function equalizeProvisioningCost(): Promise<void> {
  try {
    await hashPassword(generateToken(32));
  } catch {
    // Timing equalisation only; never affects the response.
  }
}

export async function submitStudentEnrollment(
  rawInput: unknown
): Promise<EnrollmentActionResult> {
  try {
    // 1. Validate Form Input Schema
    const parseResult = enrollmentSubmissionSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      return {
        success: false,
        error: 'Please fix the validation errors in the form.',
        fieldErrors
      };
    }

    // Abuse control (audit F-04): every accepted request can create accounts and send email.
    // Limited per client and per target email; the response does not reveal which key tripped.
    const limit = await enforceRateLimit(PUBLIC_FORM_LIMIT, [
      ipKey('enroll', trustedClientIp(await headers())),
      accountKey('enroll', parseResult.data.email)
    ]);
    if (!limit.allowed) {
      return { success: false, error: 'Too many registration attempts. Please wait a minute and try again.' };
    }

    const {
      programCode,
      fullName,
      email,
      phone,
      collegeRollNumber,
      branch,
      year
    } = parseResult.data;

    // 2. Resolve Program Server-Side
    const program = await getProgramByCode(programCode);
    if (!program) {
      return {
        success: false,
        error: 'Program not found.'
      };
    }

    // 3. Program Status Verification
    if (program.status === 'archived') {
      return {
        success: false,
        error: 'Registration for this program is no longer available.'
      };
    }

    if (program.status !== 'active') {
      return {
        success: false,
        error: 'Registration for this program is not currently open.'
      };
    }

    // A program that has already ended no longer accepts registrations.
    if (program.endDate && new Date(program.endDate).getTime() < Date.now()) {
      return {
        success: false,
        error: 'Registration for this program is no longer available.'
      };
    }

    // 4. Server-Side Capacity Verification
    if (program.capacity > 0) {
      const currentEnrollmentsCount = await getProgramEnrollmentCount(program.id);
      if (currentEnrollmentsCount >= program.capacity) {
        return {
          success: false,
          error: 'Registration for this program is currently full.'
        };
      }
    }

    // 5. Execute Student + Enrollment + Account provisioning in one atomic transaction.
    // Public mode: an existing student's profile is never changed and staff emails are refused.
    const enrollmentResult = await createEnrollmentWithStudentProvisioning({
      programId: program.id,
      mode: 'public',
      student: {
        fullName,
        email,
        phone,
        collegeRollNumber,
        branch,
        year
      }
    });

    // The requester only learns that the request was received; what it means for an existing
    // account is handled out of band (emails go to the address owner, staff cases to admins).
    const acknowledgement: EnrollmentActionResult = {
      success: true,
      data: {
        studentName: fullName,
        studentEmail: email,
        programName: program.name,
        programCode: program.code,
        status: 'pending'
      }
    };

    if (!enrollmentResult.success) {
      if (INDISTINGUISHABLE_OUTCOMES.has(enrollmentResult.error)) {
        if (enrollmentResult.error !== 'already_enrolled') {
          console.warn('[Public Enrollment] Request not applied:', enrollmentResult.error);
        }
        await equalizeProvisioningCost();
        return acknowledgement;
      }
      console.error('[Public Enrollment] Provisioning failed:', enrollmentResult.error);
      return {
        success: false,
        error: 'An error occurred during enrollment. Please try again.'
      };
    }

    const { student, enrollment, activation } = enrollmentResult;
    if (!enrollmentResult.isNewStudent) {
      await equalizeProvisioningCost();
    }

    // 6. Post-commit: Activation email dispatch (only if new activation token was generated)
    if (activation) {
      const studentPortalUrl = getStudentPortalUrl();
      try {
        const activationResult = await sendStudentActivationEmail({
          studentName: student.fullName,
          studentEmail: student.email,
          activationUrl: new URL(`/activate?token=${activation.rawToken}`, studentPortalUrl).toString(),
          expiresAt: activation.expiresAt
        });
        if (!activationResult.success) {
          console.error('[Action] Activation email not sent:', activationResult.reason, activationResult.error ?? '');
        }
      } catch (emailError) {
        console.error('Student activation email dispatch failed after provisioning:', emailError);
      }
    }

    // 7. Post-commit: Attempt registration acknowledgement dispatch without affecting enrollment/provisioning.
    // Note: Email failure MUST NOT roll back a valid database enrollment
    try {
      const emailResult = await sendEnrollmentConfirmationEmail({
        studentName: student.fullName,
        studentEmail: student.email,
        programName: program.name,
        programCode: program.code,
        startDate: program.startDate,
        endDate: program.endDate,
        status: 'pending'
      });

      if (emailResult.success) {
        await markEnrollmentConfirmationSent(enrollment.id);
      } else {
        console.error('[Action] Confirmation email not sent:', emailResult.reason ?? 'unknown');
      }
    } catch (emailErr) {
      console.error('[Action] Email dispatch caught error (enrollment preserved):', emailErr);
    }

    // Revalidate admin enrollments cache
    revalidatePath('/enrollments');

    return acknowledgement;
  } catch (error) {
    console.error('Error in submitStudentEnrollment:', error);
    return {
      success: false,
      error: 'An unexpected server error occurred. Please try again.'
    };
  }
}
