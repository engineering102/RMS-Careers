import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function PracticeQuizLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-pulse">
      {/* Top Breadcrumb Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-800 rounded" />
          <div className="h-5 w-24 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Hero Header Skeleton */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="h-8 w-2/3 bg-slate-800 rounded-lg" />
        <div className="h-4 w-full bg-slate-800/60 rounded" />
        <div className="h-4 w-1/2 bg-slate-800/60 rounded" />
        <div className="pt-4 border-t border-slate-800 flex gap-6">
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-4 w-32 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="h-2 w-full bg-slate-800 rounded-full" />

      {/* Question Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-24 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-slate-800 rounded" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((opt) => (
                <div key={opt} className="h-10 w-full bg-slate-800/40 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
