import * as React from 'react';
import { cn } from '@/lib/utils';

/** Up to two initials from a full name ("Aarav Sharma" → "AS"); "?" when there is no name. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : '';
  return (Array.from(first)[0]! + (last ? Array.from(last)[0]! : '')).toUpperCase();
}

const SIZE = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-base' } as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string | null | undefined;
  size?: keyof typeof SIZE;
}

/** Initials on a quiet neutral disc. Decorative: the name is always shown or announced beside it. */
export function Avatar({ name, size = 'md', className, ...props }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-border-strong bg-muted font-semibold text-foreground',
        SIZE[size],
        className
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}
