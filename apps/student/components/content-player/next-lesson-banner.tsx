import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NextCurriculumItemTarget } from '@/lib/types/progress';

interface NextLessonBannerProps {
  batchId: string;
  batchName?: string;
  nextItem: NextCurriculumItemTarget | null;
  isCurrentItemCompleted: boolean;
}

export function NextLessonBanner({
  batchId,
  batchName,
  nextItem,
  isCurrentItemCompleted
}: NextLessonBannerProps) {
  if (nextItem) {
    return (
      <aside
        aria-label="Next Lesson Navigation"
        className="rounded-xl border border-blue-900/40 bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 p-4.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isCurrentItemCompleted ? (
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                <CheckCircle2 className="h-3 w-3" />
                Lesson Completed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
                <Sparkles className="h-3 w-3" />
                Up Next in Sequence
              </span>
            )}
            {batchName && <span className="text-xs text-slate-500">· {batchName}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-200">{nextItem.title}</h4>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-slate-700 bg-slate-800 text-slate-300 capitalize"
            >
              {nextItem.contentType.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-slate-400">Week {nextItem.weekNumber}</span>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 h-9 gap-1.5 shrink-0"
        >
          <Link href={`/content/${encodeURIComponent(nextItem.contentItemId)}?batchId=${encodeURIComponent(batchId)}`}>
            <span>Continue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Next Lesson Navigation"
      className="rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-0.5">
        <h4 className="text-sm font-medium text-slate-300">
          You have reached the end of currently released lessons for this cohort.
        </h4>
        <p className="text-xs text-slate-500">
          Check back when new weeks unlock or explore your batch workspace.
        </p>
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs px-4 h-9 gap-1.5 shrink-0"
      >
        <Link href={`/batches/${encodeURIComponent(batchId)}`}>
          <span>Return to Batch</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </aside>
  );
}
