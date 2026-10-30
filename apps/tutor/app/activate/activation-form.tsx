'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { activateAction, type ActivationState } from './actions';

export function ActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActivationState, FormData>(activateAction, {});
  if (state.success) return <p className="rounded-lg bg-success/10 p-4 text-foreground">Your account is active. <Link className="underline" href="/login">Sign in now</Link>.</p>;
  return <form action={action} className="space-y-5"><input type="hidden" name="token" value={token} /><label className="block text-sm font-medium">New password<input className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3" type="password" name="password" autoComplete="new-password" minLength={12} required /></label><label className="block text-sm font-medium">Confirm password<input className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3" type="password" name="confirmPassword" autoComplete="new-password" minLength={12} required /></label>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<button className="min-h-11 w-full rounded-lg bg-primary font-semibold disabled:opacity-60" disabled={pending}>{pending ? 'Activating…' : 'Activate account'}</button></form>;
}
