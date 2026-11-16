import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getBatchById: vi.fn(),
  updateBatch: vi.fn(),
  confirmPendingBatchEnrollments: vi.fn(),
  copyCurriculumFromBatch: vi.fn(),
  searchEverything: vi.fn()
}));
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  getBatchById: mocks.getBatchById,
  updateBatch: mocks.updateBatch,
  confirmPendingBatchEnrollments: mocks.confirmPendingBatchEnrollments,
  copyCurriculumFromBatch: mocks.copyCurriculumFromBatch,
  searchEverything: mocks.searchEverything
}));
vi.mock('@/lib/services/enrollment-orchestration', () => ({ createEnrollmentWithStudentProvisioning: vi.fn() }));
vi.mock('@/lib/services/enrollment-emails', () => ({ sendNewEnrollmentEmails: vi.fn() }));

import { updateBatchAction } from '../../app/(admin)/batches/actions';
import { confirmBatchEnrollmentsAction } from '../../app/(admin)/batches/[batchId]/students/actions';
import { copyCurriculumFromBatchAction } from '../../app/(admin)/batches/[batchId]/curriculum/actions';
import { globalSearchAction } from '../../app/(admin)/search-actions';
import { buildAttentionItems, type AdminOverview, type OverviewBatch } from '../overview/attention';
import { dayShiftBetween, planCurriculumCopy, type CopySourcePlacement } from '../curriculum/copy-plan';

const BATCH_ID = '8c1d2f0b-1111-4222-8333-444444444444';
const SOURCE_ID = '9d2e3a1c-1111-4222-8333-444444444444';
const batchRow = {
  id: BATCH_ID,
  programId: 3,
  collegeId: 'c-1',
  name: 'CSE Alpha',
  status: 'active',
  startDate: new Date('2026-10-01T00:00:00Z'),
  endDate: new Date('2027-03-31T00:00:00Z')
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'admin' });
  mocks.getBatchById.mockResolvedValue(batchRow);
});

describe('updateBatchAction', () => {
  const input = { name: '  CSE Beta ', startDate: '2026-10-05', endDate: '2027-04-05', status: 'completed' };

  it('rejects a caller who is not an administrator before reading anything', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Forbidden.' });
    expect(await updateBatchAction(BATCH_ID, input)).toEqual({ success: false, error: 'Forbidden.' });
    expect(mocks.getBatchById).not.toHaveBeenCalled();
    expect(mocks.updateBatch).not.toHaveBeenCalled();
  });

  it('saves the trimmed name, parsed dates and status', async () => {
    mocks.updateBatch.mockResolvedValue({ ...batchRow, name: 'CSE Beta' });
    const res = await updateBatchAction(BATCH_ID, input);
    expect(res).toEqual({ success: true, message: 'Batch "CSE Beta" updated.' });
    expect(mocks.updateBatch).toHaveBeenCalledWith(BATCH_ID, {
      name: 'CSE Beta',
      startDate: new Date('2026-10-05'),
      endDate: new Date('2027-04-05'),
      status: 'completed'
    });
  });

  it.each([
    ['an end date before the start date', { ...input, endDate: '2026-09-01' }, /End date/],
    ['an unknown status', { ...input, status: 'deleted' }, /valid status/],
    ['an empty name', { ...input, name: '   ' }, /name is required/]
  ])('rejects %s', async (_label, bad, message) => {
    const res = await updateBatchAction(BATCH_ID, bad);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(message);
    expect(mocks.updateBatch).not.toHaveBeenCalled();
  });

  it('rejects a malformed batch id and reports a missing batch', async () => {
    expect((await updateBatchAction('not-a-uuid', input)).success).toBe(false);
    expect(mocks.getBatchById).not.toHaveBeenCalled();
    mocks.getBatchById.mockResolvedValue(null);
    expect(await updateBatchAction(BATCH_ID, input)).toEqual({ success: false, error: 'Batch not found.' });
  });
});

