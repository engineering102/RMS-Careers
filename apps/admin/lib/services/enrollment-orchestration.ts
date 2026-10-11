import 'server-only';

import { studentStats, userRoles, users, type Student, type Enrollment } from '@rms/db';
import { hasRole } from '@rms/auth';
import { eq, sql } from 'drizzle-orm';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { findStudentByEmail, createOrUpdateStudent } from '../db/queries/students';
import { checkExistingEnrollment, createEnrollmentRecord } from '../db/queries/enrollments';
import {
  provisionStudentAccountCore,
  StudentProvisioningError,
  PRIVILEGED_ROLES,
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
  /**
   * `admin` (default): an authenticated administrator is the source of the data (bulk import), so an
   * existing student's profile is refreshed from it.
   * `public`: anonymous self-registration. Knowing an email proves nothing, so an existing student is
   * enrolled AS-IS (no profile change) and emails belonging to staff accounts are refused.
   */
  mode?: 'admin' | 'public';
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
  const mode = input.mode ?? 'admin';
  const cleanEmail = studentData.email.trim().toLowerCase();

  try {
    const executeInTx = async (tx: AnyDbClient): Promise<EnrollmentWithProvisioningSuccess> => {
      // 0. Serialise concurrent requests for the same email (duplicate students/users/enrollments).
      if ('execute' in tx && typeof (tx as { execute?: unknown }).execute === 'function') {
        await (tx as typeof dbTx).execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`enroll:${cleanEmail}`}, 0))`);
      }

      // 1. Check if student already exists before insert/update to accurately track new vs reused
      const existingStudent = await findStudentByEmail(cleanEmail, tx);
      const isNewStudent = !existingStudent;

      let student: Student;
      if (mode === 'public') {
        if (!existingStudent) {
          // A staff account with this email must not acquire a student identity via the public form.
          const [emailUser] = await tx
            .select({ id: users.id })
            .from(users)
            .where(sql`LOWER(${users.email}) = ${cleanEmail}`)
            .limit(1);
          if (emailUser) {
            const roles = await tx.select().from(userRoles).where(eq(userRoles.userId, emailUser.id));
            if (hasRole(roles, PRIVILEGED_ROLES)) {
              throw new StudentProvisioningError('privileged_identity', 'Email belongs to a staff account');
            }
          }
        }
        // 2a. Public: create a new student, or use the existing record unchanged.
        student = existingStudent
          ? existingStudent
          : await createOrUpdateStudent({ ...studentData, collegeId: studentData.collegeId || null, email: cleanEmail }, tx);
      } else {
        // 2b. Admin: create or refresh the student record from administrator-supplied data.
        student = await createOrUpdateStudent(
          {
            ...studentData,
            collegeId: studentData.collegeId || existingStudent?.collegeId || null,
            email: cleanEmail
          },
          tx
        );
      }

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
