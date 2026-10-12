import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground [&>svg]:text-foreground',
        info: 'border-info/40 bg-info/10 text-foreground [&>svg]:text-info',
        success: 'border-success/40 bg-success/10 text-foreground [&>svg]:text-success',
        warning: 'border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning',
        destructive: 'border-destructive/50 bg-destructive/10 text-foreground [&>svg]:text-destructive'
      }
    },
    defaultVariants: { variant: 'default' }
  }
);

export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

/**
 * Live-region role for a variant: problems interrupt ("alert"), everything else is announced politely
 * ("status"). Pass `role` explicitly to override, e.g. role="note" for static copy that is not announced.
 */
export function alertRoleFor(variant: AlertVariant | null | undefined): 'alert' | 'status' {
  return variant === 'destructive' || variant === 'warning' ? 'alert' : 'status';
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, role, ...props }, ref) => (
  <div
    ref={ref}
    role={role ?? alertRoleFor(variant)}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground [&_p]:leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
