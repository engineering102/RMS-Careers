import React from 'react';

export default function BatchLiveLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-secondary/60" />
        <div className="h-8 w-56 rounded bg-secondary" />
        <div className="h-4 w-72 max-w-full rounded bg-secondary/60" />
      </div>
      <div className="flex gap-4 border-b border-border pb-2">
        <div className="h-8 w-36 rounded bg-secondary/60" />
        <div className="h-8 w-32 rounded bg-secondary" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="h-32 rounded-xl border border-border bg-card/40" />
      ))}
    </div>
  );
}
