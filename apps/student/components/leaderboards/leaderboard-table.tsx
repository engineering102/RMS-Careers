import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Zap, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types/leaderboards';
import { formatNumber } from '@/lib/format/datetime';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  timeframe: 'weekly' | 'all_time';
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/15 border border-warning/30 text-warning font-bold text-xs shadow-sm">
          <Trophy className="h-3.5 w-3.5" />
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted-foreground/15 border border-muted-foreground/30 text-foreground font-bold text-xs shadow-sm">
          <Medal className="h-3.5 w-3.5" />
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/15 border border-warning/30 text-warning font-bold text-xs shadow-sm">
          <Medal className="h-3.5 w-3.5" />
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary border border-input/70 text-muted-foreground font-semibold text-xs font-mono">
          {rank}
        </span>
      );
  }
}

/**
 * Leaderboard Table Component.
 * Presents ranked students with privacy masking (non-clickable plain text, no PII).
 */
export function LeaderboardTable({ entries, timeframe }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <Card className="border-border bg-card/40">
        <CardContent className="p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-secondary/80 border border-input flex items-center justify-center text-muted-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No Leaderboard Entries Recorded
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {timeframe === 'weekly'
              ? 'No XP activities have been logged for this cohort/college during the current calendar week yet. Complete a learning activity to take the #1 spot!'
              : 'No student progress records exist yet for this cohort/college.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground uppercase font-semibold text-[11px] tracking-wider bg-background/40 whitespace-nowrap">
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Department / Branch</th>
              <th className="py-3 px-4 text-center">Daily Streak</th>
              <th className="py-3 px-4 text-right">
                {timeframe === 'weekly' ? 'Weekly XP' : 'Total XP'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {entries.map((entry) => (
              <tr
                key={entry.studentId}
                className={`transition-colors whitespace-nowrap ${
                  entry.isCurrentUser
                    ? 'bg-primary/5 border-l-2 border-l-primary hover:bg-primary/5'
                    : 'hover:bg-secondary/30'
                }`}
              >
                {/* 1. Rank Column */}
                <td className="py-3.5 px-4 text-center">{getRankBadge(entry.rank)}</td>

                {/* 2. Student Full Name (Privacy-compliant plain text, non-clickable) */}
                <td className="py-3.5 px-4 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate max-w-xs">
                      {entry.fullName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 font-mono">
                        You
                      </span>
                    )}
                  </div>
                </td>

                {/* 3. Branch / Department */}
                <td className="py-3.5 px-4 text-foreground/80 font-mono text-xs">
                  {entry.branch || 'General Engineering'}
                </td>

                {/* 4. Daily Streak */}
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-warning font-mono font-medium">
                    <Flame className="h-3.5 w-3.5 fill-warning/20" />
                    <span>{entry.currentStreak}d</span>
                  </span>
                </td>

                {/* 5. XP Score */}
                <td className="py-3.5 px-4 text-right font-mono">
                  <span className="inline-flex items-center gap-1 font-bold text-success text-sm">
                    <Zap className="h-3.5 w-3.5" />
                    +{formatNumber(entry.xp)} XP
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
