import Link from 'next/link';
import { ResendActivationForm } from './resend-form';

export const metadata = {
  title: 'Resend Activation Link — RMS Student Portal',
  description: 'Request a new account activation link for your RMS Careers student account.'
};

export default function ResendActivationPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-5 bg-background text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Resend Activation</h1>
        <p className="mt-2 text-foreground/80">
          Enter the institutional email address registered by your college coordinator.
        </p>

        <div className="mt-7">
          <ResendActivationForm />
        </div>

        <div className="mt-6 flex justify-between text-sm text-muted-foreground">
          <Link className="text-primary hover:underline" href="/login">
            Return to sign in
          </Link>
          <Link className="text-primary hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </section>
    </main>
  );
}
