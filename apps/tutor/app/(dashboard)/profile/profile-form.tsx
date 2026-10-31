'use client';

import { useActionState, useEffect } from 'react';
import { changePasswordAction, updateProfileAction, type PasswordFormState, type ProfileFormState } from './actions';
import type { TutorProfile } from '@/lib/db/queries/profile';

const inputClass =
  'mt-1 min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive';
const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function ProfileForm({ profile }: { profile: TutorProfile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  const err = state.fieldErrors ?? {};
  const field = (name: keyof typeof err) => ({
    name,
    id: `profile-${name}`,
    'aria-invalid': err[name] ? true : undefined,
    'aria-describedby': err[name] ? `profile-${name}-error` : undefined
  });

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="profile-headline" className="text-sm font-medium">Headline</label>
        <input {...field('headline')} defaultValue={profile.headline ?? ''} maxLength={120} className={inputClass} />
        <FieldError id="profile-headline-error" message={err.headline} />
      </div>
      <div>
        <label htmlFor="profile-bio" className="text-sm font-medium">Bio</label>
        <textarea {...field('bio')} defaultValue={profile.bio ?? ''} maxLength={1000} rows={5} className={`${inputClass} py-2`} />
        <FieldError id="profile-bio-error" message={err.bio} />
      </div>
      <div>
        <label htmlFor="profile-linkedinUrl" className="text-sm font-medium">LinkedIn profile</label>
        <input {...field('linkedinUrl')} type="url" inputMode="url" defaultValue={profile.linkedinUrl ?? ''} className={inputClass} />
        <FieldError id="profile-linkedinUrl-error" message={err.linkedinUrl} />
      </div>
      <div>
        <label htmlFor="profile-githubUrl" className="text-sm font-medium">GitHub profile</label>
        <input {...field('githubUrl')} type="url" inputMode="url" defaultValue={profile.githubUrl ?? ''} className={inputClass} />
        <FieldError id="profile-githubUrl-error" message={err.githubUrl} />
      </div>
      <div aria-live="polite">
        {state.success ? <p className="text-sm text-success">{state.message}</p> : null}
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changePasswordAction, {});
  useEffect(() => {
    // Every session ended with the change, this one included: clear the cookie and say why on /login.
    if (state.success) window.location.assign('/api/session/revoked?reason=password-changed');
  }, [state.success]);

  const described = (name: PasswordFormState['field']) =>
    state.field === name ? { 'aria-invalid': true as const, 'aria-describedby': 'password-error' } : {};

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="text-sm font-medium">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} {...described('currentPassword')} />
      </div>
      <div>
        <label htmlFor="newPassword" className="text-sm font-medium">New password</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required className={inputClass} {...described('newPassword')} />
        <p className="mt-1 text-xs text-muted-foreground">At least 12 characters.</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required className={inputClass} {...described('confirmPassword')} />
      </div>
      <div aria-live="polite">
        {state.error ? (
          <p id="password-error" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.success ? <p className="text-sm text-success">Password changed. Signing you out…</p> : null}
      </div>
      <p className="text-xs text-muted-foreground">Changing your password signs you out on every device, including this one.</p>
      <button type="submit" disabled={pending || state.success} className={buttonClass}>
        {pending ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}
