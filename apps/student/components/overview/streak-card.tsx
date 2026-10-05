import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, Calendar, CheckCircle2 } from 'lucide-react';
import type { StudentStatsOverview } from '@/lib/db/queries/overview';

interface StreakCardProps {
  stats: StudentStatsOverview;
}

export function StreakCard({ stats }: StreakCardProps) {
  const currentStreak = stats.currentStreak ?? 0;
  const longestStreak = stats.longestStreak ?? 0;
  const lastActiveDate = stats.lastActivityDateIst;

  const isStreakActive = currentStreak > 0;

  return (
    <Card className="relative overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900/90 to-amber-950/20 backdrop-blur-sm">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              isStreakActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800/80 border-slate-700/50 text-slate-400'
            }`}
          >
            <Flame className={`h-4 w-4 ${isStreakActive ? 'animate-pulse text-amber-400' : ''}`} />
          </div>
          <CardTitle className="text-sm font-medium text-slate-300">Daily Streak</CardTitle>
        </div>

        <Badge
          variant="outline"
          className={
            isStreakActive
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }
        >
          {isStreakActive ? 'Streak Active' : 'No Active Streak'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-100">
              {currentStreak}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              {currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {isStreakActive
              ? 'Keep learning today to maintain and grow your consecutive streak.'
              : 'Complete a problem or learning module today to ignite your streak!'}
          </p>
        </div>

        {/* Milestone info block */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Award className="h-3.5 w-3.5 text-amber-400" />
              Personal Best:
            </span>
            <span className="font-semibold text-slate-200">
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              Last Activity:
            </span>
            <span className="font-medium text-slate-300">
              {lastActiveDate || 'None recorded'}
            </span>
          </div>
        </div>

        {/* Status Hint */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Calculated at IST midnight (Asia/Kolkata)</span>
        </div>
      </CardContent>
    </Card>
  );
}
