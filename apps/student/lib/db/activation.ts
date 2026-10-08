import 'server-only';

import { db, accountTokens, students, userRoles, users } from '@rms/db';
import { dbTx } from '@rms/db/tx';
import { generateToken, hashPassword, hashToken, hasRole } from '@rms/auth';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { dispatchDomainEvent } from '../events/dispatcher';
import { checkRateLimit } from '../rate-limit';

export type ActivationResult = { success: true } | { success: false; error: string };

export type ActivationTokenValidationResult =
  | { status: 'valid'; email: string; name: string }
  | { status: 'expired' }
  | { status: 'consumed' }
  | { status: 'already_active' }
  | { status: 'invalid' };

export type ActivationResendResult =
  | { success: true; message: string }
  | { success: false; error: string };

const GENERIC_ACTIVATION_RESEND_MESSAGE =
  'If an account pending activation exists for this email, an activation link has been sent.';

/**
 * Validates an activation token without consuming it.
 * Used for pre-rendering activation page states (valid form vs. expired / consumed / already_active).
 */
export async function validateActivationToken(rawToken: string): Promise<ActivationTokenValidationResult> {
  if (!rawToken || typeof rawToken !== 'string' || !/^[a-f0-9]{64}$/i.test(rawToken)) {
    return { status: 'invalid' };
  }

  if (!process.env.POSTGRES_URL) {
    return { status: 'invalid' };
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
          eq(accountTokens.tokenType, 'activation')
        )
      )
      .limit(1);

    if (!tokenRecord) {
      return { status: 'invalid' };
    }

    const [user] = await db
      .select({ id: users.id, status: users.status, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user) {
      return { status: 'invalid' };
    }

    if (user.status === 'active') {
      return { status: 'already_active' };
    }

    if (tokenRecord.consumedAt) {
      return { status: 'consumed' };
    }

    if (new Date() >= tokenRecord.expiresAt) {
      return { status: 'expired' };
    }

    const [student] = await db
      .select({ fullName: students.fullName })
      .from(students)
      .where(eq(students.userId, user.id))
      .limit(1);

    return {
      status: 'valid',
      email: user.email,
      name: student?.fullName || user.name || 'Student'
    };
  } catch (err) {
    console.error('[Activation] Token validation error:', err);
    return { status: 'invalid' };
  }
}

/**
 * Atomically consumes an activation token, updates user status to active,
 * sets initial password hash, and marks emailVerifiedAt.
 */
export async function activateStudentAccount(rawToken: string, password: string): Promise<ActivationResult> {
  if (!rawToken || !password || !process.env.POSTGRES_URL) {
    return { success: false, error: 'This activation link is invalid or unavailable.' };
  }
  if (password.length < 12) {
    return { success: false, error: 'Password must be at least 12 characters.' };
  }

  try {
    const tokenHash = await hashToken(rawToken);
    const passwordHash = await hashPassword(password);
    const now = new Date();

    return await dbTx.transaction(async (tx) => {
      const consumed = await tx
        .update(accountTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(accountTokens.tokenHash, tokenHash),
            eq(accountTokens.tokenType, 'activation'),
            isNull(accountTokens.consumedAt),
            gt(accountTokens.expiresAt, now)
          )
        )
        .returning({ userId: accountTokens.userId });

      const userId = consumed[0]?.userId;
      if (!userId) {
        return { success: false, error: 'This activation link is invalid, expired, or has already been used.' };
      }

      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const roles = await tx.select().from(userRoles).where(eq(userRoles.userId, userId));
      const [student] = await tx.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);

      if (!user || user.status !== 'pending_activation' || !hasRole(roles, 'student') || !student) {
        throw new Error('Activation identity is not eligible');
      }

      await tx
        .update(users)
        .set({ passwordHash, status: 'active', emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, userId));

      return { success: true };
    });
  } catch {
    return { success: false, error: 'This activation link is invalid or unavailable.' };
  }
}

/**
 * Requests an activation link resend for pending accounts.
 * Enforces rate limiting and anti-enumeration.
 */
export async function requestActivationResend(
  email: string,
  clientIp?: string
): Promise<ActivationResendResult> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !process.env.POSTGRES_URL) {
    return { success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE };
  }

  // 1. Rate limiting check (1 per 15 min per email & IP)
  const emailRate = checkRateLimit({
    key: `activation-resend:email:${normalizedEmail}`,
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
      key: `activation-resend:ip:${clientIp}`,
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
      .select({ id: users.id, status: users.status, email: users.email, name: users.name })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (user && user.status === 'pending_activation') {
      const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
      const [student] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);

      if (hasRole(roles, 'student') && student) {
        const now = new Date();
        // Invalidate prior unused activation tokens for this user
        await db
          .update(accountTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(accountTokens.userId, user.id),
              eq(accountTokens.tokenType, 'activation'),
              isNull(accountTokens.consumedAt)
            )
          );

        // Generate fresh 32-byte token with 7-day TTL
        const rawToken = generateToken(32);
        const tokenHash = await hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.insert(accountTokens).values({
          userId: user.id,
          tokenHash,
          tokenType: 'activation',
          expiresAt
        });

        if (process.env.NODE_ENV === 'development') {
          console.info(`[Activation Resend Dev] Activation link for ${user.email}: /activate?token=${rawToken}`);
        }

        // Post-commit and best-effort: the token is already committed, so a delivery failure
        // must never fail the request or reveal whether the account exists.
        try {
          const results = await dispatchDomainEvent({
            type: 'ACTIVATION_LINK_REQUESTED',
            email: user.email,
            name: user.name ?? undefined,
            rawToken,
            expiresAt
          });
          const emailResult = results.find((r) => r.consumer === 'EmailNotificationConsumer');
          const outcome = emailResult?.result as { sent?: boolean; reason?: string } | undefined;
          if (!emailResult?.success || !outcome?.sent) {
            console.error('[Activation Resend] Email not sent:', outcome?.reason ?? 'consumer_error');
          }
        } catch (dispatchErr) {
          console.error('[Activation Resend] Email dispatch error:', dispatchErr instanceof Error ? dispatchErr.message : 'unknown');
        }
      }
    }
  } catch (err) {
    console.error('[Activation Resend] Internal error:', err);
  }

  return { success: true, message: GENERIC_ACTIVATION_RESEND_MESSAGE };
}
