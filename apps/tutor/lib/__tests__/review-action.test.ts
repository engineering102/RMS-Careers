import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { context, reviewSubmission, transaction } = vi.hoisted(() => ({
  context: { current: null as unknown },
  reviewSubmission: vi.fn(),
  transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn('TX'))
}));

vi.mock('@/lib/db/tutor-context', () => ({ getTutorContext: async () => context.current }));
vi.mock('@rms/db/tx', () => ({ dbTx: { transaction } }));
vi.mock('@rms/academic/review', () => ({ reviewSubmission }));

import { reviewSubmissionAction } from '../../app/(dashboard)/reviews/[submissionId]/actions';

const SUB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const tutor = { userId: 'user-1', tutorId: 'tutor-1', scope: { kind: 'batches', batchIds: ['b'] } };
const base = { submissionId: SUB, expectedVersion: '2026-10-29 10:00:00.123456+00' };

describe('reviewSubmissionAction', () => {
  beforeEach(() => {
    context.current = tutor;
    reviewSubmission.mockReset();
    transaction.mockClear();
  });

  it('refuses a signed-out or revoked session without touching the database', async () => {
    context.current = null;
    expect(await reviewSubmissionAction({ ...base, transition: 'claim' })).toMatchObject({ success: false, code: 'unauthorized' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each(['reopen', 'correct'])('rejects the admin-only %s transition as invalid input', async (transition) => {
    const result = await reviewSubmissionAction({ ...base, transition } as never);
    expect(result).toMatchObject({ success: false, code: 'invalid_input' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires a score to approve', async () => {
    expect(await reviewSubmissionAction({ ...base, transition: 'approve' })).toMatchObject({ success: false, code: 'invalid_score' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('runs the shared review as a tutor, inside the tutor scope', async () => {
    reviewSubmission.mockResolvedValue({ ok: true, status: 'approved', version: 'v2', xpAwarded: true, notified: true });
    const result = await reviewSubmissionAction({ ...base, transition: 'approve', score: 80, feedback: 'Good work' });
    expect(result).toMatchObject({ success: true, status: 'approved', version: 'v2' });
    expect(reviewSubmission).toHaveBeenCalledWith('TX', tutor.scope, { userId: 'user-1', tutorId: 'tutor-1', kind: 'tutor' }, expect.objectContaining({ submissionId: SUB, transition: 'approve', score: 80 }));
  });

  it('reports a conflict and a foreign submission without detail, logging ids only', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    reviewSubmission.mockResolvedValueOnce({ ok: false, code: 'conflict' });
    expect(await reviewSubmissionAction({ ...base, transition: 'claim' })).toMatchObject({ success: false, code: 'conflict' });
    reviewSubmission.mockResolvedValueOnce({ ok: false, code: 'not_found' });
    const notFound = await reviewSubmissionAction({ ...base, transition: 'request_resubmission', feedback: 'Secret feedback text' });
    expect(notFound).toMatchObject({ success: false, code: 'not_found', error: 'This submission is not available to you.' });
    const logged = info.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('"evt":"tutor.authz_denied"');
    expect(logged).not.toContain('Secret feedback text');
    info.mockRestore();
  });

  it('turns an unexpected error into a generic message', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    reviewSubmission.mockRejectedValue(new TypeError('connection reset with secrets'));
    const result = await reviewSubmissionAction({ ...base, transition: 'claim' });
    expect(result).toEqual({ success: false, error: 'The review could not be saved. Please try again.', code: 'failed' });
    expect(info.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('secrets');
    info.mockRestore();
  });
});
