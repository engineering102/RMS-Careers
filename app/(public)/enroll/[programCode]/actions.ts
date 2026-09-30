'use server';

import { z } from 'zod';
import {
  getProgramByCode,
  getProgramEnrollmentCount,
  findStudentByEmail,
  checkExistingEnrollment,
  createOrUpdateStudent,
  createEnrollmentRecord,
  markEnrollmentConfirmationSent
} from '@/lib/db';
import { sendEnrollmentConfirmationEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';

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
        registeredAt: string;
        emailSent: boolean;
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

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

    // 5. Server-Side Duplicate Check
    const existingStudent = await findStudentByEmail(email);
    if (existingStudent) {
      const existingEnrollment = await checkExistingEnrollment(
        existingStudent.id,
        program.id
      );
      if (existingEnrollment) {
        return {
          success: false,
          error: 'You are already registered for this program.'
        };
      }
    }

    // 6. Create or Reuse Student Record
    const student = await createOrUpdateStudent({
      fullName,
      email,
      phone,
      collegeRollNumber,
      branch,
      year
    });

    // 7. Create Enrollment Record in Database
    const enrollment = await createEnrollmentRecord(student.id, program.id);

    // 8. Attempt Registration Acknowledgement Email Dispatch
    // Note: Email failure MUST NOT roll back a valid database enrollment
    let emailSent = false;
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
        emailSent = true;
        await markEnrollmentConfirmationSent(enrollment.id);
      }
    } catch (emailErr) {
      console.error('[Action] Email dispatch caught error (enrollment preserved):', emailErr);
    }

    // Revalidate admin enrollments cache
    revalidatePath('/enrollments');

    return {
      success: true,
      data: {
        studentName: student.fullName,
        studentEmail: student.email,
        programName: program.name,
        programCode: program.code,
        status: 'pending',
        registeredAt: enrollment.createdAt.toISOString(),
        emailSent
      }
    };
  } catch (error) {
    console.error('Error in submitStudentEnrollment:', error);
    return {
      success: false,
      error: 'An unexpected server error occurred. Please try again.'
    };
  }
}
