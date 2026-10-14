import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { CurriculumItemRow } from './curriculum-item-row';
import type { CurriculumWeek } from '@/lib/types/batch-workspace';

interface WeekSectionProps {
  week: CurriculumWeek;
}

export function WeekSection({ week }: WeekSectionProps) {
  const isAllCompleted = week.totalCount > 0 && week.completedCount === week.totalCount;
  // A topic shared by every item is shown once under the week title instead of on each row.
  const topics = new Set(week.items.map((item) => item.metadata.topic || ''));
  const sharedTopic = topics.size === 1 ? [...topics][0] : '';

  return (
    <div className="relative pl-6 sm:pl-8 space-y-4">
      {/* Vertical Timeline Track Line */}
      <div className="absolute left-2.5 sm:left-3 top-4 bottom-0 w-0.5 bg-secondary -z-10" />

      {/* Week Header Marker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
              isAllCompleted
                ? 'border-success bg-success text-success-foreground'
                : 'border-primary bg-card text-primary'
            }`}
          >
            {isAllCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : week.weekNumber}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Week {week.weekNumber}
            </h3>
            {sharedTopic && (
              <span className="text-xs font-medium text-muted-foreground">· {sharedTopic}</span>
            )}
            {isAllCompleted && (
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success text-[10px] py-0 px-1.5"
              >
                Week Completed
              </Badge>
            )}
          </div>
        </div>

        {/* Milestone Completion Progress for this week */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium self-start sm:self-auto pl-9 sm:pl-0">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {week.completedCount} / {week.totalCount}{' '}
            {week.totalCount === 1 ? 'Milestone' : 'Milestones'}
          </span>
        </div>
      </div>

      {/* Weekly Curriculum Items */}
      <div className="space-y-3 pt-1">
        {week.items.map((item) => (
          <CurriculumItemRow key={item.id} item={item} showTopic={!sharedTopic} />
        ))}
      </div>
    </div>
  );
}
