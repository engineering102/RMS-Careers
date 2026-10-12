import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function AssessmentsLoading() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-secondary rounded-full" />
          <div className="h-8 w-64 bg-secondary rounded-lg" />
          <div className="h-4 w-96 bg-secondary/60 rounded" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-secondary rounded" />
                  <div className="h-6 w-12 bg-secondary rounded" />
                </div>
                <div className="h-10 w-10 bg-secondary rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-secondary rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border bg-card/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-secondary rounded" />
                  <div className="h-4 w-16 bg-secondary rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-3 w-full bg-secondary/60 rounded" />
                  <div className="h-3 w-2/3 bg-secondary/60 rounded" />
                </div>
                <div className="h-8 w-full bg-secondary rounded-lg mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
