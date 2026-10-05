import React from 'react';

export default function ContentLoading() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-800/80 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-slate-800/80 rounded" />
          <div className="h-5 w-16 bg-slate-800/80 rounded" />
          <div className="h-5 w-24 bg-slate-800/80 rounded" />
        </div>
        <div className="h-8 w-3/4 bg-slate-800/80 rounded" />
      </div>

      {/* Main Player / Content Skeleton */}
      <div className="w-full aspect-video rounded-xl bg-slate-800/60 border border-slate-800" />

      {/* Action / Meta Skeleton */}
      <div className="flex justify-between items-center pt-2">
        <div className="h-9 w-36 bg-slate-800/80 rounded" />
      </div>

      {/* Description Skeleton */}
      <div className="h-28 w-full bg-slate-800/40 rounded-xl border border-slate-800/60" />
    </div>
  );
}
