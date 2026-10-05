'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resendActivationAction, type ResendActivationState } from './actions';

export function ResendActivationForm() {
  const [state, action, pending] = useActionState<ResendActivationState, FormData>(
    resendActivationAction,
    {}
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/70 p-5 text-sm text-emerald-200">
          <p className="font-semibold text-emerald-100">Request Processed</p>
          <p className="mt-1">{state.message}</p>
        </div>
        <p className="text-sm text-slate-400 text-center">
          <Link href="/login" className="text-blue-400 hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium text-slate-200">
        Institutional Email
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="student@college.edu"
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
        {pending ? 'Sending link…' : 'Resend activation link'}
      </button>
    </form>
  );
}
