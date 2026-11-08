import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { paginationRange } from '@/lib/format/pagination';

interface PaginationNavProps {
  page: number;
  totalPages: number;
  /** URL for a page number; pages are plain links so they work without JavaScript and keep scroll restoration. */
  hrefFor: (page: number) => string;
  className?: string;
}

const itemBase =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Numbered, link-based pager. Renders nothing for a single page. */
export function PaginationNav({ page, totalPages, hrefFor, className }: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      {hasPrev ? (
        <Link href={hrefFor(page - 1)} className={cn(itemBase, 'gap-1 text-muted-foreground hover:bg-accent hover:text-foreground')}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sr-only sm:hidden">Previous page</span>
        </Link>
      ) : (
        <span className={cn(itemBase, 'gap-1 text-muted-foreground/40')} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {paginationRange(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className={cn(itemBase, 'px-1 text-muted-foreground')} aria-hidden="true">
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={cn(itemBase, 'border border-input bg-background font-semibold text-foreground shadow-sm')}
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-label={`Page ${p}`}
            className={cn(itemBase, 'text-muted-foreground hover:bg-accent hover:text-foreground')}
          >
            {p}
          </Link>
        )
      )}

      {hasNext ? (
        <Link href={hrefFor(page + 1)} className={cn(itemBase, 'gap-1 text-muted-foreground hover:bg-accent hover:text-foreground')}>
          <span className="hidden sm:inline">Next</span>
          <span className="sr-only sm:hidden">Next page</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(itemBase, 'gap-1 text-muted-foreground/40')} aria-disabled="true">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
