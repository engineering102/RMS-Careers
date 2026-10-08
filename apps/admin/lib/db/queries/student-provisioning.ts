import 'server-only';

import { db, accountTokens, students, userRoles, users, type Student } from '@rms/db';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { generateToken, hashPassword, hashToken, hasRole } from '@rms/auth';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';

const ACTIVATION_TTL_HOURS = 168;

export type ProvisioningErrorCode =
  | 'identity_conflict'
  | 'identity_integrity_error'
  | 'provisioning_failed';

export class StudentProvisioningError extends Error {
  constructor(
    public readonly code: ProvisioningErrorCode,
    message?: string
  ) {
    super(message || code);
    this.name = 'StudentProvisioningError';
  }
}

export type StudentProvisioningResult =
  | { success: true; student: Student; userId: string; activation: { rawToken: string; expiresAt: Date } | null }
  | { success: false; error: ProvisioningErrorCode };

export interface ProvisionedAccountPayload {
  student: Student;
  userId: string;
  activation: { rawToken: string; expiresAt: Date } | null;
}

/**
 * Core student provisioning logic executing directly against the supplied database client or transaction.
 * Throws `StudentProvisioningError` upon failure to ensure transactional rollbacks.
 */
export async function provisionStudentAccountCore(
  tx: AnyDbClient,
  studentId: number
): Promise<ProvisionedAccountPayload> {
  if (!studentId) {
    throw new StudentProvisioningError('provisioning_failed', 'Student ID is required');
  }

  const [student] = await tx.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) {
    throw new StudentProvisioningError('provisioning_failed', 'Student is missing');
  }

  const cleanEmail = student.email.trim().toLowerCase();
  const [emailUser] = await tx
    .select()
    .from(users)
    .where(sql`LOWER(${users.email}) = ${cleanEmail}`)
    .limit(1);

  let user = emailUser;
  if (student.userId) {
    const [linkedUser] = await tx.select().from(users).where(eq(users.id, student.userId)).limit(1);
    if (!linkedUser) {
      throw new StudentProvisioningError('identity_integrity_error', 'Linked user account does not exist');
    }
    if (emailUser && emailUser.id !== linkedUser.id) {
      throw new StudentProvisioningError('identity_conflict', 'Student email does not match linked user email');
    }
    user = linkedUser;
  }

  if (user) {
    const linkedStudents = await tx.select({ id: students.id }).from(students).where(eq(students.userId, user.id));
    if (linkedStudents.some((linked) => linked.id !== student.id)) {
      throw new StudentProvisioningError('identity_conflict', 'User account is already linked to another student');
    }
  } else {
    const placeholderPasswordHash = await hashPassword(generateToken(32));
    const [created] = await tx
      .insert(users)
      .values({
        email: cleanEmail,
        name: student.fullName,
        passwordHash: placeholderPasswordHash,
        status: 'pending_activation'
      })
      .returning();
    user = created;
  }

  if (!user) {
    throw new StudentProvisioningError('provisioning_failed', 'User could not be provisioned');
  }

  const now = new Date();
  if (!student.userId) {
    const [linked] = await tx
      .update(students)
      .set({ userId: user.id, updatedAt: now })
      .where(and(eq(students.id, student.id), isNull(students.userId)))
      .returning();
    if (!linked) {
      throw new StudentProvisioningError('provisioning_failed', 'Student link race condition encountered');
    }
    student.userId = user.id;
  }

  const roles = await tx.select().from(userRoles).where(eq(userRoles.userId, user.id));
  if (!hasRole(roles, 'student')) {
    await tx.insert(userRoles).values({ userId: user.id, role: 'student' }).onConflictDoNothing();
  }

  let activation: { rawToken: string; expiresAt: Date } | null = null;
  if (user.status === 'pending_activation') {
    const validTokens = await tx
      .select({ id: accountTokens.id })
      .from(accountTokens)
      .where(
        and(
          eq(accountTokens.userId, user.id),
          eq(accountTokens.tokenType, 'activation'),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (validTokens.length === 0) {
      const rawToken = generateToken(32);
      const tokenHash = await hashToken(rawToken);
      const expiresAt = new Date(now.getTime() + ACTIVATION_TTL_HOURS * 60 * 60 * 1000);
      await tx.insert(accountTokens).values({
        userId: user.id,
        tokenHash,
        tokenType: 'activation',
        expiresAt
      });
      activation = { rawToken, expiresAt };
    }
  }

  return { student, userId: user.id, activation };
}

/**
 * Atomically establishes an enrolled Student's auth identity.
 * If client is passed, runs directly against it without opening a new transaction.
 * If client is omitted, wraps in db.transaction.
 */
export async function provisionStudentAccount(
  studentId: number,
  client?: AnyDbClient
): Promise<StudentProvisioningResult> {
  if (!studentId || !process.env.POSTGRES_URL) {
    return { success: false, error: 'provisioning_failed' };
  }

  if (client) {
    try {
      const result = await provisionStudentAccountCore(client, studentId);
      return { success: true, ...result };
    } catch (error) {
      if (error instanceof StudentProvisioningError) {
        return { success: false, error: error.code };
      }
      console.error('Student account provisioning failed:', error);
      return { success: false, error: 'provisioning_failed' };
    }
  }

  try {
    return await dbTx.transaction(async (tx) => {
      const result = await provisionStudentAccountCore(tx, studentId);
      return { success: true, ...result };
    });
  } catch (error) {
    if (error instanceof StudentProvisioningError) {
      return { success: false, error: error.code };
    }
    console.error('Student account provisioning failed:', error);
    return { success: false, error: 'provisioning_failed' };
  }
}

