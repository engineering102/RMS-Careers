// INTEGRATION tier: runs only via `test:int` against the guarded TEST_DATABASE_URL (see setup-int.ts).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { db } from '@rms/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import * as schema from '@rms/db/schema';

describe('Slice A1.1: Multi-Batch Schema Foundation Invariants', () => {
  // Test entities created during suite execution
  let testCollegeId: string;
  let testProgram1Id: number;
  let testProgram2Id: number;
  let testBatchAId: string;
  let testBatchBId: string;
  let testStudent1Id: number;
  let testStudent2Id: number;
  const createdContentItemIds: string[] = [];

  beforeAll(async () => {
    // Set up dedicated test entities with unique prefixes
    const timestamp = Date.now();

    // 1. College
    const [college] = await db
      .insert(schema.colleges)
      .values({
        name: `A11 Test College ${timestamp}`,
        code: `A11_${timestamp.toString().slice(-6)}`,
        city: 'Hyderabad',
        state: 'Telangana'
      })
      .returning();
    testCollegeId = college.id;

    // 2. Programs
    const [prog1] = await db
      .insert(schema.programs)
      .values({
        name: `A11 Program X ${timestamp}`,
        code: `A11_PX_${timestamp.toString().slice(-6)}`,
        collegeId: testCollegeId,
        status: 'active'
      })
      .returning();
    testProgram1Id = prog1.id;

    const [prog2] = await db
      .insert(schema.programs)
      .values({
        name: `A11 Program Y ${timestamp}`,
        code: `A11_PY_${timestamp.toString().slice(-6)}`,
        collegeId: testCollegeId,
        status: 'active'
      })
      .returning();
    testProgram2Id = prog2.id;

    // 3. Batches
    const [batchA] = await db
      .insert(schema.batches)
      .values({
        programId: testProgram1Id,
        collegeId: testCollegeId,
        name: `A11 Batch A ${timestamp}`,
        status: 'active'
      })
      .returning();
    testBatchAId = batchA.id;

    const [batchB] = await db
      .insert(schema.batches)
      .values({
        programId: testProgram2Id,
        collegeId: testCollegeId,
        name: `A11 Batch B ${timestamp}`,
        status: 'active'
      })
      .returning();
    testBatchBId = batchB.id;

    // 4. Students
    const [student1] = await db
      .insert(schema.students)
      .values({
        fullName: `A11 Student 1 ${timestamp}`,
        email: `student1.${timestamp}@test.rms-careers.local`,
        collegeId: testCollegeId,
        collegeRollNumber: `R1_${timestamp}`
      })
      .returning();
    testStudent1Id = student1.id;

    const [student2] = await db
      .insert(schema.students)
      .values({
        fullName: `A11 Student 2 ${timestamp}`,
        email: `student2.${timestamp}@test.rms-careers.local`,
        collegeId: testCollegeId,
        collegeRollNumber: `R2_${timestamp}`
      })
      .returning();
    testStudent2Id = student2.id;
  });

  afterAll(async () => {
    // Clean up created test entities in reverse dependency order
    try {
      if (testBatchAId || testBatchBId) {
        await db
          .delete(schema.batchCurriculum)
          .where(sql`batch_id IN (${testBatchAId}, ${testBatchBId})`);
      }

      if (testStudent1Id || testStudent2Id) {
        await db
          .delete(schema.enrollments)
          .where(sql`student_id IN (${testStudent1Id}, ${testStudent2Id})`);
        await db
          .delete(schema.students)
          .where(sql`id IN (${testStudent1Id}, ${testStudent2Id})`);
      }

      if (testBatchAId || testBatchBId) {
        await db
          .delete(schema.batches)
          .where(sql`id IN (${testBatchAId}, ${testBatchBId})`);
      }

      if (testProgram1Id || testProgram2Id) {
        await db
          .delete(schema.programs)
          .where(sql`id IN (${testProgram1Id}, ${testProgram2Id})`);
      }

      if (testCollegeId) {
        await db.delete(schema.colleges).where(eq(schema.colleges.id, testCollegeId));
      }

      if (createdContentItemIds.length > 0) {
        await db
          .delete(schema.contentItems)
          .where(inArray(schema.contentItems.id, createdContentItemIds));
      }
    } catch (err) {
      console.warn('Cleanup warning in afterAll:', err);
    }
  });

  // ==========================================================================
  // Test 1 — Same student, different batches
  // ==========================================================================
  it('Test 1 — allows same student to hold active enrollments in different batches concurrently', async () => {
    // Student 1 -> Batch A -> active
    const [enrollmentA] = await db
      .insert(schema.enrollments)
      .values({
        studentId: testStudent1Id,
        programId: testProgram1Id,
        batchId: testBatchAId,
        status: 'active'
      })
      .returning();

    // Student 1 -> Batch B -> active
    const [enrollmentB] = await db
      .insert(schema.enrollments)
      .values({
        studentId: testStudent1Id,
        programId: testProgram2Id,
        batchId: testBatchBId,
        status: 'active'
      })
      .returning();

    expect(enrollmentA.id).toBeDefined();
    expect(enrollmentB.id).toBeDefined();
    expect(enrollmentA.status).toBe('active');
    expect(enrollmentB.status).toBe('active');
    expect(enrollmentA.batchId).toBe(testBatchAId);
    expect(enrollmentB.batchId).toBe(testBatchBId);
  });

  // ==========================================================================
  // Test 2 — Same student, same batch
  // ==========================================================================
  it('Test 2 — prevents duplicate active/confirmed enrollment for the same student in the same batch', async () => {
    // Student 1 already has active enrollment in Batch A from Test 1.
    // Attempting to add a second active/confirmed enrollment in Batch A must fail at DB level.
    await expect(
      db
        .insert(schema.enrollments)
        .values({
          studentId: testStudent1Id,
          programId: testProgram1Id,
          batchId: testBatchAId,
          status: 'confirmed'
        })
        .returning()
    ).rejects.toThrow(/unique_active_batch_enrollment_idx|duplicate key value/i);
  });

  // ==========================================================================
  // Test 3 — Different students, same batch
  // ==========================================================================
  it('Test 3 — allows different students to enroll actively in the same batch', async () => {
    // Student 2 -> Batch A -> active
    const [enrollmentStudent2] = await db
      .insert(schema.enrollments)
      .values({
        studentId: testStudent2Id,
        programId: testProgram1Id,
        batchId: testBatchAId,
        status: 'active'
      })
      .returning();

    expect(enrollmentStudent2.id).toBeDefined();
    expect(enrollmentStudent2.studentId).toBe(testStudent2Id);
    expect(enrollmentStudent2.batchId).toBe(testBatchAId);
    expect(enrollmentStudent2.status).toBe('active');
  });

  // ==========================================================================
  // Test 4 — Different program, different batch
  // ==========================================================================
  it('Test 4 — supports enrollment across different programs and different batches', async () => {
    // Student 2 -> Program Y -> Batch B -> active
    const [enrollmentStudent2BatchB] = await db
      .insert(schema.enrollments)
      .values({
        studentId: testStudent2Id,
        programId: testProgram2Id,
        batchId: testBatchBId,
        status: 'active'
      })
      .returning();

    expect(enrollmentStudent2BatchB.id).toBeDefined();
    expect(enrollmentStudent2BatchB.programId).toBe(testProgram2Id);
    expect(enrollmentStudent2BatchB.batchId).toBe(testBatchBId);
    expect(enrollmentStudent2BatchB.status).toBe('active');
  });

  // ==========================================================================
  // Test 5 — Existing seed compatibility
  // ==========================================================================
  it('Test 5 — verifies seed-shaped data and student stats keep their invariants', async () => {
    // Deterministic fixtures: the isolated test database holds no pre-existing application data.
    const [content] = await db
      .insert(schema.contentItems)
      .values({
        programId: testProgram1Id,
        title: 'T5 fixture lecture',
        slug: `t5-fixture-${Date.now()}`,
        contentType: 'notes',
        isPublished: true
      })
      .returning();
    createdContentItemIds.push(content.id);

    await db.insert(schema.enrollments).values({
      studentId: testStudent1Id,
      programId: testProgram1Id,
      batchId: testBatchAId,
      // 'pending' stays outside the unique active/confirmed index other tests in this suite use
      status: 'pending'
    });
    await db
      .insert(schema.batchCurriculum)
      .values({ batchId: testBatchAId, contentItemId: content.id, weekNumber: 1 });
    await db.insert(schema.studentStats).values({
      studentId: testStudent1Id,
      collegeId: testCollegeId,
      totalXp: 40,
      currentStreak: 2
    });
    await db.insert(schema.activities).values({
      studentId: testStudent1Id,
      batchId: testBatchAId,
      activityType: 'dsa_solved',
      referenceId: `t5-${Date.now()}`,
      xpAwarded: 10,
      activityDateIst: '2026-01-01'
    });

    const existingStudents = await db.select().from(schema.students).where(eq(schema.students.id, testStudent1Id));
    const existingBatches = await db.select().from(schema.batches).where(eq(schema.batches.id, testBatchAId));
    const existingEnrollments = await db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.studentId, testStudent1Id));
    const existingCurriculum = await db
      .select()
      .from(schema.batchCurriculum)
      .where(eq(schema.batchCurriculum.batchId, testBatchAId));
    const existingStats = await db
      .select()
      .from(schema.studentStats)
      .where(eq(schema.studentStats.studentId, testStudent1Id));
    const existingActivities = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.studentId, testStudent1Id));

    expect(existingStudents.length).toBeGreaterThan(0);
    expect(existingBatches.length).toBeGreaterThan(0);
    expect(existingEnrollments.length).toBeGreaterThan(0);
    expect(existingCurriculum.length).toBeGreaterThan(0);
    expect(existingStats.length).toBeGreaterThan(0);
    expect(existingActivities.length).toBeGreaterThan(0);

    // Verify stats integrity
    for (const stat of existingStats) {
      expect(stat.studentId).toBeDefined();
      expect(stat.totalXp).toBeGreaterThanOrEqual(0);
      expect(stat.currentStreak).toBeGreaterThanOrEqual(0);
    }
  });

  // ==========================================================================
  // Test 6 — Nullable program on canonical content
  // ==========================================================================
  it('Test 6 — allows persisting global canonical content with program_id = NULL', async () => {
    const uniqueSlug = `global-canonical-item-${Date.now()}`;
    const [globalItem] = await db
      .insert(schema.contentItems)
      .values({
        programId: null,
        title: 'Global Engineering Practices',
        slug: uniqueSlug,
        contentType: 'notes',
        description: 'Truly global cross-program resource without parent program requirement',
        isPublished: true
      })
      .returning();

    createdContentItemIds.push(globalItem.id);

    expect(globalItem.id).toBeDefined();
    expect(globalItem.programId).toBeNull();
    expect(globalItem.slug).toBe(uniqueSlug);
    expect(globalItem.contentType).toBe('notes');
  });

  it('Test 6b — preserves canonical content and sets program_id = NULL when parent program is deleted (ON DELETE SET NULL)', async () => {
    // Create a temporary program
    const [tempProg] = await db
      .insert(schema.programs)
      .values({
        name: `Temp Program for Deletion ${Date.now()}`,
        code: `TMP_DEL_${Date.now().toString().slice(-6)}`,
        collegeId: testCollegeId,
        status: 'draft'
      })
      .returning();

    // Create a content item assigned to that program
    const uniqueSlug = `content-temp-prog-${Date.now()}`;
    const [contentItem] = await db
      .insert(schema.contentItems)
      .values({
        programId: tempProg.id,
        title: 'Program-Scoped Content Item',
        slug: uniqueSlug,
        contentType: 'lecture',
        description: 'Should survive program deletion with programId becoming null',
        isPublished: true
      })
      .returning();

    createdContentItemIds.push(contentItem.id);

    expect(contentItem.programId).toBe(tempProg.id);

    // Delete the program
    await db.delete(schema.programs).where(eq(schema.programs.id, tempProg.id));

    // Content item must still exist and have programId set to NULL
    const [persistedItem] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, contentItem.id));

    expect(persistedItem).toBeDefined();
    expect(persistedItem.id).toBe(contentItem.id);
    expect(persistedItem.programId).toBeNull();
  });

  // ==========================================================================
  // Test 7 — Batch lifecycle status
  // ==========================================================================
  it('Test 7 — verifies batches have status column defaulting to active and supporting lifecycle statuses', async () => {
    // 1. Existing batches must have status populated
    const batches = await db.select().from(schema.batches).limit(10);
    expect(batches.length).toBeGreaterThan(0);
    for (const b of batches) {
      expect(typeof b.status).toBe('string');
      expect(b.status.length).toBeGreaterThan(0);
    }

    // 2. Default value on newly inserted batch without specifying status
    const [defaultBatch] = await db
      .insert(schema.batches)
      .values({
        programId: testProgram1Id,
        collegeId: testCollegeId,
        name: `Default Status Batch ${Date.now()}`
      })
      .returning();

    expect(defaultBatch.status).toBe('active');

    // 3. Supported lifecycle statuses: draft, active, completed, archived
    const lifecycleStatuses = ['draft', 'active', 'completed', 'archived'];
    for (const st of lifecycleStatuses) {
      const [updated] = await db
        .update(schema.batches)
        .set({ status: st })
        .where(eq(schema.batches.id, defaultBatch.id))
        .returning();
      expect(updated.status).toBe(st);
    }
  });

  // ==========================================================================
  // Test 8 — Curriculum required flag
  // ==========================================================================
  it('Test 8 — verifies batch_curriculum.is_required defaults to true and distinguishes mandatory vs optional', async () => {
    // 1. Insert a curriculum item without specifying isRequired -> defaults to true
    const [existingContent] = await db
      .insert(schema.contentItems)
      .values({
        programId: testProgram1Id,
        title: 'T8 fixture lecture',
        slug: `t8-fixture-${Date.now()}`,
        contentType: 'notes',
        isPublished: true
      })
      .returning();
    createdContentItemIds.push(existingContent.id);

    const [defaultCurriculum] = await db
      .insert(schema.batchCurriculum)
      .values({
        batchId: testBatchAId,
        contentItemId: existingContent.id,
        weekNumber: 99
      })
      .returning();

    expect(defaultCurriculum.isRequired).toBe(true);

    // 2. Update to optional (is_required = false)
    const [optionalCurriculum] = await db
      .update(schema.batchCurriculum)
      .set({ isRequired: false })
      .where(eq(schema.batchCurriculum.id, defaultCurriculum.id))
      .returning();

    expect(optionalCurriculum.isRequired).toBe(false);

    // Clean up temporary curriculum record
    await db.delete(schema.batchCurriculum).where(eq(schema.batchCurriculum.id, defaultCurriculum.id));
  });

  // ==========================================================================
  // Test 9 — Activity batch aggregation index
  // ==========================================================================
  it('Test 9 — verifies activity_batch_xp_idx index exists on activities table', async () => {
    const indexQuery = await db.execute(
      sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'activities' AND indexname = 'activity_batch_xp_idx'`
    );

    expect(indexQuery.rows.length).toBe(1);
    const indexRow = indexQuery.rows[0] as { indexname: string; indexdef: string };
    expect(indexRow.indexname).toBe('activity_batch_xp_idx');
    expect(indexRow.indexdef).toContain('activities');
    expect(indexRow.indexdef).toContain('batch_id');
    expect(indexRow.indexdef).toContain('student_id');
    expect(indexRow.indexdef).toContain('activity_date_ist');
  });

  // ==========================================================================
  // Extended Test — Enrollment status enum extension
  // ==========================================================================
  it('Extended — verifies enrollment status supports revoked and suspended', async () => {
    // Test that 'revoked' and 'suspended' can be persisted without DB error
    const [revokedEnrollment] = await db
      .insert(schema.enrollments)
      .values({
        studentId: testStudent1Id,
        programId: testProgram2Id,
        batchId: testBatchAId,
        status: 'revoked'
      })
      .returning();

    expect(revokedEnrollment.status).toBe('revoked');

    const [suspendedEnrollment] = await db
      .update(schema.enrollments)
      .set({ status: 'suspended' })
      .where(eq(schema.enrollments.id, revokedEnrollment.id))
      .returning();

    expect(suspendedEnrollment.status).toBe('suspended');
  });
});
