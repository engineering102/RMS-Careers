import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Zap, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/types/leaderboards';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  timeframe: 'weekly' | 'all_time';
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs shadow-sm">
          <Trophy className="h-3.5 w-3.5" />
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/15 border border-slate-300/30 text-slate-200 font-bold text-xs shadow-sm">
          <Medal className="h-3.5 w-3.5" />
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/15 border border-amber-700/30 text-amber-500 font-bold text-xs shadow-sm">
          <Medal className="h-3.5 w-3.5" />
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700/70 text-slate-400 font-semibold text-xs font-mono">
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
      <Card className="border-slate-800 bg-slate-900/40">
        <CardContent className="p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            <Trophy className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">
            No Leaderboard Entries Recorded
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {timeframe === 'weekly'
              ? 'No XP activities have been logged for this cohort/college during the current calendar week yet. Complete a learning activity to take the #1 spot!'
              : 'No student progress records exist yet for this cohort/college.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider bg-slate-950/40 whitespace-nowrap">
              <th className="py-3 px-4 w-16 text-center">Rank</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Department / Branch</th>
              <th className="py-3 px-4 text-center">Daily Streak</th>
              <th className="py-3 px-4 text-right">
                {timeframe === 'weekly' ? 'Weekly XP' : 'Total XP'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {entries.map((entry) => (
              <tr
                key={entry.studentId}
                className={`transition-colors whitespace-nowrap ${
                  entry.isCurrentUser
                    ? 'bg-blue-950/30 border-l-2 border-l-blue-500 hover:bg-blue-950/40'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                {/* 1. Rank Column */}
                <td className="py-3.5 px-4 text-center">{getRankBadge(entry.rank)}</td>

                {/* 2. Student Full Name (Privacy-compliant plain text, non-clickable) */}
                <td className="py-3.5 px-4 font-medium text-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate max-w-xs">
                      {entry.fullName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                        You
                      </span>
                    )}
                  </div>
                </td>

                {/* 3. Branch / Department */}
                <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                  {entry.branch || 'General Engineering'}
                </td>

                {/* 4. Daily Streak */}
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-amber-400 font-mono font-medium">
                    <Flame className="h-3.5 w-3.5 fill-amber-400/20" />
                    <span>{entry.currentStreak}d</span>
                  </span>
                </td>

                {/* 5. XP Score */}
                <td className="py-3.5 px-4 text-right font-mono">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-sm">
                    <Zap className="h-3.5 w-3.5" />
                    +{entry.xp.toLocaleString()} XP
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
