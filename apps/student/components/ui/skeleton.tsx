import * as React from 'react';

import { cn } from '@/lib/utils';

// Decorative placeholder; the surrounding loading region should carry aria-busy / a status label.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
