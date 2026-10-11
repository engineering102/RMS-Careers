'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { enforceAuthLimits, ipKey, trustedClientIp } from '@/lib/security/request-limits';
import { resetStudentPassword } from '@/lib/db/password-recovery';

const schema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid reset token.'),
    password: z.string().min(12, 'Password must be at least 12 characters.'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.'
  });

export type ResetPasswordState = {
  success?: boolean;
  error?: string;
};

export async function resetPasswordAction(
  _: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid password details.' };
  }

  // Each attempt costs a bcrypt hash; bound it per client.
  const limit = await enforceAuthLimits({ client: ipKey('reset', trustedClientIp(await headers())) });
  if (!limit.allowed) return { error: 'Too many requests. Please wait a minute and try again.' };

  return resetStudentPassword(parsed.data.token, parsed.data.password);
}
