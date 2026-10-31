import 'server-only';

/**
 * Tutor overview metrics (tutor plan §8 /overview, §14 budget): review workload per batch in one grouped query.
 */
import { sql } from 'drizzle-orm';
import { assignmentSubmissions } from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { inScope, type AcademicScope } from '../scope';

export interface BatchReviewLoad {
  batchId: string;
  /** Submitted and not yet claimed (resubmissions included). */
  awaitingReview: number;
  underReview: number;
  changesRequested: number;
  approved: number;
  /** Oldest submission still awaiting a claim. */
  oldestAwaitingAt: Date | null;
}

export interface TutorOverviewMetrics {
  byBatch: Map<string, BatchReviewLoad>;
  totals: Omit<BatchReviewLoad, 'batchId' | 'oldestAwaitingAt'> & { oldestAwaitingAt: Date | null };
  /** Submissions under review that this user claimed. */
  myClaims: number;
}

export async function getTutorOverviewMetrics(client: DbClient, scope: AcademicScope, userId: string): Promise<TutorOverviewMetrics> {
  const rows = await client
    .select({
      batchId: assignmentSubmissions.batchId,
      awaitingReview: sql<number>`count(*) filter (where ${assignmentSubmissions.status} = 'submitted')::int`,
      underReview: sql<number>`count(*) filter (where ${assignmentSubmissions.status} = 'under_review')::int`,
      changesRequested: sql<number>`count(*) filter (where ${assignmentSubmissions.status} = 'resubmission_requested')::int`,
      approved: sql<number>`count(*) filter (where ${assignmentSubmissions.status} = 'approved')::int`,
      myClaims: sql<number>`count(*) filter (where ${assignmentSubmissions.status} = 'under_review' and ${assignmentSubmissions.reviewedByUserId} = ${userId})::int`,
      oldestAwaitingAt: sql<string | null>`min(${assignmentSubmissions.submittedAt}) filter (where ${assignmentSubmissions.status} = 'submitted')`
    })
    .from(assignmentSubmissions)
    .where(inScope(assignmentSubmissions.batchId, scope))
    .groupBy(assignmentSubmissions.batchId);

  const byBatch = new Map<string, BatchReviewLoad>();
  const totals: TutorOverviewMetrics['totals'] = { awaitingReview: 0, underReview: 0, changesRequested: 0, approved: 0, oldestAwaitingAt: null };
  let myClaims = 0;
  for (const r of rows) {
    const oldest = r.oldestAwaitingAt ? new Date(r.oldestAwaitingAt) : null;
    const load: BatchReviewLoad = {
      batchId: r.batchId,
      awaitingReview: Number(r.awaitingReview),
      underReview: Number(r.underReview),
      changesRequested: Number(r.changesRequested),
      approved: Number(r.approved),
      oldestAwaitingAt: oldest
    };
    byBatch.set(r.batchId, load);
    totals.awaitingReview += load.awaitingReview;
    totals.underReview += load.underReview;
    totals.changesRequested += load.changesRequested;
    totals.approved += load.approved;
    if (oldest && (!totals.oldestAwaitingAt || oldest < totals.oldestAwaitingAt)) totals.oldestAwaitingAt = oldest;
    myClaims += Number(r.myClaims);
  }
  return { byBatch, totals, myClaims };
}

/** Reads one batch's load out of the metrics; zeros when it has no submissions. */
export function batchLoad(metrics: TutorOverviewMetrics, batchId: string): BatchReviewLoad {
  return (
    metrics.byBatch.get(batchId) ?? { batchId, awaitingReview: 0, underReview: 0, changesRequested: 0, approved: 0, oldestAwaitingAt: null }
  );
}
