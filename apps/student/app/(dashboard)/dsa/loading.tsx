import React from 'react';

export default function DsaLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-pulse" aria-busy="true" aria-label="Loading DSA Practice">
      {/* Heading + overall progress card */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-3 py-2">
          <div className="h-8 w-52 rounded-lg bg-secondary/80" />
          <div className="h-4 w-full max-w-md rounded bg-secondary/50" />
          <div className="h-4 w-72 rounded bg-secondary/50" />
        </div>
        <div className="h-44 rounded-xl border border-border bg-secondary/40" />
      </div>

      {/* Sheet cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 rounded-xl border border-border bg-secondary/20" />
        ))}
      </div>
    </div>
  );
}
