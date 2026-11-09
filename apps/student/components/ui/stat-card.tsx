import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'info' | 'success' | 'warning' | 'destructive';

const toneText: Record<StatTone, string> = {
  default: 'text-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive'
};

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the number counts. Be specific (e.g. "Problems solved", not "Total"). */
  label: React.ReactNode;
  value: React.ReactNode;
  /** Short qualifier under the value (unit, comparison, or definition). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Colours the value only when it reports a state (e.g. overdue); most numbers stay neutral. */
  tone?: StatTone;
}

/** A bare label / number / hint stack, for stat strips divided by hairlines. */
export function Stat({ label, value, hint, icon: Icon, tone = 'default', className, ...props }: StatProps) {
  return (
    <div className={cn('min-w-0', className)} {...props}>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        {label}
      </p>
      <p className={cn('tabular mt-1 font-display text-2xl font-semibold leading-tight tracking-tight', toneText[tone])}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export type StatCardProps = StatProps;

/** Stat on its own card, for grids where each number stands alone. */
export function StatCard({ className, ...props }: StatCardProps) {
  return <Stat className={cn('rounded-lg border border-border bg-card p-4', className)} {...props} />;
}
