import { BrandMark } from '@/components/shell/brand-mark';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { toSafeCallbackPath } from '@/lib/auth/callback-url';
import { loginErrorMessage } from '@/lib/auth/login-errors';

export const metadata = {
  title: 'Sign in — RMS Student Portal',
  description: 'Sign in to access your RMS Careers Student Learning Portal.'
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
    <main className="bg-paper grid min-h-dvh place-items-center bg-background p-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-sm sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrandMark />
          RMS Careers
        </p>
        <h1 className="mt-6 text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted-foreground">Use the account your college set up for you.</p>

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
