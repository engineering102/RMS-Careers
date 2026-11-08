import Link from 'next/link';

import { cn } from '@/lib/utils';
import { assessmentHref } from '@/lib/services/assessment-hub';
import type { AssessmentHubView, AssessmentStatusFilter, AssessmentTab } from '@/lib/types/assessment-hub';

const TAB_LABELS: Record<AssessmentTab, string> = {
  all: 'All',
  exams: 'Timed exams',
  practice: 'Practice',
  projects: 'Projects',
  external: 'External'
};

const STATUS_LABELS: Record<AssessmentStatusFilter, string> = {
  all: 'Any status',
  todo: 'To do',
  upcoming: 'Upcoming',
  done: 'Done',
  closed: 'Closed'
};

/** Type tabs: plain links, so the server renders the filtered page and the URL is shareable. */
export function AssessmentTypeTabs({ view }: { view: AssessmentHubView }) {
  const { query, tabCounts } = view;
  // Tabs with nothing in them are hidden, except the one the student is on.
  const tabs = (Object.keys(TAB_LABELS) as AssessmentTab[]).filter(
    (tab) => tab === 'all' || tab === query.tab || tabCounts[tab] > 0
  );

  return (
    <nav
      aria-label="Assessment type"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = tab === query.tab;
          return (
            <li key={tab}>
              <Link
                href={assessmentHref(query, { tab, status: 'all', page: 1 })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {TAB_LABELS[tab]}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tabCounts[tab]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Status chips for the current tab; empty statuses are hidden unless selected. */
export function AssessmentStatusFilters({ view }: { view: AssessmentHubView }) {
  const { query, statusCounts } = view;
  const statuses = (Object.keys(STATUS_LABELS) as AssessmentStatusFilter[]).filter(
    (s) => s === 'all' || s === query.status || statusCounts[s] > 0
  );

  return (
    <nav aria-label="Filter by status" className="flex flex-wrap items-center gap-1.5">
      {statuses.map((status) => {
        const active = status === query.status;
        return (
          <Link
            key={status}
            href={assessmentHref(query, { status, page: 1 })}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              active
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:border-input hover:text-foreground'
            )}
          >
            {STATUS_LABELS[status]}
            <span className={cn('tabular-nums', active ? 'text-background/70' : 'text-muted-foreground/70')}>
              {statusCounts[status]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export const BUCKET_HEADINGS: Record<Exclude<AssessmentStatusFilter, 'all'>, string> = {
  todo: 'To do',
  upcoming: 'Upcoming',
  done: 'Done',
  closed: 'Closed'
};
