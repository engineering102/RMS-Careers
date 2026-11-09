import React from 'react';
import type { StudentStatsOverview } from '@/lib/db/queries/overview';
import { istDateKey } from '@/lib/format/relative-dates';
import { cn } from '@/lib/utils';

interface StreakCardProps {
  stats: StudentStatsOverview;
  className?: string;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** Streak cell of the Home stat strip. Says plainly when today's activity is still needed to keep it. */
export function StreakCard({ stats, className }: StreakCardProps) {
  const current = stats.currentStreak ?? 0;
  const best = stats.longestStreak ?? 0;
  const activeToday = stats.lastActivityDateIst === istDateKey(new Date());

  let hint: React.ReactNode = `Best ${days(best)}`;
  if (current === 0) hint = 'Do one thing today to start one';
  else if (!activeToday) hint = <span className="font-medium text-warning">Do one thing today to keep it</span>;

  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-sm text-muted-foreground">Streak</p>
      <p className="tabular mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground">
        {days(current)}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
