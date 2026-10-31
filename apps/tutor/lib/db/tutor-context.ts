import 'server-only';

import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { db, batches, colleges, programs, tutorBatchAssignments, tutors } from '@rms/db';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { isBatchInScope, tutorScope, type AcademicScope } from '@rms/academic/scope';
import { auth } from '@/lib/auth';
import { isSessionCurrent } from '@/lib/auth/session-revocation';
import { SESSION_REVOKED_PATH } from '@/lib/constants/session';
import { evaluateTutorAccount } from './tutor-access';
import { loadTutorAccount } from './tutor-accounts';

/**
 * The signed-in tutor and the batches they may see, re-read from the database on every request (tutor plan §5.5).
 * The JWT only says who signed in and when; access comes from current rows, so deactivation, unassignment, a role
 * change or a password reset take effect on the next request. Cached per request only (React cache), never across
 * requests or users.
 */

/** Same rule students are held to (apps/student/lib/db/access-policy.ts): only live batches are visible. */
const VISIBLE_BATCH_STATUSES = ['active', 'completed'];

export interface TutorContext {
  userId: string;
  tutorId: string;
  fullName: string;
  email: string;
  batchIds: readonly string[];
  /** Pass to every @rms/academic query. */
  scope: AcademicScope;
}

async function assignedBatchIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ batchId: tutorBatchAssignments.batchId })
    .from(tutorBatchAssignments)
    .innerJoin(tutors, eq(tutors.id, tutorBatchAssignments.tutorId))
    .innerJoin(batches, eq(batches.id, tutorBatchAssignments.batchId))
    .innerJoin(colleges, eq(colleges.id, batches.collegeId))
    .innerJoin(programs, eq(programs.id, batches.programId))
    .where(
      and(
        eq(tutors.userId, userId),
        inArray(batches.status, VISIBLE_BATCH_STATUSES),
        eq(colleges.isActive, true),
        ne(programs.status, 'archived')
      )
    );
  return rows.map((r) => r.batchId);
}

/** The current tutor, or null when the session is missing, revoked or no longer authorised. Fails closed. */
export const getTutorContext = cache(async (): Promise<TutorContext | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || session.user.role !== 'tutor' || !process.env.POSTGRES_URL) return null;

  try {
    // Both reads depend only on the user id: one round trip.
    const [account, batchIds] = await Promise.all([loadTutorAccount(db, { userId }), assignedBatchIds(userId)]);
    if (!account || evaluateTutorAccount(account, 'active') !== 'ok') return null;
    if (!isSessionCurrent(session.user.authTime, account.updatedAt)) return null;
    return {
      userId,
      tutorId: account.tutorId!,
      fullName: account.fullName ?? 'Tutor',
      email: account.email,
      batchIds,
      scope: tutorScope(batchIds)
    };
  } catch (error) {
    console.error('[tutor-context] session revalidation failed:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
});

/** Page and action guard: the current tutor, or a redirect that clears the session cookie and shows /login. */
export async function requireTutor(): Promise<TutorContext> {
  const context = await getTutorContext();
  if (!context) redirect(SESSION_REVOKED_PATH);
  return context;
}

/** Guard for batch routes: an unassigned batch and an unknown one give the same 404. */
export async function requireTutorBatch(batchId: string): Promise<TutorContext> {
  const context = await requireTutor();
  if (!isBatchInScope(context.scope, batchId)) notFound();
  return context;
}
