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
  contentItems
} from '@rms/db';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  getContentItemsWithDetails,
  getContentItemById,
  createContentItem,
  updateContentItem,
  updateContentLifecycle,
  isSlugAvailable
} from '../db/queries/content';
import {
  createContentAction,
  updateContentAction,
  updateContentLifecycleAction
} from '../../app/(admin)/content/actions';

describe('Phase 2 — Slice B1: Central Content Library Foundation', { timeout: 30000 }, () => {
  const adminSession = {
    user: { id: 'admin-uuid-b1', email: 'admin@rmscareers.com', role: 'admin' }
  };

  let testCollegeId: string;
  let testProgramId: number;
  let testBatchId: string;
  const createdContentIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create a college
    const [c] = await db
      .insert(colleges)
      .values({
        name: `B1 Test College ${timestamp}`,
        code: `B1C_${timestamp.toString().slice(-5)}`,
        city: 'Hyderabad',
        state: 'Telangana'
      })
      .returning();
    testCollegeId = c.id;

    // 2. Create a program
    const [p] = await db
      .insert(programs)
      .values({
        name: `B1 System Design Program ${timestamp}`,
        code: `B1P_${timestamp.toString().slice(-5)}`,
        collegeId: testCollegeId,
        status: 'active'
      })
      .returning();
    testProgramId = p.id;

    // 3. Create a batch
    const [b] = await db
      .insert(batches)
      .values({
        name: `B1 Cohort ${timestamp}`,
        collegeId: testCollegeId,
        programId: testProgramId,
        status: 'active'
      })
      .returning();
    testBatchId = b.id;
  });

  afterAll(async () => {
    try {
      if (createdContentIds.length > 0) {
        // Delete batch curriculum placements first
        await db
          .delete(batchCurriculum)
          .where(inArray(batchCurriculum.contentItemId, createdContentIds));

        // Delete content items
        await db
          .delete(contentItems)
          .where(inArray(contentItems.id, createdContentIds));
      }

      if (testBatchId) {
        await db.delete(batches).where(eq(batches.id, testBatchId));
      }

      if (testProgramId) {
        await db.delete(programs).where(eq(programs.id, testProgramId));
      }

      if (testCollegeId) {
        await db.delete(colleges).where(eq(colleges.id, testCollegeId));
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
  // Test A & E: Create Global Canonical Content Item
  // =========================================================================
  it('A & E — creates a globally reusable canonical content item (program_id IS NULL)', async () => {
    const timestamp = Date.now();
    const title = `Global Data Structures Primer ${timestamp}`;

    const res = await createContentAction({
      title,
      contentType: 'notes',
      description: 'Foundational array and linked list paradigms for all students',
      programId: 'global',
      topic: 'DSA Foundations',
      resourceLink: 'https://github.com/rms/dsa-notes'
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    createdContentIds.push(res.item.id);

    expect(res.item.id).toBeDefined();
    expect(res.item.title).toBe(title);
    expect(res.item.programId).toBeNull();
    expect(res.item.programName).toBeNull();
    expect(res.item.isPublished).toBe(false);
    expect(res.item.lifecycleStatus).toBe('draft');
    expect(res.item.metadata?.topic).toBe('DSA Foundations');
    expect(res.item.metadata?.resourceLink).toBe('https://github.com/rms/dsa-notes');
  });

  // =========================================================================
  // Test J: Create Program-Specific Content Item
  // =========================================================================
  it('J — creates a program-specific canonical content item linked to program_id', async () => {
    const timestamp = Date.now();
    const title = `Advanced Distributed Systems ${timestamp}`;

    const res = await createContentAction({
      title,
      contentType: 'lecture',
      programId: testProgramId,
      videoUrl: 'https://youtube.com/watch?v=rms_dist_sys',
      durationMinutes: 60,
      isPublished: true
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    createdContentIds.push(res.item.id);

    expect(res.item.programId).toBe(testProgramId);
    expect(res.item.programName).toContain('B1 System Design Program');
    expect(res.item.isPublished).toBe(true);
    expect(res.item.lifecycleStatus).toBe('published');
    expect(res.item.metadata?.videoUrl).toBe('https://youtube.com/watch?v=rms_dist_sys');
    expect(res.item.metadata?.durationMinutes).toBe(60);
  });

  // =========================================================================
  // Test F & M: In-Place Editing Preserving Canonical Content ID
  // =========================================================================
  it('F & M — updates canonical content item in-place preserving primary key ID', async () => {
    const timestamp = Date.now();
    const created = await createContentItem({
      title: `Original Title ${timestamp}`,
      contentType: 'lecture',
      programId: null
    });
    createdContentIds.push(created.id);

    const originalId = created.id;

    const updateRes = await updateContentAction(originalId, {
      title: `Refined In-Place Title ${timestamp}`,
      description: 'Updated comprehensive description',
      topic: 'Advanced Algorithms'
    });

    expect(updateRes.success).toBe(true);
    if (!updateRes.success) return;

    // Verify ID remains unchanged
    expect(updateRes.item.id).toBe(originalId);
    expect(updateRes.item.title).toBe(`Refined In-Place Title ${timestamp}`);
    expect(updateRes.item.description).toBe('Updated comprehensive description');
    expect(updateRes.item.metadata?.topic).toBe('Advanced Algorithms');

    // Confirm in database
    const directFetch = await getContentItemById(originalId);
    expect(directFetch?.id).toBe(originalId);
    expect(directFetch?.title).toBe(`Refined In-Place Title ${timestamp}`);
  });

  // =========================================================================
  // Test K: Publish / Unpublish / Archive Lifecycle Transitions
  // =========================================================================
  it('K — transitions between draft, published, and archived lifecycle states', async () => {
    const timestamp = Date.now();
    const item = await createContentItem({
      title: `Lifecycle Test Item ${timestamp}`,
      contentType: 'resource',
      isPublished: false
    });
    createdContentIds.push(item.id);

    // Initial state: Draft
    let fetched = await getContentItemById(item.id);
    expect(fetched?.isPublished).toBe(false);
    expect(fetched?.lifecycleStatus).toBe('draft');

    // 1. Publish
    const pubRes = await updateContentLifecycleAction(item.id, 'publish');
    expect(pubRes.success).toBe(true);
    fetched = await getContentItemById(item.id);
    expect(fetched?.isPublished).toBe(true);
    expect(fetched?.lifecycleStatus).toBe('published');

    // 2. Unpublish (revert to draft)
    const unpubRes = await updateContentLifecycleAction(item.id, 'unpublish');
    expect(unpubRes.success).toBe(true);
    fetched = await getContentItemById(item.id);
    expect(fetched?.isPublished).toBe(false);
    expect(fetched?.lifecycleStatus).toBe('draft');

    // 3. Archive
    const archRes = await updateContentLifecycleAction(item.id, 'archive');
    expect(archRes.success).toBe(true);
    fetched = await getContentItemById(item.id);
    expect(fetched?.isPublished).toBe(false);
    expect(fetched?.lifecycleStatus).toBe('archived');
    expect(fetched?.metadata?.isArchived).toBe(true);

    // 4. Unarchive (restore to draft)
    const unarchRes = await updateContentLifecycleAction(item.id, 'unarchive');
    expect(unarchRes.success).toBe(true);
    fetched = await getContentItemById(item.id);
    expect(fetched?.isPublished).toBe(false);
    expect(fetched?.lifecycleStatus).toBe('draft');
    expect(fetched?.metadata?.isArchived).toBe(false);
  });

  // =========================================================================
  // Test B: Search Filtering
  // =========================================================================
  it('B — searches content items by text keyword in title, slug, or description', async () => {
    const timestamp = Date.now();
    const uniqueKeyword = `UniqueKeyword${timestamp}`;

    const item = await createContentItem({
      title: `Special Topic: ${uniqueKeyword}`,
      contentType: 'notes',
      description: `Contains ${uniqueKeyword} in text body`
    });
    createdContentIds.push(item.id);

    const searchResults = await getContentItemsWithDetails({ search: uniqueKeyword });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults.some((ci) => ci.id === item.id)).toBe(true);
  });

  // =========================================================================
  // Test C & D: Program and Status Filtering
  // =========================================================================
  it('C & D — filters content items by program scope and lifecycle status', async () => {
    const timestamp = Date.now();
    const globalDraft = await createContentItem({
      title: `Global Draft ${timestamp}`,
      contentType: 'notes',
      programId: null,
      isPublished: false
    });
    const progPublished = await createContentItem({
      title: `Program Published ${timestamp}`,
      contentType: 'lecture',
      programId: testProgramId,
      isPublished: true
    });
    createdContentIds.push(globalDraft.id, progPublished.id);

    // Filter by global scope
    const globalOnly = await getContentItemsWithDetails({ programId: 'global' });
    expect(globalOnly.some((ci) => ci.id === globalDraft.id)).toBe(true);
    expect(globalOnly.some((ci) => ci.id === progPublished.id)).toBe(false);

    // Filter by test program
    const progOnly = await getContentItemsWithDetails({ programId: testProgramId });
    expect(progOnly.some((ci) => ci.id === progPublished.id)).toBe(true);
    expect(progOnly.some((ci) => ci.id === globalDraft.id)).toBe(false);

    // Filter by published status
    const publishedOnly = await getContentItemsWithDetails({ status: 'published' });
    expect(publishedOnly.every((ci) => ci.lifecycleStatus === 'published')).toBe(true);

    // Filter by draft status
    const draftOnly = await getContentItemsWithDetails({ status: 'draft' });
    expect(draftOnly.every((ci) => ci.lifecycleStatus === 'draft')).toBe(true);
  });

  // =========================================================================
  // Test G & H: Security Guards
  // =========================================================================
  it('G & H — rejects creation with non-existent program and unauthorized requests', async () => {
    // Non-existent program
    const resInvalidProg = await createContentAction({
      title: 'Invalid Program Content',
      contentType: 'lecture',
      programId: 999999
    });
    expect(resInvalidProg.success).toBe(false);
    if (!resInvalidProg.success) {
      expect(resInvalidProg.error).toMatch(/program does not exist/i);
    }

    // Unauthenticated request
    mockAuth.mockResolvedValue(null);
    const resUnauth = await createContentAction({
      title: 'Unauthenticated Attempt',
      contentType: 'lecture'
    });
    expect(resUnauth.success).toBe(false);
    if (!resUnauth.success) {
      expect(resUnauth.error).toMatch(/unauthorized/i);
    }
  });

  // =========================================================================
  // Test L: Program Deletion Preserves Canonical Content (ON DELETE SET NULL)
  // =========================================================================
  it('L — preserves canonical content item when parent program is deleted (ON DELETE SET NULL)', async () => {
    const timestamp = Date.now();
    // 1. Create a temporary program
    const [tempProg] = await db
      .insert(programs)
      .values({
        name: `Temp Program For Deletion ${timestamp}`,
        code: `TMP_${timestamp.toString().slice(-5)}`,
        collegeId: testCollegeId,
        status: 'draft'
      })
      .returning();

    // 2. Create content linked to tempProg
    const content = await createContentItem({
      title: `Content Under Temp Program ${timestamp}`,
      contentType: 'notes',
      programId: tempProg.id
    });
    createdContentIds.push(content.id);

    expect(content.programId).toBe(tempProg.id);

    // 3. Delete the program
    await db.delete(programs).where(eq(programs.id, tempProg.id));

    // 4. Content must still exist with programId set to NULL (globally preserved)
    const preservedContent = await getContentItemById(content.id);
    expect(preservedContent).toBeDefined();
    expect(preservedContent?.id).toBe(content.id);
    expect(preservedContent?.programId).toBeNull();
  });

  // =========================================================================
  // Test N & O: No batch_id in content_items and Placements Untouched by Edit
  // =========================================================================
  it('N & O — confirms content_items has no batch_id and editing content does not modify batch placements', async () => {
    const timestamp = Date.now();
    const content = await createContentItem({
      title: `Placement Test Item ${timestamp}`,
      contentType: 'lecture',
      programId: testProgramId
    });
    createdContentIds.push(content.id);

    // Verify schema: content_items row has no batchId property
    const rawContent = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, content.id))
      .limit(1);

    expect((rawContent[0] as any).batchId).toBeUndefined();
    expect((rawContent[0] as any).batch_id).toBeUndefined();

    // Place content in batch_curriculum
    const [placement] = await db
      .insert(batchCurriculum)
      .values({
        batchId: testBatchId,
        contentItemId: content.id,
        weekNumber: 1,
        sequenceOrder: 1,
        isRequired: true
      })
      .returning();

    // Verify batchUsageCount in getContentItemById is 1
    let itemWithPlacement = await getContentItemById(content.id);
    expect(itemWithPlacement?.batchUsageCount).toBe(1);

    // Edit content item in-place
    await updateContentAction(content.id, {
      title: `Renamed Content ${timestamp}`
    });

    // Placement in batchCurriculum remains completely intact
    const [persistedPlacement] = await db
      .select()
      .from(batchCurriculum)
      .where(eq(batchCurriculum.id, placement.id));

    expect(persistedPlacement).toBeDefined();
    expect(persistedPlacement.batchId).toBe(testBatchId);
    expect(persistedPlacement.contentItemId).toBe(content.id);
    expect(persistedPlacement.weekNumber).toBe(1);
    expect(persistedPlacement.isRequired).toBe(true);

    itemWithPlacement = await getContentItemById(content.id);
    expect(itemWithPlacement?.batchUsageCount).toBe(1);
  });
});
