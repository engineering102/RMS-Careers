import React from 'react';

export default function DsaLoading() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-800/80 rounded-lg" />
        <div className="h-4 w-96 bg-slate-800/50 rounded" />

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-800/40 border border-slate-800" />
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-slate-800/80 rounded-lg" />
        <div className="h-8 w-36 bg-slate-800/80 rounded-lg" />
        <div className="h-8 w-44 bg-slate-800/80 rounded-lg" />
      </div>

      {/* Search & Filter Skeleton */}
      <div className="h-14 w-full rounded-xl bg-slate-800/40 border border-slate-800" />

      {/* Problem Rows Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/30 border border-slate-800/60" />
        ))}
      </div>
    </div>
  );
}
