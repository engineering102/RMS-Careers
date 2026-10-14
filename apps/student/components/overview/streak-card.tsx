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
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card/90 to-warning/5">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-28 w-28 rounded-full bg-warning/10 blur-2xl pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              isStreakActive
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-secondary/80 border-input/50 text-muted-foreground'
            }`}
          >
            <Flame className={`h-4 w-4 ${isStreakActive ? 'animate-pulse text-warning' : ''}`} />
          </div>
          <CardTitle className="text-sm font-medium text-foreground/80">Daily Streak</CardTitle>
        </div>

        <Badge
          variant="outline"
          className={
            isStreakActive
              ? 'border-warning/30 bg-warning/10 text-warning font-semibold'
              : 'border-input bg-secondary/50 text-muted-foreground'
          }
        >
          {isStreakActive ? 'Streak Active' : 'No Active Streak'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              {currentStreak}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">
              {currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isStreakActive
              ? 'Keep learning today to maintain and grow your consecutive streak.'
              : 'Complete a problem or learning module today to ignite your streak!'}
          </p>
        </div>

        {/* Milestone info block */}
        <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Award className="h-3.5 w-3.5 text-warning" />
              Personal Best:
            </span>
            <span className="font-semibold text-foreground">
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/80">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Last Activity:
            </span>
            <span className="font-medium text-foreground/80">
              {lastActiveDate || 'None recorded'}
            </span>
          </div>
        </div>

        {/* Status Hint */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Calculated at IST midnight (Asia/Kolkata)</span>
        </div>
      </CardContent>
    </Card>
  );
}
