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

  return (
    <div className="relative pl-6 sm:pl-8 space-y-4">
      {/* Vertical Timeline Track Line */}
      <div className="absolute left-2.5 sm:left-3 top-4 bottom-0 w-0.5 bg-slate-800 -z-10" />

      {/* Week Header Marker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
              isAllCompleted
                ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                : 'border-blue-500 bg-slate-900 text-blue-400'
            }`}
          >
            {isAllCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : week.weekNumber}
          </div>

          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-slate-100">
              Week {week.weekNumber}
            </h3>
            {isAllCompleted && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] py-0 px-1.5"
              >
                Week Completed
              </Badge>
            )}
          </div>
        </div>

        {/* Milestone Completion Progress for this week */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium self-start sm:self-auto pl-9 sm:pl-0">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <span>
            {week.completedCount} / {week.totalCount}{' '}
            {week.totalCount === 1 ? 'Milestone' : 'Milestones'}
          </span>
        </div>
      </div>

      {/* Weekly Curriculum Items */}
      <div className="space-y-3 pt-1">
        {week.items.map((item) => (
          <CurriculumItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
