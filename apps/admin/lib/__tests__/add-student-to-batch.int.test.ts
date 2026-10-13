import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('server-only', () => ({}));

const mockRequireAdmin = vi.fn();
vi.mock('@/lib/authz', () => ({ requireAdmin: () => mockRequireAdmin() }));

// Never send real email from tests.
const mockSendActivationEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendEnrollmentEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/email', () => ({
  sendStudentActivationEmail: (...args: unknown[]) => mockSendActivationEmail(...args),
  sendEnrollmentConfirmationEmail: (...args: unknown[]) => mockSendEnrollmentEmail(...args)
}));

import {
  db,
  colleges,
  programs,
  batches,
  enrollments,
  students,
  users,
  userRoles,
  studentStats,
  accountTokens
} from '@rms/db';
import { and, eq, inArray } from 'drizzle-orm';
import { addStudentToBatchAction } from '../../app/(admin)/batches/[batchId]/students/actions';

describe('Add one student to a batch (real enrollment service)', { timeout: 30000 }, () => {
  const stamp = Date.now();
  const tag = stamp.toString().slice(-6);
  const email = `pr8_${tag}@example.test`;
  let collegeId: string;
  let programId: number;
  let batch1Id: string;
  let batch2Id: string;

  const form = (overrides: Record<string, string> = {}) => ({
    fullName: 'PR8 Test Student',
    email,
    phone: '9876543210',
    collegeRollNumber: `PR8-${tag}`,
    branch: 'CSE',
    year: '2',
    ...overrides
  });

  beforeAll(async () => {
    const [college] = await db
      .insert(colleges)
      .values({ name: `PR8 College ${stamp}`, code: `PR8C_${tag}` })
      .returning();
    collegeId = college.id;
    const [program] = await db
      .insert(programs)
      .values({ name: `PR8 Program ${stamp}`, code: `PR8P_${tag}`, collegeId, capacity: 0, status: 'active' })
      .returning();
    programId = program.id;
    const [b1, b2] = await db
      .insert(batches)
      .values([
        { name: `PR8 Batch 1 ${stamp}`, programId, collegeId, status: 'active' },
        { name: `PR8 Batch 2 ${stamp}`, programId, collegeId, status: 'active' }
      ])
      .returning();
    batch1Id = b1.id;
    batch2Id = b2.id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, userId: 'admin-int', role: 'admin' });
  });

  afterAll(async () => {
    try {
      const rows = await db
        .select({ id: students.id, userId: students.userId })
        .from(students)
        .where(eq(students.email, email));
      const studentIds = rows.map((r) => r.id);
      const userIds = rows.map((r) => r.userId).filter(Boolean) as string[];
      if (studentIds.length > 0) {
        await db.delete(enrollments).where(inArray(enrollments.studentId, studentIds));
        await db.delete(studentStats).where(inArray(studentStats.studentId, studentIds));
        await db.delete(students).where(inArray(students.id, studentIds));
      }
      if (userIds.length > 0) {
        await db.delete(accountTokens).where(inArray(accountTokens.userId, userIds));
        await db.delete(userRoles).where(inArray(userRoles.userId, userIds));
        await db.delete(users).where(inArray(users.id, userIds));
      }
      await db.delete(enrollments).where(inArray(enrollments.batchId, [batch1Id, batch2Id]));
      await db.delete(batches).where(inArray(batches.id, [batch1Id, batch2Id]));
      await db.delete(programs).where(eq(programs.id, programId));
      await db.delete(colleges).where(eq(colleges.id, collegeId));
    } catch (e) {
      console.error('Test cleanup error:', e);
    }
  });

  async function enrollmentsFor(batchId: string) {
    return db
      .select({ id: enrollments.id, status: enrollments.status, programId: enrollments.programId })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(and(eq(students.email, email), eq(enrollments.batchId, batchId)));
  }

  it('creates the student, account and one pending enrollment in the batch, without emails by default', async () => {
    const res = await addStudentToBatchAction(batch1Id, form());
    expect(res).toMatchObject({ success: true, data: { isNewStudent: true, enrollmentStatus: 'pending' } });

    const rows = await enrollmentsFor(batch1Id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'pending', programId });

    const [student] = await db.select().from(students).where(eq(students.email, email));
    expect(student.userId).toBeTruthy();
    expect(student.collegeId).toBe(collegeId);
    expect(mockSendActivationEmail).not.toHaveBeenCalled();
    expect(mockSendEnrollmentEmail).not.toHaveBeenCalled();
  });

  it('refuses a second enrollment of the same student in the same batch', async () => {
    const res = await addStudentToBatchAction(batch1Id, form());
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/already enrolled in this batch/);
    expect(await enrollmentsFor(batch1Id)).toHaveLength(1);
  });

  it('adds the same student to a second batch (multi-batch), reusing the record', async () => {
    const res = await addStudentToBatchAction(batch2Id, form(), { sendEmails: true });
    expect(res).toMatchObject({ success: true, data: { isNewStudent: false } });
    expect(await enrollmentsFor(batch2Id)).toHaveLength(1);
    expect(await enrollmentsFor(batch1Id)).toHaveLength(1);
    expect(await db.select().from(students).where(eq(students.email, email))).toHaveLength(1);
    // Existing student: confirmation only (mocked), no new activation invitation.
    expect(mockSendActivationEmail).not.toHaveBeenCalled();
    expect(mockSendEnrollmentEmail).toHaveBeenCalledTimes(1);
  });

  it('writes nothing for invalid input', async () => {
    const before = await db.select({ id: students.id }).from(students).where(eq(students.email, `bad_${email}`));
    const res = await addStudentToBatchAction(batch1Id, form({ email: `bad_${email}`, phone: '12' }));
    expect(res.success).toBe(false);
    const after = await db.select({ id: students.id }).from(students).where(eq(students.email, `bad_${email}`));
    expect(after).toHaveLength(before.length);
  });
});
