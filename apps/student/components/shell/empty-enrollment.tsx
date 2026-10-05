import { AlertCircle, Building2, HelpCircle } from 'lucide-react';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { signOutAction } from '@/lib/actions/auth';

export function EmptyEnrollmentView({ context }: { context: StudentEntitlementContext }) {
  const student = context.student;

  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <div className="rounded-2xl border border-amber-800/60 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 p-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">No Active Batch Enrollments</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Account status: <span className="font-semibold text-emerald-400">Active</span> · Awaiting cohort assignment
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-3 text-sm text-slate-300">
          <p>
            Welcome, <strong className="text-slate-100">{student?.fullName || 'Student'}</strong>! Your student account has been successfully verified, but you have not yet been assigned to an active training batch or curriculum cohort.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span>Institution: <strong className="text-slate-200">{student?.collegeName || 'RMS Partner College'}</strong></span>
            {student?.branch && <span>· Branch: {student.branch}</span>}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HelpCircle className="h-4 w-4" />
            <span>Contact your college coordinator or TPO for batch onboarding</span>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs font-medium text-slate-400 hover:text-slate-200 underline transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
