import Link from 'next/link';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith('/')
    ? callbackUrl
    : callbackUrl
      ? new URL(callbackUrl).pathname
      : undefined;

  return <main className="grid min-h-screen place-items-center p-5"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl"><p className="text-sm font-semibold text-blue-300">RMS CAREERS</p><h1 className="mt-2 text-3xl font-bold">Student Portal</h1><p className="mt-2 text-slate-300">Sign in with the account provisioned by your institution.</p>{error && <p role="alert" className="mt-4 text-sm text-red-300">You do not have access to the Student Portal.</p>}<div className="mt-7"><LoginForm callbackUrl={safeCallbackUrl} /></div><p className="mt-5 text-sm text-slate-400">Need to set your password? <Link className="text-blue-300 underline" href="/activate">Activate your account</Link>.</p></section></main>;
}
