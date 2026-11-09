import { cn } from '@/lib/utils';

/**
 * The RMS Careers emblem (the site favicon). A plain server-safe component in its own file, so pages outside the app
 * shell (sign-in, activation) can use it without pulling the client sidebar bundle in. Decorative: it always sits
 * next to the "RMS Careers" name or inside a labelled link.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // A 2 kB static icon: next/image would add a loader round-trip for nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/favicon-32.png"
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      decoding="async"
      className={cn('h-6 w-6 shrink-0 object-contain', className)}
    />
  );
}
