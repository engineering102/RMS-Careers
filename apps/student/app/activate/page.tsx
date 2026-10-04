import Link from 'next/link';
import { ActivationForm } from './activation-form';

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const validToken = typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
  return <main className="grid min-h-screen place-items-center p-5"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7"><p className="text-sm font-semibold text-blue-300">RMS CAREERS</p><h1 className="mt-2 text-3xl font-bold">Activate your account</h1><p className="mt-2 text-slate-300">Create a password to access your Student Portal.</p><div className="mt-7">{validToken ? <ActivationForm token={token} /> : <p role="alert" className="rounded-lg bg-red-950 p-4 text-red-200">This activation link is invalid. Contact your institutional coordinator for a new link.</p>}</div><p className="mt-5 text-sm text-slate-400"><Link className="text-blue-300 underline" href="/login">Return to sign in</Link></p></section></main>;
}
