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
      // Bronze is decorative and has no design token (rank 1 gold uses `warning`).
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/15 border border-amber-700/30 text-amber-500 font-bold text-xs shadow-sm">
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

  // Below `sm` the Branch and Streak columns fold into the Student cell so Rank, Student and XP fit a
  // phone without horizontal scrolling; the table still scrolls inside its card if a cell is too wide.
  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground uppercase font-semibold text-[11px] tracking-wider bg-background/40 whitespace-nowrap">
              <th className="py-3 px-3 sm:px-4 w-14 sm:w-16 text-center">Rank</th>
              <th className="py-3 px-3 sm:px-4">Student</th>
              <th className="hidden sm:table-cell py-3 px-4">Department / Branch</th>
              <th className="hidden sm:table-cell py-3 px-4 text-center">Daily Streak</th>
              <th className="py-3 px-3 sm:px-4 text-right">
                {timeframe === 'weekly' ? 'Weekly XP' : 'Total XP'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {entries.map((entry) => (
              <tr
                key={entry.studentId}
                className={`transition-colors ${
                  entry.isCurrentUser
                    ? 'bg-primary/5 border-l-2 border-l-primary hover:bg-primary/5'
                    : 'hover:bg-secondary/30'
                }`}
              >
                {/* 1. Rank Column */}
                <td className="py-3.5 px-3 sm:px-4 text-center">{getRankBadge(entry.rank)}</td>

                {/* 2. Student Full Name (Privacy-compliant plain text, non-clickable) */}
                <td className="py-3.5 px-3 sm:px-4 font-medium text-foreground min-w-[9rem]">
                  <div className="flex items-start gap-2">
                    {/* Names wrap to two lines; the full name stays available on hover. */}
                    <span className="text-sm font-semibold line-clamp-2 break-words" title={entry.fullName}>
                      {entry.fullName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 font-mono">
                        You
                      </span>
                    )}
                  </div>
                  {/* Phone layout: branch and streak under the name (their own columns are hidden). */}
                  <div className="sm:hidden mt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    {entry.branch && <span className="line-clamp-1 break-all" title={entry.branch}>{entry.branch}</span>}
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-warning">
                      <Flame className="h-3 w-3 fill-warning/20" aria-hidden="true" />
                      {entry.currentStreak}d
                    </span>
                  </div>
                </td>

                {/* 3. Branch / Department ("—" when the college never recorded one) */}
                <td className="hidden sm:table-cell py-3.5 px-4 text-foreground/80 font-mono text-xs max-w-[16rem] break-words">
                  {entry.branch || <span className="text-muted-foreground">—</span>}
                </td>

                {/* 4. Daily Streak */}
                <td className="hidden sm:table-cell py-3.5 px-4 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-warning font-mono font-medium">
                    <Flame className="h-3.5 w-3.5 fill-warning/20" />
                    <span>{entry.currentStreak}d</span>
                  </span>
                </td>

                {/* 5. XP Score (never truncated or wrapped) */}
                <td className="py-3.5 px-3 sm:px-4 text-right font-mono whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-bold text-success text-sm">
                    <Zap className="h-3.5 w-3.5" />
                    {entry.xp > 0 ? '+' : ''}
                    {formatNumber(entry.xp)} XP
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
