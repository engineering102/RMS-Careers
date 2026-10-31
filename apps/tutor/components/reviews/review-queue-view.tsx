import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { db } from '@rms/db';
import { getReviewQueue, getReviewQueueCounts } from '@rms/academic/tutor/review-queue';
import type { TutorContext } from '@/lib/db/tutor-context';
import type { AssignedBatchSummary } from '@/lib/db/queries/batches';
import { queueHref, statusesFor, type QueueParams, type QueueStatusFilter } from '@/lib/reviews/queue-params';
import { EmptyState } from '@/components/ui/empty-state';
import { ReviewQueueList } from './review-queue-list';

const TABS: { value: QueueStatusFilter; label: string }[] = [
  { value: 'open', label: 'Needs review' },
  { value: 'submitted', label: 'Awaiting' },
  { value: 'under_review', label: 'In review' },
  { value: 'resubmission_requested', label: 'Changes requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' }
];

const EMPTY_COPY: Record<QueueStatusFilter, string> = {
  open: 'Nothing is waiting for review. New submissions appear here, oldest first.',
  submitted: 'No submissions are waiting to be claimed.',
  under_review: 'No submissions are in review.',
  resubmission_requested: 'No submissions are waiting on student changes.',
  approved: 'No approved submissions yet.',
  all: 'No project submissions yet.'
};

const controlClass =
  'min-h-[44px] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const linkButtonClass =
  'inline-flex min-h-[44px] items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The review queue for /reviews (all assigned batches, with a batch filter) and for a batch's Projects tab
 * (`fixedBatchId`). Server component: two queries in parallel.
 */
export async function ReviewQueueView({
  tutor,
  params,
  basePath,
  batches,
  fixedBatchId
}: {
  tutor: TutorContext;
  params: QueueParams;
  basePath: string;
  batches?: AssignedBatchSummary[];
  fixedBatchId?: string;
}) {
  const batchId = fixedBatchId ?? params.batchId ?? undefined;
  const filters = { batchId, mineUserId: params.mine ? tutor.userId : undefined, search: params.q || undefined };
  const [page, counts] = await Promise.all([
    getReviewQueue(db, tutor.scope, { ...filters, statuses: statusesFor(params.status) }, params.cursor),
    getReviewQueueCounts(db, tutor.scope, filters)
  ]);
  const countFor = (value: QueueStatusFilter) =>
    value === 'open'
      ? counts.submitted + counts.under_review
      : value === 'all'
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : counts[value];

  return (
    <div className="space-y-4">
      <nav aria-label="Submission status">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = params.status === tab.value;
            return (
              <li key={tab.value}>
                <Link
                  href={queueHref(basePath, params, { status: tab.value })}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-foreground">{countFor(tab.value)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="get" action={basePath} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {params.status !== 'open' ? <input type="hidden" name="status" value={params.status} /> : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="queue-search" className="text-xs font-medium text-muted-foreground">
            Student name or roll number
          </label>
          <input id="queue-search" name="q" defaultValue={params.q} maxLength={100} className={`${controlClass} sm:w-64`} />
        </div>
        {batches && batches.length > 1 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="queue-batch" className="text-xs font-medium text-muted-foreground">
              Batch
            </label>
            <select id="queue-batch" name="batch" defaultValue={params.batchId ?? ''} className={controlClass}>
              <option value="">All my batches</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={params.mine} className="h-4 w-4" />
          Only submissions I reviewed
        </label>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Apply
        </button>
      </form>

      {page.rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={params.cursor ? 'No more submissions' : 'No submissions here'}
          description={params.q || params.mine || params.batchId ? 'Nothing matches these filters.' : EMPTY_COPY[params.status]}
        />
      ) : (
        <ReviewQueueList rows={page.rows} userId={tutor.userId} showBatch={!fixedBatchId} />
      )}

      {params.cursor || page.nextCursor ? (
        <nav aria-label="Pages" className="flex flex-wrap gap-3">
          {params.cursor ? (
            <Link href={queueHref(basePath, params, {})} className={linkButtonClass}>
              First page
            </Link>
          ) : null}
          {page.nextCursor ? (
            <Link href={queueHref(basePath, params, { cursor: page.nextCursor })} className={linkButtonClass}>
              Next page
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
