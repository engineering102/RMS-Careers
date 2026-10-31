'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getTutorContext } from '@/lib/db/tutor-context';
import { updateTutorProfile } from '@/lib/db/queries/profile';
import { changeTutorPassword } from '@/lib/db/tutor-accounts';

export interface ProfileFormState {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<'headline' | 'bio' | 'linkedinUrl' | 'githubUrl', string>>;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `At most ${max} characters.`)
    .transform((v) => (v === '' ? null : v));

const profileLink = (host: RegExp, example: string) =>
  z
    .string()
    .trim()
    .max(300, 'At most 300 characters.')
    .refine((v) => {
      if (v === '') return true;
      try {
        const url = new URL(v);
        return url.protocol === 'https:' && host.test(url.hostname);
      } catch {
        return false;
      }
    }, `Enter a link like ${example}.`)
    .transform((v) => (v === '' ? null : v));

const profileSchema = z.object({
  headline: optionalText(120),
  bio: optionalText(1000),
  linkedinUrl: profileLink(/^([a-z]+\.)?linkedin\.com$/i, 'https://www.linkedin.com/in/your-name'),
  githubUrl: profileLink(/^github\.com$/i, 'https://github.com/your-name')
});

/** Own profile only; writes the tutors row and never users.updated_at (plan §8 updateProfileAction). */
export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const tutor = await getTutorContext();
  if (!tutor) return { error: 'Your session has ended. Sign in again to continue.' };

  const parsed = profileSchema.safeParse({
    headline: String(formData.get('headline') ?? ''),
    bio: String(formData.get('bio') ?? ''),
    linkedinUrl: String(formData.get('linkedinUrl') ?? ''),
    githubUrl: String(formData.get('githubUrl') ?? '')
  });
  if (!parsed.success) {
    const fieldErrors: ProfileFormState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState['fieldErrors']>;
      fieldErrors[key] ??= issue.message;
    }
    return { error: 'Check the highlighted fields.', fieldErrors };
  }

  try {
    if (!(await updateTutorProfile(tutor.tutorId, parsed.data))) return { error: 'Your profile could not be saved.' };
  } catch (error) {
    console.error('[tutor-profile] update failed:', error instanceof Error ? error.name : 'unknown');
    return { error: 'Your profile could not be saved. Please try again.' };
  }
  try {
    revalidatePath('/profile');
  } catch {
    // Outside a request (tests).
  }
  return { success: true, message: 'Profile saved.' };
}

export interface PasswordFormState {
  success?: boolean;
  error?: string;
  field?: 'currentPassword' | 'newPassword' | 'confirmPassword';
}

/** Changes the password and ends every session (this one too); the form then sends the tutor to sign in. */
export async function changePasswordAction(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const tutor = await getTutorContext();
  if (!tutor) return { error: 'Your session has ended. Sign in again to continue.' };

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  if (newPassword !== String(formData.get('confirmPassword') ?? '')) {
    return { error: 'The new passwords do not match.', field: 'confirmPassword' };
  }
  if (newPassword.length > 200 || currentPassword.length > 200) return { error: 'Passwords must be at most 200 characters.', field: 'newPassword' };

  const result = await changeTutorPassword(tutor.userId, currentPassword, newPassword);
  return result.success ? { success: true } : { error: result.error, field: result.field };
}