describe('confirmBatchEnrollmentsAction', () => {
  it('confirms only through the batch-scoped query', async () => {
    mocks.confirmPendingBatchEnrollments.mockResolvedValue(2);
    expect(await confirmBatchEnrollmentsAction(BATCH_ID, [11, 12])).toEqual({ success: true, data: { confirmed: 2 } });
    expect(mocks.confirmPendingBatchEnrollments).toHaveBeenCalledWith(BATCH_ID, [11, 12]);
  });

  it('rejects empty or non-numeric id lists and unauthorised callers', async () => {
    expect((await confirmBatchEnrollmentsAction(BATCH_ID, [])).success).toBe(false);
    expect((await confirmBatchEnrollmentsAction(BATCH_ID, ['11'])).success).toBe(false);
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Unauthorized.' });
    expect(await confirmBatchEnrollmentsAction(BATCH_ID, [11])).toEqual({ success: false, error: 'Unauthorized.' });
    expect(mocks.confirmPendingBatchEnrollments).not.toHaveBeenCalled();
  });

  it('says so when nothing was pending, and explains a duplicate confirmed enrollment', async () => {
    mocks.confirmPendingBatchEnrollments.mockResolvedValue(0);
    const none = await confirmBatchEnrollmentsAction(BATCH_ID, [11]);
    expect(none.success).toBe(false);

    mocks.confirmPendingBatchEnrollments.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
    const dup = await confirmBatchEnrollmentsAction(BATCH_ID, [11]);
    expect(dup.success).toBe(false);
    if (!dup.success) expect(dup.error).toMatch(/already has a confirmed enrollment/);
  });
});

describe('copyCurriculumFromBatchAction', () => {
  const source = { ...batchRow, id: SOURCE_ID, name: 'CSE 2025', startDate: new Date('2026-09-01T00:00:00Z') };
  const byId = (rows: Record<string, unknown>) => (id: string) => Promise.resolve(rows[id] ?? null);
  const skipped = { alreadyPlaced: 0, notPublished: 0, otherProgram: 0 };

  it('copies with the day gap between the two start dates', async () => {
    mocks.getBatchById.mockImplementation(byId({ [BATCH_ID]: batchRow, [SOURCE_ID]: source }));
    mocks.copyCurriculumFromBatch.mockResolvedValue({ sourceCount: 4, copied: 4, skipped });
    const res = await copyCurriculumFromBatchAction(BATCH_ID, { sourceBatchId: SOURCE_ID, shiftDates: true });
    expect(res.success).toBe(true);
    expect(mocks.copyCurriculumFromBatch).toHaveBeenCalledWith({
      sourceBatchId: SOURCE_ID,
      targetBatchId: BATCH_ID,
      targetProgramId: 3,
      shiftDays: 30
    });
  });

  it('copies without dates when asked not to shift them', async () => {
    mocks.getBatchById.mockImplementation(byId({ [BATCH_ID]: batchRow, [SOURCE_ID]: source }));
    mocks.copyCurriculumFromBatch.mockResolvedValue({ sourceCount: 1, copied: 1, skipped });
    await copyCurriculumFromBatchAction(BATCH_ID, { sourceBatchId: SOURCE_ID, shiftDates: false });
    expect(mocks.copyCurriculumFromBatch.mock.calls[0][0].shiftDays).toBeNull();
  });

  it.each([
    ['the batch itself as the source', { [BATCH_ID]: batchRow }, BATCH_ID, /different batch/],
    ['a source from another program', { [BATCH_ID]: batchRow, [SOURCE_ID]: { ...source, programId: 9 } }, SOURCE_ID, /same program/],
    ['a read-only target', { [BATCH_ID]: { ...batchRow, status: 'archived' }, [SOURCE_ID]: source }, SOURCE_ID, /archived batch/],
    ['a missing source', { [BATCH_ID]: batchRow }, SOURCE_ID, /not found/]
  ])('refuses %s', async (_label, rows, sourceBatchId, message) => {
    mocks.getBatchById.mockImplementation(byId(rows));
    const res = await copyCurriculumFromBatchAction(BATCH_ID, { sourceBatchId, shiftDates: true });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(message);
    expect(mocks.copyCurriculumFromBatch).not.toHaveBeenCalled();
  });

  it('reports an empty source and a copy that added nothing as errors', async () => {
    mocks.getBatchById.mockImplementation(byId({ [BATCH_ID]: batchRow, [SOURCE_ID]: source }));
    mocks.copyCurriculumFromBatch.mockResolvedValue({ sourceCount: 0, copied: 0, skipped });
    const empty = await copyCurriculumFromBatchAction(BATCH_ID, { sourceBatchId: SOURCE_ID, shiftDates: true });
    expect(empty).toEqual({ success: false, error: 'CSE 2025 has no curriculum to copy.' });

    mocks.copyCurriculumFromBatch.mockResolvedValue({ sourceCount: 3, copied: 0, skipped: { ...skipped, alreadyPlaced: 3 } });
    const nothing = await copyCurriculumFromBatchAction(BATCH_ID, { sourceBatchId: SOURCE_ID, shiftDates: true });
    expect(nothing.success).toBe(false);
    if (!nothing.success) expect(nothing.error).toMatch(/3 already in this batch/);
  });
});

