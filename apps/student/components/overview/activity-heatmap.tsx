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
      return 'bg-slate-800/80 border-slate-700/50 hover:border-slate-500';
    case 1:
      return 'bg-emerald-950 border-emerald-800/60 hover:border-emerald-600';
    case 2:
      return 'bg-emerald-800 border-emerald-600/70 hover:border-emerald-400';
    case 3:
      return 'bg-emerald-600 border-emerald-400/80 hover:border-emerald-300';
    case 4:
      return 'bg-emerald-400 border-emerald-200 shadow-sm shadow-emerald-400/30 hover:border-white';
    default:
      return 'bg-slate-800/80 border-slate-700/50';
  }
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const { days, totalActiveDays, totalPeriodXp, startDate, endDate } = heatmap;

  const dateRangeDisplay = `${formatIstDateReadable(startDate)} – ${formatIstDateReadable(endDate)}`;

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-200">
              30-Day Activity Heatmap
            </CardTitle>
            <p className="text-xs text-slate-400">Daily learning momentum in IST (Asia/Kolkata)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs"
          >
            <Flame className="h-3 w-3 mr-1 text-emerald-400" />
            {totalActiveDays} / 30 Active Days
          </Badge>

          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs"
          >
            {totalPeriodXp.toLocaleString()} Period XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Heatmap Grid */}
        <TooltipProvider delayDuration={100}>
          <div
            className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2 p-3 rounded-xl border border-slate-800/80 bg-slate-950/40"
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
                      className={`h-7 w-full rounded-md border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${intensityClass}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold text-slate-100">{day.formattedDate}</p>
                    <p className="text-slate-300">
                      {day.count > 0 ? (
                        <>
                          <span className="font-semibold text-emerald-400">{day.xp} XP</span> ·{' '}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>{dateRangeDisplay}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Less</span>
            <div className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded-xs border bg-slate-800/80 border-slate-700/50"
                title="0 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-emerald-950 border-emerald-800/60"
                title="1-25 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-emerald-800 border-emerald-600/70"
                title="26-50 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-emerald-600 border-emerald-400/80"
                title="51-100 XP"
              />
              <div
                className="h-3 w-3 rounded-xs border bg-emerald-400 border-emerald-200"
                title="100+ XP"
              />
            </div>
            <span className="text-[11px] text-slate-400">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
