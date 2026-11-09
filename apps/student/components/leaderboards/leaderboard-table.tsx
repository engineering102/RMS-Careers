import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame } from 'lucide-react';
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
        <span className="tabular inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground font-display text-xs font-semibold text-background" aria-label="Rank 1">
          1
        </span>
      );
    case 2:
      return (
        <span className="tabular inline-flex h-7 w-7 items-center justify-center rounded-full border border-foreground font-display text-xs font-semibold text-foreground" aria-label="Rank 2">
          2
        </span>
      );
    case 3:
      // Top three are marked by weight (filled, outlined, ringed), not gold/silver/bronze colours.
      return (
        <span className="tabular inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-strong font-display text-xs font-semibold text-foreground" aria-label="Rank 3">
          3
        </span>
      );
    default:
      return (
        <span className="tabular inline-flex h-7 w-7 items-center justify-center text-xs font-medium text-muted-foreground">
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
      <Card className="border-border bg-card">
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
    <Card className="border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium text-xs bg-muted/50 whitespace-nowrap">
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
                    : 'hover:bg-accent/30'
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
                      <span className="inline-flex shrink-0 items-center rounded bg-foreground px-1.5 py-0.5 text-xs font-medium text-background">
                        You
                      </span>
                    )}
                  </div>
                  {/* Phone layout: branch and streak under the name (their own columns are hidden). */}
                  <div className="tabular mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
                    {entry.branch && <span className="line-clamp-1 break-all" title={entry.branch}>{entry.branch}</span>}
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-warning">
                      <Flame className="h-3 w-3" aria-hidden="true" />
                      {entry.currentStreak}d
                    </span>
                  </div>
                </td>

                {/* 3. Branch / Department ("—" when the college never recorded one) */}
                <td className="hidden max-w-[16rem] break-words px-4 py-3.5 text-sm text-muted-foreground sm:table-cell">
                  {entry.branch || <span className="text-muted-foreground">—</span>}
                </td>

                {/* 4. Daily Streak */}
                <td className="hidden sm:table-cell py-3.5 px-4 text-center whitespace-nowrap">
                  <span className="tabular inline-flex items-center gap-1 text-muted-foreground">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{entry.currentStreak}d</span>
                  </span>
                </td>

                {/* 5. XP Score (never truncated or wrapped) */}
                <td className="whitespace-nowrap px-3 py-3.5 text-right sm:px-4">
                  <span className="tabular inline-flex items-center gap-1 text-sm font-semibold text-foreground">
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
