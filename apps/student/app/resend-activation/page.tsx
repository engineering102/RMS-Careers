import Link from 'next/link';
import { ResendActivationForm } from './resend-form';

export const metadata = {
  title: 'Resend Activation Link — RMS Student Portal',
  description: 'Request a new account activation link for your RMS Careers student account.'
};

export default function ResendActivationPage() {
  return (
    <main className="grid min-h-screen place-items-center p-5 bg-slate-950 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-blue-400 uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Resend Activation</h1>
        <p className="mt-2 text-slate-300">
          Enter the institutional email address registered by your college coordinator.
        </p>

        <div className="mt-7">
          <ResendActivationForm />
        </div>

        <div className="mt-6 flex justify-between text-sm text-slate-400">
          <Link className="text-blue-400 hover:underline" href="/login">
            Return to sign in
          </Link>
          <Link className="text-blue-400 hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </section>
    </main>
  );
}
