import 'server-only';

import { db, accountTokens, tutors, users } from '@rms/db';
import { dbTx, type AnyDbClient } from '@rms/db/tx';
import { generateToken, hashPassword, hashToken, verifyPassword } from '@rms/auth';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { checkRateLimit } from '../rate-limit';
import {
  renderActivationLinkEmail,
  renderPasswordResetEmail,
  sendAccountEmail
} from '../email/account-emails';
import { evaluateTutorAccount, type TutorAccountRecord } from './tutor-access';

/**
 * Tutor sign-in, activation and password recovery (tutor plan §5.5). Mirrors the student portal's hardened flows:
 * one bcrypt comparison on every sign-in path, single-use hashed tokens consumed atomically, generic answers that
 * never reveal whether an account exists, per-email and per-client limits, and emails sent only after commit.
 * Who counts as a tutor is decided by evaluateTutorAccount (tutor-access.ts).
 */

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;
const TOKEN_FORMAT = /^[a-f0-9]{64}$/i;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

export const GENERIC_RECOVERY_MESSAGE = 'If a tutor account exists for this email, a password reset link has been sent.';
export const GENERIC_RESEND_MESSAGE =
  'If a tutor account pending activation exists for this email, an activation link has been sent.';

let equalizationHashPromise: Promise<string> | undefined;

/** A bcrypt hash of a random secret, computed once per isolate; compared against when no account matches. */
function equalizationHash(): Promise<string> {
  equalizationHashPromise ??= hashPassword(crypto.randomUUID() + crypto.randomUUID());
  return equalizationHashPromise;
}

const accountColumns = {
  userId: users.id,
  email: users.email,
  status: users.status,
  passwordHash: users.passwordHash,
  updatedAt: users.updatedAt,
  tutorId: tutors.id,
  tutorActive: tutors.isActive,
  fullName: tutors.fullName,
  roles: sql<string[]>`(select coalesce(array_agg(ur.role::text), '{}') from user_roles ur where ur.user_id = ${users.id})`
};

/** One query: the user, their tutor profile (if any) and their roles. */
export async function loadTutorAccount(
  client: AnyDbClient,
  by: { email: string } | { userId: string }
): Promise<(TutorAccountRecord & { passwordHash: string; email: string; fullName: string | null }) | null> {
  const where = 'email' in by ? sql`lower(${users.email}) = ${by.email.trim().toLowerCase()}` : eq(users.id, by.userId);
  const [row] = await client.select(accountColumns).from(users).leftJoin(tutors, eq(tutors.userId, users.id)).where(where).limit(1);
  if (!row) return null;
  return { ...row, roles: row.roles ?? [], updatedAt: row.updatedAt ?? null };
}

// ---------------------------------------------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------------------------------------------

export interface TutorIdentity {
  userId: string;
  tutorId: string;
  email: string;
  name: string;
}

