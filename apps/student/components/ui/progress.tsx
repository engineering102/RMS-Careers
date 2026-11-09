import * as React from 'react';
import { cn } from '@/lib/utils';

export type ProgressTone = 'default' | 'success' | 'warning' | 'destructive';

const FILL: Record<ProgressTone, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive'
};

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Week 6 progress". Required: a bare bar means nothing to a screen reader. */
  label: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
}

/** Thin, flat progress bar. The fill width is the only thing that changes. */
export function Progress({ value, max = 100, label, tone = 'default', size = 'sm', className, ...props }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(Math.min(max, Math.max(0, value)))}
      className={cn('w-full overflow-hidden rounded-full bg-muted', size === 'sm' ? 'h-1' : 'h-1.5', className)}
      {...props}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none', FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
