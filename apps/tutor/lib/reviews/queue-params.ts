import type { SubmissionStatusEnum } from '@rms/db/schema';
import { OPEN_REVIEW_STATUSES, REVIEW_STATUSES } from '@rms/academic/tutor/review-queue';

/** Queue URL parameters (tutor plan §14.2). Anything unrecognised falls back to the default view. */
export type QueueStatusFilter = 'open' | 'all' | SubmissionStatusEnum;

export interface QueueParams {
  status: QueueStatusFilter;
  batchId: string | null;
  mine: boolean;
  q: string;
  cursor: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseQueueParams(raw: RawParams): QueueParams {
  const status = first(raw.status);
  const batch = first(raw.batch);
  return {
    status: status === 'all' || (REVIEW_STATUSES as readonly string[]).includes(status) ? (status as QueueStatusFilter) : 'open',
    batchId: UUID.test(batch) ? batch : null,
    mine: first(raw.mine) === '1',
    q: first(raw.q).trim().slice(0, 100),
    cursor: first(raw.cursor).slice(0, 200) || null
  };
}

export function statusesFor(filter: QueueStatusFilter): readonly SubmissionStatusEnum[] | undefined {
  if (filter === 'open') return OPEN_REVIEW_STATUSES;
  if (filter === 'all') return undefined;
  return [filter];
}

/** A queue URL with some parameters changed; the cursor is dropped unless given. */
export function queueHref(basePath: string, params: QueueParams, change: Partial<QueueParams>): string {
  const next = { ...params, cursor: null, ...change };
  const search = new URLSearchParams();
  if (next.status !== 'open') search.set('status', next.status);
  if (next.batchId) search.set('batch', next.batchId);
  if (next.mine) search.set('mine', '1');
  if (next.q) search.set('q', next.q);
  if (next.cursor) search.set('cursor', next.cursor);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
