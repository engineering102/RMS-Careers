'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Users,
  Building2,
  Calendar,
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';
import type {
  LeaderboardScope,
  LeaderboardTimeframe,
  BatchOption,
  StudentLeaderboardStanding
} from '@/lib/types/leaderboards';

interface LeaderboardHeaderProps {
  scope: LeaderboardScope;
  timeframe: LeaderboardTimeframe;
  selectedBatchId?: string;
  batchName?: string;
  collegeName?: string | null;
  availableBatches?: BatchOption[];
  userStanding: StudentLeaderboardStanding;
  weekStartDateIst?: string;
}

export function LeaderboardHeader({
  scope,
  timeframe,
  selectedBatchId,
  batchName,
  collegeName,
  availableBatches = [],
  userStanding,
  weekStartDateIst
}: LeaderboardHeaderProps) {
  const router = useRouter();

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBatchId = e.target.value;
    router.push(`/leaderboards?scope=batch&timeframe=${timeframe}&batchId=${newBatchId}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Title & Description */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="h-3.5 w-3.5" />
              Peer Rankings
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {timeframe === 'weekly' ? 'Weekly (IST Week)' : 'All-Time Cumulative'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Leaderboard & Peer Rankings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track weekly milestones and all-time achievements across your batch cohort and college.
          </p>
        </div>

        {/* User Standing Pill */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm self-start md:self-auto shrink-0">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Trophy className="h-5 w-5" />
          </div>

          <div className="space-y-0.5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Your Standing
            </p>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-bold text-slate-100 font-mono">
                {userStanding.rank ? `Rank #${userStanding.rank}` : 'Unranked'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                <Zap className="h-3 w-3" />
                {userStanding.xp} XP
              </span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                <Flame className="h-3 w-3" />
                {userStanding.currentStreak}d
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls: Scope Tabs, Timeframe Toggle, and Cohort Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-800/80">
        {/* Scope Tabs (Batch vs College) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <Link
            href={`/leaderboards?scope=batch&timeframe=${timeframe}${selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scope === 'batch'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Batch Cohort</span>
          </Link>

          <Link
            href={`/leaderboards?scope=college&timeframe=${timeframe}`}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scope === 'college'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>College-Wide</span>
          </Link>
        </div>

        {/* Right Controls: Batch Selector (if batch scope) + Timeframe Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {scope === 'batch' && availableBatches.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Cohort:</span>
              <select
                value={selectedBatchId}
                onChange={handleBatchChange}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                {availableBatches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Timeframe Toggle (Weekly vs All-Time) */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <Link
              href={`/leaderboards?scope=${scope}&timeframe=weekly${scope === 'batch' && selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                timeframe === 'weekly'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly
            </Link>

            <Link
              href={`/leaderboards?scope=${scope}&timeframe=all_time${scope === 'batch' && selectedBatchId ? `&batchId=${selectedBatchId}` : ''}`}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                timeframe === 'all_time'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All-Time
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Scope Context Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {scope === 'batch' ? (
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users className="h-3.5 w-3.5 text-blue-400" />
              <span>Showing rankings for cohort:</span>
              <strong className="text-slate-100 font-semibold">{batchName || 'Your Enrolled Batch'}</strong>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Showing rankings across:</span>
              <strong className="text-slate-100 font-semibold">{collegeName || 'Your College'}</strong>
            </span>
          )}
        </div>

        {timeframe === 'weekly' && weekStartDateIst && (
          <span className="font-mono text-slate-400 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-500" />
            Week starting {weekStartDateIst} (IST)
          </span>
        )}
      </div>
    </div>
  );
}
