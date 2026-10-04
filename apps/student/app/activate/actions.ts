'use server';
import { z } from 'zod';
import { activateStudentAccount } from '@/lib/db/activation';

const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i), password: z.string().min(12, 'Use at least 12 characters.'), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type ActivationState = { success?: boolean; error?: string };

export async function activateAction(_: ActivationState, formData: FormData): Promise<ActivationState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid activation details.' };
  return activateStudentAccount(parsed.data.token, parsed.data.password);
}
