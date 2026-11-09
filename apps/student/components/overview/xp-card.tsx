import React from 'react';
import type { StudentStatsOverview } from '@/lib/db/queries/overview';
import { formatNumber } from '@/lib/format/datetime';
import { levelForXp, XP_PER_LEVEL } from '@/lib/types/activity';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface XpCardProps {
  stats: StudentStatsOverview;
  className?: string;
}

/** XP cell of the Home stat strip: total, level, and how far into the level the student is. */
export function XpCard({ stats, className }: XpCardProps) {
  const totalXp = stats.totalXp ?? 0;
  // Same rule as the server ledger (100 XP per level), derived from XP so it can never disagree with it.
  const level = levelForXp(totalXp);
  const intoLevel = Math.max(0, totalXp - (level - 1) * XP_PER_LEVEL);
  const pct = Math.min(100, Math.round((intoLevel / XP_PER_LEVEL) * 100));
  const remaining = Math.max(0, level * XP_PER_LEVEL - totalXp);

  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-sm text-muted-foreground">XP</p>
      <p className="tabular mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground">
        {formatNumber(totalXp)}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {`Level ${level}`}
        <span className="hidden sm:inline">{` · ${remaining} XP to Level ${level + 1}`}</span>
      </p>
      <Progress value={pct} label={`Level ${level} progress`} className="mt-2 hidden max-w-[10rem] sm:block" />
      <span className="sr-only">{`${pct}% of the way to Level ${level + 1}`}</span>
    </div>
  );
}
