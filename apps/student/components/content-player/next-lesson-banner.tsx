import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import type { NextCurriculumItemTarget } from '@/lib/types/progress';

interface NextLessonBannerProps {
  batchId: string;
  batchName?: string;
  nextItem: NextCurriculumItemTarget | null;
  isCurrentItemCompleted: boolean;
}

/** End-of-lesson continuity: the next item in the batch's sequence, or a note that you've reached the end. */
export function NextLessonBanner({ batchId, batchName, nextItem, isCurrentItemCompleted }: NextLessonBannerProps) {
  if (nextItem) {
    return (
      <aside
        aria-label="Next Lesson Navigation"
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            {isCurrentItemCompleted ? 'Done. Up next' : 'Up next'}
            {batchName ? ` in ${batchName}` : ''} · Week {nextItem.weekNumber}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[15px] font-medium text-foreground">{nextItem.title}</span>
            <ContentTypeTag type={nextItem.contentType} />
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={`/content/${encodeURIComponent(nextItem.contentItemId)}?batchId=${encodeURIComponent(batchId)}`}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Next Lesson Navigation"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="space-y-0.5">
        <p className="text-[15px] font-medium text-foreground">That's everything released so far</p>
        <p className="text-sm text-muted-foreground">New items appear in your curriculum as each week opens.</p>
      </div>
      <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
        <Link href={`/batches/${encodeURIComponent(batchId)}`}>Back to curriculum</Link>
      </Button>
    </aside>
  );
}
