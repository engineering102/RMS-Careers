import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Admin live-session queries are keyed by (batch, id): another batch's session is never read or changed.
vi.mock('server-only', () => ({}));

import { db, batches, colleges, programs, batchLiveSessions } from '@rms/db';
import { eq, inArray } from 'drizzle-orm';
import {
  createLiveSession,
  deleteLiveSession,
  listBatchLiveSessions,
  setLiveSessionPublished,
  updateLiveSession,
  type LiveSessionInput
} from '../db/queries/live-sessions';

describe('admin live-session queries on the test database', { timeout: 60000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  let collegeId: string;
  let programId: number;
  let batchA: string;
  let batchB: string;
  let sessionId: string;

  const input = (overrides: Partial<LiveSessionInput> = {}): LiveSessionInput => ({
    title: `WS8 Live ${stamp}`,
    description: null,
    meetingUrl: 'https://zoom.us/j/1234567890',
    joiningInstructions: null,
    recurrenceDays: [1, 3],
    startTime: '19:00',
    durationMinutes: 60,
    startsOn: '2026-11-02',
    endsOn: '2026-12-18',
    isPublished: false,
    ...overrides
  });

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `WS8 College ${stamp}`, code: `WS8_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `WS8 Program ${stamp}`, code: `WS8_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const created = await db
      .insert(batches)
      .values([
        { name: `WS8 A ${stamp}`, programId, collegeId },
        { name: `WS8 B ${stamp}`, programId, collegeId }
      ])
      .returning();
    [batchA, batchB] = [created[0].id, created[1].id];
  });

  afterAll(async () => {
    await db.delete(batchLiveSessions).where(inArray(batchLiveSessions.batchId, [batchA, batchB]));
    await db.delete(batches).where(inArray(batches.id, [batchA, batchB]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it('creates and lists a session for its batch only', async () => {
    sessionId = await createLiveSession(batchA, input(), null as unknown as string);
    const listed = await listBatchLiveSessions(batchA);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: sessionId, recurrenceDays: [1, 3], startsOn: '2026-11-02', endsOn: '2026-12-18', isPublished: false });
    expect(await listBatchLiveSessions(batchB)).toEqual([]);
  });

  it('never changes a session through another batch', async () => {
    expect(await updateLiveSession(batchB, sessionId, input({ title: 'hijacked' }))).toBe(false);
    expect(await setLiveSessionPublished(batchB, sessionId, true)).toBe(false);
    expect(await deleteLiveSession(batchB, sessionId)).toBe(false);
    expect((await listBatchLiveSessions(batchA))[0]).toMatchObject({ title: `WS8 Live ${stamp}`, isPublished: false });
  });

  it('updates, publishes and deletes within its batch', async () => {
    expect(await updateLiveSession(batchA, sessionId, input({ recurrenceDays: [5], startTime: '07:30' }))).toBe(true);
    expect(await setLiveSessionPublished(batchA, sessionId, true)).toBe(true);
    expect((await listBatchLiveSessions(batchA))[0]).toMatchObject({ recurrenceDays: [5], startTime: '07:30', isPublished: true });
    expect(await deleteLiveSession(batchA, sessionId)).toBe(true);
    expect(await listBatchLiveSessions(batchA)).toEqual([]);
  });
});
