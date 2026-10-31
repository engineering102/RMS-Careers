import { requireTutor } from '@/lib/db/tutor-context';
import { getAssignedBatchSummaries } from '@/lib/db/queries/batches';
import { parseQueueParams } from '@/lib/reviews/queue-params';
import { PageHeader } from '@/components/ui/page-header';
import { ReviewQueueView } from '@/components/reviews/review-queue-view';

export const metadata = { title: 'Reviews — RMS Tutor Portal' };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tutor = await requireTutor();
  const params = parseQueueParams(await searchParams);
  // A batch filter outside the tutor's batches is dropped (the query would return nothing anyway).
  if (params.batchId && !tutor.batchIds.includes(params.batchId)) params.batchId = null;
  const batches = await getAssignedBatchSummaries(tutor.scope);

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Project submissions from your batches, oldest first." />
      <ReviewQueueView tutor={tutor} params={params} basePath="/reviews" batches={batches} />
    </div>
  );
}
