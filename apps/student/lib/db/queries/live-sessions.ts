import 'server-only';

import { db, batchLiveSessions } from '@rms/db';
import { and, asc, eq } from 'drizzle-orm';

export interface StudentLiveSession {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  joiningInstructions: string | null;
  recurrenceDays: number[];
  startTime: string;
  durationMinutes: number;
  startsOn: string | null;
  endsOn: string | null;
}

/**
 * Published live sessions of a batch (tutor plan WS-8). Callers must check the student's batch entitlement first
 * (assertBatchEntitlement); drafts are never returned.
 */
export async function getPublishedLiveSessions(batchId: string): Promise<StudentLiveSession[]> {
  if (!batchId || !process.env.POSTGRES_URL) return [];
  return db
    .select({
      id: batchLiveSessions.id,
      title: batchLiveSessions.title,
      description: batchLiveSessions.description,
      meetingUrl: batchLiveSessions.meetingUrl,
      joiningInstructions: batchLiveSessions.joiningInstructions,
      recurrenceDays: batchLiveSessions.recurrenceDays,
      startTime: batchLiveSessions.startTime,
      durationMinutes: batchLiveSessions.durationMinutes,
      startsOn: batchLiveSessions.startsOn,
      endsOn: batchLiveSessions.endsOn
    })
    .from(batchLiveSessions)
    .where(and(eq(batchLiveSessions.batchId, batchId), eq(batchLiveSessions.isPublished, true)))
    .orderBy(asc(batchLiveSessions.sortOrder), asc(batchLiveSessions.createdAt));
}
