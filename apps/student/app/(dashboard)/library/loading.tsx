import React from 'react';

export default function LibraryLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="h-4 w-96 max-w-full rounded bg-secondary/60" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="h-10 w-full rounded-lg bg-secondary" />

      {/* Category Card Grid Skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-60 rounded-2xl border border-border/80 bg-card/40 p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div className="h-12 w-12 rounded-xl bg-secondary" />
              <div className="h-8 w-10 rounded bg-secondary/60" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-secondary/60" />
              <div className="h-5 w-1/2 rounded bg-secondary" />
              <div className="h-3 w-full rounded bg-secondary/40" />
            </div>
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <div className="h-4 w-28 rounded bg-secondary/60" />
              <div className="h-4 w-16 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
