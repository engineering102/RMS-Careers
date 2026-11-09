import React from 'react';
import Link from 'next/link';
import type { StudentDeadlineItem } from '@/lib/db/queries/overview';
import { formatDate } from '@/lib/format/datetime';
import { dueLabel } from '@/lib/format/relative-dates';
import { curriculumItemHref } from '@/lib/content/content-href';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import { cn } from '@/lib/utils';

interface DeadlinesCardProps {
  deadlines: StudentDeadlineItem[];
  /** Rows to show; the rest are counted in the heading. */
  limit?: number;
}

/** @deprecated Legacy wording kept for existing callers and tests; Home uses dueLabel (lib/format/relative-dates). */
export function formatRelativeDeadline(dueAtDate: Date) {
  const now = new Date();
  const due = new Date(dueAtDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return { text: 'Past Due', isUrgent: true, isOverdue: true };
  if (diffDays <= 0) return { text: 'Due Today', isUrgent: true, isOverdue: false };
  if (diffDays === 1) return { text: 'Due Tomorrow', isUrgent: true, isOverdue: false };
  if (diffDays <= 3) return { text: `Due in ${diffDays} days`, isUrgent: true, isOverdue: false };
  return { text: `Due ${formatDate(due, { month: 'short', day: 'numeric' })}`, isUrgent: false, isOverdue: false };
}

export function getDeadlineHref(item: StudentDeadlineItem): string {
  return curriculumItemHref(item);
}

/** "Coming up": open deadlines across the student's batches, soonest first, as plain rows. */
export function DeadlinesCard({ deadlines, limit = 6 }: DeadlinesCardProps) {
  const open = deadlines
    .filter((d) => !d.isCompleted)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const shown = open.slice(0, limit);
  const multipleBatches = new Set(open.map((d) => d.batchId)).size > 1;

  return (
    <section aria-labelledby="coming-up-heading" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="coming-up-heading" className="text-[15px] font-semibold text-foreground">
          Coming up
        </h2>
        {open.length > 0 && (
          <span className="tabular text-sm text-muted-foreground">
            {open.length} open
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          Nothing is due. New deadlines appear here as your batch schedules them.
        </p>
      ) : (
        <ul className="mt-3 border-t border-border">
          {shown.map((item) => {
            const due = dueLabel(item.dueAt);
            return (
              <li key={`${item.batchId}-${item.id}`} className="border-b border-border">
                <Link
                  href={getDeadlineHref(item)}
                  data-testid="deadline-item-link"
                  className="-mx-2 flex min-h-[3.25rem] items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Phones: icon only (label kept for screen readers) so the title gets the width. */}
                  <ContentTypeTag type={item.contentType} className="shrink-0 max-sm:[&>span]:sr-only sm:w-28" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Week {item.weekNumber}
                      {multipleBatches && ` · ${item.batchName}`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'tabular shrink-0 text-sm',
                      due.tone === 'overdue' ? 'font-medium text-destructive' : due.tone === 'soon' ? 'font-medium text-warning' : 'text-muted-foreground'
                    )}
                  >
                    {due.text}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
