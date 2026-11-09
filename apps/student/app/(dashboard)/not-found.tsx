import React from 'react';
import Link from 'next/link';
import { Compass, BookOpen, LayoutDashboard } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 sm:p-10 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-inner mb-4">
          <Compass className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-input/60">
          404 · Page Not Found
        </span>

        <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Resource Not Found
        </h1>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          The requested batch workspace, assessment, curriculum milestone, or learning resource does not exist or is not accessible with your active institutional enrollment.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/overview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Overview</span>
          </Link>

          <Link
            href="/batches"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary/80 px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-foreground transition"
          >
            <BookOpen className="h-4 w-4" />
            <span>View My Batches</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
