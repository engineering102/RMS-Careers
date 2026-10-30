import Link from 'next/link';
import { validateActivationToken } from '@/lib/db/tutor-accounts';
import { ActivationForm } from './activation-form';

export default async function ActivatePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let tokenState:
    | { status: 'valid'; email: string; name: string }
    | { status: 'expired' | 'consumed' | 'already_active' | 'invalid' }
    | { status: 'missing' } = { status: 'missing' };

  if (typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token)) {
    const res = await validateActivationToken(token);
    tokenState = res;
  } else if (token) {
    tokenState = { status: 'invalid' };
  }

  return (
    <main className="grid min-h-dvh place-items-center p-5 bg-background text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-input bg-card p-7 shadow-2xl">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">RMS Careers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Activate your account</h1>
        <p className="mt-2 text-foreground/80">Set your password to access your Tutor Portal.</p>

        <div className="mt-7">
          {tokenState.status === 'valid' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/70 p-3 text-sm text-foreground/80">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Account</p>
                <p className="font-medium text-foreground mt-0.5">{tokenState.name} ({tokenState.email})</p>
              </div>
              <ActivationForm token={token!} />
            </div>
          )}

          {tokenState.status === 'already_active' && (
            <div role="alert" className="rounded-xl border border-primary/40 bg-primary/10 p-5 text-sm text-foreground space-y-3">
              <p className="font-semibold text-foreground">Account Already Activated</p>
              <p>Your tutor account is already active. You can sign in directly using your password.</p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}

          {tokenState.status === 'consumed' && (
            <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-foreground space-y-3">
              <p className="font-semibold text-foreground">Activation Link Already Used</p>
              <p>This single-use activation link has already been consumed. If you have already set your password, please sign in. If you forgot your password, you can reset it.</p>
              <div className="pt-2 flex gap-3">
                <Link
                  href="/login"
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/forgot-password"
                  className="rounded-lg border border-input bg-secondary px-4 py-2 font-semibold text-foreground hover:bg-accent transition"
                >
                  Reset Password
                </Link>
              </div>
            </div>
          )}

          {tokenState.status === 'expired' && (
            <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-5 text-sm text-foreground space-y-3">
              <p className="font-semibold text-foreground">Activation Link Expired</p>
              <p>Activation links expire after 7 days for security. You can request a fresh activation link to complete your setup.</p>
              <div className="pt-2">
                <Link
                  href="/resend-activation"
                  className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Request New Activation Link
                </Link>
              </div>
            </div>
          )}

          {(tokenState.status === 'invalid' || tokenState.status === 'missing') && (
            <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-5 text-sm text-foreground space-y-3">
              <p className="font-semibold text-foreground">Invalid Activation Link</p>
              <p>This activation link is invalid, incomplete, or missing. Please check your invitation email or request a new link.</p>
              <div className="pt-2">
                <Link
                  href="/resend-activation"
                  className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Request Activation Link
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already activated?{' '}
          <Link className="text-primary hover:underline font-medium" href="/login">
            Sign in to your portal
          </Link>
        </p>
      </section>
    </main>
  );
}
