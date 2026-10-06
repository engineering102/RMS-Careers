import React from 'react';

export default function BatchesLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-6xl mx-auto" aria-label="Loading batches">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-slate-800 pb-5">
        <div className="h-4 w-28 rounded bg-slate-800" />
        <div className="h-8 w-56 rounded bg-slate-800" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-800/60" />
      </div>

      {/* Batch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded-full bg-slate-800" />
              <div className="h-5 w-16 rounded bg-slate-800/60" />
            </div>
            <div className="h-6 w-44 rounded bg-slate-800" />
            <div className="h-12 w-full rounded bg-slate-950/60" />
            <div className="h-10 w-full rounded-xl bg-slate-800/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
