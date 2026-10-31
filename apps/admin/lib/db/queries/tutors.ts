import 'server-only';

import {
  db,
  accountTokens,
  batches,
  students,
  tutorBatchAssignments,
  tutors,
  userRoles,
  users
} from '@rms/db';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { generateToken, hashPassword, hashToken } from '@rms/auth';
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';

/**
 * Tutor accounts and batch assignments (tutor plan WS-7, §10).
 *
 * Identity rule (plan decision D-5): a tutor account never shares an email with a student or an administrator.
 * Admin credentials must not be usable on the tutor domain, and a tutor-side password reset must not be able to
 * change an admin password, so a person who is both uses a separate email for the tutor account.
 *
 * Tutors are never deleted: reviews keep pointing at them (reviewed_by_* is ON DELETE SET NULL). Deactivation
 * (tutors.is_active) ends tutor-portal access on the next request; unassigning ends access to that batch.
 */

/** Same lifetime as student activation links. */
export const TUTOR_ACTIVATION_TTL_HOURS = 168;

export type TutorAccountState = 'pending_activation' | 'active' | 'inactive' | 'suspended';

export interface TutorListItem {
  tutorId: string;
  userId: string;
  fullName: string;
  email: string;
  headline: string | null;
  state: TutorAccountState;
  assignedBatchCount: number;
  createdAt: Date;
}

export interface TutorInvitation {
  tutorId: string;
  userId: string;
  email: string;
  fullName: string;
  /** Raw single-use token for the emailed link. Never log or persist it. */
  rawToken: string;
  expiresAt: Date;
}

export type CreateTutorResult =
  | { ok: true; invitation: TutorInvitation }
  | { ok: false; code: 'student_email' | 'admin_email' | 'already_tutor' | 'email_in_use' };

export type ReissueInvitationResult =
  | { ok: true; invitation: TutorInvitation }
  | { ok: false; code: 'not_found' | 'already_active' | 'inactive' };

export type AssignTutorResult =
  | { ok: true; created: boolean }
  | { ok: false; code: 'tutor_not_found' | 'tutor_inactive' | 'batch_not_found' };

function accountState(userStatus: string, isActive: boolean): TutorAccountState {
  if (!isActive) return 'inactive';
  if (userStatus === 'pending_activation') return 'pending_activation';
  if (userStatus === 'active') return 'active';
  return 'suspended';
}

async function issueActivationToken(tx: AnyDbClient, userId: string, now: Date) {
  const rawToken = generateToken(32);
  const expiresAt = new Date(now.getTime() + TUTOR_ACTIVATION_TTL_HOURS * 60 * 60 * 1000);
  await tx.insert(accountTokens).values({ userId, tokenHash: await hashToken(rawToken), tokenType: 'activation', expiresAt });
  return { rawToken, expiresAt };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

/** Every tutor with account state and number of assigned batches; one query. */
export async function listTutors(): Promise<TutorListItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  const rows = await db
    .select({
      tutorId: tutors.id,
      userId: tutors.userId,
      fullName: tutors.fullName,
      email: users.email,
      headline: tutors.headline,
      isActive: tutors.isActive,
      userStatus: users.status,
      createdAt: tutors.createdAt,
      assignedBatchCount: sql<number>`(select count(*)::int from ${tutorBatchAssignments} where ${tutorBatchAssignments.tutorId} = ${tutors.id})`
    })
    .from(tutors)
    .innerJoin(users, eq(users.id, tutors.userId))
    .orderBy(asc(tutors.fullName));
  return rows.map(({ isActive, userStatus, ...r }) => ({
    ...r,
    assignedBatchCount: Number(r.assignedBatchCount),
    state: accountState(userStatus, isActive)
  }));
}

/**
 * Creates the user (pending activation, unusable random password), the `tutor` role, the tutor profile and an
 * activation token in ONE transaction: any failure leaves no partial account. The invitation email is sent by the
 * caller after commit, so a mail failure never undoes the account (use reissueTutorInvitation to resend).
 */
export async function createTutorAccount(input: {
  email: string;
  fullName: string;
  headline?: string | null;
}): Promise<CreateTutorResult> {
  const email = input.email.trim().toLowerCase();
  // bcrypt is CPU-heavy: hash before opening the transaction so the connection is not held for it.
  const placeholderHash = await hashPassword(generateToken(32));

  try {
    return await dbTx.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);

      if (existing) {
        const roles = (await tx.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, existing.id))).map(
          (r) => r.role
        );
        if (roles.includes('admin') || roles.includes('super_admin')) return { ok: false, code: 'admin_email' } as const;
        if (roles.includes('student')) return { ok: false, code: 'student_email' } as const;
        if (roles.includes('tutor')) return { ok: false, code: 'already_tutor' } as const;
        return { ok: false, code: 'email_in_use' } as const;
      }

      // A student record can exist before its login account (provisioning links them later by email).
      const [studentRecord] = await tx
        .select({ id: students.id })
        .from(students)
        .where(sql`lower(${students.email}) = ${email}`)
        .limit(1);
      if (studentRecord) return { ok: false, code: 'student_email' } as const;

      const now = new Date();
      const [user] = await tx
        .insert(users)
        .values({ email, name: input.fullName, passwordHash: placeholderHash, status: 'pending_activation' })
        .returning({ id: users.id });
      await tx.insert(userRoles).values({ userId: user.id, role: 'tutor' });
      const [tutor] = await tx
        .insert(tutors)
        .values({ userId: user.id, fullName: input.fullName, headline: input.headline ?? null })
        .returning({ id: tutors.id });
      const activation = await issueActivationToken(tx, user.id, now);

      return {
        ok: true,
        invitation: { tutorId: tutor.id, userId: user.id, email, fullName: input.fullName, ...activation }
      } as const;
    });
  } catch (error) {
    // Two admins creating the same email at once: the unique index on users.email decides.
    if (isUniqueViolation(error)) return { ok: false, code: 'email_in_use' };
    throw error;
  }
}

