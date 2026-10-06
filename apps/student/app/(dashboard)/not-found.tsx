import React from 'react';
import Link from 'next/link';
import { Compass, BookOpen, LayoutDashboard } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-8 sm:p-10 shadow-2xl text-center backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner mb-4">
          <Compass className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
          404 · Page Not Found
        </span>

        <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Resource Not Found
        </h1>

        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          The requested batch workspace, assessment, curriculum milestone, or learning resource does not exist or is not accessible with your active institutional enrollment.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/overview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Overview</span>
          </Link>

          <Link
            href="/batches"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <BookOpen className="h-4 w-4" />
            <span>View My Batches</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
