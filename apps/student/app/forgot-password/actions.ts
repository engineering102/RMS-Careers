'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { requestPasswordRecovery } from '@/lib/db/password-recovery';
import { accountKey, enforceAuthLimits, ipKey, trustedClientIp } from '@/lib/security/request-limits';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.')
});

export type ForgotPasswordState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function forgotPasswordAction(
  _: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid email address.' };
  }

  // Client identity from Cloudflare only (never x-forwarded-for); limits per client and per account.
  const clientIp = trustedClientIp(await headers()) ?? undefined;
  const limit = await enforceAuthLimits({ client: ipKey('recovery', clientIp ?? null), account: accountKey('recovery', parsed.data.email) });
  if (!limit.allowed) return { error: 'Too many requests. Please wait a minute and try again.' };

  return requestPasswordRecovery(parsed.data.email, clientIp);
}
