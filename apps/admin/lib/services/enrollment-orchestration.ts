import 'server-only';

import { studentStats, type Student, type Enrollment } from '@rms/db';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { findStudentByEmail, createOrUpdateStudent } from '../db/queries/students';
import { checkExistingEnrollment, createEnrollmentRecord } from '../db/queries/enrollments';
import {
  provisionStudentAccountCore,
  StudentProvisioningError,
  type ProvisioningErrorCode
} from '../db/queries/student-provisioning';

export type EnrollmentServiceErrorCode =
  | 'already_enrolled'
  | ProvisioningErrorCode
  | 'database_error';

export class EnrollmentServiceError extends Error {
  constructor(
    public readonly code: EnrollmentServiceErrorCode,
    message?: string
  ) {
    super(message || code);
    this.name = 'EnrollmentServiceError';
  }
}

export interface StudentEnrollmentInput {
  fullName: string;
  email: string;
  phone: string;
  collegeRollNumber: string;
  branch: string;
  year: number;
  collegeId?: string | null;
}

export interface CreateEnrollmentWithProvisioningInput {
  programId: number;
  batchId?: string | null;
  student: StudentEnrollmentInput;
}

export type EnrollmentWithProvisioningSuccess = {
  success: true;
  isNewStudent: boolean;
  student: Student;
  enrollment: Enrollment;
  userId: string;
  activation: {
    rawToken: string;
    expiresAt: Date;
  } | null;
};

export type EnrollmentWithProvisioningFailure = {
  success: false;
  error: EnrollmentServiceErrorCode;
  message?: string;
};

export type CreateEnrollmentWithProvisioningResult =
  | EnrollmentWithProvisioningSuccess
  | EnrollmentWithProvisioningFailure;

/**
 * Transactional Orchestration Service for Student Enrollment + Account Provisioning.
 *
 * Guarantees that:
 * 1. Exactly ONE database transaction controls:
 *    - Student create/reuse
 *    - Duplicate enrollment check
 *    - Enrollment creation (linked to target batchId)
 *    - User create/reuse
 *    - Student role assignment
 *    - students.user_id link
 *    - Single-use activation token generation (or reuse check)
 * 2. If any step fails, the entire transaction is rolled back with zero orphaned state.
 * 3. No nested transactions or compensating deletes are used.
 * 4. Activation and confirmation emails are strictly decoupled from the transaction boundary
 *    and must be executed by the caller AFTER this service successfully commits.
 */
export async function createEnrollmentWithStudentProvisioning(
  input: CreateEnrollmentWithProvisioningInput,
  client: AnyDbClient = dbTx
): Promise<CreateEnrollmentWithProvisioningResult> {
  const { programId, batchId, student: studentData } = input;
  const cleanEmail = studentData.email.trim().toLowerCase();

  try {
    const executeInTx = async (tx: AnyDbClient): Promise<EnrollmentWithProvisioningSuccess> => {
      // 1. Check if student already exists before insert/update to accurately track new vs reused
      const existingStudent = await findStudentByEmail(cleanEmail, tx);
      const isNewStudent = !existingStudent;

      // 2. Create or reuse student record using tx
      const student = await createOrUpdateStudent(
        {
          ...studentData,
          collegeId: studentData.collegeId || existingStudent?.collegeId || null,
          email: cleanEmail
        },
        tx
      );

      // If student is associated with a college, ensure student_stats row exists atomically
      if (student.collegeId) {
        // onConflictDoNothing already tolerates an existing row. Do NOT swallow other errors:
        // a failed statement aborts the Postgres transaction and must roll everything back.
        await tx
          .insert(studentStats)
          .values({
            studentId: student.id,
            collegeId: student.collegeId
          })
          .onConflictDoNothing();
      }

      // 3. Duplicate enrollment check INSIDE the transaction
      const existingEnrollment = await checkExistingEnrollment(student.id, programId, tx, batchId);
      if (existingEnrollment) {
        throw new EnrollmentServiceError(
          'already_enrolled',
          batchId ? 'You are already registered for this batch.' : 'You are already registered for this program.'
        );
      }

      // 4. Create enrollment record using tx
      const enrollment = await createEnrollmentRecord(student.id, programId, tx, batchId);

      // 5. Provision auth user, role, user_id link, and activation token using tx
      const provisioning = await provisionStudentAccountCore(tx, student.id);

      return {
        success: true,
        isNewStudent,
        student: provisioning.student,
        enrollment,
        userId: provisioning.userId,
        activation: provisioning.activation
      };
    };

    // Open a real interactive transaction on the neon-serverless Pool client (dbTx).
    // Failures propagate; there is deliberately no non-atomic fallback. A caller passing an
    // existing transaction client (no `transaction` method, or a savepoint-capable tx) joins it.
    if ('transaction' in client && typeof client.transaction === 'function') {
      return await (client as typeof dbTx).transaction(async (tx) => {
        return await executeInTx(tx);
      });
    } else {
      return await executeInTx(client);
    }
  } catch (error) {
    if (error instanceof EnrollmentServiceError) {
      return {
        success: false,
        error: error.code,
        message: error.message
      };
    }
    if (error instanceof StudentProvisioningError) {
      return {
        success: false,
        error: error.code,
        message: error.message
      };
    }
    console.error('Enrollment with student provisioning transaction failed:', error);
    return {
      success: false,
      error: 'database_error',
      message: error instanceof Error ? error.message : 'Database transaction failed'
    };
  }
}
