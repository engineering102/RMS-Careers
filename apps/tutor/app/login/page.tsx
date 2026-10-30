import Link from 'next/link';
import { LoginForm } from './login-form';
import { toSafeCallbackPath } from '@/lib/auth/callback-url';
import { loginErrorMessage } from '@/lib/auth/login-errors';

export const metadata = {
  title: 'Sign In — RMS Tutor Portal',
  description: 'Sign in to access your RMS Careers Tutor Portal.'
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const safeCallbackUrl = toSafeCallbackPath(callbackUrl);
  const errorMessage = loginErrorMessage(error);

  return (
    <main className="grid min-h-dvh place-items-center p-5 bg-background text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Tutor Portal</h1>
        <p className="mt-2 text-foreground/80">Sign in with the tutor account RMS Careers invited you to.</p>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
            {errorMessage}
          </p>
        )}

        <div className="mt-7">
          <LoginForm callbackUrl={safeCallbackUrl} />
        </div>

        <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-border text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Forgot your password?</span>
            <Link className="text-primary hover:underline font-medium" href="/forgot-password">
              Reset password
            </Link>
          </div>
          <div className="flex justify-between">
            <span>First time here?</span>
            <Link className="text-primary hover:underline font-medium" href="/activate">
              Activate account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
