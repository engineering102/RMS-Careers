import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In — RMS Student Portal',
  description: 'Sign in to access your RMS Careers Student Learning Portal.'
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith('/')
    ? callbackUrl
    : callbackUrl
      ? new URL(callbackUrl).pathname
      : undefined;

  return (
    <main className="grid min-h-screen place-items-center p-5 bg-slate-950 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-blue-400 uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Student Portal</h1>
        <p className="mt-2 text-slate-300">Sign in with the account provisioned by your institution.</p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/70 p-3 text-sm text-red-200">
            You do not have access to the Student Portal.
          </p>
        )}

        <div className="mt-7">
          <LoginForm callbackUrl={safeCallbackUrl} />
        </div>

        <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-slate-800 text-sm text-slate-400">
          <div className="flex justify-between">
            <span>Forgot your password?</span>
            <Link className="text-blue-400 hover:underline font-medium" href="/forgot-password">
              Reset password
            </Link>
          </div>
          <div className="flex justify-between">
            <span>First time here?</span>
            <Link className="text-blue-400 hover:underline font-medium" href="/activate">
              Activate account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
