import 'server-only';

import { db, accountTokens, type AccountToken, type TokenTypeEnum } from '@rms/db';
import { generateToken, hashToken } from '@rms/auth';
import { eq, and, isNull, gt } from 'drizzle-orm';

/**
 * Creates and persists a single-use account token.
 * Generates a cryptographically random raw token, stores only its SHA-256 hash in the database,
 * and returns the raw token to the caller (e.g., for secure email delivery).
 *
 * @param data.userId The user ID receiving the token
 * @param data.tokenType 'activation' or 'password_reset'
 * @param data.ttlHours Time-to-live in hours (defaults: activation = 168h [7 days], password_reset = 1h)
 * @returns Object containing the ephemeral rawToken and the persisted tokenRecord
 */
export async function createAccountToken(data: {
  userId: string;
  tokenType: TokenTypeEnum;
  ttlHours?: number;
}): Promise<{ rawToken: string; tokenRecord: AccountToken }> {
  const rawToken = generateToken(32);
  const tokenHash = await hashToken(rawToken);

  const defaultHours = data.tokenType === 'activation' ? 168 : 1;
  const hours = data.ttlHours ?? defaultHours;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const [tokenRecord] = await db
    .insert(accountTokens)
    .values({
      userId: data.userId,
      tokenHash,
      tokenType: data.tokenType,
      expiresAt
    })
    .returning();

  return { rawToken, tokenRecord };
}

/**
 * Validates and consumes a single-use token atomically via compare-and-swap.
 * Enforces replay protection and expiration check.
 *
 * @param data.rawToken The plaintext token candidate supplied by the user
 * @param data.expectedType Expected token type ('activation' | 'password_reset')
 * @returns Promise resolving to the user ID if valid, or null if invalid/expired/already consumed
 */
export async function consumeAccountToken(data: {
  rawToken: string;
  expectedType: TokenTypeEnum;
}): Promise<string | null> {
  if (!data.rawToken || typeof data.rawToken !== 'string') {
    return null;
  }

  try {
    const candidateHash = await hashToken(data.rawToken);
    const now = new Date();

    // Atomic compare-and-swap update
    const updated = await db
      .update(accountTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(accountTokens.tokenHash, candidateHash),
          eq(accountTokens.tokenType, data.expectedType),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, now)
        )
      )
      .returning({ userId: accountTokens.userId });

    if (updated.length === 0) {
      return null;
    }

    return updated[0].userId;
  } catch (error) {
    console.error('Error consuming account token:', error);
    return null;
  }
}
