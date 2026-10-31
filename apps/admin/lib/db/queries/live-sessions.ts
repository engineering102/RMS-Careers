import 'server-only';

import { db, batchLiveSessions, type BatchLiveSession } from '@rms/db';
import { and, asc, eq } from 'drizzle-orm';

/**
 * Batch live sessions (migration 0006, tutor plan WS-8). Every statement is keyed by (batch_id, id), so a session
 * id from another batch is never read or changed through this batch's page.
 */

export interface LiveSessionInput {
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

/** All sessions of a batch, published or not, in display order. */
export async function listBatchLiveSessions(batchId: string): Promise<BatchLiveSession[]> {
  if (!process.env.POSTGRES_URL) return [];
  return db
    .select()
    .from(batchLiveSessions)
    .where(eq(batchLiveSessions.batchId, batchId))
    .orderBy(asc(batchLiveSessions.sortOrder), asc(batchLiveSessions.createdAt));
}

export async function createLiveSession(batchId: string, input: LiveSessionInput, createdByUserId: string): Promise<string> {
  const [row] = await db
    .insert(batchLiveSessions)
    .values({ batchId, ...input, createdByUserId })
    .returning({ id: batchLiveSessions.id });
  return row.id;
}

/** Returns false when the session does not exist in this batch. */
export async function updateLiveSession(batchId: string, sessionId: string, input: LiveSessionInput): Promise<boolean> {
  const updated = await db
    .update(batchLiveSessions)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(batchLiveSessions.batchId, batchId), eq(batchLiveSessions.id, sessionId)))
    .returning({ id: batchLiveSessions.id });
  return updated.length > 0;
}

export async function setLiveSessionPublished(batchId: string, sessionId: string, isPublished: boolean): Promise<boolean> {
  const updated = await db
    .update(batchLiveSessions)
    .set({ isPublished, updatedAt: new Date() })
    .where(and(eq(batchLiveSessions.batchId, batchId), eq(batchLiveSessions.id, sessionId)))
    .returning({ id: batchLiveSessions.id });
  return updated.length > 0;
}

export async function deleteLiveSession(batchId: string, sessionId: string): Promise<boolean> {
  const deleted = await db
    .delete(batchLiveSessions)
    .where(and(eq(batchLiveSessions.batchId, batchId), eq(batchLiveSessions.id, sessionId)))
    .returning({ id: batchLiveSessions.id });
  return deleted.length > 0;
}
