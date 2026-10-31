import 'server-only';

/**
 * Live sessions of a tutor's batches (tutor plan §8 /batches/[batchId]/live). Tutors see unpublished sessions too
 * and get the Join link; the link may carry a passcode, so it is never logged.
 */
import { and, asc, eq } from 'drizzle-orm';
import { batchLiveSessions } from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { inScope, isBatchInScope, type AcademicScope } from '../scope';

export interface TutorLiveSession {
  id: string;
  batchId: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  joiningInstructions: string | null;
  recurrenceDays: number[];
  startTime: string;
  durationMinutes: number;
  startsOn: string | null;
  endsOn: string | null;
  isPublished: boolean;
}

const columns = {
  id: batchLiveSessions.id,
  batchId: batchLiveSessions.batchId,
  title: batchLiveSessions.title,
  description: batchLiveSessions.description,
  meetingUrl: batchLiveSessions.meetingUrl,
  joiningInstructions: batchLiveSessions.joiningInstructions,
  recurrenceDays: batchLiveSessions.recurrenceDays,
  startTime: batchLiveSessions.startTime,
  durationMinutes: batchLiveSessions.durationMinutes,
  startsOn: batchLiveSessions.startsOn,
  endsOn: batchLiveSessions.endsOn,
  isPublished: batchLiveSessions.isPublished
};

/** Every session of one batch, published or not. */
export async function getBatchLiveSessions(client: DbClient, scope: AcademicScope, batchId: string): Promise<TutorLiveSession[]> {
  if (!isBatchInScope(scope, batchId)) return [];
  return client
    .select(columns)
    .from(batchLiveSessions)
    .where(eq(batchLiveSessions.batchId, batchId))
    .orderBy(asc(batchLiveSessions.sortOrder), asc(batchLiveSessions.createdAt));
}

/** Published sessions across the scope (for the overview's "next class"). */
export async function getPublishedLiveSessions(client: DbClient, scope: AcademicScope): Promise<TutorLiveSession[]> {
  return client
    .select(columns)
    .from(batchLiveSessions)
    .where(and(inScope(batchLiveSessions.batchId, scope), eq(batchLiveSessions.isPublished, true)))
    .orderBy(asc(batchLiveSessions.sortOrder), asc(batchLiveSessions.createdAt));
}
