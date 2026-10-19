import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { resolveXpBatchId } from '../services/xp-attribution';

const batch = (batchId: string) => ({
  batchId,
  batchName: batchId,
  programId: 'p',
  programName: 'P',
  programCode: 'P',
  startDate: null,
  endDate: null
}) as any;

describe('resolveXpBatchId', () => {
  const active = [batch('b1'), batch('b2')];

  it('keeps an accessible requested batch', () => {
    expect(resolveXpBatchId(active, 'b2', 'b1')).toBe('b2');
  });

  it('falls back to the active-cohort cookie when no batch is requested', () => {
    expect(resolveXpBatchId(active, null, 'b2')).toBe('b2');
  });

  it('falls back to the first active batch without a cookie', () => {
    expect(resolveXpBatchId(active, undefined, undefined)).toBe('b1');
  });

  it('ignores requested or cookie batches the student is not active in', () => {
    expect(resolveXpBatchId(active, 'other', 'stale')).toBe('b1');
  });

  it('returns null when the student has no active batch', () => {
    expect(resolveXpBatchId([], 'b1', 'b1')).toBeNull();
  });
});
