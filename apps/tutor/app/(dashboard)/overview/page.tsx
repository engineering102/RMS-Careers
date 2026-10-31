import { Layers } from 'lucide-react';
import { requireTutor } from '@/lib/db/tutor-context';
import { getAssignedBatchSummaries } from '@/lib/db/queries/batches';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Overview — RMS Tutor Portal' };

export default async function OverviewPage() {
  const tutor = await requireTutor();
  const batches = await getAssignedBatchSummaries(tutor.scope);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {tutor.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {batches.length === 0
            ? 'You have no batches yet.'
            : `You are assigned to ${batches.length} ${batches.length === 1 ? 'batch' : 'batches'}.`}
        </p>
      </header>

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches assigned"
          description="Your coordinator assigns batches to you. They appear here as soon as they do."
        />
      ) : (
        <section aria-labelledby="batches-heading" className="space-y-3">
          <h2 id="batches-heading" className="text-lg font-semibold">
            Your batches
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((b) => (
              <li key={b.batchId} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{b.programCode}</p>
                <p className="mt-1 font-semibold text-foreground">{b.batchName}</p>
                <p className="text-sm text-muted-foreground">{b.collegeName}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {b.activeStudents} {b.activeStudents === 1 ? 'student' : 'students'}
                  {b.status === 'completed' ? ' · Completed' : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
