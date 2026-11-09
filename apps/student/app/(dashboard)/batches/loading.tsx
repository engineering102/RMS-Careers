import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BatchesLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true" aria-label="Loading batches">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="border-t border-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 border-b border-border py-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
