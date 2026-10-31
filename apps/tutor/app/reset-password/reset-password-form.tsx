'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPasswordAction, type ResetPasswordState } from './actions';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {}
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-xl border border-success/40 bg-success/10 p-5 text-sm text-foreground"
        >
          <p className="font-semibold text-foreground">Password Updated</p>
          <p className="mt-1">
            Your password has been successfully reset. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="block text-center rounded-lg bg-primary py-2.5 px-4 font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in to Tutor Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <label className="block text-sm font-medium text-foreground">
        New Password
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="At least 12 characters"
          required
        />
      </label>

      <label className="block text-sm font-medium text-foreground">
        Confirm New Password
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={12}
          placeholder="Repeat new password"
          required
        />
      </label>

      {state.error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        className="min-h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={pending}
      >
        {pending ? 'Updating password…' : 'Reset password'}
      </button>
    </form>
  );
}
