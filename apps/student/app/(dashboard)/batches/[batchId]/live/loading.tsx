import React from 'react';

export default function BatchLiveLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-secondary/60" />
        <div className="h-8 w-56 rounded bg-secondary" />
        <div className="h-4 w-72 max-w-full rounded bg-secondary/60" />
      </div>
      <div className="flex gap-4 border-b border-border pb-2">
        <div className="h-8 w-36 rounded bg-secondary/60" />
        <div className="h-8 w-32 rounded bg-secondary" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-16 rounded-md bg-secondary/60" />
          <div className="h-9 w-20 rounded-md bg-secondary/40" />
          <div className="h-6 w-48 rounded bg-secondary" />
        </div>
        <div className="h-9 w-48 rounded-lg bg-secondary/60" />
      </div>
      <div className="h-[32rem] rounded-lg border border-border bg-card" />
    </div>
  );
}
