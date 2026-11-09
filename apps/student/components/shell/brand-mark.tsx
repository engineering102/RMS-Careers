import { cn } from '@/lib/utils';

/**
 * The "R" mark. A plain server-safe component in its own file, so pages outside the app shell (sign-in,
 * activation) can use it without pulling the client sidebar bundle in.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] bg-foreground font-display text-[13px] font-bold text-background',
        className
      )}
    >
      R
    </span>
  );
}
