import React from 'react';

export default function LibraryLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-800/60" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-10 flex-1 rounded-lg bg-slate-800" />
          <div className="h-10 w-40 rounded-lg bg-slate-800" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-lg bg-slate-800/80 shrink-0" />
          ))}
        </div>
      </div>

      {/* Results Count Skeleton */}
      <div className="h-4 w-36 rounded bg-slate-800/60" />

      {/* Card Grid Skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 rounded bg-slate-800" />
              <div className="h-4 w-16 rounded bg-slate-800/60" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-full rounded bg-slate-800/40" />
              <div className="h-3 w-2/3 rounded bg-slate-800/40" />
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <div className="h-4 w-16 rounded bg-slate-800/60" />
              <div className="h-7 w-24 rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
