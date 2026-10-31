'use server';

import { AuthError } from 'next-auth';
import { z } from 'zod';
import { signIn } from '@/lib/auth';
import { toPostLoginTarget } from '@/lib/auth/callback-url';

const schema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.'), callbackUrl: z.string().startsWith('/').optional() });
export async function loginAction(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid sign-in details.' };
  try { await signIn('credentials', { ...parsed.data, redirectTo: toPostLoginTarget(parsed.data.callbackUrl) }); return {}; }
  catch (error) {
    if (error instanceof AuthError) {
      if ((error as { code?: string }).code === 'rate_limited') return { error: 'Too many sign-in attempts. Please wait a minute and try again.' };
      return { error: 'Invalid email, password, or tutor account status.' };
    }
    throw error;
  }
}
