import * as React from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ItemStatus = 'done' | 'current' | 'todo' | 'locked' | 'revise';

const DEFAULT_LABEL: Record<ItemStatus, string> = {
  done: 'Done',
  current: 'In progress',
  todo: 'Not started',
  locked: 'Locked',
  revise: 'Needs revision'
};

export interface StatusMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ItemStatus;
  /** Accessible name; defaults to the status in words. Pass null when adjacent text already says it. */
  label?: string | null;
}

/**
 * The small mark at the start of a curriculum row or problem row: filled check when done, half ring when in
 * progress, empty ring when not started, dashed ring with a lock when locked, red ring when a tutor asked for changes.
 * Shape carries the meaning as well as colour.
 */
export function StatusMark({ status, label, className, ...props }: StatusMarkProps) {
  const name = label === undefined ? DEFAULT_LABEL[status] : label;
  return (
    <span
      role={name ? 'img' : undefined}
      aria-label={name ?? undefined}
      aria-hidden={name ? undefined : true}
      className={cn(
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
        status === 'done' && 'border-success bg-success text-success-foreground',
        status === 'current' && 'border-primary bg-[conic-gradient(hsl(var(--primary))_0_50%,transparent_0)]',
        status === 'todo' && 'border-input',
        status === 'locked' && 'border-dashed border-input text-faint',
        status === 'revise' && 'border-destructive bg-destructive/10',
        className
      )}
      {...props}
    >
      {status === 'done' && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
      {status === 'locked' && <Lock className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden="true" />}
      {status === 'revise' && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />}
    </span>
  );
}
