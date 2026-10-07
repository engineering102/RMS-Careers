'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { COHORT_COOKIE_NAME, COHORT_COOKIE_MAX_AGE } from '@/lib/constants/cohort';

const switchCohortSchema = z.object({
  batchId: z.string().uuid()
});

export type SetActiveCohortResult = {
  success: boolean;
  activeBatchId?: string;
  error?: string;
};

/**
 * Server Action: Validates and persists the student's selected active cohort.
 * Guarantees server authority: Verifies that the requested batchId belongs
 * to the authenticated student's active enrollments.
 */
export async function setActiveCohortAction(
  batchId: string
): Promise<SetActiveCohortResult> {
  try {
    const parsed = switchCohortSchema.safeParse({ batchId });
    if (!parsed.success) {
      return { success: false, error: 'Invalid batch identifier format.' };
    }

    const context = await requireStudentEntitlement();
    if (!context.hasActiveEntitlement || !context.student) {
      return { success: false, error: 'Unauthorized: No active student entitlement.' };
    }

    // Verify requested batchId is present in active batches
    const isEnrolled = context.activeBatches.some((b) => b.batchId === parsed.data.batchId);
    if (!isEnrolled) {
      return {
        success: false,
        error: 'UnauthorizedBatchSelection: You are not actively enrolled in this cohort.'
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(COHORT_COOKIE_NAME, parsed.data.batchId, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      maxAge: COHORT_COOKIE_MAX_AGE
    });

    return {
      success: true,
      activeBatchId: parsed.data.batchId
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message?.includes('NEXT_REDIRECT')
    ) {
      return {
        success: false,
        error: 'Unauthorized: Please log in'
      };
    }
    console.error('[CohortAction] Error setting active cohort:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while switching cohorts.'
    };
  }
}
