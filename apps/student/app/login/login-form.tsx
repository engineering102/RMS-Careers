'use client';
import { useActionState } from 'react';
import { loginAction } from './actions';

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="space-y-5"><input type="hidden" name="callbackUrl" value={callbackUrl || '/dashboard'} />
    <label className="block text-sm font-medium">Institutional email<input className="mt-2 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3" name="email" type="email" autoComplete="email" required /></label>
    <label className="block text-sm font-medium">Password<input className="mt-2 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3" name="password" type="password" autoComplete="current-password" required /></label>
    {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
    <button className="min-h-11 w-full rounded-lg bg-blue-500 px-4 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
