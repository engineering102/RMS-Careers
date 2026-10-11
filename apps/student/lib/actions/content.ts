'use server';

import { revalidatePath } from 'next/cache';
import { db, enrollments } from '@rms/db';
import { eq, and } from 'drizzle-orm';
import { requireStudentEntitlement, hasBatchAccess } from '@/lib/db/queries/entitlements';
import { awardActivityXp } from '@/lib/services/xp-ledger';
import { getContentItem } from '@/lib/db/queries/content';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LECTURE_COMPLETION_XP = 5;

/**
 * Server Action: Marks a lecture/resource as watched and completed for the authenticated student.
 * Guarantees server-authoritative entitlement and idempotent XP allocation.
 *
 * @param contentItemId Target content item UUID.
 * @param batchId Optional cohort batch context.
 */
export async function markLectureWatched(
  contentItemId: string,
  batchId?: string
): Promise<ActionResult<{ isCompleted: boolean; xpAwarded: number }>> {
  try {
    // 1. Authorize: Session must belong to an active student
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;

    // 2. Validate content item ID format
    if (!contentItemId || !UUID_REGEX.test(contentItemId)) {
      return { success: false, error: 'Content not found', code: 'NOT_FOUND' };
    }

    // 3. Verify student entitlement to this content item and release availability
    try {
      await getContentItem(studentId, contentItemId, batchId);
    } catch {
      return { success: false, error: 'Content not found', code: 'NOT_FOUND' };
    }

    // 4. Validate batch entitlement if batchId was provided (shared lifecycle policy).
    let verifiedBatchId: string | null = null;
    if (batchId && UUID_REGEX.test(batchId)) {
      if (!(await hasBatchAccess(studentId, batchId))) {
        const [enrollment] = await db
          .select({ status: enrollments.status })
          .from(enrollments)
          .where(and(eq(enrollments.studentId, studentId), eq(enrollments.batchId, batchId)))
          .limit(1);
        return {
          success: false,
          error: enrollment?.status === 'completed'
            ? 'This batch is completed and in read-only mode.'
            : 'You do not have active entitlement to this batch.',
          code: 'UNAUTHORIZED_BATCH'
        };
      }
      verifiedBatchId = batchId;
    }

    // 5. Idempotent, race-safe completion + XP (ledger and student_stats move together; audit F-07).
    const award = await awardActivityXp({
      studentId,
      batchId: verifiedBatchId,
      activityType: 'lecture_completed',
      referenceId: contentItemId,
      xp: LECTURE_COMPLETION_XP
    });

    if (!award.awarded) {
      return {
        success: true,
        data: { isCompleted: true, xpAwarded: 0 },
        message: 'Already marked as completed'
      };
    }

    // Revalidate paths for instant client freshness
    revalidatePath(`/content/${contentItemId}`);
    revalidatePath('/overview');
    if (verifiedBatchId) {
      revalidatePath(`/batches/${verifiedBatchId}`);
    }

    return {
      success: true,
      data: { isCompleted: true, xpAwarded: award.xpAwarded },
      message: `Completed! +${award.xpAwarded} XP`
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
    console.error('[Action:markLectureWatched] Error marking lecture as watched:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while saving your progress.',
      code: 'INTERNAL_ERROR'
    };
  }
}
