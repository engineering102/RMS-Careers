import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireStudentEntitlement, resolveActiveCohort } from '@/lib/db/queries/entitlements';
import { COHORT_COOKIE_NAME } from '@/lib/constants/cohort';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate } from '@/lib/format/datetime';

export const metadata = {
  title: 'Curriculum — RMS Student Portal',
  description: 'Choose a batch to open its weekly curriculum.'
};

export default async function BatchesPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  // If student has exactly one active batch, redirect directly to their workspace
  if (context.activeBatches.length === 1) {
    redirect(`/batches/${context.activeBatches[0].batchId}`);
  }

  // If no active batches are assigned yet
  if (context.activeBatches.length === 0) {
    return <EmptyEnrollmentView context={context} />;
  }

  // Only the cohort the overview, leaderboards and deadlines are scoped to is "Active"; others are "Enrolled".
  const cookieStore = await cookies();
  const activeCohort = resolveActiveCohort(context.activeBatches, {
    cookieBatchId: cookieStore.get(COHORT_COOKIE_NAME)?.value
  });

  // Several batches: choose one. Each row links to /batches/<id> (the e2e journey drills down through these links).
  return (
    <div className="space-y-8">
      <PageHeader title="Curriculum" description="You're in more than one batch. Choose one to open its weeks." />

      <ul className="border-t border-border">
        {context.activeBatches.map((batch) => {
          const isActive = batch.batchId === activeCohort?.batchId;
          return (
            <li key={batch.batchId} className="border-b border-border">
              <Link
                href={`/batches/${batch.batchId}`}
                className="group -mx-2 flex items-center gap-4 rounded-md px-2 py-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium text-foreground">{batch.batchName}</span>
                    {isActive && <Badge>Active</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {batch.programName}
                    {batch.startDate &&
                      ` · ${formatDate(batch.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}${
                        batch.endDate ? ` – ${formatDate(batch.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''
                      }`}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
