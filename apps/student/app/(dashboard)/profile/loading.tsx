import React from 'react';

export default function ProfileLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-6xl mx-auto pb-12" aria-label="Loading profile">
      {/* Hero Banner Skeleton */}
      <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-800 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-slate-800" />
            <div className="h-4 w-64 rounded bg-slate-800/60" />
            <div className="h-3 w-40 rounded bg-slate-800/40" />
          </div>
        </div>
        <div className="h-16 w-40 rounded-xl bg-slate-950/60 hidden sm:block" />
      </div>

      {/* Dual Cards: Academic & Career Form Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-6 w-48 rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-950/60" />
            ))}
          </div>
        </div>

        <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-6 w-56 rounded bg-slate-800" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-950/60" />
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Section Skeleton */}
      <div className="h-72 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="h-6 w-60 rounded bg-slate-800" />
        <div className="h-40 rounded-xl bg-slate-950/60" />
      </div>
    </div>
  );
}
