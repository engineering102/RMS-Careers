import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[350px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground mb-4">
          {description}
        </p>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
