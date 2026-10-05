import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { STUDENT_NAV_ITEMS } from '@/components/shell/nav-items';
import { Building2, Calendar, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Overview — RMS Student Portal',
  description: 'Aggregated student learning feed, active cohorts, and curriculum access.'
};

export default async function OverviewPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const primaryBatch = context.activeBatches[0];
  const featureModules = STUDENT_NAV_ITEMS.filter((item) => item.href !== '/overview');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
              RMS Careers · Student Workbench
            </span>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              Welcome back, {student?.fullName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                {student?.collegeName || 'RMS Partner College'}
              </span>
              {student?.branch && <span>· Branch: {student.branch}</span>}
              {student?.collegeRollNumber && <span>· Roll No: {student.collegeRollNumber}</span>}
            </div>
          </div>

          {/* Active Cohort Pill */}
          {primaryBatch && (
            <div className="flex flex-col sm:items-end justify-center rounded-xl border border-blue-800/40 bg-blue-950/40 p-4 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                Active Cohort
              </span>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">{primaryBatch.batchName}</p>
              <p className="text-xs text-slate-400">{primaryBatch.programName}</p>
            </div>
          )}
        </div>
      </section>

      {/* Active Enrollments Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">Enrolled Batches & Programs</h2>
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

      {/* Future Learning Modules Overview */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <h2 className="text-base font-semibold text-slate-200">Platform Learning Modules</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureModules.map((module) => {
            const Icon = module.icon;
            return (
              <div
                key={module.title}
                className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-5 space-y-2 opacity-80"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  {module.badge && (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-semibold">
                      {module.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-200 pt-1">{module.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{module.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
