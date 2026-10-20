import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNumber } from '@/lib/format/datetime';
import { formatIstDateReadable } from '@/lib/types/overview';
import type { ActivityType } from '@/lib/types/activity';
import type { ActivityInsightsData } from '@/lib/types/activity-insights';

interface ActivityInsightsCardProps {
  insights: ActivityInsightsData;
}

/** Colour follows the activity type, never its size, so a slice looks the same every week. */
export const ACTIVITY_TYPE_SWATCH: Record<ActivityType, string> = {
  dsa_solved: 'bg-primary',
  quiz_completed: 'bg-warning',
  lecture_completed: 'bg-purple-400',
  assignment_approved: 'bg-success',
  external_assessment: 'bg-info'
};

function shortWeekLabel(weekStartIst: string): string {
  // "Oct 13, 2026" → "Oct 13"
  return formatIstDateReadable(weekStartIst).replace(/,\s*\d{4}$/, '');
}

function WeekChange({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null;
  if (changePercent === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden="true" /> Same as last week
      </span>
    );
  }
  const up = changePercent > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-success' : 'text-muted-foreground'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? '+' : ''}
      {changePercent}% vs last week
    </span>
  );
}

export function ActivityInsightsCard({ insights }: ActivityInsightsCardProps) {
  const { weekly, mix } = insights;
  const maxWeekXp = Math.max(...weekly.weeks.map((w) => w.xp), 1);
  const firstWeek = weekly.weeks[0];

  return (
    <Card className="border-border bg-card/60" data-testid="activity-insights">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold text-foreground">Activity insights</CardTitle>
          <p className="text-xs text-muted-foreground">Your learning rhythm and where your XP comes from</p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        {/* Weekly XP trend */}
        <section aria-labelledby="weekly-xp-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 id="weekly-xp-heading" className="text-xs font-medium text-muted-foreground">
              XP per week
            </h3>
            <WeekChange changePercent={weekly.changePercent} />
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatNumber(weekly.thisWeekXp)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">XP this week</span>
          </p>

          <ol
            className="mt-3 flex h-24 items-end gap-1 border-b border-border"
            aria-label={`XP per week for the last ${weekly.weeks.length} weeks`}
          >
            {weekly.weeks.map((week) => {
              const height = week.xp > 0 ? Math.max(4, Math.round((week.xp / maxWeekXp) * 100)) : 0;
              const label = `Week of ${shortWeekLabel(week.weekStartIst)}: ${formatNumber(week.xp)} XP from ${week.activityCount} ${
                week.activityCount === 1 ? 'activity' : 'activities'
              }`;
              return (
                <li key={week.weekStartIst} className="flex h-full flex-1 items-end" title={label}>
                  <span className="sr-only">{label}</span>
                  <span
                    aria-hidden="true"
                    data-testid="weekly-xp-bar"
                    className={`block w-full rounded-t-sm transition-colors ${
                      week.isCurrentWeek ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </li>
              );
            })}
          </ol>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{firstWeek ? shortWeekLabel(firstWeek.weekStartIst) : ''}</span>
            <span>This week</span>
          </div>
        </section>

        {/* XP mix by activity type */}
        <section aria-labelledby="xp-mix-heading">
          <h3 id="xp-mix-heading" className="text-xs font-medium text-muted-foreground">
            XP mix, last 30 days
          </h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatNumber(mix.totalXp)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              XP from {formatNumber(mix.totalCount)} {mix.totalCount === 1 ? 'activity' : 'activities'}
            </span>
          </p>

          {mix.slices.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Complete a lecture, quiz or DSA problem to see where your XP comes from.
            </p>
          ) : (
            <>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {mix.slices.map((slice) => (
                  <span
                    key={slice.activityType}
                    data-testid="xp-mix-segment"
                    className={`${ACTIVITY_TYPE_SWATCH[slice.activityType]} h-full`}
                    style={{ flexGrow: slice.xp, flexBasis: 0 }}
                    title={`${slice.label}: ${formatNumber(slice.xp)} XP`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {mix.slices.map((slice) => (
                  <li key={slice.activityType} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${ACTIVITY_TYPE_SWATCH[slice.activityType]}`}
                    />
                    <span className="flex-1 text-foreground/90">{slice.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(slice.xp)} XP · {slice.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
