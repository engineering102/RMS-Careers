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

// Mock auth so we can simulate authenticated admin
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

import {
  db,
  colleges,
  programs,
  batches,
  batchCurriculum,
  contentItems,
  students,
  activities
} from '@rms/db';
import { eq, inArray, sql, and } from 'drizzle-orm';
import {
  getBatchCurriculum,
  getEligibleContentForBatch,
  getCurriculumPlacementById,
  addContentToBatch,
  updateCurriculumPlacement,
  removeCurriculumPlacement,
  reorderCurriculumPlacements
} from '../db/queries/curriculum';
import {
  addContentToBatchAction,
  updatePlacementAction,
  removePlacementAction,
  reorderCurriculumAction
} from '../../app/(admin)/batches/[batchId]/curriculum/actions';

describe('Phase 2 — Slice B2: Batch Curriculum Builder & Placement Workbench', { timeout: 30000 }, () => {
  const adminSession = {
    user: { id: 'admin-uuid-b2', email: 'admin@rmscareers.com', role: 'admin' }
  };

  let collegeId: string;
  let fullStackProgramId: number;
  let dsaProgramId: number;
  let batchAId: string;
  let batchBId: string;
  let completedBatchId: string;

  // Canonical content IDs
  let globalPublishedContentId: string;
  let fullStackPublishedContentId: string;
  let dsaPublishedContentId: string;
  let fullStackDraftContentId: string;
  let fullStackArchivedContentId: string;

  // Tracking for cleanup
  const createdContentIds: string[] = [];
  const createdBatchIds: string[] = [];
  const createdStudentIds: number[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. College
    const [c] = await db
      .insert(colleges)
      .values({
        name: `B2 College ${timestamp}`,
        code: `B2C_${timestamp.toString().slice(-5)}`,
        city: 'Hyderabad',
        state: 'Telangana'
      })
      .returning();
    collegeId = c.id;

    // 2. Programs: Full Stack & DSA
    const [p1] = await db
      .insert(programs)
      .values({
        name: `B2 Full Stack Development ${timestamp}`,
        code: `B2_FSD_${timestamp.toString().slice(-5)}`,
        collegeId,
        status: 'active'
      })
      .returning();
    fullStackProgramId = p1.id;

    const [p2] = await db
      .insert(programs)
      .values({
        name: `B2 Data Structures & Algorithms ${timestamp}`,
        code: `B2_DSA_${timestamp.toString().slice(-5)}`,
        collegeId,
        status: 'active'
      })
      .returning();
    dsaProgramId = p2.id;

    // 3. Batches: Batch A (active), Batch B (active), Batch Completed (completed)
    const [b1] = await db
      .insert(batches)
      .values({
        name: `Alpha Full Stack ${timestamp}`,
        collegeId,
        programId: fullStackProgramId,
        status: 'active'
      })
      .returning();
    batchAId = b1.id;
    createdBatchIds.push(b1.id);

    const [b2] = await db
      .insert(batches)
      .values({
        name: `Beta Full Stack ${timestamp}`,
        collegeId,
        programId: fullStackProgramId,
        status: 'active'
      })
      .returning();
    batchBId = b2.id;
    createdBatchIds.push(b2.id);

    const [b3] = await db
      .insert(batches)
      .values({
        name: `Historical Full Stack ${timestamp}`,
        collegeId,
        programId: fullStackProgramId,
        status: 'completed'
      })
      .returning();
    completedBatchId = b3.id;
    createdBatchIds.push(b3.id);

    // 4. Content Items:
    // Content 1: Global Published "Git Basics"
    const [ci1] = await db
      .insert(contentItems)
      .values({
        title: `Git Basics ${timestamp}`,
        slug: `git-basics-${timestamp}`,
        contentType: 'notes',
        programId: null, // Global
        isPublished: true
      })
      .returning();
    globalPublishedContentId = ci1.id;
    createdContentIds.push(ci1.id);

    // Content 2: Full Stack Published "React Hooks"
    const [ci2] = await db
      .insert(contentItems)
      .values({
        title: `React Hooks Deep Dive ${timestamp}`,
        slug: `react-hooks-${timestamp}`,
        contentType: 'lecture',
        programId: fullStackProgramId,
        isPublished: true
      })
      .returning();
    fullStackPublishedContentId = ci2.id;
    createdContentIds.push(ci2.id);

    // Content 3: DSA Published "Graph Algorithms"
    const [ci3] = await db
      .insert(contentItems)
      .values({
        title: `Graph Algorithms ${timestamp}`,
        slug: `graph-algorithms-${timestamp}`,
        contentType: 'lecture',
        programId: dsaProgramId,
        isPublished: true
      })
      .returning();
    dsaPublishedContentId = ci3.id;
    createdContentIds.push(ci3.id);

    // Content 4: Full Stack Draft "Advanced React"
    const [ci4] = await db
      .insert(contentItems)
      .values({
        title: `Advanced React Patterns ${timestamp}`,
        slug: `advanced-react-${timestamp}`,
        contentType: 'lecture',
        programId: fullStackProgramId,
        isPublished: false // Draft
      })
      .returning();
    fullStackDraftContentId = ci4.id;
    createdContentIds.push(ci4.id);

    // Content 5: Full Stack Archived
    const [ci5] = await db
      .insert(contentItems)
      .values({
        title: `Legacy Redux Notes ${timestamp}`,
        slug: `legacy-redux-${timestamp}`,
        contentType: 'notes',
        programId: fullStackProgramId,
        isPublished: false,
        metadata: { isArchived: true, archivedAt: new Date().toISOString() }
      })
      .returning();
    fullStackArchivedContentId = ci5.id;
    createdContentIds.push(ci5.id);
  });

  afterAll(async () => {
    try {
      if (createdBatchIds.length > 0) {
        await db
          .delete(batchCurriculum)
          .where(inArray(batchCurriculum.batchId, createdBatchIds));
      }

      if (createdContentIds.length > 0) {
        await db
          .delete(contentItems)
          .where(inArray(contentItems.id, createdContentIds));
      }

      if (createdStudentIds.length > 0) {
        await db.delete(activities).where(inArray(activities.studentId, createdStudentIds));
        await db.delete(students).where(inArray(students.id, createdStudentIds));
      }

      if (createdBatchIds.length > 0) {
        await db.delete(batches).where(inArray(batches.id, createdBatchIds));
      }

      if (fullStackProgramId || dsaProgramId) {
        await db
          .delete(programs)
          .where(inArray(programs.id, [fullStackProgramId, dsaProgramId]));
      }

      if (collegeId) {
        await db.delete(colleges).where(eq(colleges.id, collegeId));
      }
    } catch (err) {
      console.warn('Cleanup warning in afterAll:', err);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // =========================================================================
  // Scenarios B & C: Adding Global & Program-Specific Content to Batch A
  // =========================================================================
  it('adds global published content and program-specific published content to Batch A', async () => {
    // 1. Add Global Content (Git Basics) to Batch A Week 1
    const resGlobal = await addContentToBatchAction(batchAId, {
      contentItemId: globalPublishedContentId,
      weekNumber: 1,
      isRequired: true
    });

    expect(resGlobal.success).toBe(true);
    if (!resGlobal.success) return;

    expect(resGlobal.placement.batchId).toBe(batchAId);
    expect(resGlobal.placement.contentItemId).toBe(globalPublishedContentId);
    expect(resGlobal.placement.weekNumber).toBe(1);
    expect(resGlobal.placement.sequenceOrder).toBe(1);
    expect(resGlobal.placement.isRequired).toBe(true);
    expect(resGlobal.placement.isGlobal).toBe(true);

    // 2. Add Program Content (React Hooks) to Batch A Week 1
    const resProg = await addContentToBatchAction(batchAId, {
      contentItemId: fullStackPublishedContentId,
      weekNumber: 1,
      isRequired: true
    });

    expect(resProg.success).toBe(true);
    if (!resProg.success) return;

    expect(resProg.placement.batchId).toBe(batchAId);
    expect(resProg.placement.contentItemId).toBe(fullStackPublishedContentId);
    expect(resProg.placement.weekNumber).toBe(1);
    expect(resProg.placement.sequenceOrder).toBe(2);
    expect(resProg.placement.isGlobal).toBe(false);

    // Verify curriculum for Batch A now has 2 items
    const curriculumA = await getBatchCurriculum(batchAId);
    expect(curriculumA).toHaveLength(2);
    expect(curriculumA[0].sequenceOrder).toBe(1);
    expect(curriculumA[1].sequenceOrder).toBe(2);
  });

  // =========================================================================
  // Scenario H: Same Content placed into Batch B without duplication
  // =========================================================================
  it('H — places the exact same canonical content items into Batch B independently', async () => {
    // 1. Add Git Basics to Batch B Week 1
    const resGlobalB = await addContentToBatchAction(batchBId, {
      contentItemId: globalPublishedContentId,
      weekNumber: 1,
      isRequired: true
    });
    expect(resGlobalB.success).toBe(true);

    // 2. Add React Hooks to Batch B Week 2
    const resProgB = await addContentToBatchAction(batchBId, {
      contentItemId: fullStackPublishedContentId,
      weekNumber: 2,
      isRequired: false // Optional in Batch B
    });
    expect(resProgB.success).toBe(true);
    if (!resProgB.success) return;

    expect(resProgB.placement.weekNumber).toBe(2);
    expect(resProgB.placement.isRequired).toBe(false);

    // Verify both batches reference the exact same canonical content items
    const curriculumA = await getBatchCurriculum(batchAId);
    const curriculumB = await getBatchCurriculum(batchBId);

    const aContentIds = curriculumA.map((x) => x.contentItemId);
    const bContentIds = curriculumB.map((x) => x.contentItemId);

    expect(aContentIds).toContain(globalPublishedContentId);
    expect(bContentIds).toContain(globalPublishedContentId);
    expect(aContentIds).toContain(fullStackPublishedContentId);
    expect(bContentIds).toContain(fullStackPublishedContentId);

    // Verify canonical content count in DB remains exactly 1 for Git Basics
    const gitBasicsRows = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, globalPublishedContentId));
    expect(gitBasicsRows).toHaveLength(1);
  });

  // =========================================================================
  // Scenario D: Wrong Program Content Rejected Server-Side
  // =========================================================================
  it('D — rejects content belonging to a different program (DSA content in Full Stack batch)', async () => {
    const res = await addContentToBatchAction(batchAId, {
      contentItemId: dsaPublishedContentId,
      weekNumber: 1
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/belongs to another program/i);
    }
  });

  // =========================================================================
  // Scenarios E & F: Draft & Archived Content Rejected
  // =========================================================================
  it('E & F — rejects draft content and archived content from being newly placed', async () => {
    // Draft item
    const resDraft = await addContentToBatchAction(batchAId, {
      contentItemId: fullStackDraftContentId,
      weekNumber: 1
    });
    expect(resDraft.success).toBe(false);
    if (!resDraft.success) {
      expect(resDraft.error).toMatch(/draft content items cannot be placed/i);
    }

    // Archived item
    const resArchived = await addContentToBatchAction(batchAId, {
      contentItemId: fullStackArchivedContentId,
      weekNumber: 1
    });
    expect(resArchived.success).toBe(false);
    if (!resArchived.success) {
      expect(resArchived.error).toMatch(/archived content items cannot be newly placed/i);
    }
  });

  // =========================================================================
  // Scenario G: Duplicate Placement Prevention
  // =========================================================================
  it('G — prevents duplicate placement of the same content item in the same batch', async () => {
    // Git Basics is already placed in Batch A
    const resDup = await addContentToBatchAction(batchAId, {
      contentItemId: globalPublishedContentId,
      weekNumber: 3
    });

    expect(resDup.success).toBe(false);
    if (!resDup.success) {
      expect(resDup.error).toMatch(/already placed in this batch/i);
    }
  });

  // =========================================================================
  // Scenario I & J: Required/Optional and Sequence/Week Updates
  // =========================================================================
  it('I & J — updates week number, sequence, and required flag on a placement in-place', async () => {
    const curriculumA = await getBatchCurriculum(batchAId);
    const gitPlacement = curriculumA.find((x) => x.contentItemId === globalPublishedContentId)!;

    const resUpdate = await updatePlacementAction(batchAId, gitPlacement.id, {
      weekNumber: 3,
      sequenceOrder: 5,
      isRequired: false
    });

    expect(resUpdate.success).toBe(true);
    if (!resUpdate.success) return;

    expect(resUpdate.placement.id).toBe(gitPlacement.id);
    expect(resUpdate.placement.weekNumber).toBe(3);
    expect(resUpdate.placement.sequenceOrder).toBe(5);
    expect(resUpdate.placement.isRequired).toBe(false);
  });

  // =========================================================================
  // Scenario R: Reordering Within a Week
  // =========================================================================
  it('R — reorders curriculum placements deterministically within a batch', async () => {
    // Reset placements to Week 1 with known order
    const curriculumA = await getBatchCurriculum(batchAId);
    const p1 = curriculumA[0];
    const p2 = curriculumA[1];

    const updates = [
      { placementId: p1.id, weekNumber: 1, sequenceOrder: 2 },
      { placementId: p2.id, weekNumber: 1, sequenceOrder: 1 }
    ];

    const res = await reorderCurriculumAction(batchAId, updates);
    expect(res.success).toBe(true);

    const reorderedCurriculum = await getBatchCurriculum(batchAId);
    const updatedP2 = reorderedCurriculum.find((x) => x.id === p2.id);
    const updatedP1 = reorderedCurriculum.find((x) => x.id === p1.id);

    expect(updatedP2?.sequenceOrder).toBe(1);
    expect(updatedP1?.sequenceOrder).toBe(2);
  });

  // =========================================================================
  // Scenario O: Completed Batch Mutability Guard
  // =========================================================================
  it('O — rejects curriculum mutation on a completed batch', async () => {
    const res = await addContentToBatchAction(completedBatchId, {
      contentItemId: globalPublishedContentId,
      weekNumber: 1
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/cannot modify curriculum for a completed batch/i);
    }
  });

  // =========================================================================
  // Scenarios L, M & N: Removing Placement Preserves Canonical Content & Progress
  // =========================================================================
  it('L, M & N — removing placement from Batch A preserves canonical content, Batch B placement, and student progress', async () => {
    // 1. Create a test student and simulate an activity record for Git Basics
    const timestamp = Date.now();
    const [testStudent] = await db
      .insert(students)
      .values({
        fullName: `Test Student ${timestamp}`,
        email: `student_b2_${timestamp}@example.com`,
        collegeId
      })
      .returning();
    createdStudentIds.push(testStudent.id);

    const [activityRecord] = await db
      .insert(activities)
      .values({
        studentId: testStudent.id,
        batchId: batchAId,
        activityType: 'lecture_completed',
        referenceId: globalPublishedContentId,
        xpAwarded: 50,
        activityDateIst: '2026-10-06'
      })
      .returning();

    // 2. Get placement of Git Basics on Batch A
    const curriculumA = await getBatchCurriculum(batchAId);
    const gitPlacementA = curriculumA.find((x) => x.contentItemId === globalPublishedContentId)!;

    // 3. Remove placement from Batch A
    const removeRes = await removePlacementAction(batchAId, gitPlacementA.id);
    expect(removeRes.success).toBe(true);

    // 4. Verify Batch A no longer has Git Basics
    const updatedCurriculumA = await getBatchCurriculum(batchAId);
    expect(updatedCurriculumA.some((x) => x.contentItemId === globalPublishedContentId)).toBe(false);

    // 5. Verify Batch B STILL has Git Basics (Batch B placement unaffected)
    const curriculumB = await getBatchCurriculum(batchBId);
    expect(curriculumB.some((x) => x.contentItemId === globalPublishedContentId)).toBe(true);

    // 6. Verify canonical Git Basics content item STILL exists in DB
    const [persistedCanonical] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, globalPublishedContentId));
    expect(persistedCanonical).toBeDefined();
    expect(persistedCanonical.id).toBe(globalPublishedContentId);

    // 7. Verify student activity / progress STILL exists in DB
    const [persistedActivity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityRecord.id));
    expect(persistedActivity).toBeDefined();
    expect(persistedActivity.id).toBe(activityRecord.id);
    expect(persistedActivity.referenceId).toBe(globalPublishedContentId);
  });
});
