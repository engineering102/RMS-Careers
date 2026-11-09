import * as React from 'react';
import { cn } from '@/lib/utils';

/** A key or shortcut, e.g. <Kbd>⌘K</Kbd>. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}
