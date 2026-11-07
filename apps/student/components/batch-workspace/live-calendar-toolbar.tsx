import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CALENDAR_VIEWS, rangeLabel, shiftAnchor, type CalendarView } from '@/lib/live/calendar';

const VIEW_LABELS: Record<CalendarView, string> = { day: 'Day', week: 'Week', month: 'Month' };

interface LiveCalendarToolbarProps {
  basePath: string;
  view: CalendarView;
  anchor: string;
}

export function calendarHref(basePath: string, view: CalendarView, date?: string): string {
  const params = new URLSearchParams({ view });
  if (date) params.set('date', date);
  return `${basePath}?${params.toString()}`;
}

/** Today · ‹ › · range title · Day / Week / Month. Plain links, so navigation works without client JavaScript. */
export function LiveCalendarToolbar({ basePath, view, anchor }: LiveCalendarToolbarProps) {
  const stepLabel = VIEW_LABELS[view].toLowerCase();
  const iconButton =
    'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={calendarHref(basePath, view)}
          className="mr-1 inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Today
        </Link>
        <Link href={calendarHref(basePath, view, shiftAnchor(view, anchor, -1))} aria-label={`Previous ${stepLabel}`} className={iconButton}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href={calendarHref(basePath, view, shiftAnchor(view, anchor, 1))} aria-label={`Next ${stepLabel}`} className={iconButton}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <h2 className="ml-2 truncate text-base font-semibold text-foreground sm:text-lg" aria-live="polite">
          {rangeLabel(view, anchor)}
        </h2>
      </div>

      <nav aria-label="Calendar view" className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {CALENDAR_VIEWS.map((option) => {
          const active = option === view;
          return (
            <Link
              key={option}
              href={calendarHref(basePath, option, anchor)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {VIEW_LABELS[option]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
