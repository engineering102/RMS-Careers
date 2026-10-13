import { AlertCircle, Building2, HelpCircle } from 'lucide-react';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { SignOutButton } from './sign-out-button';

export function EmptyEnrollmentView({ context }: { context: StudentEntitlementContext }) {
  const student = context.student;

  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <div className="rounded-2xl border border-warning/40 bg-gradient-to-b from-card via-card to-warning/5 p-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning border border-warning/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">No Active Batch Enrollments</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Account status: <span className="font-semibold text-success">Active</span> · Awaiting cohort assignment
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-background/60 p-5 space-y-3 text-sm text-foreground/80">
          <p>
            Welcome, <strong className="text-foreground">{student?.fullName || 'Student'}</strong>! Your student account has been successfully verified, but you have not yet been assigned to an active training batch or curriculum cohort.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Institution: <strong className="text-foreground">{student?.collegeName || 'RMS Partner College'}</strong></span>
            {student?.branch && <span>· Branch: {student.branch}</span>}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Contact your college coordinator or TPO for batch onboarding</span>
          </div>

          <SignOutButton className="text-xs font-medium text-muted-foreground hover:text-foreground underline transition">
            Sign out
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
