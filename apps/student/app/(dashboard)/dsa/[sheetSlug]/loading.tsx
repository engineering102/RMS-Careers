import React from 'react';

export default function DsaSheetLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-12 animate-pulse" aria-busy="true" aria-label="Loading problem sheet">
      <div className="h-3 w-40 rounded bg-secondary/50" />

      {/* Sheet header + progress card */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-3 py-2">
          <div className="h-3 w-28 rounded bg-secondary/60" />
          <div className="h-8 w-64 rounded-lg bg-secondary/80" />
          <div className="h-4 w-full max-w-md rounded bg-secondary/50" />
          <div className="h-4 w-72 rounded bg-secondary/50" />
        </div>
        <div className="h-44 rounded-xl border border-border bg-secondary/40" />
      </div>

      {/* Toolbar */}
      <div className="h-9 w-full rounded-md bg-secondary/40" />

      {/* Pattern accordions */}
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 border-t border-border bg-secondary/20 first:border-t-0" />
        ))}
      </div>
    </div>
  );
}
