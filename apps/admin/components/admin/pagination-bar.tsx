import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationBarProps {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  /** Visible summary, e.g. "Showing 51–100 of 137 items". */
  summary: string;
  /** Link-based paging (server-rendered lists): the href for a page. */
  hrefForPage?: (page: number) => string;
  /** Button-based paging (client state): called with the requested page. */
  onPageChange?: (page: number) => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
  className?: string;
}

/** Page numbers to show: first, last, and the current page with one neighbour each side. */
export function visiblePages(page: number, pageCount: number): (number | 'gap')[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const itemClass =
  'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Previous / numbered / Next page controls with a summary; renders nothing for a single page. */
export function PaginationBar({
  page,
  pageCount,
  summary,
  hrefForPage,
  onPageChange,
  label = 'Pagination',
  className
}: PaginationBarProps) {
  if (pageCount <= 1) {
    return <p className={cn('text-xs text-muted-foreground', className)}>{summary}</p>;
  }

  const control = (target: number, content: ReactNode, opts: { current?: boolean; disabled?: boolean; ariaLabel?: string }) => {
    const cls = cn(
      itemClass,
      opts.current
        ? 'border-primary bg-primary text-primary-foreground'
        : 'bg-background hover:bg-muted',
      opts.disabled && 'pointer-events-none opacity-40'
    );
    if (opts.disabled) {
      return (
        <span className={cls} aria-disabled="true" aria-label={opts.ariaLabel}>
          {content}
        </span>
      );
    }
    if (hrefForPage) {
      return (
        <Link href={hrefForPage(target)} className={cls} aria-label={opts.ariaLabel} aria-current={opts.current ? 'page' : undefined}>
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onPageChange?.(target)}
        className={cls}
        aria-label={opts.ariaLabel}
        aria-current={opts.current ? 'page' : undefined}
      >
        {content}
      </button>
    );
  };

  return (
    <nav aria-label={label} className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-xs text-muted-foreground">{summary}</p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {control(page - 1, <><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />Previous</>, {
            disabled: page <= 1,
            ariaLabel: 'Previous page'
          })}
        </li>
        {visiblePages(page, pageCount).map((p, i) => (
          <li key={p === 'gap' ? `gap-${i}` : p}>
            {p === 'gap' ? (
              <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">…</span>
            ) : (
              control(p, p, { current: p === page, ariaLabel: `Page ${p}` })
            )}
          </li>
        ))}
        <li>
          {control(page + 1, <>Next<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></>, {
            disabled: page >= pageCount,
            ariaLabel: 'Next page'
          })}
        </li>
      </ul>
    </nav>
  );
}
