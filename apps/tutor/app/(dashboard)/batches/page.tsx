import Link from 'next/link';
import { Layers } from 'lucide-react';
import { db } from '@rms/db';
import { batchLoad, getTutorOverviewMetrics } from '@rms/academic/tutor/overview';
import { requireTutor } from '@/lib/db/tutor-context';
import { getAssignedBatchSummaries } from '@/lib/db/queries/batches';
import { plural } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Batches — RMS Tutor Portal' };

export default async function BatchesPage() {
  const tutor = await requireTutor();
  const [batches, metrics] = await Promise.all([
    getAssignedBatchSummaries(tutor.scope),
    getTutorOverviewMetrics(db, tutor.scope, tutor.userId)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Batches" description="The batches you are assigned to teach." />
      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches assigned"
          description="Your coordinator assigns batches to you. They appear here as soon as they do."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => {
            const load = batchLoad(metrics, b.batchId);
            return (
              <li key={b.batchId}>
                <Link
                  href={`/batches/${b.batchId}`}
                  className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{b.programCode}</p>
                  <p className="mt-1 font-semibold text-foreground">{b.batchName}</p>
                  <p className="text-sm text-muted-foreground">{b.collegeName}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {plural(b.activeStudents, 'student')} · {load.awaitingReview} awaiting review · {load.underReview} in review
                    {b.status === 'completed' ? ' · Completed' : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