/**
 * New activation link for a tutor who has not activated yet. Unused earlier links are invalidated in the same
 * transaction, so only the newest email works.
 */
export async function reissueTutorInvitation(tutorId: string): Promise<ReissueInvitationResult> {
  return dbTx.transaction(async (tx) => {
    const [row] = await tx
      .select({ userId: tutors.userId, fullName: tutors.fullName, isActive: tutors.isActive, email: users.email, status: users.status })
      .from(tutors)
      .innerJoin(users, eq(users.id, tutors.userId))
      .where(eq(tutors.id, tutorId))
      .limit(1);
    if (!row) return { ok: false, code: 'not_found' } as const;
    if (!row.isActive) return { ok: false, code: 'inactive' } as const;
    if (row.status !== 'pending_activation') return { ok: false, code: 'already_active' } as const;

    const now = new Date();
    await tx
      .update(accountTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(accountTokens.userId, row.userId),
          eq(accountTokens.tokenType, 'activation'),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      );
    const activation = await issueActivationToken(tx, row.userId, now);
    return {
      ok: true,
      invitation: { tutorId, userId: row.userId, email: row.email, fullName: row.fullName, ...activation }
    } as const;
  });
}

/**
 * Activates or deactivates a tutor profile. Does not touch users.status or users.updated_at: tutor access is
 * re-checked against tutors.is_active on every tutor-portal request, so no session revocation is needed.
 */
export async function setTutorActive(tutorId: string, isActive: boolean): Promise<boolean> {
  const updated = await db
    .update(tutors)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(tutors.id, tutorId))
    .returning({ id: tutors.id });
  return updated.length > 0;
}

export interface BatchTutorItem {
  tutorId: string;
  fullName: string;
  email: string;
  state: TutorAccountState;
  assignedAt: Date;
}

/** Tutors assigned to one batch. */
export async function getBatchTutors(batchId: string): Promise<BatchTutorItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  const rows = await db
    .select({
      tutorId: tutors.id,
      fullName: tutors.fullName,
      email: users.email,
      isActive: tutors.isActive,
      userStatus: users.status,
      assignedAt: tutorBatchAssignments.assignedAt
    })
    .from(tutorBatchAssignments)
    .innerJoin(tutors, eq(tutors.id, tutorBatchAssignments.tutorId))
    .innerJoin(users, eq(users.id, tutors.userId))
    .where(eq(tutorBatchAssignments.batchId, batchId))
    .orderBy(asc(tutors.fullName));
  return rows.map(({ isActive, userStatus, ...r }) => ({ ...r, state: accountState(userStatus, isActive) }));
}

/** Active tutors, for the assignment picker. */
export async function getAssignableTutors(): Promise<Array<{ tutorId: string; fullName: string; email: string }>> {
  if (!process.env.POSTGRES_URL) return [];
  return db
    .select({ tutorId: tutors.id, fullName: tutors.fullName, email: users.email })
    .from(tutors)
    .innerJoin(users, eq(users.id, tutors.userId))
    .where(eq(tutors.isActive, true))
    .orderBy(asc(tutors.fullName));
}

/** Assigns a tutor to a batch. Idempotent: assigning twice is not an error. */
export async function addTutorToBatch(tutorId: string, batchId: string): Promise<AssignTutorResult> {
  const [[tutor], [batch]] = await Promise.all([
    db.select({ isActive: tutors.isActive }).from(tutors).where(eq(tutors.id, tutorId)).limit(1),
    db.select({ id: batches.id }).from(batches).where(eq(batches.id, batchId)).limit(1)
  ]);
  if (!tutor) return { ok: false, code: 'tutor_not_found' };
  if (!tutor.isActive) return { ok: false, code: 'tutor_inactive' };
  if (!batch) return { ok: false, code: 'batch_not_found' };

  const inserted = await db
    .insert(tutorBatchAssignments)
    .values({ tutorId, batchId })
    .onConflictDoNothing({ target: [tutorBatchAssignments.tutorId, tutorBatchAssignments.batchId] })
    .returning({ id: tutorBatchAssignments.id });
  return { ok: true, created: inserted.length > 0 };
}

/** Removes the assignment. Review history stays on the submissions. Returns false if there was none. */
export async function removeTutorFromBatch(tutorId: string, batchId: string): Promise<boolean> {
  const removed = await db
    .delete(tutorBatchAssignments)
    .where(and(eq(tutorBatchAssignments.tutorId, tutorId), eq(tutorBatchAssignments.batchId, batchId)))
    .returning({ id: tutorBatchAssignments.id });
  return removed.length > 0;
}
