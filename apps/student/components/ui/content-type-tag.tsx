import * as React from 'react';
import { contentTypeMeta } from '@/lib/content/content-types';
import { cn } from '@/lib/utils';

export interface ContentTypeTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: string | null | undefined;
  /** Hide the label and keep only the icon (the label stays available to screen readers). */
  iconOnly?: boolean;
}

/** Quiet icon + label naming a content type. Neutral on purpose: colour is kept for state. */
export function ContentTypeTag({ type, iconOnly = false, className, ...props }: ContentTypeTagProps) {
  const { label, icon: Icon } = contentTypeMeta(type);
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground', className)} {...props}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
    </span>
  );
}
