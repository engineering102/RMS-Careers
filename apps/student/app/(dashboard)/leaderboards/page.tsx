import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getLeaderboardData } from '@/lib/db/queries/leaderboards';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { LeaderboardHeader } from '@/components/leaderboards/leaderboard-header';
import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table';
import type { LeaderboardScope, LeaderboardTimeframe } from '@/lib/types/leaderboards';

export const metadata = {
  title: 'Leaderboard & Peer Rankings — RMS Student Portal',
  description: 'Cohort and college-wide peer leaderboards tracking weekly milestones and all-time achievements.'
};

interface LeaderboardsPageProps {
  searchParams: Promise<{
    scope?: string;
    timeframe?: string;
    batchId?: string;
  }>;
}

export default async function LeaderboardsPage({ searchParams }: LeaderboardsPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const resolvedSearchParams = await searchParams;

  const scope: LeaderboardScope =
    resolvedSearchParams.scope === 'college' ? 'college' : 'batch';
  const timeframe: LeaderboardTimeframe =
    resolvedSearchParams.timeframe === 'all_time' ? 'all_time' : 'weekly';

  // Fetch server-authoritative leaderboard data
  const data = await getLeaderboardData({
    studentId: student.id,
    collegeId: student.collegeId,
    scope,
    timeframe,
    batchId: resolvedSearchParams.batchId
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Scope Tabs, Cohort Selector & Standing Pill */}
      <LeaderboardHeader
        scope={data.scope}
        timeframe={data.timeframe}
        selectedBatchId={data.batchId}
        batchName={data.batchName}
        collegeName={data.collegeName || student.collegeName}
        availableBatches={data.availableBatches}
        userStanding={data.userStanding}
        weekStartDateIst={data.weekStartDateIst}
      />

      {/* 2. Ranked Peer Table (Privacy Masked) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            {data.timeframe === 'weekly' ? 'Weekly XP Standings' : 'All-Time XP Standings'}
          </h2>

          <span className="text-xs text-slate-400 font-mono">
            {data.entries.length} {data.entries.length === 1 ? 'participant' : 'participants'}
          </span>
        </div>

        <LeaderboardTable entries={data.entries} timeframe={data.timeframe} />
      </div>
    </div>
  );
}
