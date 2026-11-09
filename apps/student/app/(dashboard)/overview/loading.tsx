import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Same shape as Home, so nothing jumps when the data arrives. */
export default function OverviewLoading() {
  return (
    <div className="space-y-10" role="status" aria-busy="true" aria-label="Loading overview">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>

      <div className="space-y-6">
        <Skeleton className="h-[7.5rem] w-full rounded-lg" />
        <div className="grid grid-cols-3 border-y border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className={i ? 'space-y-2 border-l border-border py-4 pl-5' : 'space-y-2 py-4'}>
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-[9.5rem] w-40" />
        </div>
      </div>

      {/* Activity Insights Skeleton */}
      <div className="h-56 rounded-2xl border border-border bg-card/50 p-6 grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-28 rounded bg-secondary" />
            <div className="h-7 w-24 rounded bg-secondary" />
            <div className="h-24 rounded-xl bg-background/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
