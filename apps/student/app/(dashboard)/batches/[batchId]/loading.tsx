import React from 'react';

export default function BatchWorkspaceLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 md:p-8 space-y-4">
        <div className="h-4 w-28 rounded bg-secondary" />
        <div className="h-8 w-64 rounded bg-secondary" />
        <div className="h-4 w-80 max-w-full rounded bg-secondary/60" />
        <div className="h-14 w-full rounded-xl bg-secondary/40 mt-4" />
      </div>

      {/* Subnav Skeleton */}
      <div className="flex gap-4 border-b border-border pb-2">
        <div className="h-8 w-36 rounded bg-secondary" />
        <div className="h-8 w-32 rounded bg-secondary/60" />
        <div className="h-8 w-32 rounded bg-secondary/60" />
      </div>

      {/* Week strip skeleton */}
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-8 w-12 rounded-md border border-border bg-card" />
        ))}
      </div>

      {/* Selected week skeleton: header, then content-type sections with the first open */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="h-5 w-20 rounded bg-secondary" />
          <div className="ml-auto h-3 w-24 rounded bg-secondary/60" />
        </div>
        {Array.from({ length: 3 }).map((_, sectionIdx) => (
          <div key={sectionIdx} className="border-t border-border first:border-t-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-4 w-4 rounded bg-secondary" />
              <div className="h-4 w-28 rounded bg-secondary" />
              <div className="ml-auto h-3 w-16 rounded bg-secondary/60" />
            </div>
            {sectionIdx === 0 && (
              <div className="px-2 pb-3 sm:px-4">
                <div className="overflow-hidden rounded-lg border border-border">
                  {Array.from({ length: 3 }).map((_, itemIdx) => (
                    <div key={itemIdx} className="h-16 border-t border-border bg-background/40 first:border-t-0" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
