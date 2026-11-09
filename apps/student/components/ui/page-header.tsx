import * as React from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small label above the title (section or context name). */
  eyebrow?: React.ReactNode;
  /** Primary/secondary actions, right-aligned on wide screens and stacked below on narrow ones. */
  actions?: React.ReactNode;
  /** Slot above the title row, e.g. a breadcrumb or a back link. */
  leading?: React.ReactNode;
  /** Heading level; pages use 1, sections inside a page use 2. */
  level?: 1 | 2;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  leading,
  level = 1,
  className,
  children,
  ...props
}: PageHeaderProps) {
  const Heading = level === 1 ? 'h1' : 'h2';

  return (
    <header className={cn('flex flex-col gap-3', className)} {...props}>
      {leading}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-sm text-muted-foreground">{eyebrow}</p>
          ) : null}
          <Heading
            className={cn(
              'text-balance font-display font-semibold tracking-tight text-foreground',
              level === 1 ? 'text-[1.625rem] leading-tight md:text-[1.875rem]' : 'text-xl'
            )}
          >
            {title}
          </Heading>
          {description ? <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
