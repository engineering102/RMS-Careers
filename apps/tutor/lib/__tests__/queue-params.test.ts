import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseQueueParams, queueHref, statusesFor } from '../reviews/queue-params';

const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('review queue URL parameters', () => {
  it('defaults to the open work view', () => {
    expect(parseQueueParams({})).toEqual({ status: 'open', batchId: null, mine: false, q: '', cursor: null });
    expect(statusesFor('open')).toEqual(['submitted', 'under_review']);
    expect(statusesFor('all')).toBeUndefined();
    expect(statusesFor('approved')).toEqual(['approved']);
  });

  it('ignores unknown statuses and malformed batch ids', () => {
    expect(parseQueueParams({ status: 'deleted', batch: "1' or 1=1" })).toMatchObject({ status: 'open', batchId: null });
    expect(parseQueueParams({ status: ['approved', 'x'], batch: B, mine: '1', q: '  Asha  ' })).toMatchObject({
      status: 'approved',
      batchId: B,
      mine: true,
      q: 'Asha'
    });
    expect(parseQueueParams({ q: 'x'.repeat(500) }).q).toHaveLength(100);
  });

  it('builds links that drop the cursor when filters change', () => {
    const params = parseQueueParams({ status: 'all', batch: B, cursor: 'abc' });
    expect(queueHref('/reviews', params, { status: 'open' })).toBe(`/reviews?batch=${B}`);
    expect(queueHref('/reviews', params, { cursor: 'next' })).toBe(`/reviews?status=all&batch=${B}&cursor=next`);
    expect(queueHref('/reviews', parseQueueParams({}), {})).toBe('/reviews');
  });
});