describe('planCurriculumCopy', () => {
  const item = (id: string, over: Partial<CopySourcePlacement> = {}): CopySourcePlacement => ({
    contentItemId: id,
    weekNumber: 1,
    sequenceOrder: 1,
    isRequired: true,
    availableFrom: null,
    dueAt: null,
    contentProgramId: null,
    lifecycleStatus: 'published',
    ...over
  });

  it('skips items already placed, unpublished, or owned by another program, and counts each', () => {
    const plan = planCurriculumCopy({
      source: [
        item('a'),
        item('b', { lifecycleStatus: 'draft' }),
        item('c', { lifecycleStatus: 'archived' }),
        item('d', { contentProgramId: 9 }),
        item('e', { contentProgramId: 3 }),
        item('f')
      ],
      target: [{ contentItemId: 'f', weekNumber: 1, sequenceOrder: 1 }],
      targetProgramId: 3,
      shiftDays: null
    });
    expect(plan.rows.map((r) => r.contentItemId)).toEqual(['a', 'e']);
    expect(plan.skipped).toEqual({ alreadyPlaced: 1, notPublished: 2, otherProgram: 1 });
  });

  it('keeps weeks and source order, placing copies after what the target already has in a week', () => {
    const plan = planCurriculumCopy({
      source: [
        item('w2-second', { weekNumber: 2, sequenceOrder: 5 }),
        item('w1', { weekNumber: 1, sequenceOrder: 2, isRequired: false }),
        item('w2-first', { weekNumber: 2, sequenceOrder: 1 })
      ],
      target: [{ contentItemId: 'existing', weekNumber: 2, sequenceOrder: 4 }],
      targetProgramId: 3,
      shiftDays: null
    });
    expect(plan.rows.map((r) => [r.contentItemId, r.weekNumber, r.sequenceOrder, r.isRequired])).toEqual([
      ['w1', 1, 1, false],
      ['w2-first', 2, 5, true],
      ['w2-second', 2, 6, true]
    ]);
  });

  it('shifts dates by whole days, or clears them when no shift is given', () => {
    const source = [
      item('a', { availableFrom: new Date('2026-09-01T03:30:00Z'), dueAt: new Date('2026-09-08T18:29:00Z') })
    ];
    const shifted = planCurriculumCopy({ source, target: [], targetProgramId: 3, shiftDays: 30 }).rows[0];
    expect(shifted.availableFrom).toEqual(new Date('2026-10-01T03:30:00Z'));
    expect(shifted.dueAt).toEqual(new Date('2026-10-08T18:29:00Z'));

    const cleared = planCurriculumCopy({ source, target: [], targetProgramId: 3, shiftDays: null }).rows[0];
    expect(cleared.availableFrom).toBeNull();
    expect(cleared.dueAt).toBeNull();
  });

  it('dayShiftBetween needs both start dates', () => {
    expect(dayShiftBetween(new Date('2026-09-01T00:00:00Z'), new Date('2026-10-01T00:00:00Z'))).toBe(30);
    expect(dayShiftBetween(new Date('2026-10-01T00:00:00Z'), new Date('2026-09-01T00:00:00Z'))).toBe(-30);
    expect(dayShiftBetween(null, new Date())).toBeNull();
    expect(dayShiftBetween(new Date(), null)).toBeNull();
  });
});

