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
        <div role="status" className="rounded-xl border border-success/40 bg-success/10 p-5 text-sm text-foreground">
          <p className="font-semibold text-foreground">Request Processed</p>
          <p className="mt-1">{state.message}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          <Link href="/login" className="text-primary hover:underline">
            Return to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-medium text-foreground">
        Institutional Email
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
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
        {pending ? 'Sending link…' : 'Resend activation link'}
      </button>
    </form>
  );
}
