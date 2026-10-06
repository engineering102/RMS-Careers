import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth()
}));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args)
}));

const mockGetBatchById = vi.fn();
const mockGetContentItemById = vi.fn();
const mockGetCurriculumPlacementById = vi.fn();
const mockAddContentToBatch = vi.fn();
const mockUpdateCurriculumPlacement = vi.fn();
const mockRemoveCurriculumPlacement = vi.fn();
const mockReorderCurriculumPlacements = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getBatchById: (...args: any[]) => mockGetBatchById(...args),
  getContentItemById: (...args: any[]) => mockGetContentItemById(...args),
  getCurriculumPlacementById: (...args: any[]) => mockGetCurriculumPlacementById(...args),
  addContentToBatch: (...args: any[]) => mockAddContentToBatch(...args),
  updateCurriculumPlacement: (...args: any[]) => mockUpdateCurriculumPlacement(...args),
  removeCurriculumPlacement: (...args: any[]) => mockRemoveCurriculumPlacement(...args),
  reorderCurriculumPlacements: (...args: any[]) => mockReorderCurriculumPlacements(...args)
}));

import {
  addContentToBatchAction,
  updatePlacementAction,
  removePlacementAction,
  reorderCurriculumAction
} from '../../app/(admin)/batches/[batchId]/curriculum/actions';

