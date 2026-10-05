'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { requestPasswordRecovery } from '@/lib/db/password-recovery';

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

  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : headerList.get('x-real-ip') || undefined;

  return requestPasswordRecovery(parsed.data.email, clientIp);
}
