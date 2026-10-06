import React from 'react';

export default function OverviewLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto" aria-label="Loading overview">
      {/* Hero Welcome Skeleton */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-3">
        <div className="h-4 w-32 rounded bg-slate-800" />
        <div className="h-8 w-72 rounded bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-800/60" />
      </div>

      {/* 4 Gamification Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-slate-800" />
            <div className="h-7 w-24 rounded bg-slate-800" />
            <div className="h-3 w-16 rounded bg-slate-800/50" />
          </div>
        ))}
      </div>

      {/* 30-Day Heatmap & Deadlines Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-64 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-800" />
          <div className="h-4 w-64 rounded bg-slate-800/60" />
          <div className="h-32 rounded-xl bg-slate-950/60" />
        </div>

        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-800" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-950/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
