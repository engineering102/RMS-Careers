import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
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
import { Building2, Calendar, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Overview — RMS Student Portal',
  description: 'Aggregated student learning feed, XP progress, daily streaks, deadlines, and activity heatmap.'
};

export default async function OverviewPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const primaryBatch = context.activeBatches[0];
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
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
              RMS Careers · Student Workbench
            </span>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              Welcome back, {student.fullName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                {student.collegeName || 'RMS Partner College'}
              </span>
              {student.branch && <span>· Branch: {student.branch}</span>}
              {student.collegeRollNumber && <span>· Roll No: {student.collegeRollNumber}</span>}
            </div>
          </div>

          {/* Active Cohort Pill */}
          {primaryBatch && (
            <div className="flex flex-col sm:items-end justify-center rounded-xl border border-blue-800/40 bg-blue-950/40 p-4 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                Primary Cohort
              </span>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">{primaryBatch.batchName}</p>
              <p className="text-xs text-slate-400">{primaryBatch.programName}</p>
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
            <BookOpen className="h-4 w-4 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-200">Enrolled Batches & Programs</h2>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-medium">
            {context.enrollments.length} Active {context.enrollments.length === 1 ? 'Cohort' : 'Cohorts'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {context.enrollments.map((enr) => (
            <article
              key={enr.enrollmentId}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  {enr.programCode}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {enr.status}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-slate-100 text-sm">{enr.programName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{enr.batchName || 'General Program Track'}</p>
              </div>

              {enr.batchStartDate && (
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-800/80">
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
