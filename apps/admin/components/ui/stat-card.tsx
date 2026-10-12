import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'info' | 'success' | 'warning' | 'destructive';

const toneIconClasses: Record<StatTone, string> = {
  default: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive'
};

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the number counts. Be specific (e.g. "Pending registrations", not "Total"). */
  label: React.ReactNode;
  value: React.ReactNode;
  /** Short qualifier under the value (unit, comparison, or definition). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', className, ...props }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 text-card-foreground shadow-sm', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', toneIconClasses[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
