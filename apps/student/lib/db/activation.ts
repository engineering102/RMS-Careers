import 'server-only';

import { db, accountTokens, students, userRoles, users } from '@rms/db';
import { hashPassword, hashToken, hasRole } from '@rms/auth';
import { and, eq, gt, isNull } from 'drizzle-orm';

export type ActivationResult = { success: true } | { success: false; error: string };

export async function activateStudentAccount(rawToken: string, password: string): Promise<ActivationResult> {
  if (!rawToken || !password || !process.env.POSTGRES_URL) return { success: false, error: 'This activation link is invalid or unavailable.' };
  try {
    const tokenHash = await hashToken(rawToken);
    const passwordHash = await hashPassword(password);
    const now = new Date();
    return await db.transaction(async (tx) => {
      const consumed = await tx.update(accountTokens).set({ consumedAt: now }).where(and(eq(accountTokens.tokenHash, tokenHash), eq(accountTokens.tokenType, 'activation'), isNull(accountTokens.consumedAt), gt(accountTokens.expiresAt, now))).returning({ userId: accountTokens.userId });
      const userId = consumed[0]?.userId;
      if (!userId) return { success: false, error: 'This activation link is invalid, expired, or has already been used.' };
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const roles = await tx.select().from(userRoles).where(eq(userRoles.userId, userId));
      const [student] = await tx.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);
      if (!user || user.status !== 'pending_activation' || !hasRole(roles, 'student') || !student) {
        throw new Error('Activation identity is not eligible');
      }
      await tx.update(users).set({ passwordHash, status: 'active', emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, userId));
      return { success: true };
    });
  } catch { return { success: false, error: 'This activation link is invalid or unavailable.' }; }
}
