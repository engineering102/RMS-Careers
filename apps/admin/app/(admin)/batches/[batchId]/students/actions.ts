'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import { getBatchById, getBatchRoster, getProgramById, getProgramEnrollmentCount } from '@/lib/db/queries';
import { buildRosterExportCsv, rosterExportFilename } from '@/lib/batches/roster';
import { validateImportRows } from '@/lib/csv/validator';
import { createEnrollmentWithStudentProvisioning } from '@/lib/services/enrollment-orchestration';
import { sendNewEnrollmentEmails } from '@/lib/services/enrollment-emails';
import { fieldErrorsFromIssue, type StudentFieldErrors } from '@/lib/enrollment/student-form';

const inputSchema = z.object({
  fullName: z.string().max(200),
  email: z.string().max(320),
  phone: z.string().max(32),
  collegeRollNumber: z.string().max(100),
  branch: z.string().max(200),
  year: z.string().max(20)
});

export type AddStudentToBatchResult =
  | {
      success: true;
      data: {
        studentName: string;
        isNewStudent: boolean;
        enrollmentStatus: 'pending';
        emails: { requested: boolean; sent: number; failed: number };
      };
    }
  | { success: false; error: string; fieldErrors?: StudentFieldErrors };

/**
 * Adds one student to a batch: the same rules and service as the bulk import (validateImportRows +
 * createEnrollmentWithStudentProvisioning in admin mode), for a single row. The program always comes
 * from the batch, never from the client. The new enrollment is `pending`, exactly like an imported or
 * self-registered one. Emails are sent only when asked for, after the enrollment has committed.
 */
export async function addStudentToBatchAction(
  batchId: string,
  rawInput: unknown,
  options: { sendEmails?: boolean } = {}
): Promise<AddStudentToBatchResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = inputSchema.safeParse(rawInput);
    if (typeof batchId !== 'string' || !batchId || !parsed.success) {
      return { success: false, error: 'Invalid request.' };
    }
    const input = parsed.data;

    const batch = await getBatchById(batchId);
    if (!batch) return { success: false, error: 'Batch not found.' };

    const program = await getProgramById(batch.programId);
    if (!program) return { success: false, error: 'Program not found.' };
    if (program.status === 'archived') {
      return { success: false, error: 'This program is archived and cannot accept new enrollments.' };
    }

    // Identical rules to the bulk import (one-row file).
    const [row] = validateImportRows([
      {
        rowIndex: 1,
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        collegeRollNumber: input.collegeRollNumber.trim(),
        branch: input.branch.trim(),
        academicYear: input.year.trim()
      }
    ]);
    if (row.status !== 'valid') {
      const { fieldErrors, unmatched } = fieldErrorsFromIssue(row.issue);
      return {
        success: false,
        error: unmatched.length > 0 ? unmatched.join('; ') : 'Please fix the highlighted fields.',
        fieldErrors
      };
    }

    // Same capacity rule as the bulk import (program-level; 0 = unlimited).
    if (program.capacity > 0) {
      const enrolled = await getProgramEnrollmentCount(program.id);
      if (enrolled >= program.capacity) {
        return {
          success: false,
          error: `This program is full: all ${program.capacity} seats are taken.`
        };
      }
    }

    const result = await createEnrollmentWithStudentProvisioning({
      programId: program.id,
      batchId: batch.id,
      student: {
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        collegeRollNumber: row.collegeRollNumber,
        branch: row.branch,
        year: row.year,
        collegeId: batch.collegeId || program.collegeId || null
      }
    });

    if (!result.success) {
      switch (result.error) {
        case 'already_enrolled':
          return {
            success: false,
            error: 'This student is already enrolled in this batch (pending, active or confirmed).',
            fieldErrors: { email: 'Already enrolled in this batch' }
          };
        case 'privileged_identity':
          return {
            success: false,
            error: 'This email belongs to a staff account and cannot be enrolled as a student.',
            fieldErrors: { email: 'Belongs to a staff account' }
          };
        case 'identity_conflict':
        case 'identity_integrity_error':
          return {
            success: false,
            error: 'This email conflicts with another account, so it cannot be enrolled. Check the existing records.',
            fieldErrors: { email: 'Conflicts with another account' }
          };
        default:
          console.error('[Add student] Enrollment failed:', result.error);
          return { success: false, error: 'The student could not be added. Please try again.' };
      }
    }

    const emails = options.sendEmails
      ? await sendNewEnrollmentEmails(result, { program, batch })
      : { sent: 0, failed: 0 };

    revalidatePath(`/batches/${batch.id}`);
    revalidatePath('/batches');
    revalidatePath('/enrollments');

    return {
      success: true,
      data: {
        studentName: result.student.fullName,
        isNewStudent: result.isNewStudent,
        enrollmentStatus: 'pending',
        emails: { requested: Boolean(options.sendEmails), ...emails }
      }
    };
  } catch (error) {
    console.error('Error in addStudentToBatchAction:', error);
    return { success: false, error: 'An unexpected error occurred while adding the student.' };
  }
}

export type ExportBatchRosterResult =
  | { success: true; data: { filename: string; csvContent: string; rowCount: number } }
  | { success: false; error: string };

/**
 * Downloads the batch's students with portal access as `name,email` CSV, the format external
 * assessment platforms (QwikTest) take for a test's candidate list. Read-only.
 */
export async function exportBatchRosterCsvAction(batchId: string): Promise<ExportBatchRosterResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };
    if (typeof batchId !== 'string' || !batchId) return { success: false, error: 'Invalid request.' };

    const batch = await getBatchById(batchId);
    if (!batch) return { success: false, error: 'Batch not found.' };

    const { csvContent, rowCount } = buildRosterExportCsv(await getBatchRoster(batch.id));
    if (rowCount === 0) {
      return { success: false, error: 'No students with portal access in this batch to export.' };
    }
    return { success: true, data: { filename: rosterExportFilename(batch.name), csvContent, rowCount } };
  } catch (error) {
    console.error('Error in exportBatchRosterCsvAction:', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Could not export the roster. Please try again.' };
  }
}
