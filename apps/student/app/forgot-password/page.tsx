import Link from 'next/link';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = {
  title: 'Reset Password — RMS Student Portal',
  description: 'Request a password reset link for your RMS Careers student account.'
};

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-5 bg-background text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-foreground/80">
          Enter your registered institutional email to receive a secure password reset link.
        </p>

        <div className="mt-7">
          <ForgotPasswordForm />
        </div>

        <div className="mt-6 flex justify-between text-sm text-muted-foreground">
          <Link className="text-primary hover:underline" href="/login">
            Return to sign in
          </Link>
          <Link className="text-primary hover:underline" href="/activate">
            Need to activate?
          </Link>
        </div>
      </section>
    </main>
  );
}
