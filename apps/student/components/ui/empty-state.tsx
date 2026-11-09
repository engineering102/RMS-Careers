import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Names the space, e.g. "No tests yet". */
  title: string;
  /** One sentence on what will appear here and how it gets there. */
  description: string;
  action?: React.ReactNode;
  className?: string;
}

// Same API as apps/admin/components/admin/empty-state.tsx. Quiet by design: a plain icon, no illustration tile.
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-14 text-center', className)}>
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {Icon && <Icon className="mb-3 h-5 w-5 text-faint" aria-hidden="true" />}
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
