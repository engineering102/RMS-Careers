'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Activity, Flame, CalendarDays } from 'lucide-react';
import {
  type HeatmapDay,
  type HeatmapIntensity,
  formatIstDateReadable
} from '@/lib/types/overview';
import { formatNumber } from '@/lib/format/datetime';

interface ActivityHeatmapProps {
  heatmap: {
    days: HeatmapDay[];
    totalActiveDays: number;
    totalPeriodXp: number;
    startDate: string;
    endDate: string;
  };
}

function getIntensityClasses(intensity: HeatmapIntensity): string {
  switch (intensity) {
    case 0:
      return 'bg-secondary/80 border-input/50 hover:border-input';
    case 1:
      return 'bg-success/15 border-success/25 hover:border-success/50';
    case 2:
      return 'bg-success/35 border-success/50 hover:border-success/80';
    case 3:
      return 'bg-success/60 border-success/80 hover:border-success';
    case 4:
      return 'bg-success border-success shadow-sm shadow-success/30 hover:border-foreground';
    default:
      return 'bg-secondary/80 border-input/50';
  }
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const { days, totalActiveDays, totalPeriodXp, startDate, endDate } = heatmap;

  const dateRangeDisplay = `${formatIstDateReadable(startDate)} – ${formatIstDateReadable(endDate)}`;

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 border border-success/20 text-success">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              30-Day Activity Heatmap
            </CardTitle>
            <p className="text-xs text-muted-foreground">Daily learning momentum in IST (Asia/Kolkata)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success text-xs"
          >
            <Flame className="h-3 w-3 mr-1 text-success" />
            {totalActiveDays} / 30 Active Days
          </Badge>

          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary text-xs"
          >
            {formatNumber(totalPeriodXp)} Period XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Heatmap Grid */}
        <TooltipProvider delayDuration={100}>
          <div
            className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2 p-3 rounded-xl border border-border/80 bg-background/40"
            role="grid"
            aria-label="30-Day Activity Heatmap"
          >
            {days.map((day) => {
              const tooltipText =
                day.count > 0
                  ? `${day.formattedDate}: ${day.xp} XP earned (${day.count} ${
                      day.count === 1 ? 'activity' : 'activities'
                    })`
                  : `${day.formattedDate}: No activity recorded`;

              const intensityClass = getIntensityClasses(day.intensity);

              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      role="gridcell"
                      aria-label={tooltipText}
                      title={tooltipText}
                      className={`h-7 w-full rounded-md border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-success/50 ${intensityClass}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold text-foreground">{day.formattedDate}</p>
                    <p className="text-foreground/80">
                      {day.count > 0 ? (
                        <>
                          <span className="font-semibold text-success">{day.xp} XP</span> ·{' '}
                          {day.count} {day.count === 1 ? 'activity' : 'activities'}
                        </>
                      ) : (
                        'No activity'
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend and Timeframe Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{dateRangeDisplay}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Less</span>
            <div className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-xs border bg-secondary/80 border-input/50"
                title="0 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-success/15 border-success/25"
                title="1-25 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-success/35 border-success/50"
                title="26-50 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-success/60 border-success/80"
                title="51-100 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-success border-success"
                title="100+ XP"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
