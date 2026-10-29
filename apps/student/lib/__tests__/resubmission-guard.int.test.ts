// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Tutor plan D-12: the student's resubmission UPDATE must not overwrite a reviewer's claim or an approval.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  db,
  colleges,
  programs,
  batches,
  students,
  contentItems,
  assignments,
  assignmentSubmissions,
  type SubmissionStatusEnum
} from '@rms/db';
import { eq } from 'drizzle-orm';
import { resubmitProjectIfEditable } from '@/lib/db/queries/projects';

describe('resubmitProjectIfEditable (real SQL)', { timeout: 60000 }, () => {
  const stamp = Date.now().toString();
  const suffix = stamp.slice(-6);
  const original = 'https://github.com/example/original';
  let collegeId: string;
  let programId: number;
  let batchId: string;
  let studentId: number;
  let contentItemId: string;
  let assignmentId: string;
  let submissionId: string;

  const setStatus = async (status: SubmissionStatusEnum) => {
    await db
      .update(assignmentSubmissions)
      .set({ status, githubUrl: original, notes: null })
      .where(eq(assignmentSubmissions.id, submissionId));
  };
  const readRow = async () => {
    const [row] = await db
      .select({ status: assignmentSubmissions.status, githubUrl: assignmentSubmissions.githubUrl, notes: assignmentSubmissions.notes })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.id, submissionId));
    return row;
  };
  const resubmit = () =>
    resubmitProjectIfEditable(submissionId, { githubUrl: 'https://github.com/example/updated', liveUrl: null, notes: 'v2' }, new Date());

  beforeAll(async () => {
    const [college] = await db.insert(colleges).values({ name: `D12 College ${stamp}`, code: `D12_${suffix}` }).returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `D12 Program ${stamp}`, code: `D12_P_${suffix}`, collegeId, status: 'active' })
      .returning();
    programId = program.id;
    const [batch] = await db.insert(batches).values({ name: `D12 Batch ${stamp}`, programId, collegeId }).returning();
    batchId = batch.id;
    const [student] = await db
      .insert(students)
      .values({ fullName: `D12 Student ${stamp}`, email: `d12.student.${stamp}@example.test`, collegeId })
      .returning();
    studentId = student.id;
    const [item] = await db
      .insert(contentItems)
      .values({ programId, title: `D12 Project ${stamp}`, slug: `d12-project-${stamp}`, contentType: 'project', isPublished: true })
      .returning();
    contentItemId = item.id;
    const [assignment] = await db.insert(assignments).values({ contentItemId, maxScore: 100 }).returning();
    assignmentId = assignment.id;
    const [submission] = await db
      .insert(assignmentSubmissions)
      .values({ assignmentId, studentId, batchId, githubUrl: original })
      .returning({ id: assignmentSubmissions.id });
    submissionId = submission.id;
  });

  afterAll(async () => {
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
    await db.delete(contentItems).where(eq(contentItems.id, contentItemId));
    await db.delete(students).where(eq(students.id, studentId));
    await db.delete(batches).where(eq(batches.id, batchId));
    await db.delete(programs).where(eq(programs.id, programId));
    await db.delete(colleges).where(eq(colleges.id, collegeId));
  });

  it.each(['submitted', 'resubmission_requested'] as const)('updates a %s submission and resets it to submitted', async (status) => {
    await setStatus(status);
    expect(await resubmit()).toBe(true);
    expect(await readRow()).toEqual({ status: 'submitted', githubUrl: 'https://github.com/example/updated', notes: 'v2' });
  });

  it.each(['under_review', 'approved'] as const)('leaves an %s submission untouched', async (status) => {
    await setStatus(status);
    expect(await resubmit()).toBe(false);
    expect(await readRow()).toEqual({ status, githubUrl: original, notes: null });
  });
});
