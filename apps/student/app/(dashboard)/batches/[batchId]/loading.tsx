import React from 'react';

export default function BatchWorkspaceLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 space-y-4">
        <div className="h-4 w-28 rounded bg-slate-800" />
        <div className="h-8 w-64 rounded bg-slate-800" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-800/60" />
        <div className="h-14 w-full rounded-xl bg-slate-800/40 mt-4" />
      </div>

      {/* Subnav Skeleton */}
      <div className="flex gap-4 border-b border-slate-800 pb-2">
        <div className="h-8 w-36 rounded bg-slate-800" />
        <div className="h-8 w-32 rounded bg-slate-800/60" />
        <div className="h-8 w-32 rounded bg-slate-800/60" />
      </div>

      {/* Timeline Skeleton */}
      <div className="space-y-8 pl-6">
        {Array.from({ length: 2 }).map((_, weekIdx) => (
          <div key={weekIdx} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-slate-800" />
              <div className="h-5 w-24 rounded bg-slate-800" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, itemIdx) => (
                <div
                  key={itemIdx}
                  className="h-24 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
