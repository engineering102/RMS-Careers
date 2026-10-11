import 'server-only';

import { db, users } from '@rms/db';
import { eq } from 'drizzle-orm';

/**
 * Server-side sign-out: sessions issued before `at` fail lib/auth.ts revalidation. `at` is taken from
 * the Worker clock, which also stamps the `authTime` claim, so clock skew with the database cannot
 * revoke a sign-in that happens right after.
 */
export async function revokeAllSessionsForUser(userId: string, at: Date): Promise<void> {
  await db.update(users).set({ updatedAt: at }).where(eq(users.id, userId));
}
