import { cookies } from 'next/headers';
import { requireStudentEntitlement, resolveActiveCohort } from '@/lib/db/queries/entitlements';
import { getStudentOverview } from '@/lib/db/queries/overview';
import { getStudentActivityLedger } from '@/lib/db/queries/activities';
import { getResumeLearningTarget } from '@/lib/services/resume-learning';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ResumeLearningCard } from '@/components/dashboard/resume-learning-card';
import { XpCard } from '@/components/overview/xp-card';
import { StreakCard } from '@/components/overview/streak-card';
import { DeadlinesCard } from '@/components/overview/deadlines-card';
import { ActivityHeatmap } from '@/components/overview/activity-heatmap';
import { ActivityLedger } from '@/components/overview/activity-ledger';
import { COHORT_COOKIE_NAME } from '@/lib/constants/cohort';
import { Building2, Calendar, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Overview — RMS Student Portal',
  description: 'Aggregated student learning feed, XP progress, daily streaks, deadlines, and activity heatmap.'
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
  const queryBatchId = resolvedSearchParams?.batchId;

  // Precedence: Query batchId > Validated Cookie > Fallback activeBatches[0]
  const activeCohort = resolveActiveCohort(context.activeBatches, {
    queryBatchId,
    cookieBatchId
  });

  const activeBatchIds = context.activeBatches.map((b) => b.batchId);

  // Fetch server-authoritative overview data, activity ledger, and resume target
  const [overviewData, activityLedger, resumeTarget] = await Promise.all([
    getStudentOverview(student.id, activeBatchIds),
    getStudentActivityLedger(student.id, { limit: 10 }),
    getResumeLearningTarget(student.id)
  ]);

  return (
    <div className="space-y-8">
      {/* 1. Welcome Banner */}
      <section className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              RMS Careers · Student Workbench
            </span>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {student.fullName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {student.collegeName || 'RMS Partner College'}
              </span>
              {student.branch && <span>· Branch: {student.branch}</span>}
              {student.collegeRollNumber && <span>· Roll No: {student.collegeRollNumber}</span>}
            </div>
          </div>

          {/* Active Cohort Pill */}
          {activeCohort && (
            <div className="flex flex-col sm:items-end justify-center rounded-xl border border-primary/30 bg-primary/10 p-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Active Cohort
                </span>
                {context.activeBatches.length > 1 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    ({context.activeBatches.length} Enrolled)
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">{activeCohort.batchName}</p>
              <p className="text-xs text-muted-foreground">{activeCohort.programName}</p>
            </div>
          )}
        </div>
      </section>

      {/* 2. Resume Learning Hero Card (Slice 4) */}
      <ResumeLearningCard target={resumeTarget} />

      {/* 3. Top Summary Stat Cards: XP and Streak */}
      <section className="grid gap-6 sm:grid-cols-2">
        <XpCard stats={overviewData.stats} />
        <StreakCard stats={overviewData.stats} />
      </section>

      {/* 3. Core Operational Widgets: 30-Day Activity Heatmap & Upcoming Deadlines */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <ActivityHeatmap heatmap={overviewData.heatmap} />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <DeadlinesCard deadlines={overviewData.deadlines} />
        </div>
      </section>

      {/* 4. Active Enrollments Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Enrolled Batches & Programs</h2>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground/80 font-medium">
            {context.enrollments.length} Active {context.enrollments.length === 1 ? 'Cohort' : 'Cohorts'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {context.enrollments.map((enr) => (
            <article
              key={enr.enrollmentId}
              className="rounded-xl border border-border bg-card/60 p-5 space-y-3 hover:border-input transition"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20 uppercase tracking-wider">
                  {enr.programCode}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-success font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {enr.status}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-sm">{enr.programName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{enr.batchName || 'General Program Track'}</p>
              </div>

              {enr.batchStartDate && (
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/80">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Started {new Date(enr.batchStartDate).toLocaleDateString()}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 5. Chronological Activity Ledger & Streak Log (Slice 15) */}
      <section>
        <ActivityLedger
          activities={activityLedger.activities}
          totalCount={activityLedger.totalCount}
          streakDetails={activityLedger.streakDetails}
        />
      </section>
    </div>
  );
}
