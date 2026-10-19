'use server';

import { revalidatePath } from 'next/cache';
import { db, studentDsaProgress } from '@rms/db';
import { eq, and } from 'drizzle-orm';
import { requireStudentEntitlement, hasBatchAccess } from '@/lib/db/queries/entitlements';
import { awardActivityXp } from '@/lib/services/xp-ledger';
import { getXpAttributionBatchId } from '@/lib/services/xp-attribution';
import { getDsaQuestionBySlug } from '@/lib/data/dsa-sheets';
import type { RecordDsaProblemInput } from '@/lib/types/dsa';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Server Action: Records or updates a solved DSA problem for the authenticated student.
 * Guarantees server-authoritative progress recording and duplicate-resistant XP allocation.
 */
export async function recordDsaProblemSolved(
  input: RecordDsaProblemInput
): Promise<ActionResult<{ isNewlySolved: boolean; xpAwarded: number }>> {
  try {
    // 1. Authorize: Session must belong to an active student
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { problemSlug, submissionUrl, notes, batchId } = input;

    // 2. Validate problem slug against catalog
    if (!problemSlug || typeof problemSlug !== 'string') {
      return { success: false, error: 'Invalid problem slug.', code: 'INVALID_INPUT' };
    }

    const problemItem = getDsaQuestionBySlug(problemSlug);
    if (!problemItem) {
      return { success: false, error: 'Problem not found in catalog.', code: 'NOT_FOUND' };
    }

    // 3. Sanitize optional URL and notes
    let sanitizedUrl: string | null = null;
    if (submissionUrl && submissionUrl.trim().length > 0) {
      const trimmed = submissionUrl.trim();
      if (!/^https?:\/\/.+/i.test(trimmed)) {
        return {
          success: false,
          error: 'Submission URL must start with http:// or https://',
          code: 'INVALID_URL'
        };
      }
      sanitizedUrl = trimmed;
    }

    const sanitizedNotes = notes && notes.trim().length > 0 ? notes.trim() : null;

    // 4. XP is attributed to the requested batch when the student has access to it, else to the
    // active cohort, so batch leaderboards see it even when the page was opened without ?batchId.
    const verifiedBatchId = await getXpAttributionBatchId(
      context.activeBatches,
      batchId && UUID_REGEX.test(batchId) && (await hasBatchAccess(studentId, batchId)) ? batchId : null
    );

    // 5. Check if problem was already solved by this student
    const [existing] = await db
      .select({
        id: studentDsaProgress.id,
        isCompleted: studentDsaProgress.isCompleted
      })
      .from(studentDsaProgress)
      .where(
        and(
          eq(studentDsaProgress.studentId, studentId),
          eq(studentDsaProgress.problemSlug, problemSlug)
        )
      )
      .limit(1);

    if (existing && existing.isCompleted) {
      // Already solved: update submission notes and URL without awarding duplicate XP
      await db
        .update(studentDsaProgress)
        .set({
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          updatedAt: new Date()
        })
        .where(eq(studentDsaProgress.id, existing.id));

      revalidatePath('/dsa', 'layout');
      return {
        success: true,
        data: { isNewlySolved: false, xpAwarded: 0 },
        message: 'Submission details updated.'
      };
    }

    // 6. Newly solved: calculate XP based on problem difficulty
    const difficulty = problemItem.question.difficulty;
    let xpToAward = 10; // Default Easy
    if (difficulty === 'medium') {
      xpToAward = 25;
    } else if (difficulty === 'hard') {
      xpToAward = 50;
    }

    const now = new Date();

    // 7. Insert or update progress record
    if (existing) {
      await db
        .update(studentDsaProgress)
        .set({
          isCompleted: true,
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          completedAt: now,
          updatedAt: now
        })
        .where(eq(studentDsaProgress.id, existing.id));
    } else {
      await db
        .insert(studentDsaProgress)
        .values({
          studentId,
          problemSlug,
          isCompleted: true,
          submissionUrl: sanitizedUrl,
          notes: sanitizedNotes,
          completedAt: now,
          updatedAt: now
        })
        .onConflictDoNothing();
    }

    // 8. Idempotent, race-safe XP + streak + dsa_solved_count (single statement; see xp-ledger.ts).
    // Concurrent requests for the same problem award once; the response reports what was awarded.
    const award = await awardActivityXp({
      studentId,
      batchId: verifiedBatchId,
      activityType: 'dsa_solved',
      referenceId: problemSlug,
      xp: xpToAward,
      now
    });
    const xpAwarded = award.xpAwarded;

    // Revalidate paths for instant client freshness
    revalidatePath('/dsa', 'layout');
    revalidatePath('/overview');
    if (verifiedBatchId) {
      revalidatePath(`/batches/${verifiedBatchId}`);
    }

    return {
      success: true,
      data: { isNewlySolved: award.awarded, xpAwarded },
      message: award.awarded ? `Problem solved! +${xpAwarded} XP` : 'Submission details updated.'
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
    ) {
      throw error;
    }
    console.error('[Action:recordDsaProblemSolved] Error saving DSA progress:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while saving your DSA progress.',
      code: 'INTERNAL_ERROR'
    };
  }
}
