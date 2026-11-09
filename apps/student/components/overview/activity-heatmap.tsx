import React from 'react';
import type { HeatmapDay, StudentOverviewData } from '@/lib/types/overview';
import { formatNumber } from '@/lib/format/datetime';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  heatmap: StudentOverviewData['heatmap'];
}

// Intensity 0-4 as the theme's primary colour at increasing strength (ink in Graphite, blue in Lab notebook,
// green in Transcript), so the grid always belongs to the theme.
const LEVEL: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-primary/20',
  2: 'bg-primary/40',
  3: 'bg-primary/65',
  4: 'bg-primary/90'
};

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** Last 30 days as a Monday-first calendar: one column per week, one square per day. */
export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const days = heatmap.days;
  const firstDow = days.length ? (new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const cells: (HeatmapDay | null)[] = [...Array<null>(firstDow).fill(null), ...days];

  return (
    <section aria-labelledby="activity-heading" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="activity-heading" className="text-[15px] font-semibold text-foreground">
          Activity
        </h2>
        <span className="text-sm text-muted-foreground">Last 30 days</span>
      </div>

      <div className="mt-3 border-t border-border pt-4">
        <div className="flex gap-3">
          <div className="grid grid-rows-7 gap-1 text-[11px] leading-[18px] text-muted-foreground" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="h-[18px]">
                {label}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label={`${heatmap.totalActiveDays} active days and ${heatmap.totalPeriodXp} XP in the last 30 days`}
            className="grid grid-flow-col grid-rows-7 gap-1"
            style={{ gridAutoColumns: '18px' }}
          >
            {cells.map((day, i) =>
              day ? (
                <span
                  key={day.date}
                  title={`${day.formattedDate}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}, ${day.xp} XP`}
                  className={cn('h-[18px] w-[18px] rounded-[3px]', LEVEL[day.intensity] ?? LEVEL[0])}
                />
              ) : (
                <span key={`pad-${i}`} className="h-[18px] w-[18px]" />
              )
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            <span className="tabular font-medium text-foreground">{heatmap.totalActiveDays}</span> active days ·{' '}
            <span className="tabular font-medium text-foreground">{formatNumber(heatmap.totalPeriodXp)}</span> XP
          </p>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground" aria-hidden="true">
            Less
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className={cn('h-2.5 w-2.5 rounded-[2px]', LEVEL[l])} />
            ))}
            More
          </span>
        </div>
      </div>
    </section>
  );
}
