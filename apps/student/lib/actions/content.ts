'use server';

import { revalidatePath } from 'next/cache';
import { db, activities, enrollments } from '@rms/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getContentItem } from '@/lib/db/queries/content';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns current date in Asia/Kolkata timezone as YYYY-MM-DD.
 */
function getKolkataDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

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

    // 3. Verify student entitlement to this content item
    try {
      await getContentItem(studentId, contentItemId);
    } catch {
      return { success: false, error: 'Content not found', code: 'NOT_FOUND' };
    }

    // 4. Validate batch entitlement if batchId was provided
    let verifiedBatchId: string | null = null;
    if (batchId && UUID_REGEX.test(batchId)) {
      const [enrollment] = await db
        .select({ batchId: enrollments.batchId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.batchId, batchId),
            sql`${enrollments.status} IN ('active', 'confirmed')`
          )
        )
        .limit(1);

      if (enrollment) {
        verifiedBatchId = batchId;
      }
    }

    // 5. Check if completion is already recorded in activities
    const [existing] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          eq(activities.studentId, studentId),
          eq(activities.activityType, 'lecture_completed'),
          eq(activities.referenceId, contentItemId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: true,
        data: { isCompleted: true, xpAwarded: 0 },
        message: 'Already marked as completed'
      };
    }

    // 6. Record completion in activities table (idempotent + awards 5 XP)
    const activityDateIst = getKolkataDateString();
    const xpToAward = 5;

    await db
      .insert(activities)
      .values({
        studentId,
        batchId: verifiedBatchId,
        activityType: 'lecture_completed',
        referenceId: contentItemId,
        xpAwarded: xpToAward,
        activityDateIst
      })
      .onConflictDoNothing();

    // Revalidate paths for instant client freshness
    revalidatePath(`/content/${contentItemId}`);
    revalidatePath('/overview');
    if (verifiedBatchId) {
      revalidatePath(`/batches/${verifiedBatchId}`);
    }

    return {
      success: true,
      data: { isCompleted: true, xpAwarded: xpToAward },
      message: `Completed! +${xpToAward} XP`
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
