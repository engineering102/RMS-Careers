import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
// Mock next/cache and server-only
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));
vi.mock('server-only', () => ({}));

// Mock auth so we can simulate authenticated administrator and unauthenticated attempts
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

// Mock email to avoid actual network dispatches while testing email calls
const mockSendActivationEmail = vi.fn().mockResolvedValue({ success: true });
const mockSendEnrollmentEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/email', () => ({
  sendStudentActivationEmail: (...args: any[]) => mockSendActivationEmail(...args),
  sendEnrollmentConfirmationEmail: (...args: any[]) => mockSendEnrollmentEmail(...args)
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
import { eq, inArray, sql, and } from 'drizzle-orm';
import {
  validateImportFileAction,
  executeBulkImportAction
} from '../../app/(admin)/enrollments/import/actions';
import type { ValidatedImportRow } from '../csv/validator';

describe('Slice A1.3: Batch-Aware Student Import & Multi-Batch Enrollment', { timeout: 30000 }, () => {
  const adminSession = {
    user: { id: 'admin-uuid-1', email: 'admin@rmscareers.com', role: 'super_admin' }
  };

  let collegeAId: string;
  let collegeBId: string;
  let programAId: number;
  let programBId: number;
  let batchA1Id: string;
  let batchA2Id: string;
  let batchB1Id: string;

  let createdStudentEmails: string[] = [];
  let createdBatchIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create colleges
    const [c1] = await db
      .insert(colleges)
      .values({
        name: `A13 College Alpha ${timestamp}`,
        code: `A13A_${timestamp.toString().slice(-5)}`,
        city: 'Hyderabad',
        state: 'Telangana'
      })
      .returning();
    collegeAId = c1.id;

    const [c2] = await db
      .insert(colleges)
      .values({
        name: `A13 College Beta ${timestamp}`,
        code: `A13B_${timestamp.toString().slice(-5)}`,
        city: 'Chennai',
        state: 'Tamil Nadu'
      })
      .returning();
    collegeBId = c2.id;

    // 2. Create programs
    const [p1] = await db
      .insert(programs)
      .values({
        name: `A13 Full Stack Track ${timestamp}`,
        code: `A13_P1_${timestamp.toString().slice(-5)}`,
        collegeId: collegeAId,
        capacity: 100,
        status: 'active'
      })
      .returning();
    programAId = p1.id;

    const [p2] = await db
      .insert(programs)
      .values({
        name: `A13 Data Science Track ${timestamp}`,
        code: `A13_P2_${timestamp.toString().slice(-5)}`,
        collegeId: collegeBId,
        capacity: 100,
        status: 'active'
      })
      .returning();
    programBId = p2.id;

    // 3. Create batches: batchA1 and batchA2 for programA; batchB1 for programB
    const [b1] = await db
      .insert(batches)
      .values({
        name: `Alpha Batch 1 ${timestamp}`,
        programId: programAId,
        collegeId: collegeAId,
        status: 'active',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31')
      })
      .returning();
    batchA1Id = b1.id;
    createdBatchIds.push(b1.id);

    const [b2] = await db
      .insert(batches)
      .values({
        name: `Alpha Batch 2 ${timestamp}`,
        programId: programAId,
        collegeId: collegeAId,
        status: 'active',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2027-01-31')
      })
      .returning();
    batchA2Id = b2.id;
    createdBatchIds.push(b2.id);

    const [b3] = await db
      .insert(batches)
      .values({
        name: `Beta Batch 1 ${timestamp}`,
        programId: programBId,
        collegeId: collegeBId,
        status: 'active',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31')
      })
      .returning();
    batchB1Id = b3.id;
    createdBatchIds.push(b3.id);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  afterAll(async () => {
    try {
      if (createdStudentEmails.length > 0) {
        const studentRows = await db
          .select({ id: students.id, userId: students.userId })
          .from(students)
          .where(inArray(students.email, createdStudentEmails));

        const studentIds = studentRows.map((s) => s.id);
        const userIds = studentRows.map((s) => s.userId).filter(Boolean) as string[];

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
      }

      if (createdBatchIds.length > 0) {
        await db.delete(enrollments).where(inArray(enrollments.batchId, createdBatchIds));
        await db.delete(batches).where(inArray(batches.id, createdBatchIds));
      }

      if (programAId || programBId) {
        await db.delete(programs).where(inArray(programs.id, [programAId, programBId]));
      }

      if (collegeAId || collegeBId) {
        await db.delete(colleges).where(inArray(colleges.id, [collegeAId, collegeBId]));
      }
    } catch (e) {
      console.error('Test cleanup error:', e);
    }
  });

  // ==========================================================================
  // Scenario A — New student + target batch
  // ==========================================================================
  it('Scenario A: imports new student into target batch with consistent user, student, stats, and enrollment', async () => {
    const email = `a13_new_${Date.now()}@example.com`;
    createdStudentEmails.push(email);

    const validRow: ValidatedImportRow = {
      rowIndex: 1,
      fullName: 'Alice Developer',
      email,
      phone: '9876543210',
      collegeRollNumber: '21CS01',
      branch: 'CSE',
      year: 3,
      yearFormatted: '3rd Year',
      status: 'valid'
    };

    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: true
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.summary.newStudentsCount).toBe(1);
    expect(res.summary.reusedStudentsCount).toBe(0);
    expect(res.summary.newEnrollmentsCount).toBe(1);
    expect(res.summary.alreadyEnrolledCount).toBe(0);

    // Verify User record
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    expect(user).toBeDefined();
    expect(user.status).toBe('pending_activation');

    // Verify Student record
    const [student] = await db.select().from(students).where(eq(students.email, email)).limit(1);
    expect(student).toBeDefined();
    expect(student.userId).toBe(user.id);
    expect(student.collegeId).toBe(collegeAId);

    // Verify Student Stats record
    const [stats] = await db.select().from(studentStats).where(eq(studentStats.studentId, student.id)).limit(1);
    expect(stats).toBeDefined();
    expect(stats.collegeId).toBe(collegeAId);
    expect(stats.totalXp).toBe(0);

    // Verify Enrollment record in target batch
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.batchId, batchA1Id)))
      .limit(1);
    expect(enrollment).toBeDefined();
    expect(enrollment.batchId).toBe(batchA1Id);
    expect(enrollment.programId).toBe(programAId);
    expect(enrollment.status).toBe('pending');

    // Activation email was sent for new student
    expect(mockSendActivationEmail).toHaveBeenCalledTimes(1);
  });

  // ==========================================================================
  // Scenario B — Existing student + new batch
  // ==========================================================================
  it('Scenario B: enrolls existing student into a second batch without duplicating user or student', async () => {
    const email = `a13_multibatch_${Date.now()}@example.com`;
    createdStudentEmails.push(email);

    const validRow: ValidatedImportRow = {
      rowIndex: 1,
      fullName: 'Bob Smith',
      email,
      phone: '9123456789',
      collegeRollNumber: '21CS02',
      branch: 'ECE',
      year: 2,
      yearFormatted: '2nd Year',
      status: 'valid'
    };

    // 1. Initial import into Batch A1
    const res1 = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: false
    });
    expect(res1.success).toBe(true);

    const [userBefore] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const [studentBefore] = await db.select().from(students).where(eq(students.email, email)).limit(1);

    mockSendActivationEmail.mockClear();

    // 2. Second import of same student into Batch A2
    const res2 = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA2Id,
      rows: [validRow],
      sendEmails: true
    });

    expect(res2.success).toBe(true);
    if (!res2.success) return;

    expect(res2.summary.newStudentsCount).toBe(0);
    expect(res2.summary.reusedStudentsCount).toBe(1);
    expect(res2.summary.newEnrollmentsCount).toBe(1);
    expect(res2.summary.alreadyEnrolledCount).toBe(0);

    // Verify student and user IDs are strictly reused
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.email, email));
    expect(Number(userCount[0].count)).toBe(1);

    const studentCount = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.email, email));
    expect(Number(studentCount[0].count)).toBe(1);

    // Verify student has 2 distinct enrollments in the database
    const studentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentBefore.id));
    expect(studentEnrollments).toHaveLength(2);

    const enrolledBatchIds = studentEnrollments.map((e) => e.batchId);
    expect(enrolledBatchIds).toContain(batchA1Id);
    expect(enrolledBatchIds).toContain(batchA2Id);

    // Existing student should NOT receive a new account activation email
    expect(mockSendActivationEmail).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // Scenario C — Existing student + same batch (Idempotency)
  // ==========================================================================
  it('Scenario C: re-importing student into the same batch is idempotent and skips creation', async () => {
    const email = `a13_idempotent_${Date.now()}@example.com`;
    createdStudentEmails.push(email);

    const validRow: ValidatedImportRow = {
      rowIndex: 1,
      fullName: 'Charlie Brown',
      email,
      phone: '9888877777',
      collegeRollNumber: '21CS03',
      branch: 'MECH',
      year: 4,
      yearFormatted: '4th Year',
      status: 'valid'
    };

    // 1. Initial import into Batch A1
    await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: false
    });

    // 2. Re-importing into Batch A1
    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: false
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.summary.newStudentsCount).toBe(0);
    expect(res.summary.reusedStudentsCount).toBe(0);
    expect(res.summary.newEnrollmentsCount).toBe(0);
    expect(res.summary.alreadyEnrolledCount).toBe(1);

    // Enrollment count in Batch A1 for this student remains exactly 1
    const [student] = await db.select().from(students).where(eq(students.email, email)).limit(1);
    const userEnrollments = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.batchId, batchA1Id)));
    expect(userEnrollments).toHaveLength(1);
  });

  // ==========================================================================
  // Scenario D — Existing student, completed old batch + new batch
  // ==========================================================================
  it('Scenario D: student with completed batch retains completed status when enrolled in a new batch', async () => {
    const email = `a13_completed_${Date.now()}@example.com`;
    createdStudentEmails.push(email);

    const validRow: ValidatedImportRow = {
      rowIndex: 1,
      fullName: 'David Completed',
      email,
      phone: '9777766666',
      collegeRollNumber: '21CS04',
      branch: 'CIVIL',
      year: 4,
      yearFormatted: '4th Year',
      status: 'valid'
    };

    // 1. Import into Batch A1
    await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: false
    });

    const [student] = await db.select().from(students).where(eq(students.email, email)).limit(1);

    // 2. Mark Batch A1 enrollment as 'confirmed' or 'transferred'
    await db
      .update(enrollments)
      .set({ status: 'confirmed' })
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.batchId, batchA1Id)));

    // 3. Import student into Batch A2
    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA2Id,
      rows: [validRow],
      sendEmails: false
    });

    expect(res.success).toBe(true);

    // 4. Verify Batch A1 remains confirmed and Batch A2 is pending
    const [enr1] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.batchId, batchA1Id)))
      .limit(1);
    expect(enr1.status).toBe('confirmed');

    const [enr2] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.batchId, batchA2Id)))
      .limit(1);
    expect(enr2.status).toBe('pending');
  });

  // ==========================================================================
  // Scenario E — Multiple students in same target batch
  // ==========================================================================
  it('Scenario E: imports multiple students in a single batch file consistently', async () => {
    const timestamp = Date.now();
    const email1 = `a13_multi1_${timestamp}@example.com`;
    const email2 = `a13_multi2_${timestamp}@example.com`;
    createdStudentEmails.push(email1, email2);

    const rows: ValidatedImportRow[] = [
      {
        rowIndex: 1,
        fullName: 'Eva Green',
        email: email1,
        phone: '9666655555',
        collegeRollNumber: '21CS05',
        branch: 'CSE',
        year: 1,
        yearFormatted: '1st Year',
        status: 'valid'
      },
      {
        rowIndex: 2,
        fullName: 'Frank Ocean',
        email: email2,
        phone: '9555544444',
        collegeRollNumber: '21CS06',
        branch: 'CSE',
        year: 1,
        yearFormatted: '1st Year',
        status: 'valid'
      }
    ];

    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows,
      sendEmails: false
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.summary.newStudentsCount).toBe(2);
    expect(res.summary.newEnrollmentsCount).toBe(2);

    const batchEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.batchId, batchA1Id));

    expect(batchEnrollments.length).toBeGreaterThanOrEqual(2);
  });

  // ==========================================================================
  // Scenario F — Duplicate emails in CSV file
  // ==========================================================================
  it('Scenario F: identifies in-file duplicate emails before database mutation', async () => {
    const email = `a13_dup_${Date.now()}@example.com`;
    const csvContent = [
      'Full Name,Email,Phone Number,College Roll Number,Branch,Academic Year',
      `"Grace Hopper","${email}","9444433333","21CS07","CSE","3rd Year"`,
      `"Grace Duplicate","${email}","9444433333","21CS08","CSE","3rd Year"`
    ].join('\n');

    const formData = new FormData();
    formData.append('programId', String(programAId));
    formData.append('batchId', batchA1Id);
    formData.append('file', new File([csvContent], 'duplicates.csv', { type: 'text/csv' }));

    const res = await validateImportFileAction(formData);

    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.preview.totalRows).toBe(2);
    expect(res.preview.validCount).toBe(1);
    expect(res.preview.duplicateInFileCount).toBe(1);

    const dupRow = res.preview.rows.find((r) => r.status === 'in_file_duplicate');
    expect(dupRow).toBeDefined();
    expect(dupRow?.email).toBe(email);
  });

  // ==========================================================================
  // Scenario G — Program / Batch mismatch
  // ==========================================================================
  it('Scenario G: rejects import when selected batch belongs to another program', async () => {
    // batchB1Id belongs to programBId, but client attempts to pass programAId
    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchB1Id,
      rows: [
        {
          rowIndex: 1,
          fullName: 'Harry Mismatch',
          email: 'harry@example.com',
          phone: '9333322222',
          collegeRollNumber: '21CS09',
          branch: 'CSE',
          year: 2,
          yearFormatted: '2nd Year',
          status: 'valid'
        }
      ],
      sendEmails: false
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/does not belong to the selected program/i);
    }
  });

  // ==========================================================================
  // Data Integrity — XP & stats preserved across new batch enrollments
  // ==========================================================================
  it('preserves existing XP and streaks when an active student is enrolled into an additional batch', async () => {
    const email = `a13_stats_${Date.now()}@example.com`;
    createdStudentEmails.push(email);

    const validRow: ValidatedImportRow = {
      rowIndex: 1,
      fullName: 'Iris Scholar',
      email,
      phone: '9222211111',
      collegeRollNumber: '21CS10',
      branch: 'CSE',
      year: 3,
      yearFormatted: '3rd Year',
      status: 'valid'
    };

    // 1. Initial enrollment
    await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [validRow],
      sendEmails: false
    });

    const [student] = await db.select().from(students).where(eq(students.email, email)).limit(1);

    // 2. Simulate learning progress: add XP and streak
    await db
      .update(studentStats)
      .set({
        totalXp: 750,
        currentStreak: 12,
        currentLevel: 4
      })
      .where(eq(studentStats.studentId, student.id));

    // 3. Enroll into second batch
    const res = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA2Id,
      rows: [validRow],
      sendEmails: false
    });

    expect(res.success).toBe(true);

    // 4. Verify stats were NOT reset
    const [stats] = await db
      .select()
      .from(studentStats)
      .where(eq(studentStats.studentId, student.id))
      .limit(1);

    expect(stats.totalXp).toBe(750);
    expect(stats.currentStreak).toBe(12);
    expect(stats.currentLevel).toBe(4);
  });

  // ==========================================================================
  // Security — Unauthorized access
  // ==========================================================================
  it('blocks unauthenticated requests to validateImportFileAction and executeBulkImportAction', async () => {
    mockAuth.mockResolvedValue(null);

    const formData = new FormData();
    formData.append('programId', String(programAId));
    formData.append('batchId', batchA1Id);
    formData.append('file', new File(['test'], 'test.csv', { type: 'text/csv' }));

    const res1 = await validateImportFileAction(formData);
    expect(res1.success).toBe(false);
    if (!res1.success) {
      expect(res1.error).toMatch(/unauthorized/i);
    }

    const res2 = await executeBulkImportAction({
      programId: programAId,
      batchId: batchA1Id,
      rows: [],
      sendEmails: false
    });
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toMatch(/unauthorized/i);
    }
  });
});
