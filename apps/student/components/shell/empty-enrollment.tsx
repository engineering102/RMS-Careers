import { AlertCircle, Building2, HelpCircle } from 'lucide-react';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { SignOutButton } from './sign-out-button';

export function EmptyEnrollmentView({ context }: { context: StudentEntitlementContext }) {
  const student = context.student;

  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">No active batch enrollments</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Account status: <span className="font-semibold text-success">Active</span> · Awaiting cohort assignment
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-foreground">
          <p>
            Hi {student?.fullName || 'there'}. Your account is active, but your college hasn't added you to a batch yet. Your curriculum, tests and practice appear here once they do.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>{student?.collegeName || 'Your college'}</span>
            {student?.branch && <span>· {student.branch}</span>}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Waiting longer than expected? Ask your college coordinator or TPO.</span>
          </div>

          <SignOutButton className="text-xs font-medium text-muted-foreground hover:text-foreground underline transition">
            Sign out
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
