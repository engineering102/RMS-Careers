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
      <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-slate-900 p-7 shadow-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-slate-400">
          An error occurred while preparing your learning dashboard. Please try again or return to sign in.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
