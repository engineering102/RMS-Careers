import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { getAssignedBatch } from '@/lib/db/queries/batches';
import { BatchSubnav } from '@/components/batches/batch-subnav';

/** Every batch route: the batch must be one of the tutor's (else the same 404 as an unknown id). */
export default async function BatchLayout({ children, params }: { children: React.ReactNode; params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const batch = await getAssignedBatch(tutor.scope, batchId);
  if (!batch) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/batches" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All batches
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {batch.programCode} · {batch.collegeName}
          </p>
          <p className="text-2xl font-bold tracking-tight md:text-3xl">
            {batch.batchName}
            {batch.status === 'completed' ? <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">Completed</span> : null}
          </p>
        </div>
        <BatchSubnav batchId={batchId} />
      </div>
      {children}
    </div>
  );
}
