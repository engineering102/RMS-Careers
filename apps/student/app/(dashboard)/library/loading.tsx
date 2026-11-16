import React from 'react';

// Mirrors the Library's first page: title, search, subject cards.
export default function LibraryLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-hidden="true">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-9 w-40 rounded-lg bg-secondary" />
          <div className="h-4 w-[32rem] max-w-full rounded bg-secondary/60" />
        </div>
        <div className="h-11 w-full rounded-lg bg-secondary" />
      </div>

      <div className="space-y-4">
        <div className="h-5 w-28 rounded bg-secondary" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 space-y-4 rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-lg bg-secondary" />
                <div className="h-7 w-8 rounded bg-secondary/60" />
              </div>
              <div className="h-5 w-2/3 rounded bg-secondary" />
              <div className="h-3 w-1/2 rounded bg-secondary/60" />
              <div className="space-y-2 border-t border-border pt-3">
                <div className="h-3 w-full rounded bg-secondary/40" />
                <div className="h-3 w-4/5 rounded bg-secondary/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