describe('buildAttentionItems', () => {
  const now = new Date('2026-11-16T06:00:00Z');
  const healthy: OverviewBatch = {
    id: 'b-1',
    name: 'CSE Alpha',
    status: 'active',
    collegeCode: 'JNT',
    programCode: 'FS-1',
    startDate: new Date('2026-10-01T00:00:00Z'),
    endDate: new Date('2027-03-31T00:00:00Z'),
    studentCount: 40,
    pendingCount: 0,
    tutorCount: 1,
    curriculumCount: 12,
    awaitingReviewCount: 0,
    unpublishedLiveSessionCount: 0
  };
  const overview = (batches: OverviewBatch[], counts: Partial<AdminOverview['counts']> = {}): AdminOverview => ({
    counts: { activePrograms: 1, studentsWithAccess: 40, pendingEnrollments: 0, tutorsPendingActivation: 0, ...counts },
    batches
  });

  it('is empty when every batch is set up and nothing is waiting', () => {
    expect(buildAttentionItems(overview([healthy]), now)).toEqual([]);
  });

  it('lists blocking work before housekeeping and links each item to where it is done', () => {
    const items = buildAttentionItems(
      overview(
        [{ ...healthy, tutorCount: 0, awaitingReviewCount: 3, curriculumCount: 0, unpublishedLiveSessionCount: 1 }],
        { pendingEnrollments: 5, tutorsPendingActivation: 1 }
      ),
      now
    );
    expect(items.map((i) => [i.id, i.tone, i.href])).toEqual([
      ['pending-enrollments', 'warning', '/enrollments?status=pending'],
      ['review-b-1', 'warning', '/batches/b-1/projects'],
      ['curriculum-b-1', 'warning', '/batches/b-1/curriculum'],
      ['tutor-b-1', 'info', '/batches/b-1'],
      ['live-b-1', 'info', '/batches/b-1/live-lectures'],
      ['tutors-pending', 'info', '/tutors']
    ]);
    expect(items[0].title).toBe('5 enrollments are waiting for confirmation');
    expect(items[1].title).toBe('3 project submissions to review in CSE Alpha');
  });

  it('flags an active batch past its end date and one with no students at all', () => {
    const ids = buildAttentionItems(
      overview([{ ...healthy, endDate: new Date('2026-11-01T00:00:00Z'), studentCount: 0 }]),
      now
    ).map((i) => i.id);
    expect(ids).toEqual(['ended-b-1', 'students-b-1']);
  });

  it('does not call a batch empty while students are still pending', () => {
    const ids = buildAttentionItems(overview([{ ...healthy, studentCount: 0, pendingCount: 4 }]), now).map((i) => i.id);
    expect(ids).not.toContain('students-b-1');
  });

  it('warns about a draft batch only when it starts within a week or has started', () => {
    const draft = { ...healthy, status: 'draft', curriculumCount: 0, tutorCount: 0 };
    const soon = buildAttentionItems(overview([{ ...draft, startDate: new Date('2026-11-20T00:00:00Z') }]), now);
    expect(soon.map((i) => i.id)).toEqual(['draft-b-1']);
    const later = buildAttentionItems(overview([{ ...draft, startDate: new Date('2027-01-10T00:00:00Z') }]), now);
    expect(later).toEqual([]);
  });
});

describe('globalSearchAction', () => {
  it('searches colleges for super administrators only', async () => {
    mocks.searchEverything.mockResolvedValue([]);
    await globalSearchAction('  asha ');
    expect(mocks.searchEverything).toHaveBeenLastCalledWith('asha', { includeColleges: false });
    mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'a', role: 'super_admin' });
    await globalSearchAction('asha');
    expect(mocks.searchEverything).toHaveBeenLastCalledWith('asha', { includeColleges: true });
  });

  it('returns nothing for a too-short or non-string term without querying, and refuses non-admins', async () => {
    expect(await globalSearchAction('a')).toEqual({ success: true, data: [] });
    expect(await globalSearchAction({ $ne: 1 })).toEqual({ success: true, data: [] });
    expect(mocks.searchEverything).not.toHaveBeenCalled();
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: 'Unauthorized.' });
    expect(await globalSearchAction('asha')).toEqual({ success: false, error: 'Unauthorized.' });
  });
});
