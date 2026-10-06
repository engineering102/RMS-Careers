import React from 'react';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl mx-auto pb-12" aria-label="Loading notifications">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-slate-800" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-800/60" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-slate-800/80" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <div className="h-8 w-16 rounded-lg bg-slate-800" />
        <div className="h-8 w-20 rounded-lg bg-slate-800/60" />
      </div>

      {/* Notifications List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-48 rounded bg-slate-800" />
                <div className="h-3 w-16 rounded bg-slate-800/60" />
              </div>
              <div className="h-3 w-full rounded bg-slate-800/50" />
              <div className="h-3 w-2/3 rounded bg-slate-800/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
