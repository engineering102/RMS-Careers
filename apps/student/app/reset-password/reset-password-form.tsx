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
          className="rounded-xl border border-emerald-800 bg-emerald-950/70 p-5 text-sm text-emerald-200"
        >
          <p className="font-semibold text-emerald-100">Password Updated</p>
          <p className="mt-1">
            Your password has been successfully reset. You can now sign in with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="block text-center rounded-lg bg-blue-500 py-2.5 px-4 font-semibold text-white transition hover:bg-blue-600"
          >
            Sign in to Student Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <label className="block text-sm font-medium text-slate-200">
        New Password
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="At least 12 characters"
          required
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        Confirm New Password
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={12}
          placeholder="Repeat new password"
          required
        />
      </label>

      {state.error && (
        <div role="alert" className="rounded-lg border border-red-800 bg-red-950/70 p-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        className="min-h-11 w-full rounded-lg bg-blue-500 font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
        disabled={pending}
      >
        {pending ? 'Updating password…' : 'Reset password'}
      </button>
    </form>
  );
}
