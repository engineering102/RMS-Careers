import Link from 'next/link';
import { CheckCircle2, ClipboardList, Inbox, Users } from 'lucide-react';
import { db } from '@rms/db';
import { restrictScope } from '@rms/academic/scope';
import { batchLoad, getTutorOverviewMetrics } from '@rms/academic/tutor/overview';
import { getPublishedLiveSessions } from '@rms/academic/tutor/live';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { getAssignedBatch } from '@/lib/db/queries/batches';
import { formatIstDate, waitingFor } from '@/lib/format';
import { StatCard } from '@/components/ui/stat-card';
import { NextClassLine } from '@/components/batches/next-class';

export const metadata = { title: 'Batch — RMS Tutor Portal' };

export default async function BatchHomePage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const scope = restrictScope(tutor.scope, [batchId]);
  const [batch, metrics, sessions] = await Promise.all([
    getAssignedBatch(tutor.scope, batchId),
    getTutorOverviewMetrics(db, scope, tutor.userId),
    getPublishedLiveSessions(db, scope)
  ]);
  const load = batchLoad(metrics, batchId);

  return (
    <div className="space-y-6">
      <section aria-label="Batch summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active students" value={batch?.activeStudents ?? 0} icon={Users} />
        <StatCard
          label="Awaiting review"
          value={load.awaitingReview}
          icon={Inbox}
          tone={load.awaitingReview > 0 ? 'warning' : 'default'}
          hint={load.oldestAwaitingAt ? `Oldest waiting ${waitingFor(load.oldestAwaitingAt)} (since ${formatIstDate(load.oldestAwaitingAt)})` : undefined}
        />
        <StatCard label="In review" value={load.underReview} icon={ClipboardList} tone="info" />
        <StatCard label="Approved projects" value={load.approved} icon={CheckCircle2} tone="success" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="next-class-heading" className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h2 id="next-class-heading" className="font-semibold">Next live class</h2>
          <NextClassLine sessions={sessions} />
          <Link href={`/batches/${batchId}/live`} className="inline-flex min-h-[44px] items-center text-sm text-primary underline-offset-4 hover:underline">
            All live classes
          </Link>
        </section>
        <section aria-labelledby="shortcuts-heading" className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h2 id="shortcuts-heading" className="font-semibold">Go to</h2>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            <li><Link className="inline-flex min-h-[44px] items-center text-primary underline-offset-4 hover:underline" href={`/batches/${batchId}/projects`}>Project submissions</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center text-primary underline-offset-4 hover:underline" href={`/batches/${batchId}/students`}>Students and progress</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center text-primary underline-offset-4 hover:underline" href={`/batches/${batchId}/assessments`}>Assessment participation</Link></li>
            <li><Link className="inline-flex min-h-[44px] items-center text-primary underline-offset-4 hover:underline" href={`/batches/${batchId}/curriculum`}>Curriculum</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
