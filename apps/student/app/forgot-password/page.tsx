import { BrandMark } from '@/components/shell/brand-mark';
import Link from 'next/link';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = {
  title: 'Forgot password — RMS Student Portal',
  description: 'Request a password reset link for your RMS Careers student account.'
};

export default function ForgotPasswordPage() {
  return (
    <main className="bg-paper grid min-h-dvh place-items-center bg-background p-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-sm sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrandMark />
          RMS Careers
        </p>
        <h1 className="mt-6 text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-foreground">
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
