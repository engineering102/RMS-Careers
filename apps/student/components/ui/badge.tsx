import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Quiet label, not a button: no hover state, medium weight, tinted text for status rather than solid fills.
  'inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium leading-4',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        info: 'bg-info/10 text-info'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// A <span>, so it is valid inside paragraphs, headings and links.
function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
