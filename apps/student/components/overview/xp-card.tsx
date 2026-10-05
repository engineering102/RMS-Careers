import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trophy, Zap } from 'lucide-react';
import type { StudentStatsOverview } from '@/lib/db/queries/overview';

interface XpCardProps {
  stats: StudentStatsOverview;
}

export function XpCard({ stats }: XpCardProps) {
  const totalXp = stats.totalXp ?? 0;
  const currentLevel = stats.currentLevel ?? 1;

  // Level progression heuristic (500 XP per level)
  const xpPerLevel = 500;
  const currentLevelBaseXp = (currentLevel - 1) * xpPerLevel;
  const nextLevelTargetXp = currentLevel * xpPerLevel;
  const xpIntoCurrentLevel = Math.max(0, totalXp - currentLevelBaseXp);
  const levelProgressPercent = Math.min(
    100,
    Math.round((xpIntoCurrentLevel / xpPerLevel) * 100)
  );
  const xpRemainingToNextLevel = Math.max(0, nextLevelTargetXp - totalXp);

  return (
    <Card className="relative overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900/90 to-blue-950/20 backdrop-blur-sm">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium text-slate-300">Global XP</CardTitle>
        </div>
        <Badge
          variant="outline"
          className="border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold"
        >
          Level {currentLevel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-100">
              {totalXp.toLocaleString()}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              XP Earned
            </span>
          </div>

          {totalXp === 0 ? (
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Earn XP by completing coding challenges, lectures, quizzes, and projects.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              {xpRemainingToNextLevel > 0
                ? `${xpRemainingToNextLevel.toLocaleString()} XP to Level ${currentLevel + 1}`
                : `Max progress reached for Level ${currentLevel}`}
            </p>
          )}
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>Progress to Lvl {currentLevel + 1}</span>
            <span>{levelProgressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${levelProgressPercent}%` }}
              role="progressbar"
              aria-valuenow={levelProgressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>DSA Solved:</span>
            <span className="font-semibold text-slate-200">{stats.dsaSolvedCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Zap className="h-3 w-3 text-blue-400" />
            <span>Server Authoritative</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
