import Link from 'next/link';
import { validatePasswordResetToken } from '@/lib/db/tutor-accounts';
import { ResetPasswordForm } from './reset-password-form';

export const metadata = {
  title: 'Set New Password — RMS Tutor Portal',
  description: 'Set a new password for your RMS Careers tutor account.'
};

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let validationResult:
    | { valid: true; email: string }
    | { valid: false; error: string; code: 'INVALID' | 'EXPIRED' | 'CONSUMED' }
    | { valid: false; error: string; code: 'MISSING' } = {
    valid: false,
    error: 'Reset token is required.',
    code: 'MISSING'
  };

  if (typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token)) {
    const res = await validatePasswordResetToken(token);
    validationResult = res;
  } else if (token) {
    validationResult = {
      valid: false,
      error: 'This password reset link is malformed or invalid.',
      code: 'INVALID'
    };
  }

  return (
    <main className="grid min-h-dvh place-items-center p-5 bg-background text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Set new password</h1>
        <p className="mt-2 text-foreground/80">Choose a secure password for your Tutor Portal account.</p>

        <div className="mt-7">
          {validationResult.valid ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/70 p-3 text-sm text-foreground/80">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Account</p>
                <p className="font-medium text-foreground mt-0.5">{validationResult.email}</p>
              </div>
              <ResetPasswordForm token={token!} />
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-xl border border-destructive/50 bg-destructive/10 p-5 text-sm text-foreground space-y-3"
            >
              <p className="font-semibold text-foreground">
                {validationResult.code === 'EXPIRED'
                  ? 'Password Reset Link Expired'
                  : validationResult.code === 'CONSUMED'
                    ? 'Reset Link Already Used'
                    : 'Invalid Reset Link'}
              </p>
              <p>{validationResult.error}</p>
              <div className="pt-2">
                <Link
                  href="/forgot-password"
                  className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Request New Reset Link
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link className="text-primary hover:underline font-medium" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
