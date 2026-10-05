import 'server-only';

import { db, accountTokens, userRoles, users, students } from '@rms/db';
import { generateToken, hashPassword, hashToken, hasRole } from '@rms/auth';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { checkRateLimit } from '../rate-limit';

export type PasswordRecoveryRequestResult =
  | { success: true; message: string }
  | { success: false; error: string };

export type ResetTokenValidationResult =
  | { valid: true; email: string }
  | { valid: false; error: string; code: 'INVALID' | 'EXPIRED' | 'CONSUMED' };

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

const GENERIC_RECOVERY_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

/**
 * Initiates a self-service password recovery request for students.
 * Enforces rate limiting (1 req / 15 min per email, 3 req / 15 min per IP) and strict anti-enumeration.
 */
export async function requestPasswordRecovery(
  email: string,
  clientIp?: string
): Promise<PasswordRecoveryRequestResult> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !process.env.POSTGRES_URL) {
    return { success: true, message: GENERIC_RECOVERY_MESSAGE };
  }

  // 1. Rate limiting check (per email and per IP)
  const emailRate = checkRateLimit({
    key: `pw-reset:email:${normalizedEmail}`,
    limit: 1,
    windowMs: 15 * 60 * 1000
  });
  if (!emailRate.success) {
    return {
      success: false,
      error: 'Too many requests. Please try again later.'
    };
  }

  if (clientIp) {
    const ipRate = checkRateLimit({
      key: `pw-reset:ip:${clientIp}`,
      limit: 3,
      windowMs: 15 * 60 * 1000
    });
    if (!ipRate.success) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.'
      };
    }
  }

  try {
    const [user] = await db
      .select({ id: users.id, status: users.status, email: users.email })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (user && user.status === 'active') {
      const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
      const [student] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);

      if (hasRole(roles, 'student') && student) {
        const now = new Date();
        // Invalidate prior unused password reset tokens for this user
        await db
          .update(accountTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(accountTokens.userId, user.id),
              eq(accountTokens.tokenType, 'password_reset'),
              isNull(accountTokens.consumedAt)
            )
          );

        // Generate fresh 32-byte token with 1-hour TTL
        const rawToken = generateToken(32);
        const tokenHash = await hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1-hour TTL

        await db.insert(accountTokens).values({
          userId: user.id,
          tokenHash,
          tokenType: 'password_reset',
          expiresAt
        });

        if (process.env.NODE_ENV === 'development') {
          console.info(`[Password Recovery Dev] Reset link for ${user.email}: /reset-password?token=${rawToken}`);
        }
      }
    }
  } catch (err) {
    console.error('[Password Recovery] Internal error during request processing:', err);
  }

  // Anti-enumeration: response is invariant regardless of account existence
  return { success: true, message: GENERIC_RECOVERY_MESSAGE };
}

/**
 * Validates a candidate password reset token without consuming it.
 * Used for pre-rendering UI states (form vs. expired/invalid error banner).
 */
export async function validatePasswordResetToken(
  rawToken: string
): Promise<ResetTokenValidationResult> {
  if (!rawToken || typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/i.test(rawToken)) {
    return {
      valid: false,
      error: 'This password reset link is invalid or malformed.',
      code: 'INVALID'
    };
  }

  if (!process.env.POSTGRES_URL) {
    return {
      valid: false,
      error: 'Database connection is unavailable.',
      code: 'INVALID'
    };
  }

  try {
    const tokenHash = await hashToken(rawToken);
    const [tokenRecord] = await db
      .select({
        id: accountTokens.id,
        userId: accountTokens.userId,
        expiresAt: accountTokens.expiresAt,
        consumedAt: accountTokens.consumedAt,
        tokenType: accountTokens.tokenType
      })
      .from(accountTokens)
      .where(
        and(
          eq(accountTokens.tokenHash, tokenHash),
          eq(accountTokens.tokenType, 'password_reset')
        )
      )
      .limit(1);

    if (!tokenRecord) {
      return {
        valid: false,
        error: 'This password reset link is invalid or unavailable.',
        code: 'INVALID'
      };
    }

    if (tokenRecord.consumedAt) {
      return {
        valid: false,
        error: 'This password reset link has already been used. Please request a new link.',
        code: 'CONSUMED'
      };
    }

    if (new Date() >= tokenRecord.expiresAt) {
      return {
        valid: false,
        error: 'This password reset link has expired. Reset links are valid for 1 hour.',
        code: 'EXPIRED'
      };
    }

    const [user] = await db
      .select({ email: users.email, status: users.status })
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user || user.status !== 'active') {
      return {
        valid: false,
        error: 'The associated account is not eligible for password recovery.',
        code: 'INVALID'
      };
    }

    return { valid: true, email: user.email };
  } catch (err) {
    console.error('[Password Recovery] Token validation error:', err);
    return {
      valid: false,
      error: 'Unable to validate reset link.',
      code: 'INVALID'
    };
  }
}

/**
 * Atomically consumes the reset token, updates the student password hash,
 * and invalidates any other outstanding reset tokens for the user.
 */
export async function resetStudentPassword(
  rawToken: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  if (!rawToken || !newPassword || !process.env.POSTGRES_URL) {
    return { success: false, error: 'Invalid reset details provided.' };
  }

  if (newPassword.length < 12) {
    return { success: false, error: 'Password must be at least 12 characters.' };
  }

  try {
    const tokenHash = await hashToken(rawToken);
    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    return await db.transaction(async (tx) => {
      // 1. Atomic compare-and-swap consumption
      const consumed = await tx
        .update(accountTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(accountTokens.tokenHash, tokenHash),
            eq(accountTokens.tokenType, 'password_reset'),
            isNull(accountTokens.consumedAt),
            gt(accountTokens.expiresAt, now)
          )
        )
        .returning({ userId: accountTokens.userId });

      const userId = consumed[0]?.userId;
      if (!userId) {
        return {
          success: false,
          error: 'This password reset link is invalid, expired, or has already been used.'
        };
      }

      // 2. Validate user identity and student role
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const roles = await tx.select().from(userRoles).where(eq(userRoles.userId, userId));
      const [student] = await tx.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);

      if (!user || user.status !== 'active' || !hasRole(roles, 'student') || !student) {
        throw new Error('Identity not eligible for password reset');
      }

      // 3. Update password hash
      await tx
        .update(users)
        .set({
          passwordHash,
          updatedAt: now
        })
        .where(eq(users.id, userId));

      // 4. Invalidate any remaining unused reset tokens for this user
      await tx
        .update(accountTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(accountTokens.userId, userId),
            eq(accountTokens.tokenType, 'password_reset'),
            isNull(accountTokens.consumedAt)
          )
        );

      return { success: true };
    });
  } catch (err) {
    console.error('[Password Recovery] Reset error:', err);
    return {
      success: false,
      error: 'This password reset link is invalid or unavailable.'
    };
  }
}
