import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Migration 0006 (tutor plan WS-3): batch_live_sessions constraints and assignment_submissions.reviewed_by_user_id.
vi.mock('server-only', () => ({}));

import {
  db,
  colleges,
  programs,
  batches,
  users,
  students,
  contentItems,
  assignments,
  batchCurriculum,
  assignmentSubmissions,
  batchLiveSessions,
  type NewBatchLiveSession
} from '@rms/db';
import { eq, inArray } from 'drizzle-orm';
import { getBatchProjectSubmissions } from '../db/queries/batch-projects';

describe('migration 0006 on the test database', { timeout: 60000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  let collegeId: string;
  let programId: number;
  let batchId: string;
  let deletedBatchId: string;
  let userId: string;
  let studentId: number;
  let contentItemId: string;
  let assignmentId: string;
  let submissionId: string;

  const session = (overrides: Partial<NewBatchLiveSession> = {}): NewBatchLiveSession => ({
    batchId,
    title: `M0006 session ${stamp}`,
    meetingUrl: 'https://zoom.us/j/1234567890',
    recurrenceDays: [1, 3, 5],
    startTime: '19:00',
    durationMinutes: 90,
    ...overrides
  });

  beforeAll(async () => {
    const [college] = await db
      .insert(colleges)
      .values({ name: `M0006 College ${stamp}`, code: `M0006_${suffix}` })
      .returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `M0006 Program ${stamp}`, code: `M0006_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const created = await db
      .insert(batches)
      .values([
        { name: `M0006 Batch ${stamp}`, programId, collegeId },
        { name: `M0006 Batch to delete ${stamp}`, programId, collegeId }
      ])
      .returning();
    batchId = created[0].id;
    deletedBatchId = created[1].id;
    const [user] = await db
      .insert(users)
      .values({ email: `m0006.reviewer.${stamp}@example.test`, passwordHash: 'not-a-real-hash', name: 'M0006 Reviewer' })
      .returning();
    userId = user.id;
    const [student] = await db
      .insert(students)
      .values({ fullName: `M0006 Student ${stamp}`, email: `m0006.student.${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    const [item] = await db
      .insert(contentItems)
      .values({ programId, title: `M0006 Project ${stamp}`, slug: `m0006-project-${stamp}`, contentType: 'project', isPublished: true })
      .returning();
    contentItemId = item.id;
    const [assignment] = await db.insert(assignments).values({ contentItemId, maxScore: 100 }).returning();
    assignmentId = assignment.id;
    await db.insert(batchCurriculum).values({ batchId, contentItemId, weekNumber: 1 });
    const [submission] = await db
      .insert(assignmentSubmissions)
      .values({ assignmentId, studentId, batchId, githubUrl: 'https://github.com/example/m0006', reviewedByUserId: userId })
      .returning();
    submissionId = submission.id;
  });

  afterAll(async () => {
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    await db.delete(batchLiveSessions).where(inArray(batchLiveSessions.batchId, [batchId, deletedBatchId]));
    await db.delete(batchCurriculum).where(eq(batchCurriculum.batchId, batchId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
    await db.delete(contentItems).where(eq(contentItems.id, contentItemId));
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(batches).where(inArray(batches.id, [batchId, deletedBatchId]));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  describe('batch_live_sessions', () => {
    it('stores a weekly session with the documented defaults', async () => {
      const [row] = await db.insert(batchLiveSessions).values(session({ createdByUserId: userId })).returning();
      expect(row.recurrenceDays).toEqual([1, 3, 5]);
      expect(row.timeZone).toBe('Asia/Kolkata');
      expect(row.isPublished).toBe(false);
      expect(row.sortOrder).toBe(0);
      expect(row.startsOn).toBeNull();
      expect(row.createdByUserId).toBe(userId);
    });

    it('stores a one-off session (starts_on = ends_on) and returns dates as YYYY-MM-DD', async () => {
      const [row] = await db
        .insert(batchLiveSessions)
        .values(session({ recurrenceDays: [3], startsOn: '2026-11-04', endsOn: '2026-11-04', startTime: '07:30', durationMinutes: 15 }))
        .returning();
      expect(row.startsOn).toBe('2026-11-04');
      expect(row.endsOn).toBe('2026-11-04');
    });

    it.each([
      ['duration below 15 minutes', { durationMinutes: 14 }, 'bls_duration_chk'],
      ['duration above 480 minutes', { durationMinutes: 481 }, 'bls_duration_chk'],
      ['no weekdays', { recurrenceDays: [] }, 'bls_days_chk'],
      ['weekday 0', { recurrenceDays: [0, 1] }, 'bls_days_chk'],
      ['weekday 8', { recurrenceDays: [8] }, 'bls_days_chk'],
      ['more than seven weekdays', { recurrenceDays: [1, 2, 3, 4, 5, 6, 7, 1] }, 'bls_days_chk'],
      ['hour 24', { startTime: '24:00' }, 'bls_time_chk'],
      ['single-digit hour', { startTime: '7:00' }, 'bls_time_chk'],
      ['minute 60', { startTime: '10:60' }, 'bls_time_chk'],
      ['window ending before it starts', { startsOn: '2026-11-10', endsOn: '2026-11-09' }, 'bls_window_chk']
    ] as const)('rejects %s (%s)', async (_label, overrides, constraint) => {
      await expect(
        db.insert(batchLiveSessions).values(session(overrides as Partial<NewBatchLiveSession>))
      ).rejects.toThrow(new RegExp(constraint));
    });

    it('rejects a session for a batch that does not exist', async () => {
      await expect(
        db.insert(batchLiveSessions).values(session({ batchId: '00000000-0000-4000-8000-000000000000' }))
      ).rejects.toThrow(/batch_live_sessions_batch_id_batches_id_fk/);
    });

    it('deletes sessions with their batch', async () => {
      await db.insert(batchLiveSessions).values(session({ batchId: deletedBatchId }));
      await db.delete(batches).where(eq(batches.id, deletedBatchId));
      const left = await db.select().from(batchLiveSessions).where(eq(batchLiveSessions.batchId, deletedBatchId));
      expect(left).toEqual([]);
    });
  });

  describe('assignment_submissions.reviewed_by_user_id', () => {
    it('is readable through the existing admin submissions query', async () => {
      const rows = await getBatchProjectSubmissions(batchId);
      expect(rows.map((r) => r.submissionId)).toContain(submissionId);
    });

    it('keeps the submission and clears the reviewer when the reviewing user is deleted', async () => {
      // created_by_user_id on the live session from the first test must clear too (ON DELETE SET NULL).
      await db.delete(users).where(eq(users.id, userId));
      const [submission] = await db
        .select({ reviewedByUserId: assignmentSubmissions.reviewedByUserId })
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.id, submissionId));
      expect(submission).toBeDefined();
      expect(submission.reviewedByUserId).toBeNull();
      const sessions = await db
        .select({ createdByUserId: batchLiveSessions.createdByUserId })
        .from(batchLiveSessions)
        .where(eq(batchLiveSessions.batchId, batchId));
      expect(sessions.every((s) => s.createdByUserId === null)).toBe(true);
    });
  });
});
