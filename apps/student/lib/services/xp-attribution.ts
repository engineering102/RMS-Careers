import 'server-only';

import { cookies } from 'next/headers';
import { resolveActiveCohort, type StudentBatchItem } from '@/lib/db/queries/entitlements';
import { ACTIVE_COHORT_COOKIE_NAME } from '@/lib/constants/cohort';

/**
 * Picks the batch an XP award is attributed to.
 *
 * Batch leaderboards only count batch-attributed activity, so an award must never land with a
 * null batch while the student has an active cohort. Precedence: the requested batch (when the
 * student currently has access to it) → the active-cohort cookie → the first active batch → null.
 */
export function resolveXpBatchId(
  activeBatches: StudentBatchItem[],
  requestedBatchId?: string | null,
  cookieBatchId?: string | null
): string | null {
  return (
    resolveActiveCohort(activeBatches, { queryBatchId: requestedBatchId, cookieBatchId })?.batchId ??
    null
  );
}

/** Server Action variant: reads the active-cohort cookie from the current request. */
export async function getXpAttributionBatchId(
  activeBatches: StudentBatchItem[],
  requestedBatchId?: string | null
): Promise<string | null> {
  let cookieBatchId: string | undefined;
  try {
    cookieBatchId = (await cookies()).get(ACTIVE_COHORT_COOKIE_NAME)?.value;
  } catch {
    // Outside a request scope (scripts/tests): fall back to the first active batch.
  }
  return resolveXpBatchId(activeBatches, requestedBatchId, cookieBatchId);
}
