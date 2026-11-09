import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Same shape as a lesson: back link, type and title, the player, then the completion control. */
export default function ContentLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12" role="status" aria-busy="true" aria-label="Loading lesson">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
