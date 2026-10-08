'use server';

import { auth } from '@/lib/auth';
import {
  getPrograms,
  getProgramEnrollmentCount,
  markEnrollmentConfirmationSent,
  getExistingEnrollmentsByEmails,
  getBatchById,
  getBatchEnrollmentCount,
  type Program,
  type Batch
} from '@/lib/db';
import { createEnrollmentWithStudentProvisioning } from '@/lib/services/enrollment-orchestration';
import { parseImportFile } from '@/lib/csv/parser';
import { validateImportRows, type ValidatedImportRow } from '@/lib/csv/validator';
import { generateCsvTemplate, generateErrorReportCsv } from '@/lib/csv/template';
import { sendEnrollmentConfirmationEmail, sendStudentActivationEmail } from '@/lib/email';
import { getStudentPortalUrl } from '@/lib/email/student-portal-url';
import { revalidatePath } from 'next/cache';

export interface ImportPreviewData {
  program: {
    id: number;
    name: string;
    code: string;
    capacity: number;
    enrolledCount: number;
    remainingCapacity: number;
  };
  batch: {
    id: string;
    name: string;
    status: string;
    enrolledCount: number;
  };
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  alreadyEnrolledCount: number;
  newValidCount: number;
  isExceedingCapacity: boolean;
  rows: ValidatedImportRow[];
}

export interface ImportSummaryData {
  totalRows: number;
  newStudentsCount: number;
  reusedStudentsCount: number;
  newEnrollmentsCount: number;
  alreadyEnrolledCount: number;
  emailsSentCount: number;
  emailFailuresCount: number;
}

export async function validateImportFileAction(formData: FormData): Promise<
  | { success: true; preview: ImportPreviewData }
  | { success: false; error: string; missingColumns?: string[] }
> {
  try {
    // 1. Admin Authentication Check
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    // 2. Extract Program ID, Batch ID, and File
    const programIdStr = formData.get('programId') as string;
    const batchIdStr = formData.get('batchId') as string | null;
    const file = formData.get('file') as File | null;

    if (!programIdStr) {
      return { success: false, error: 'Please select a program first.' };
    }

    const programId = parseInt(programIdStr, 10);
    if (isNaN(programId)) {
      return { success: false, error: 'Invalid program selected.' };
    }

    if (!batchIdStr) {
      return { success: false, error: 'Please select a target batch.' };
    }

    if (!file || file.size === 0) {
      return { success: false, error: 'Please upload a valid CSV or Excel file.' };
    }

    // Max upload size 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds maximum limit of 10MB.' };
    }

    // 3. Resolve Program Server-Side
    const allPrograms = await getPrograms();
    const program = allPrograms.find((p) => p.id === programId);
    if (!program) {
      return { success: false, error: 'Selected program not found.' };
    }

    if (program.status === 'archived') {
      return { success: false, error: 'Selected program is archived and cannot accept new enrollments.' };
    }

    // 4. Resolve Batch Server-Side and Verify Consistency
    const batch = await getBatchById(batchIdStr);
    if (!batch) {
      return { success: false, error: 'Selected batch not found.' };
    }

    if (batch.programId !== program.id) {
      return { success: false, error: 'Selected batch does not belong to the selected program.' };
    }

    // 5. Parse Uploaded Spreadsheet File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parseResult = parseImportFile(buffer, file.name);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse spreadsheet file.',
        missingColumns: parseResult.missingColumns
      };
    }

    if (parseResult.rows.length === 0) {
      return { success: false, error: 'The uploaded file contains no data rows.' };
    }

    // 6. Validate Input Rows
    const validatedRows = validateImportRows(parseResult.rows);

    // 7. Database Check for Existing Enrollments in target batch
    const validEmails = validatedRows
      .filter((r) => r.status === 'valid')
      .map((r) => r.email);

    const existingEnrolledSet = await getExistingEnrollmentsByEmails(
      program.id,
      validEmails,
      batch.id
    );

    // Update row statuses if student is already enrolled in this target batch
    validatedRows.forEach((r) => {
      if (r.status === 'valid' && existingEnrolledSet.has(r.email.toLowerCase())) {
        r.status = 'already_enrolled';
        r.issue = 'Student is already enrolled in this batch';
      }
    });

    // 8. Metric Calculations & Capacity Check
    const enrolledCount = await getProgramEnrollmentCount(program.id);
    const batchEnrolledCount = await getBatchEnrollmentCount(batch.id);
    const remainingCapacity =
      program.capacity > 0 ? Math.max(0, program.capacity - enrolledCount) : 999999;

    const totalRows = validatedRows.length;
    const invalidCount = validatedRows.filter((r) => r.status === 'invalid').length;
    const duplicateInFileCount = validatedRows.filter((r) => r.status === 'in_file_duplicate').length;
    const alreadyEnrolledCount = validatedRows.filter((r) => r.status === 'already_enrolled').length;
    const newValidCount = validatedRows.filter((r) => r.status === 'valid').length;
    const validCount = newValidCount;

    const isExceedingCapacity =
      program.capacity > 0 && newValidCount > remainingCapacity;

    return {
      success: true,
      preview: {
        program: {
          id: program.id,
          name: program.name,
          code: program.code,
          capacity: program.capacity,
          enrolledCount,
          remainingCapacity
        },
        batch: {
          id: batch.id,
          name: batch.name,
          status: batch.status,
          enrolledCount: batchEnrolledCount
        },
        totalRows,
        validCount,
        invalidCount,
        duplicateInFileCount,
        alreadyEnrolledCount,
        newValidCount,
        isExceedingCapacity,
        rows: validatedRows
      }
    };
  } catch (error) {
    console.error('Error in validateImportFileAction:', error);
    return { success: false, error: 'An unexpected error occurred during file parsing.' };
  }
}

