import React from 'react';

export default function LeaderboardsLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-6xl mx-auto pb-12" aria-label="Loading leaderboards">
      {/* Header & Controls Skeleton */}
      <div className="space-y-4 border-b border-border/80 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-secondary" />
            <div className="h-8 w-64 rounded bg-secondary" />
            <div className="h-4 w-96 max-w-full rounded bg-secondary/60" />
          </div>
          <div className="h-16 w-56 rounded-xl bg-card border border-border" />
        </div>

        {/* Scope Tabs & Timeframe Skeletons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="h-10 w-64 rounded-xl bg-card border border-border" />
          <div className="h-10 w-44 rounded-lg bg-card border border-border" />
        </div>
      </div>

      {/* Leaderboard Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
        <div className="h-12 bg-background/60 border-b border-border" />
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 px-6 gap-4">
              <div className="h-8 w-8 rounded-full bg-secondary shrink-0" />
              <div className="h-4 w-40 rounded bg-secondary flex-1" />
              <div className="h-4 w-28 rounded bg-secondary/60 hidden sm:block" />
              <div className="h-4 w-16 rounded bg-secondary/60" />
              <div className="h-4 w-20 rounded bg-secondary shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
