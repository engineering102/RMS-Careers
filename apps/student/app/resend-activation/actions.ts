'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { requestActivationResend } from '@/lib/db/activation';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.')
});

export type ResendActivationState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function resendActivationAction(
  _: ResendActivationState,
  formData: FormData
): Promise<ResendActivationState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid email address.' };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : headerList.get('x-real-ip') || undefined;

  return requestActivationResend(parsed.data.email, clientIp);
}
