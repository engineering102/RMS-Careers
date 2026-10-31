import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getBatchById: vi.fn(),
  createLiveSession: vi.fn(),
  updateLiveSession: vi.fn(),
  setLiveSessionPublished: vi.fn(),
  deleteLiveSession: vi.fn()
}));
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/queries', () => ({
  getBatchById: mocks.getBatchById,
  createLiveSession: mocks.createLiveSession,
  updateLiveSession: mocks.updateLiveSession,
  setLiveSessionPublished: mocks.setLiveSessionPublished,
  deleteLiveSession: mocks.deleteLiveSession
}));

import { liveSessionSchema } from '../../app/(admin)/batches/[batchId]/live-lectures/schema';
import {
  createLiveSessionAction,
  updateLiveSessionAction,
  setLiveSessionPublishedAction,
  deleteLiveSessionAction
} from '../../app/(admin)/batches/[batchId]/live-lectures/actions';

const BATCH = '9d2e3f1c-1111-4222-8333-444444444444';
const SESSION = 'ae3f4a2d-1111-4222-8333-444444444444';

const valid = {
  title: '  DSA Live  ',
  description: '',
  meetingUrl: 'https://us06web.zoom.us/j/12345678901?pwd=abc',
  joiningInstructions: 'Join 5 minutes early',
  recurrenceDays: [5, 1, 3],
  startTime: '19:00',
  durationMinutes: 90,
  startsOn: '',
  endsOn: '',
  isPublished: true
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'admin' });
  mocks.getBatchById.mockResolvedValue({ id: BATCH });
});

describe('liveSessionSchema', () => {
  it('normalises a valid session', () => {
    const parsed = liveSessionSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        title: 'DSA Live',
        description: null,
        meetingUrl: 'https://us06web.zoom.us/j/12345678901?pwd=abc',
        joiningInstructions: 'Join 5 minutes early',
        recurrenceDays: [1, 3, 5],
        startTime: '19:00',
        durationMinutes: 90,
        startsOn: null,
        endsOn: null,
        isPublished: true
      });
    }
  });

  it.each([
    ['meetingUrl', { meetingUrl: 'https://meet.google.com/abc-defg-hij' }],
    ['recurrenceDays', { recurrenceDays: [] }],
    ['startTime', { startTime: '25:00' }],
    ['durationMinutes', { durationMinutes: 10 }],
    ['endsOn', { startsOn: '2026-11-10', endsOn: '2026-11-01' }],
    ['recurrenceDays', { recurrenceDays: [1], startsOn: '2026-11-04', endsOn: '2026-11-04' }],
    ['title', { title: '   ' }]
  ])('reports a %s error on that field', (field, overrides) => {
    const parsed = liveSessionSchema.safeParse({ ...valid, ...overrides });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(Object.keys(parsed.error.flatten().fieldErrors)).toContain(field);
  });
});

describe('live session actions', () => {
  it('creates with the admin as creator', async () => {
    expect(await createLiveSessionAction(BATCH, valid)).toEqual({ success: true });
    expect(mocks.createLiveSession).toHaveBeenCalledWith(BATCH, expect.objectContaining({ title: 'DSA Live', recurrenceDays: [1, 3, 5] }), 'admin-1');
  });

  it('returns field errors without saving', async () => {
    const res = await createLiveSessionAction(BATCH, { ...valid, meetingUrl: 'http://zoom.us/j/1234567890' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.fieldErrors?.meetingUrl?.[0]).toMatch(/https/);
    expect(mocks.createLiveSession).not.toHaveBeenCalled();
  });

  it('refuses non-admins, invalid ids and unknown batches', async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: false, error: 'Forbidden.' });
    expect((await createLiveSessionAction(BATCH, valid)).success).toBe(false);
    expect((await deleteLiveSessionAction(BATCH, 'nope')).success).toBe(false);
    mocks.getBatchById.mockResolvedValueOnce(null);
    expect(await setLiveSessionPublishedAction(BATCH, SESSION, true)).toEqual({ success: false, error: 'Batch not found.' });
    expect(mocks.createLiveSession).not.toHaveBeenCalled();
    expect(mocks.deleteLiveSession).not.toHaveBeenCalled();
    expect(mocks.setLiveSessionPublished).not.toHaveBeenCalled();
  });

  it('reports a session that is not in this batch', async () => {
    mocks.updateLiveSession.mockResolvedValue(false);
    mocks.deleteLiveSession.mockResolvedValue(false);
    mocks.setLiveSessionPublished.mockResolvedValue(false);
    expect(await updateLiveSessionAction(BATCH, SESSION, valid)).toEqual({ success: false, error: 'Live session not found.' });
    expect(await deleteLiveSessionAction(BATCH, SESSION)).toEqual({ success: false, error: 'Live session not found.' });
    expect(await setLiveSessionPublishedAction(BATCH, SESSION, false)).toEqual({ success: false, error: 'Live session not found.' });
  });

  it('updates, publishes and deletes within the batch', async () => {
    mocks.updateLiveSession.mockResolvedValue(true);
    mocks.setLiveSessionPublished.mockResolvedValue(true);
    mocks.deleteLiveSession.mockResolvedValue(true);
    expect(await updateLiveSessionAction(BATCH, SESSION, valid)).toEqual({ success: true });
    expect(mocks.updateLiveSession).toHaveBeenCalledWith(BATCH, SESSION, expect.any(Object));
    expect(await setLiveSessionPublishedAction(BATCH, SESSION, false)).toEqual({ success: true });
    expect(await deleteLiveSessionAction(BATCH, SESSION)).toEqual({ success: true });
  });
});
