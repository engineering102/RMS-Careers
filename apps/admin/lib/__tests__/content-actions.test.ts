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

const mockGetContentItemById = vi.fn();
const mockCreateContentItem = vi.fn();
const mockUpdateContentItem = vi.fn();
const mockUpdateContentLifecycle = vi.fn();
const mockGetProgramById = vi.fn();

vi.mock('@/lib/db/queries', () => ({
  getContentItemById: (...args: any[]) => mockGetContentItemById(...args),
  createContentItem: (...args: any[]) => mockCreateContentItem(...args),
  updateContentItem: (...args: any[]) => mockUpdateContentItem(...args),
  updateContentLifecycle: (...args: any[]) => mockUpdateContentLifecycle(...args),
  getProgramById: (...args: any[]) => mockGetProgramById(...args)
}));

import {
  createContentAction,
  updateContentAction,
  updateContentLifecycleAction
} from '../../app/(admin)/content/actions';

describe('Admin Content Library Server Actions', () => {
  const adminSession = {
    user: { id: 'admin-uuid', email: 'admin@rmscareers.com', role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // =========================================================================
  // Authentication & Authorization Guards
  // =========================================================================
  describe('Authorization Guards', () => {
    it('rejects createContentAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await createContentAction({
        title: 'Unauthorized Item',
        contentType: 'lecture'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockCreateContentItem).not.toHaveBeenCalled();
    });

    it('rejects updateContentAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await updateContentAction('550e8400-e29b-41d4-a716-446655440000', {
        title: 'Unauthorized Update'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockUpdateContentItem).not.toHaveBeenCalled();
    });

    it('rejects updateContentLifecycleAction when unauthenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const res = await updateContentLifecycleAction(
        '550e8400-e29b-41d4-a716-446655440000',
        'publish'
      );

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/unauthorized/i);
      }
      expect(mockUpdateContentLifecycle).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // createContentAction
  // =========================================================================
  describe('createContentAction', () => {
    it('creates global content item successfully with default draft state', async () => {
      mockCreateContentItem.mockResolvedValue({
        id: 'mock-content-1',
        title: 'System Architecture Fundamentals',
        slug: 'system-architecture-fundamentals',
        contentType: 'lecture',
        description: 'Core concepts of high scale distributed systems',
        programId: null,
        programName: null,
        programCode: null,
        isPublished: false,
        metadata: { topic: 'Architecture' },
        lifecycleStatus: 'draft',
        batchUsageCount: 0
      });

      const res = await createContentAction({
        title: 'System Architecture Fundamentals',
        contentType: 'lecture',
        description: 'Core concepts of high scale distributed systems',
        programId: 'global',
        topic: 'Architecture'
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.item.id).toBe('mock-content-1');
        expect(res.item.programId).toBeNull();
        expect(res.item.isPublished).toBe(false);
      }

      expect(mockCreateContentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'System Architecture Fundamentals',
          contentType: 'lecture',
          programId: null,
          isPublished: false,
          metadata: expect.objectContaining({ topic: 'Architecture' })
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/content');
    });

    it('creates program-scoped content item when valid programId is provided', async () => {
      mockGetProgramById.mockResolvedValue({ id: 101, name: 'Full Stack Track', code: 'FSD_01' });
      mockCreateContentItem.mockResolvedValue({
        id: 'mock-content-2',
        title: 'React Server Components Deep Dive',
        slug: 'react-server-components-deep-dive',
        contentType: 'notes',
        programId: 101,
        programName: 'Full Stack Track',
        programCode: 'FSD_01',
        isPublished: true,
        lifecycleStatus: 'published',
        batchUsageCount: 0
      });

      const res = await createContentAction({
        title: 'React Server Components Deep Dive',
        contentType: 'notes',
        programId: 101,
        isPublished: true
      });

      expect(res.success).toBe(true);
      expect(mockGetProgramById).toHaveBeenCalledWith(101);
      expect(mockCreateContentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'React Server Components Deep Dive',
          programId: 101,
          isPublished: true
        })
      );
    });

    it('rejects creation when referenced programId does not exist', async () => {
      mockGetProgramById.mockResolvedValue(null);

      const res = await createContentAction({
        title: 'Algorithms Track',
        contentType: 'lecture',
        programId: 9999
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/program does not exist/i);
      }
      expect(mockCreateContentItem).not.toHaveBeenCalled();
    });

    it('fails validation on empty title or invalid content type', async () => {
      const res = await createContentAction({
        title: ' ',
        contentType: 'invalid_type' as any
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeDefined();
      }
      expect(mockCreateContentItem).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateContentAction
  // =========================================================================
  describe('updateContentAction', () => {
    it('updates content item in-place preserving primary key ID', async () => {
      const contentId = '550e8400-e29b-41d4-a716-446655440000';
      mockGetContentItemById.mockResolvedValue({
        id: contentId,
        title: 'Old Title',
        programId: null
      });

      mockUpdateContentItem.mockResolvedValue({
        id: contentId,
        title: 'Updated Title',
        slug: 'updated-title',
        contentType: 'lecture',
        programId: null,
        isPublished: false,
        lifecycleStatus: 'draft'
      });

      const res = await updateContentAction(contentId, {
        title: 'Updated Title'
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.item.id).toBe(contentId);
        expect(res.item.title).toBe('Updated Title');
      }

      expect(mockUpdateContentItem).toHaveBeenCalledWith(
        contentId,
        expect.objectContaining({
          title: 'Updated Title'
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/content');
    });

    it('rejects update when content item does not exist', async () => {
      mockGetContentItemById.mockResolvedValue(null);

      const res = await updateContentAction('550e8400-e29b-41d4-a716-446655440000', {
        title: 'Non-existent Item'
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/does not exist/i);
      }
      expect(mockUpdateContentItem).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateContentLifecycleAction
  // =========================================================================
  describe('updateContentLifecycleAction', () => {
    it('transitions content to published state', async () => {
      const contentId = '550e8400-e29b-41d4-a716-446655440000';
      mockGetContentItemById.mockResolvedValue({ id: contentId, isPublished: false });
      mockUpdateContentLifecycle.mockResolvedValue({
        id: contentId,
        isPublished: true,
        lifecycleStatus: 'published'
      });

      const res = await updateContentLifecycleAction(contentId, 'publish');

      expect(res.success).toBe(true);
      expect(mockUpdateContentLifecycle).toHaveBeenCalledWith(contentId, 'publish');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/content');
    });

    it('transitions content to archived state', async () => {
      const contentId = '550e8400-e29b-41d4-a716-446655440000';
      mockGetContentItemById.mockResolvedValue({ id: contentId, isPublished: true });
      mockUpdateContentLifecycle.mockResolvedValue({
        id: contentId,
        isPublished: false,
        lifecycleStatus: 'archived'
      });

      const res = await updateContentLifecycleAction(contentId, 'archive');

      expect(res.success).toBe(true);
      expect(mockUpdateContentLifecycle).toHaveBeenCalledWith(contentId, 'archive');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/content');
    });
  });
});