/** Exactly one bcrypt comparison on every path, so timing does not reveal which emails have accounts. */
export async function authenticateTutor(email: string, password: string): Promise<TutorIdentity | null> {
  if (!email || !password || !process.env.POSTGRES_URL) return null;
  try {
    const account = await loadTutorAccount(db, { email });
    const eligible = account !== null && evaluateTutorAccount(account, 'active') === 'ok';
    const passwordOk = await verifyPassword(password, eligible ? account!.passwordHash : await equalizationHash());
    if (!eligible || !passwordOk) return null;
    return { userId: account!.userId, tutorId: account!.tutorId!, email: account!.email, name: account!.fullName ?? 'Tutor' };
  } catch (error) {
    // Rejected generically, but visible in Workers logs: an outage must not look like bad passwords. Never the email.
    console.error('[tutor-auth] sign-in lookup failed:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------------------------------------------

export type ActivationTokenState =
  | { status: 'valid'; email: string; name: string }
  | { status: 'expired' | 'consumed' | 'already_active' | 'invalid' };

async function findToken(rawToken: string, tokenType: 'activation' | 'password_reset') {
  const [token] = await db
    .select({ userId: accountTokens.userId, expiresAt: accountTokens.expiresAt, consumedAt: accountTokens.consumedAt })
    .from(accountTokens)
    .where(and(eq(accountTokens.tokenHash, await hashToken(rawToken)), eq(accountTokens.tokenType, tokenType)))
    .limit(1);
  return token ?? null;
}

/** Checks an activation link without consuming it (drives which state the /activate page shows). */
export async function validateActivationToken(rawToken: string): Promise<ActivationTokenState> {
  if (!TOKEN_FORMAT.test(rawToken ?? '') || !process.env.POSTGRES_URL) return { status: 'invalid' };
  try {
    const token = await findToken(rawToken, 'activation');
    if (!token) return { status: 'invalid' };
    const account = await loadTutorAccount(db, { userId: token.userId });
    if (!account) return { status: 'invalid' };
    if (account.status === 'active' && evaluateTutorAccount(account, 'active') === 'ok') return { status: 'already_active' };
    if (evaluateTutorAccount(account, 'pending_activation') !== 'ok') return { status: 'invalid' };
    if (token.consumedAt) return { status: 'consumed' };
    if (new Date() >= token.expiresAt) return { status: 'expired' };
    return { status: 'valid', email: account.email, name: account.fullName ?? 'Tutor' };
  } catch (error) {
    console.error('[tutor-activation] token validation failed:', error instanceof Error ? error.name : 'unknown');
    return { status: 'invalid' };
  }
}

export type ActivationResult = { success: true } | { success: false; error: string };

/** Consumes the link and sets the first password in one transaction. */
export async function activateTutorAccount(rawToken: string, password: string): Promise<ActivationResult> {
  if (!TOKEN_FORMAT.test(rawToken ?? '') || !password || !process.env.POSTGRES_URL) {
    return { success: false, error: 'This activation link is invalid or unavailable.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };

  try {
    const tokenHash = await hashToken(rawToken);
    const passwordHash = await hashPassword(password);
    const now = new Date();
    return await dbTx.transaction(async (tx) => {
      const [consumed] = await tx
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
      if (!consumed) return { success: false as const, error: 'This activation link is invalid, expired, or has already been used.' };

      const account = await loadTutorAccount(tx, { userId: consumed.userId });
      // Throwing rolls the token consumption back too.
      if (!account || evaluateTutorAccount(account, 'pending_activation') !== 'ok') throw new Error('Activation identity is not eligible');

      await tx
        .update(users)
        .set({ passwordHash, status: 'active', emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, consumed.userId));
      return { success: true as const };
    });
  } catch {
    return { success: false, error: 'This activation link is invalid or unavailable.' };
  }
}

function limited(prefix: string, email: string, clientIp: string | undefined): boolean {
  if (!checkRateLimit({ key: `${prefix}:email:${email}`, limit: 1, windowMs: RECOVERY_WINDOW_MS }).success) return true;
  if (clientIp && !checkRateLimit({ key: `${prefix}:ip:${clientIp}`, limit: 3, windowMs: RECOVERY_WINDOW_MS }).success) return true;
  return false;
}

async function issueToken(userId: string, tokenType: 'activation' | 'password_reset', ttlMs: number) {
  const now = new Date();
  const rawToken = generateToken(32);
  const expiresAt = new Date(now.getTime() + ttlMs);
  await dbTx.transaction(async (tx) => {
    // Only the newest link works.
    await tx
      .update(accountTokens)
      .set({ consumedAt: now })
      .where(and(eq(accountTokens.userId, userId), eq(accountTokens.tokenType, tokenType), isNull(accountTokens.consumedAt)));
    await tx.insert(accountTokens).values({ userId, tokenHash: await hashToken(rawToken), tokenType, expiresAt });
  });
  return { rawToken, expiresAt };
}

export type RequestResult = { success: true; message: string } | { success: false; error: string };

/** Self-service activation resend for an invited tutor whose link expired. Generic answer either way. */
export async function requestActivationResend(email: string, clientIp?: string): Promise<RequestResult> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !process.env.POSTGRES_URL) return { success: true, message: GENERIC_RESEND_MESSAGE };
  if (limited('tutor-activation-resend', normalized, clientIp)) return { success: false, error: 'Too many requests. Please try again later.' };

  try {
    const account = await loadTutorAccount(db, { email: normalized });
    if (account && evaluateTutorAccount(account, 'pending_activation') === 'ok') {
      const { rawToken, expiresAt } = await issueToken(account.userId, 'activation', ACTIVATION_TTL_MS);
      if (process.env.NODE_ENV === 'development') console.info(`[tutor-activation dev] /activate?token=${rawToken}`);
      await sendAccountEmail(account.email, renderActivationLinkEmail({ name: account.fullName ?? undefined, token: rawToken, expiresAt }));
    }
  } catch (error) {
    console.error('[tutor-activation] resend failed:', error instanceof Error ? error.name : 'unknown');
  }
  return { success: true, message: GENERIC_RESEND_MESSAGE };
}

// ---------------------------------------------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------------------------------------------

/** Sends a 1-hour reset link to an active tutor. Generic answer either way. */
export async function requestPasswordRecovery(email: string, clientIp?: string): Promise<RequestResult> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !process.env.POSTGRES_URL) return { success: true, message: GENERIC_RECOVERY_MESSAGE };
  if (limited('tutor-pw-reset', normalized, clientIp)) return { success: false, error: 'Too many requests. Please try again later.' };

  try {
    const account = await loadTutorAccount(db, { email: normalized });
    if (account && evaluateTutorAccount(account, 'active') === 'ok') {
      const { rawToken, expiresAt } = await issueToken(account.userId, 'password_reset', RESET_TTL_MS);
      if (process.env.NODE_ENV === 'development') console.info(`[tutor-recovery dev] /reset-password?token=${rawToken}`);
      await sendAccountEmail(account.email, renderPasswordResetEmail({ name: account.fullName ?? undefined, token: rawToken, expiresAt }));
    }
  } catch (error) {
    console.error('[tutor-recovery] request failed:', error instanceof Error ? error.name : 'unknown');
  }
  return { success: true, message: GENERIC_RECOVERY_MESSAGE };
}

export type ResetTokenState = { valid: true; email: string } | { valid: false; error: string; code: 'INVALID' | 'EXPIRED' | 'CONSUMED' };

export async function validatePasswordResetToken(rawToken: string): Promise<ResetTokenState> {
  if (!TOKEN_FORMAT.test(rawToken ?? '') || !process.env.POSTGRES_URL) {
    return { valid: false, error: 'This password reset link is invalid or malformed.', code: 'INVALID' };
  }
  try {
    const token = await findToken(rawToken, 'password_reset');
    if (!token) return { valid: false, error: 'This password reset link is invalid or unavailable.', code: 'INVALID' };
    if (token.consumedAt) return { valid: false, error: 'This password reset link has already been used. Please request a new link.', code: 'CONSUMED' };
    if (new Date() >= token.expiresAt) return { valid: false, error: 'This password reset link has expired. Reset links are valid for 1 hour.', code: 'EXPIRED' };
    const account = await loadTutorAccount(db, { userId: token.userId });
    if (!account || evaluateTutorAccount(account, 'active') !== 'ok') {
      return { valid: false, error: 'This account is not eligible for password recovery.', code: 'INVALID' };
    }
    return { valid: true, email: account.email };
  } catch (error) {
    console.error('[tutor-recovery] token validation failed:', error instanceof Error ? error.name : 'unknown');
    return { valid: false, error: 'Unable to validate reset link.', code: 'INVALID' };
  }
}

/**
 * Consumes the reset link and sets the new password in one transaction. Stamping users.updated_at revokes every
 * existing tutor session on every device (session-revocation.ts).
 */
export async function resetTutorPassword(rawToken: string, newPassword: string): Promise<ActivationResult> {
  if (!TOKEN_FORMAT.test(rawToken ?? '') || !newPassword || !process.env.POSTGRES_URL) {
    return { success: false, error: 'Invalid reset details provided.' };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };

  try {
    const tokenHash = await hashToken(rawToken);
    const passwordHash = await hashPassword(newPassword);
    const now = new Date();
    return await dbTx.transaction(async (tx) => {
      const [consumed] = await tx
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
      if (!consumed) return { success: false as const, error: 'This password reset link is invalid, expired, or has already been used.' };

      const account = await loadTutorAccount(tx, { userId: consumed.userId });
      if (!account || evaluateTutorAccount(account, 'active') !== 'ok') throw new Error('Reset identity is not eligible');

      await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, consumed.userId));
      await tx
        .update(accountTokens)
        .set({ consumedAt: now })
        .where(and(eq(accountTokens.userId, consumed.userId), eq(accountTokens.tokenType, 'password_reset'), isNull(accountTokens.consumedAt)));
      return { success: true as const };
    });
  } catch {
    return { success: false, error: 'This password reset link is invalid or unavailable.' };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Change password (signed in)
// ---------------------------------------------------------------------------------------------------------------

export type ChangePasswordResult = { success: true } | { success: false; error: string; field?: 'currentPassword' | 'newPassword' };

/**
 * Checks the current password, then sets the new one. Stamping users.updated_at ends every tutor session, this one
 * included, so the caller sends the tutor to sign in again (tutor plan §8 changePasswordAction).
 */
export async function changeTutorPassword(userId: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, field: 'newPassword' };
  }
  if (newPassword === currentPassword) {
    return { success: false, error: 'Choose a password different from the current one.', field: 'newPassword' };
  }
  if (!process.env.POSTGRES_URL) return { success: false, error: 'Password change is unavailable right now.' };

  try {
    const account = await loadTutorAccount(db, { userId });
    if (!account || evaluateTutorAccount(account, 'active') !== 'ok') return { success: false, error: 'Password change is unavailable right now.' };
    if (!(await verifyPassword(currentPassword ?? '', account.passwordHash))) {
      return { success: false, error: 'The current password is incorrect.', field: 'currentPassword' };
    }
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error('[tutor-auth] password change failed:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Password change is unavailable right now.' };
  }
}
