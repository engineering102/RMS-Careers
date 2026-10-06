import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity,
  Award,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Code2,
  FolderGit2,
  Flame,
  PlayCircle,
  Users,
  Zap
} from 'lucide-react';
import type {
  ActivityType,
  LearningActivityRecord,
  StudentStreakDetails
} from '@/lib/types/activity';

interface ActivityLedgerProps {
  activities: LearningActivityRecord[];
  totalCount: number;
  streakDetails?: StudentStreakDetails;
}

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; badgeClass: string }
> = {
  dsa_solved: {
    label: 'DSA Practice',
    icon: Code2,
    colorClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  lecture_completed: {
    label: 'Curriculum Lecture',
    icon: PlayCircle,
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  quiz_completed: {
    label: 'Knowledge Check',
    icon: ClipboardCheck,
    colorClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  assignment_approved: {
    label: 'Project Deliverable',
    icon: FolderGit2,
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  external_assessment: {
    label: 'External Benchmark',
    icon: Award,
    colorClass: 'text-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  }
};

/**
 * Activity Ledger & Streak Log Component.
 * Presents real-time chronological records of XP-awarded actions and daily streak status.
 */
export function ActivityLedger({
  activities,
  totalCount,
  streakDetails
}: ActivityLedgerProps) {
  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="space-y-4">
      {/* 1. Header with Streak Risk Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Activity Ledger & Streak Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time ledger of XP-bearing events and Asia/Kolkata daily streak progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {streakDetails && (
            streakDetails.isActiveToday ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Streak Secured Today</span>
              </span>
            ) : streakDetails.isAtRisk ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Streak at Risk (Due by Midnight IST)</span>
              </span>
            ) : null
          )}

          <span className="text-xs text-slate-400 font-mono">
            {totalCount} {totalCount === 1 ? 'event' : 'events'}
          </span>
        </div>
      </div>

      {/* 2. Chronological Ledger List */}
      {activities.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-8 text-center space-y-2.5">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">
              No Learning Activities Logged Yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Complete a curriculum lecture, solve a DSA problem, or pass a knowledge check to earn XP
              and begin building your Asia/Kolkata daily streak.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="divide-y divide-slate-800/80">
            {activities.map((activity) => {
              const config =
                ACTIVITY_TYPE_CONFIG[activity.activityType] ||
                ACTIVITY_TYPE_CONFIG.lecture_completed;
              const IconComponent = config.icon;

              let formattedTime = '';
              try {
                formattedTime = dateFormatter.format(new Date(activity.createdAt));
              } catch {
                formattedTime = activity.activityDateIst;
              }

              return (
                <div
                  key={activity.id}
                  className="p-4 sm:p-4.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0 ${config.colorClass}`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>

                        {activity.batchName && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Users className="h-3 w-3 text-slate-500" />
                            {activity.batchName}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                        {activity.title}
                      </p>

                      <p className="text-[11px] text-slate-400 font-mono">
                        {formattedTime} IST · {activity.activityDateIst}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      <Zap className="h-3 w-3 fill-amber-400" />
                      +{activity.xpAwarded} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
