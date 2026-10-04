'use server';

import { AuthError } from 'next-auth';
import { z } from 'zod';
import { signIn } from '@/lib/auth';

const schema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.'), callbackUrl: z.string().startsWith('/').optional() });
export async function loginAction(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid sign-in details.' };
  try { await signIn('credentials', { ...parsed.data, redirectTo: parsed.data.callbackUrl || '/dashboard' }); return {}; }
  catch (error) { if (error instanceof AuthError) return { error: 'Invalid email, password, or student account status.' }; throw error; }
}