describe('Admin Batch Curriculum Builder Server Actions', () => {
  const adminSession = {
    user: { id: 'admin-uuid', email: 'admin@rmscareers.com', role: 'admin' }
  };

  const activeBatch = {
    id: 'batch-active-1',
    name: 'Full Stack Cohort Alpha',
    programId: 10,
    collegeId: 'college-1',
    status: 'active'
  };

  const completedBatch = {
    id: 'batch-completed-1',
    name: 'Completed Cohort 2025',
    programId: 10,
    collegeId: 'college-1',
    status: 'completed'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
    mockGetBatchById.mockResolvedValue(activeBatch);
  });

  // =========================================================================
  // Authorization Guards
  // =========================================================================
  describe('Authorization Guards', () => {
    it('rejects addContentToBatchAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });

    it('rejects removePlacementAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await removePlacementAction('batch-active-1', 42);

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockRemoveCurriculumPlacement).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Batch Lifecycle & Mutability
  // =========================================================================
  describe('Batch Lifecycle & Mutability', () => {
    it('rejects adding content when batch is completed', async () => {
      mockGetBatchById.mockResolvedValue(completedBatch);

      const res = await addContentToBatchAction('batch-completed-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/cannot modify curriculum for a completed batch/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });

    it('rejects removing placement when batch is completed', async () => {
      mockGetBatchById.mockResolvedValue(completedBatch);

      const res = await removePlacementAction('batch-completed-1', 42);

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/cannot modify curriculum for a completed batch/i);
      }
      expect(mockRemoveCurriculumPlacement).not.toHaveBeenCalled();
    });

    it('rejects when batch does not exist', async () => {
      mockGetBatchById.mockResolvedValue(null);

      const res = await addContentToBatchAction('batch-nonexistent', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/batch not found/i);
      }
    });
  });

  // =========================================================================
  // Content Eligibility & Scope Guards
  // =========================================================================
  describe('Content Eligibility & Scope', () => {
    it('rejects draft content items from being placed', async () => {
      mockGetContentItemById.mockResolvedValue({
        id: 'content-draft-1',
        title: 'Draft React Lecture',
        programId: 10,
        isPublished: false,
        lifecycleStatus: 'draft'
      });

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/draft content items cannot be placed/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });

    it('rejects archived content items from being newly placed', async () => {
      mockGetContentItemById.mockResolvedValue({
        id: 'content-archived-1',
        title: 'Archived Notes',
        programId: 10,
        isPublished: false,
        lifecycleStatus: 'archived'
      });

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/draft content items cannot be placed|archived content items cannot be newly placed/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });

    it('rejects content belonging to a different program', async () => {
      // Content belongs to program 99, but batch belongs to program 10
      mockGetContentItemById.mockResolvedValue({
        id: 'content-mismatched',
        title: 'Data Science Only Lecture',
        programId: 99,
        isPublished: true,
        lifecycleStatus: 'published'
      });

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/belongs to another program/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });

    it('accepts global published content (program_id IS NULL)', async () => {
      mockGetContentItemById.mockResolvedValue({
        id: 'content-global-1',
        title: 'Git Version Control',
        programId: null,
        isPublished: true,
        lifecycleStatus: 'published'
      });

      mockAddContentToBatch.mockResolvedValue({
        id: 101,
        batchId: 'batch-active-1',
        contentItemId: 'content-global-1',
        weekNumber: 1,
        sequenceOrder: 1,
        isRequired: true
      });

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1,
        isRequired: true
      });

      expect(res.success).toBe(true);
      expect(mockAddContentToBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'batch-active-1',
          contentItemId: '550e8400-e29b-41d4-a716-446655440000',
          weekNumber: 1,
          isRequired: true
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/batch-active-1/curriculum');
    });

    it('accepts program-scoped published content when program matches batch.programId', async () => {
      mockGetContentItemById.mockResolvedValue({
        id: 'content-prog-1',
        title: 'React Server Components',
        programId: 10,
        isPublished: true,
        lifecycleStatus: 'published'
      });

      mockAddContentToBatch.mockResolvedValue({
        id: 102,
        batchId: 'batch-active-1',
        contentItemId: 'content-prog-1',
        weekNumber: 2,
        sequenceOrder: 1,
        isRequired: true
      });

      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 2
      });

      expect(res.success).toBe(true);
      expect(mockAddContentToBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'batch-active-1',
          weekNumber: 2
        })
      );
    });
  });

  // =========================================================================
  // Date Refinement Validation
  // =========================================================================
  describe('Date Validation', () => {
    it('rejects placement when due date precedes available date', async () => {
      const res = await addContentToBatchAction('batch-active-1', {
        contentItemId: '550e8400-e29b-41d4-a716-446655440000',
        weekNumber: 1,
        availableFrom: '2026-10-15T00:00:00.000Z',
        dueAt: '2026-10-10T00:00:00.000Z' // Prior to availableFrom
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/due date must not precede available date/i);
      }
      expect(mockAddContentToBatch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Removal & Reorder Actions
  // =========================================================================
  describe('Removal and Reorder', () => {
    it('removes placement successfully and revalidates path', async () => {
      mockGetCurriculumPlacementById.mockResolvedValue({
        id: 42,
        batchId: 'batch-active-1',
        title: 'Item to Remove'
      });
      mockRemoveCurriculumPlacement.mockResolvedValue(true);

      const res = await removePlacementAction('batch-active-1', 42);

      expect(res.success).toBe(true);
      expect(mockRemoveCurriculumPlacement).toHaveBeenCalledWith(42);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/batch-active-1/curriculum');
    });

    it('rejects removal when placement belongs to another batch', async () => {
      mockGetCurriculumPlacementById.mockResolvedValue({
        id: 42,
        batchId: 'batch-other-2',
        title: 'Item on Other Batch'
      });

      const res = await removePlacementAction('batch-active-1', 42);

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/does not belong to this batch/i);
      }
      expect(mockRemoveCurriculumPlacement).not.toHaveBeenCalled();
    });

    it('reorders placements successfully', async () => {
      const updates = [
        { placementId: 1, weekNumber: 1, sequenceOrder: 2 },
        { placementId: 2, weekNumber: 1, sequenceOrder: 1 }
      ];

      mockReorderCurriculumPlacements.mockResolvedValue([
        { id: 2, sequenceOrder: 1 },
        { id: 1, sequenceOrder: 2 }
      ]);

      const res = await reorderCurriculumAction('batch-active-1', updates);

      expect(res.success).toBe(true);
      expect(mockReorderCurriculumPlacements).toHaveBeenCalledWith('batch-active-1', updates);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/batches/batch-active-1/curriculum');
    });
  });
});
