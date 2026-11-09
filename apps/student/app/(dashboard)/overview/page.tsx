import { cookies } from 'next/headers';
import { requireStudentEntitlement, resolveActiveCohort } from '@/lib/db/queries/entitlements';
import { getStudentOverview } from '@/lib/db/queries/overview';
import { getStudentActivityInsights } from '@/lib/db/queries/activity-insights';
import { getResumeLearningTarget } from '@/lib/services/resume-learning';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ResumeLearningCard } from '@/components/dashboard/resume-learning-card';
import { XpCard } from '@/components/overview/xp-card';
import { StreakCard } from '@/components/overview/streak-card';
import { DeadlinesCard } from '@/components/overview/deadlines-card';
import { ActivityHeatmap } from '@/components/overview/activity-heatmap';
import { ActivityInsightsCard } from '@/components/overview/activity-insights-card';
import { Stat } from '@/components/ui/stat-card';
import { COHORT_COOKIE_NAME } from '@/lib/constants/cohort';
import { formatNumber } from '@/lib/format/datetime';
import { greetingFor } from '@/lib/format/relative-dates';

export const metadata = {
  title: 'Home — RMS Student Portal',
  description: 'What to do next, what is due, and your recent progress.'
};

interface OverviewPageProps {
  searchParams?: Promise<{
    batchId?: string;
  }>;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const cookieStore = await cookies();
  const cookieBatchId = cookieStore.get(COHORT_COOKIE_NAME)?.value;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // Precedence: Query batchId > Validated Cookie > Fallback activeBatches[0]
  const activeCohort = resolveActiveCohort(context.activeBatches, {
    queryBatchId: resolvedSearchParams?.batchId,
    cookieBatchId
  });

  const activeBatchIds = context.activeBatches.map((b) => b.batchId);

  const [overviewData, activityInsights, resumeTarget] = await Promise.all([
    getStudentOverview(student.id, activeBatchIds),
    getStudentActivityInsights(student.id),
    getResumeLearningTarget(student.id)
  ]);

  const firstName = student.fullName.trim().split(/\s+/)[0] || student.fullName;
  const contextLine = [activeCohort?.batchName, resumeTarget.weekNumber !== undefined ? `Week ${resumeTarget.weekNumber}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        {contextLine && <p className="text-sm text-muted-foreground">{contextLine}</p>}
        <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2rem]">
          {greetingFor()}, {firstName}
        </h1>
      </header>

      <div className="space-y-6">
        <ResumeLearningCard target={resumeTarget} />

        <section aria-label="Your progress" className="grid grid-cols-3 border-y border-border">
          <XpCard stats={overviewData.stats} className="py-4 pr-3" />
          <StreakCard stats={overviewData.stats} className="border-l border-border py-4 pl-3 pr-3 sm:pl-5" />
          <Stat
            label="DSA solved"
            value={formatNumber(overviewData.stats.dsaSolvedCount ?? 0)}
            hint="Across all sheets"
            className="border-l border-border py-4 pl-3 sm:pl-5"
          />
        </section>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DeadlinesCard deadlines={overviewData.deadlines} />
        <ActivityHeatmap heatmap={overviewData.heatmap} />
      </div>

      {/* Weekly XP trend and XP mix (replaced the activity log on main). */}
      <ActivityInsightsCard insights={activityInsights} />
    </div>
  );
}
