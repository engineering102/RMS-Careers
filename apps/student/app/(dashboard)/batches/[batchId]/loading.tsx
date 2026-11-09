import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Same shape as the curriculum page: header with progress, then the week card with its sections. */
export default function BatchWorkspaceLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading curriculum">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="w-full space-y-2 lg:w-72">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-60" />
            </div>
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border px-4 py-4 first:border-t-0">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
