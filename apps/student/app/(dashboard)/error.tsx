'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-7 shadow-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An error occurred while preparing your learning dashboard. Please try again or return to sign in.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-lg border border-input bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent transition"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
