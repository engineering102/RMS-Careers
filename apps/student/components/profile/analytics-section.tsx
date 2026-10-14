import React from 'react';
import {
  Code2,
  Calendar,
  PieChart,
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import type {
  TopicProgress,
  CategoryXpBreakdown,
  StudentStatsSummary
} from '@/lib/types/profile';
import type { HeatmapDay } from '@/lib/types/overview';
import { formatNumber } from '@/lib/format/datetime';

interface AnalyticsSectionProps {
  stats: StudentStatsSummary;
  topicProgress: TopicProgress[];
  heatmap: {
    days: HeatmapDay[];
    totalActiveDays: number;
    totalPeriodXp: number;
    startDate: string;
    endDate: string;
  };
  xpBreakdown: CategoryXpBreakdown[];
}

export function AnalyticsSection({
  stats,
  topicProgress,
  heatmap,
  xpBreakdown
}: AnalyticsSectionProps) {
  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 1:
        return 'bg-success/5 border-success/30';
      case 2:
        return 'bg-success/5 border-success/60';
      case 3:
        return 'bg-success border-success';
      case 4:
        return 'bg-success border-success shadow-sm shadow-success/40';
      default:
        return 'bg-card border-border/80';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dsa':
        return {
          bar: 'bg-primary',
          dot: 'bg-primary',
          text: 'text-primary'
        };
      case 'quizzes':
        return {
          bar: 'bg-purple-500',
          dot: 'bg-purple-500',
          text: 'text-purple-400'
        };
      case 'projects':
        return {
          bar: 'bg-success',
          dot: 'bg-success',
          text: 'text-success'
        };
      case 'external':
        return {
          bar: 'bg-warning',
          dot: 'bg-warning',
          text: 'text-warning'
        };
      default:
        return {
          bar: 'bg-muted-foreground',
          dot: 'bg-muted-foreground',
          text: 'text-muted-foreground'
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. High-Level Milestone Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total XP */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm shadow-md">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-warning" />
            <span>Total XP</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(stats.totalXp)}</p>
          <p className="mt-0.5 text-[11px] text-warning/80">Level {stats.currentLevel}</p>
        </div>

        {/* Current Streak */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm shadow-md">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>Current Streak</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.currentStreak} days</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Asia/Kolkata IST</p>
        </div>

        {/* Longest Streak */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm shadow-md">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Trophy className="h-4 w-4 text-purple-400" />
            <span>Best Streak</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.longestStreak} days</p>
          <p className="mt-0.5 text-[11px] text-purple-400/80">Record achievement</p>
        </div>

        {/* DSA Solved */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm shadow-md">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>DSA Solved</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.dsaSolvedCount}</p>
          <p className="mt-0.5 text-[11px] text-success/80">Verified solutions</p>
        </div>
      </div>

      {/* 2. 30-Day Activity Heatmap */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 border border-success/20 text-success">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">30-Day Activity Heatmap</h3>
              <p className="text-xs text-muted-foreground">
                Daily learning consistency tracked in Asia/Kolkata timezone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Active Days: <strong className="text-success">{heatmap.totalActiveDays} / 30</strong>
            </span>
            <span className="text-muted-foreground">
              Period XP: <strong className="text-warning">+{heatmap.totalPeriodXp}</strong>
            </span>
          </div>
        </div>

        {/* Grid squares */}
        <div className="mt-6">
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
            {heatmap.days.map((day) => (
              <div
                key={day.date}
                className="group relative flex flex-col items-center"
              >
                <div
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg border transition-all duration-150 hover:scale-110 cursor-default ${getIntensityClass(
                    day.intensity
                  )}`}
                />
                {/* Floating tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-2 hidden -translate-x-1/2 left-1/2 flex-col items-center z-30 group-hover:flex">
                  <div className="rounded-lg bg-background border border-border px-2.5 py-1.5 text-center text-[11px] text-foreground shadow-xl whitespace-nowrap">
                    <p className="font-semibold">{day.formattedDate}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {day.count} {day.count === 1 ? 'action' : 'actions'} · +{day.xp} XP
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span>{heatmap.startDate}</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="h-3 w-3 rounded-sm bg-card border border-border" />
              <div className="h-3 w-3 rounded-sm bg-success/5 border border-success/30" />
              <div className="h-3 w-3 rounded-sm bg-success/5 border border-success/60" />
              <div className="h-3 w-3 rounded-sm bg-success border border-success" />
              <div className="h-3 w-3 rounded-sm bg-success border border-success" />
              <span>More</span>
            </div>
            <span>{heatmap.endDate}</span>
          </div>
        </div>
      </div>

      {/* 3. Dual Section: Topic Completion Progress & Category XP Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A. Topic Completion Progress Bars */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Topic Completion</h3>
              <p className="text-xs text-muted-foreground">
                DSA problem patterns completed across curriculum sheets
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {topicProgress.map((topic) => (
              <div key={topic.topicSlug} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{topic.topicTitle}</span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{topic.solvedQuestions}</strong> / {topic.totalQuestions}{' '}
                    <span className="text-primary font-semibold">({topic.percentage}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500"
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* B. Category XP Breakdown */}
        <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Category XP Breakdown</h3>
              <p className="text-xs text-muted-foreground">Distribution of experience points earned across activities</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Multi-segment Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-background border border-border flex">
              {xpBreakdown.map((cat) => {
                const colors = getCategoryColor(cat.category);
                return cat.percentage > 0 ? (
                  <div
                    key={cat.category}
                    className={`h-full ${colors.bar} transition-all duration-500`}
                    style={{ width: `${cat.percentage}%` }}
                    title={`${cat.label}: ${cat.percentage}%`}
                  />
                ) : null;
              })}
            </div>

            {/* Category Cards List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {xpBreakdown.map((cat) => {
                const colors = getCategoryColor(cat.category);
                return (
                  <div
                    key={cat.category}
                    className="rounded-xl border border-border/80 bg-background/40 p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${colors.dot} shrink-0`} />
                      <span className="text-xs font-medium text-foreground/80">{cat.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">+{cat.xp} XP</span>
                      <span className="text-[10px] text-muted-foreground block">({cat.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-background/60 border border-border/60 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Gamification Ledger</span>
              <span className="font-bold text-warning">{formatNumber(stats.totalXp)} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