export async function executeBulkImportAction(input: {
  programId: number;
  batchId?: string;
  rows: ValidatedImportRow[];
  sendEmails: boolean;
}): Promise<
  | { success: true; summary: ImportSummaryData }
  | { success: false; error: string }
> {
  try {
    // 1. Admin Auth Check
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access.' };
    }

    const { programId, batchId, rows, sendEmails } = input;

    // 2. Program Resolution
    const allPrograms = await getPrograms();
    const program = allPrograms.find((p) => p.id === programId);
    if (!program) {
      return { success: false, error: 'Program not found.' };
    }

    // 3. Batch Resolution & Consistency Verification
    if (!batchId) {
      return { success: false, error: 'Target batch is required.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Selected batch not found.' };
    }

    if (batch.programId !== program.id) {
      return { success: false, error: 'Selected batch does not belong to the selected program.' };
    }

    // Filter only valid rows to import
    const validRowsToImport = rows.filter((r) => r.status === 'valid');
    if (validRowsToImport.length === 0) {
      return { success: false, error: 'No valid rows available to import.' };
    }

    // 4. Server-Side Capacity Verification
    const enrolledCount = await getProgramEnrollmentCount(program.id);
    const remainingCapacity =
      program.capacity > 0 ? Math.max(0, program.capacity - enrolledCount) : 999999;

    if (program.capacity > 0 && validRowsToImport.length > remainingCapacity) {
      return {
        success: false,
        error: `Import exceeds available capacity. ${remainingCapacity} seat${remainingCapacity === 1 ? '' : 's'} remain, but ${validRowsToImport.length} new enrollments are ready to be imported.`
      };
    }

    // 5. Batch Processing Loop
    let newStudentsCount = 0;
    let reusedStudentsCount = 0;
    let newEnrollmentsCount = 0;
    let alreadyEnrolledCount = 0;
    let emailsSentCount = 0;
    let emailFailuresCount = 0;

    for (const row of validRowsToImport) {
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
        if (result.error === 'already_enrolled') {
          alreadyEnrolledCount++;
          continue;
        }
        throw new Error(`Student Portal provisioning failed for ${row.email}: ${result.message || result.error}`);
      }

      if (result.isNewStudent) {
        newStudentsCount++;
      } else {
        reusedStudentsCount++;
      }
      newEnrollmentsCount++;

      // Optional Phase 3 Email Dispatch (strictly post-commit)
      if (sendEmails) {
        try {
          // Send activation invitation only for newly provisioned students
          if (result.isNewStudent && result.activation) {
            const studentPortalUrl = getStudentPortalUrl();
            const activationResult = await sendStudentActivationEmail({
              studentName: result.student.fullName,
              studentEmail: result.student.email,
              activationUrl: new URL(`/activate?token=${result.activation.rawToken}`, studentPortalUrl).toString(),
              expiresAt: result.activation.expiresAt
            });
            if (!activationResult.success) emailFailuresCount++;
          }

          const emailResult = await sendEnrollmentConfirmationEmail({
            studentName: result.student.fullName,
            studentEmail: result.student.email,
            programName: `${program.name} (${batch.name})`,
            programCode: program.code,
            startDate: batch.startDate || program.startDate,
            endDate: batch.endDate || program.endDate,
            status: 'pending'
          });

          if (emailResult.success) {
            emailsSentCount++;
            await markEnrollmentConfirmationSent(result.enrollment.id);
          } else {
            emailFailuresCount++;
          }
        } catch (emailErr) {
          console.error(`[Bulk Import] Email failed for ${result.student.email}:`, emailErr);
          emailFailuresCount++;
        }
      }
    }

    // Revalidate admin enrollments & batches cache
    revalidatePath('/enrollments');
    revalidatePath('/batches');

    return {
      success: true,
      summary: {
        totalRows: rows.length,
        newStudentsCount,
        reusedStudentsCount,
        newEnrollmentsCount,
        alreadyEnrolledCount,
        emailsSentCount,
        emailFailuresCount
      }
    };
  } catch (error) {
    console.error('Error in executeBulkImportAction:', error);
    return { success: false, error: 'An unexpected database error occurred during bulk import.' };
  }
}

export async function getDownloadTemplateCsvAction(): Promise<string> {
  return generateCsvTemplate();
}

export async function getDownloadErrorReportCsvAction(
  rows: ValidatedImportRow[]
): Promise<string> {
  return generateErrorReportCsv(rows);
}
