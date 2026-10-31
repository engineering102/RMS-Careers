// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Students see only the PUBLISHED live sessions of the batch they ask for.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { db, batches, colleges, programs, batchLiveSessions } from '@rms/db';
import { eq, inArray } from 'drizzle-orm';
import { getPublishedLiveSessions } from '@/lib/db/queries/live-sessions';

describe('getPublishedLiveSessions (real SQL)', { timeout: 60000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  let collegeId: string;
  let programId: number;
  let batchA: string;
  let batchB: string;

  const session = (batchId: string, title: string, isPublished: boolean) => ({
    batchId,
    title,
    meetingUrl: 'https://zoom.us/j/1234567890?pwd=x',
    recurrenceDays: [2, 4],
    startTime: '18:00',
    durationMinutes: 45,
    isPublished
  });

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `WS8S College ${stamp}`, code: `WS8S_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `WS8S Program ${stamp}`, code: `WS8S_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const created = await db
      .insert(batches)
      .values([
        { name: `WS8S A ${stamp}`, programId, collegeId },
        { name: `WS8S B ${stamp}`, programId, collegeId }
      ])
      .returning();
    [batchA, batchB] = [created[0].id, created[1].id];
    await db.insert(batchLiveSessions).values([
      session(batchA, 'Published A', true),
      session(batchA, 'Draft A', false),
      session(batchB, 'Published B', true)
    ]);
  });

  afterAll(async () => {
    await db.delete(batchLiveSessions).where(inArray(batchLiveSessions.batchId, [batchA, batchB]));
    await db.delete(batches).where(inArray(batches.id, [batchA, batchB]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it('returns only the published sessions of the requested batch', async () => {
    const rows = await getPublishedLiveSessions(batchA);
    expect(rows.map((r) => r.title)).toEqual(['Published A']);
    expect(rows[0]).toMatchObject({ recurrenceDays: [2, 4], startTime: '18:00', durationMinutes: 45, startsOn: null, endsOn: null });
    expect(rows[0]).not.toHaveProperty('isPublished');
  });

  it('returns nothing for an unknown batch', async () => {
    expect(await getPublishedLiveSessions('00000000-0000-4000-8000-000000000000')).toEqual([]);
  });
});
