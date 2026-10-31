import { requireTutorBatch } from '@/lib/db/tutor-context';
import { parseQueueParams } from '@/lib/reviews/queue-params';
import { ReviewQueueView } from '@/components/reviews/review-queue-view';

export const metadata = { title: 'Projects — RMS Tutor Portal' };

export default async function BatchProjectsPage({
  params,
  searchParams
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const queue = { ...parseQueueParams(await searchParams), batchId: null };

  return (
    <section aria-labelledby="projects-heading" className="space-y-4">
      <h2 id="projects-heading" className="text-xl font-semibold">Project submissions</h2>
      <ReviewQueueView tutor={tutor} params={queue} basePath={`/batches/${batchId}/projects`} fixedBatchId={batchId} />
    </section>
  );
}
