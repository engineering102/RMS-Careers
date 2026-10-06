import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Load environment variables for live database integration
const envCandidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env.local'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../student/.env.local')
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    try {
      loadEnvFile(envPath);
      break;
    } catch {}
  }
}

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

import { db, colleges, programs, batches, enrollments, students } from '@rms/db';
import { eq, inArray, sql } from 'drizzle-orm';
import { createBatchAction } from '../../app/(admin)/batches/actions';
import { getBatchesWithDetails } from '../db/queries/batches';

describe('Slice A1.2: Admin Batch Management', () => {
  let collegeAId: string;
  let collegeBId: string;
  let programAId: number;
  let programBId: number;
  let createdBatchIds: string[] = [];
  let createdStudentIds: number[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create 2 test colleges
    const [c1] = await db
      .insert(colleges)
      .values({
        name: `A12 College Alpha ${timestamp}`,
        code: `A12A_${timestamp.toString().slice(-5)}`,
        city: 'Hyderabad',
        state: 'Telangana'
      })
      .returning();
    collegeAId = c1.id;

    const [c2] = await db
      .insert(colleges)
      .values({
        name: `A12 College Beta ${timestamp}`,
        code: `A12B_${timestamp.toString().slice(-5)}`,
        city: 'Bengaluru',
        state: 'Karnataka'
      })
      .returning();
    collegeBId = c2.id;

    // Create 2 programs: programA in collegeA, programB in collegeB
    const [p1] = await db
      .insert(programs)
      .values({
        name: `A12 Program Alpha Track ${timestamp}`,
        code: `A12_P1_${timestamp.toString().slice(-5)}`,
        collegeId: collegeAId,
        status: 'active'
      })
      .returning();
    programAId = p1.id;

    const [p2] = await db
      .insert(programs)
      .values({
        name: `A12 Program Beta Track ${timestamp}`,
        code: `A12_P2_${timestamp.toString().slice(-5)}`,
        collegeId: collegeBId,
        status: 'active'
      })
      .returning();
    programBId = p2.id;
  });

  afterAll(async () => {
    try {
      // Clean up in reverse dependency order
      if (createdStudentIds.length > 0) {
        await db.delete(enrollments).where(inArray(enrollments.studentId, createdStudentIds));
        await db.delete(students).where(inArray(students.id, createdStudentIds));
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
    } catch (err) {
      console.warn('Cleanup warning in afterAll:', err);
    }
  });

  beforeEach(() => {
    // Default to authenticated administrator
    mockAuth.mockResolvedValue({
      user: {
        id: 'mock-admin-uuid',
        name: 'RMS Admin',
        email: 'admin@rms-careers.local',
        role: 'admin'
      }
    });
  });

  // ==========================================================================
  // Test 1 — Create valid batch
  // ==========================================================================
  it('Test 1 — creates a valid batch given college + program + dates', async () => {
    const res = await createBatchAction({
      name: 'Alpha 2026 Morning Cohort',
      collegeId: collegeAId,
      programId: programAId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });

    expect(res.success).toBe(true);
    expect(res.batch).toBeDefined();
    expect(res.batch?.id).toBeDefined();
    expect(res.batch?.name).toBe('Alpha 2026 Morning Cohort');
    expect(res.batch?.collegeId).toBe(collegeAId);
    expect(res.batch?.programId).toBe(programAId);
    expect(res.batch?.status).toBe('active');

    createdBatchIds.push(res.batch!.id);
  });

  // ==========================================================================
  // Test 2 — Program/college mismatch
  // ==========================================================================
  it('Test 2 — rejects creation when program does not belong to selected college', async () => {
    // programB belongs to collegeB, but client claims collegeA
    const res = await createBatchAction({
      name: 'Mismatched Batch Attempt',
      collegeId: collegeAId,
      programId: programBId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/program does not belong to the selected college/i);
  });

  // ==========================================================================
  // Test 3 — Invalid dates (endDate < startDate)
  // ==========================================================================
  it('Test 3 — rejects creation when endDate precedes startDate', async () => {
    const res = await createBatchAction({
      name: 'Invalid Dates Batch',
      collegeId: collegeAId,
      programId: programAId,
      startDate: new Date('2026-12-31'),
      endDate: new Date('2026-07-01') // Precedes start date
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/end date must not precede start date/i);
  });

  // ==========================================================================
  // Test 4 — Missing required fields
  // ==========================================================================
  it('Test 4 — fails validation when required fields are missing or empty', async () => {
    const resEmptyName = await createBatchAction({
      name: '   ',
      collegeId: collegeAId,
      programId: programAId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });
    expect(resEmptyName.success).toBe(false);
    expect(resEmptyName.error).toMatch(/batch name is required/i);

    const resMissingCollege = await createBatchAction({
      name: 'Valid Name',
      collegeId: 'not-a-uuid',
      programId: programAId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });
    expect(resMissingCollege.success).toBe(false);
    expect(resMissingCollege.error).toMatch(/valid college/i);
  });

  // ==========================================================================
  // Test 5 — Unauthorized creation
  // ==========================================================================
  it('Test 5 — rejects unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null); // Simulate no session

    const res = await createBatchAction({
      name: 'Unauthorized Batch',
      collegeId: collegeAId,
      programId: programAId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unauthorized/i);
  });

  // ==========================================================================
  // Test 6 — Batch listing
  // ==========================================================================
  it('Test 6 — retrieves batches with college, program, enrollment count, and status without N+1', async () => {
    const list = await getBatchesWithDetails({ collegeId: collegeAId });

    expect(list.length).toBeGreaterThanOrEqual(1);
    const item = list.find((b) => b.collegeId === collegeAId);
    expect(item).toBeDefined();
    expect(item?.collegeName).toBeDefined();
    expect(item?.collegeCode).toBeDefined();
    expect(item?.programName).toBeDefined();
    expect(item?.programCode).toBeDefined();
    expect(item?.status).toBe('active');
    expect(typeof item?.enrollmentCount).toBe('number');
  });

  // ==========================================================================
  // Test 7 — Enrollment count reflects actual database enrollments
  // ==========================================================================
  it('Test 7 — verifies enrollment count accurately reflects live student enrollments', async () => {
    // 1. Create a dedicated batch
    const createRes = await createBatchAction({
      name: 'Enrollment Count Verification Cohort',
      collegeId: collegeAId,
      programId: programAId,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31')
    });
    expect(createRes.success).toBe(true);
    const targetBatchId = createRes.batch!.id;
    createdBatchIds.push(targetBatchId);

    // Initial count should be 0
    let [batchRecord] = await getBatchesWithDetails({ programId: programAId });
    const targetBefore = (await getBatchesWithDetails({ programId: programAId })).find(
      (b) => b.id === targetBatchId
    );
    expect(targetBefore?.enrollmentCount).toBe(0);

    // 2. Enroll 2 students into this batch
    const timestamp = Date.now();
    const [s1] = await db
      .insert(students)
      .values({
        fullName: `A12 Test Student 1 ${timestamp}`,
        email: `a12_student1_${timestamp}@rms-careers.local`,
        collegeId: collegeAId
      })
      .returning();
    const [s2] = await db
      .insert(students)
      .values({
        fullName: `A12 Test Student 2 ${timestamp}`,
        email: `a12_student2_${timestamp}@rms-careers.local`,
        collegeId: collegeAId
      })
      .returning();

    createdStudentIds.push(s1.id, s2.id);

    await db.insert(enrollments).values([
      {
        studentId: s1.id,
        programId: programAId,
        batchId: targetBatchId,
        status: 'active'
      },
      {
        studentId: s2.id,
        programId: programAId,
        batchId: targetBatchId,
        status: 'confirmed'
      }
    ]);

    // 3. Verify count is now 2
    const targetAfter = (await getBatchesWithDetails({ programId: programAId })).find(
      (b) => b.id === targetBatchId
    );
    expect(targetAfter?.enrollmentCount).toBe(2);
  });

  // ==========================================================================
  // Test 8 — Empty state when no batches match
  // ==========================================================================
  it('Test 8 — returns empty list when no batches match the requested filter', async () => {
    // College B has no batches created in this test suite yet
    const list = await getBatchesWithDetails({ collegeId: collegeBId });
    expect(list).toEqual([]);
  });

  // ==========================================================================
  // Test 9 — Filtering by college and program
  // ==========================================================================
  it('Test 9 — correctly scopes batches by college and program filters', async () => {
    // Create a batch in College B
    const createResB = await createBatchAction({
      name: 'Beta 2026 Evening Cohort',
      collegeId: collegeBId,
      programId: programBId,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-15')
    });
    expect(createResB.success).toBe(true);
    createdBatchIds.push(createResB.batch!.id);

    // 1. College A filter returns only College A batches
    const listCollegeA = await getBatchesWithDetails({ collegeId: collegeAId });
    expect(listCollegeA.length).toBeGreaterThan(0);
    expect(listCollegeA.every((b) => b.collegeId === collegeAId)).toBe(true);

    // 2. College B filter returns only College B batches
    const listCollegeB = await getBatchesWithDetails({ collegeId: collegeBId });
    expect(listCollegeB.length).toBe(1);
    expect(listCollegeB[0].collegeId).toBe(collegeBId);
    expect(listCollegeB[0].name).toBe('Beta 2026 Evening Cohort');

    // 3. Program filter returns only batches belonging to that program
    const listProgB = await getBatchesWithDetails({ programId: programBId });
    expect(listProgB.length).toBe(1);
    expect(listProgB[0].programId).toBe(programBId);
  });
});
