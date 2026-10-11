import 'server-only';

import { db, users } from '@rms/db';
import { eq } from 'drizzle-orm';

/**
 * Server-side sign-out: every session issued before `at` stops being accepted (see
 * lib/auth/session-revocation.ts). `at` comes from the Worker clock, the same clock that stamps the
 * `authTime` claim at sign-in, so a fresh sign-in right after a sign-out is not affected by skew
 * between the Worker and the database.
 */
export async function revokeAllSessionsForUser(userId: string, at: Date): Promise<void> {
  await db.update(users).set({ updatedAt: at }).where(eq(users.id, userId));
}
