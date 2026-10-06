import 'server-only';

import {
  db,
  batches,
  batchCurriculum,
  contentItems,
  programs,
  type BatchCurriculum,
  type ContentTypeEnum,
  type DbClient
} from '@rms/db';
import { eq, and, or, asc, desc, count, ilike, isNull, inArray, sql } from 'drizzle-orm';
import { computeLifecycleStatus } from './content';

export interface CurriculumPlacementItem {
  id: number;
  batchId: string;
  contentItemId: string;
  title: string;
  slug: string;
  contentType: ContentTypeEnum;
  description: string | null;
  contentProgramId: number | null;
  contentProgramName: string | null;
  contentProgramCode: string | null;
  isGlobal: boolean;
  isPublished: boolean;
  lifecycleStatus: 'draft' | 'published' | 'archived';
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
  createdAt: Date;
}

export interface EligibleContentItem {
  id: string;
  title: string;
  slug: string;
  contentType: ContentTypeEnum;
  description: string | null;
  programId: number | null;
  programName: string | null;
  programCode: string | null;
  isGlobal: boolean;
  isPublished: boolean;
  lifecycleStatus: 'published';
  topic: string | null;
}

/**
 * Retrieves the full curriculum for a batch ordered chronologically by week and sequence.
 * Avoids N+1 queries by performing a single joined select.
 */
export async function getBatchCurriculum(
  batchId: string,
  client: DbClient = db
): Promise<CurriculumPlacementItem[]> {
  if (!batchId) return [];
  try {
    if (!process.env.POSTGRES_URL) return [];

    const rows = await client
      .select({
        id: batchCurriculum.id,
        batchId: batchCurriculum.batchId,
        contentItemId: batchCurriculum.contentItemId,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        isRequired: batchCurriculum.isRequired,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt,
        createdAt: batchCurriculum.createdAt,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        description: contentItems.description,
        contentProgramId: contentItems.programId,
        contentProgramName: programs.name,
        contentProgramCode: programs.code,
        isPublished: contentItems.isPublished,
        metadata: contentItems.metadata
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .leftJoin(programs, eq(contentItems.programId, programs.id))
      .where(eq(batchCurriculum.batchId, batchId))
      .orderBy(
        asc(batchCurriculum.weekNumber),
        asc(batchCurriculum.sequenceOrder),
        asc(batchCurriculum.id)
      );

    return rows.map((r) => ({
      id: r.id,
      batchId: r.batchId,
      contentItemId: r.contentItemId,
      title: r.title,
      slug: r.slug,
      contentType: r.contentType,
      description: r.description,
      contentProgramId: r.contentProgramId,
      contentProgramName: r.contentProgramName,
      contentProgramCode: r.contentProgramCode,
      isGlobal: r.contentProgramId === null,
      isPublished: r.isPublished,
      lifecycleStatus: computeLifecycleStatus(
        r.isPublished,
        r.metadata as Record<string, unknown>
      ),
      weekNumber: r.weekNumber,
      sequenceOrder: r.sequenceOrder,
      isRequired: r.isRequired,
      availableFrom: r.availableFrom,
      dueAt: r.dueAt,
      createdAt: r.createdAt
    }));
  } catch (error) {
    console.error(`Error fetching curriculum for batch ${batchId}:`, error);
    return [];
  }
}

/**
 * Retrieves canonical content items eligible to be newly placed into a specific batch.
 * Eligible items must be:
 * 1. Published (is_published = true)
 * 2. Not archived (metadata->>'isArchived' != 'true')
 * 3. Either Global (program_id IS NULL) OR matching batch's program (program_id = batch.program_id)
 * 4. NOT already placed in this batch
 */
export async function getEligibleContentForBatch(
  batchId: string,
  options?: {
    search?: string;
    contentType?: ContentTypeEnum | 'all';
    limit?: number;
  },
  client: DbClient = db
): Promise<EligibleContentItem[]> {
  if (!batchId) return [];
  try {
    if (!process.env.POSTGRES_URL) return [];

    // 1. Fetch batch to determine parent program
    const [batch] = await client
      .select({ id: batches.id, programId: batches.programId })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) return [];

    // 2. Fetch existing placements in this batch to exclude
    const existingPlacements = await client
      .select({ contentItemId: batchCurriculum.contentItemId })
      .from(batchCurriculum)
      .where(eq(batchCurriculum.batchId, batchId));

    const excludedIds = existingPlacements.map((p) => p.contentItemId);

    // 3. Build conditions for eligible content
    const conditions = [
      eq(contentItems.isPublished, true),
      sql`COALESCE((${contentItems.metadata}->>'isArchived')::boolean, false) = false`,
      or(isNull(contentItems.programId), eq(contentItems.programId, batch.programId))
    ];

    if (excludedIds.length > 0) {
      conditions.push(sql`${contentItems.id} NOT IN ${excludedIds}`);
    }

    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(contentItems.title, term),
          ilike(contentItems.slug, term),
          ilike(contentItems.description, term)
        )
      );
    }

    if (options?.contentType && options.contentType !== 'all') {
      conditions.push(eq(contentItems.contentType, options.contentType));
    }

    const rows = await client
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        description: contentItems.description,
        programId: contentItems.programId,
        programName: programs.name,
        programCode: programs.code,
        metadata: contentItems.metadata
      })
      .from(contentItems)
      .leftJoin(programs, eq(contentItems.programId, programs.id))
      .where(and(...conditions))
      .orderBy(asc(contentItems.title))
      .limit(options?.limit || 100);

    return rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, unknown>;
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        contentType: r.contentType,
        description: r.description,
        programId: r.programId,
        programName: r.programName,
        programCode: r.programCode,
        isGlobal: r.programId === null,
        isPublished: true,
        lifecycleStatus: 'published',
        topic: (meta.topic as string) || null
      };
    });
  } catch (error) {
    console.error(`Error fetching eligible content for batch ${batchId}:`, error);
    return [];
  }
}

/**
 * Retrieves a single placement record by ID.
 */
export async function getCurriculumPlacementById(
  placementId: number,
  client: DbClient = db
): Promise<CurriculumPlacementItem | null> {
  if (!placementId) return null;
  try {
    if (!process.env.POSTGRES_URL) return null;

    const rows = await client
      .select({
        id: batchCurriculum.id,
        batchId: batchCurriculum.batchId,
        contentItemId: batchCurriculum.contentItemId,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        isRequired: batchCurriculum.isRequired,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt,
        createdAt: batchCurriculum.createdAt,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        description: contentItems.description,
        contentProgramId: contentItems.programId,
        contentProgramName: programs.name,
        contentProgramCode: programs.code,
        isPublished: contentItems.isPublished,
        metadata: contentItems.metadata
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .leftJoin(programs, eq(contentItems.programId, programs.id))
      .where(eq(batchCurriculum.id, placementId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      batchId: r.batchId,
      contentItemId: r.contentItemId,
      title: r.title,
      slug: r.slug,
      contentType: r.contentType,
      description: r.description,
      contentProgramId: r.contentProgramId,
      contentProgramName: r.contentProgramName,
      contentProgramCode: r.contentProgramCode,
      isGlobal: r.contentProgramId === null,
      isPublished: r.isPublished,
      lifecycleStatus: computeLifecycleStatus(
        r.isPublished,
        r.metadata as Record<string, unknown>
      ),
      weekNumber: r.weekNumber,
      sequenceOrder: r.sequenceOrder,
      isRequired: r.isRequired,
      availableFrom: r.availableFrom,
      dueAt: r.dueAt,
      createdAt: r.createdAt
    };
  } catch (error) {
    console.error(`Error fetching placement ${placementId}:`, error);
    return null;
  }
}

export interface AddContentToBatchInput {
  batchId: string;
  contentItemId: string;
  weekNumber: number;
  sequenceOrder?: number;
  isRequired?: boolean;
  availableFrom?: Date | null;
  dueAt?: Date | null;
}

/**
 * Adds a canonical content item to a batch curriculum.
 * Ensures sequence order is deterministically calculated if not provided.
 */
export async function addContentToBatch(
  input: AddContentToBatchInput,
  client: DbClient = db
): Promise<CurriculumPlacementItem> {
  const { batchId, contentItemId, weekNumber } = input;

  // 1. Check if placement already exists
  const [existing] = await client
    .select({ id: batchCurriculum.id })
    .from(batchCurriculum)
    .where(
      and(
        eq(batchCurriculum.batchId, batchId),
        eq(batchCurriculum.contentItemId, contentItemId)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error('This content item is already placed in this batch.');
  }

  // 2. Determine sequence order if not specified
  let seq = input.sequenceOrder;
  if (seq === undefined || seq === null) {
    const [maxSeqRow] = await client
      .select({ maxSeq: sql<number>`COALESCE(MAX(${batchCurriculum.sequenceOrder}), 0)` })
      .from(batchCurriculum)
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(batchCurriculum.weekNumber, weekNumber)
        )
      );
    seq = Number(maxSeqRow?.maxSeq || 0) + 1;
  }

  // 3. Insert placement
  const [created] = await client
    .insert(batchCurriculum)
    .values({
      batchId,
      contentItemId,
      weekNumber,
      sequenceOrder: seq,
      isRequired: input.isRequired ?? true,
      availableFrom: input.availableFrom || null,
      dueAt: input.dueAt || null
    })
    .returning();

  const fetched = await getCurriculumPlacementById(created.id, client);
  if (!fetched) {
    throw new Error('Failed to retrieve newly created curriculum placement.');
  }
  return fetched;
}

export interface UpdateCurriculumPlacementInput {
  weekNumber?: number;
  sequenceOrder?: number;
  isRequired?: boolean;
  availableFrom?: Date | null;
  dueAt?: Date | null;
}

/**
 * Updates properties of an existing curriculum placement.
 */
export async function updateCurriculumPlacement(
  placementId: number,
  input: UpdateCurriculumPlacementInput,
  client: DbClient = db
): Promise<CurriculumPlacementItem> {
  const existing = await getCurriculumPlacementById(placementId, client);
  if (!existing) {
    throw new Error(`Curriculum placement with ID ${placementId} not found.`);
  }

  const updateValues: Record<string, unknown> = {};

  if (input.weekNumber !== undefined) updateValues.weekNumber = input.weekNumber;
  if (input.sequenceOrder !== undefined) updateValues.sequenceOrder = input.sequenceOrder;
  if (input.isRequired !== undefined) updateValues.isRequired = input.isRequired;
  if (input.availableFrom !== undefined) updateValues.availableFrom = input.availableFrom;
  if (input.dueAt !== undefined) updateValues.dueAt = input.dueAt;

  await client
    .update(batchCurriculum)
    .set(updateValues)
    .where(eq(batchCurriculum.id, placementId));

  const updated = await getCurriculumPlacementById(placementId, client);
  if (!updated) {
    throw new Error('Failed to retrieve updated curriculum placement.');
  }
  return updated;
}

/**
 * Removes a curriculum placement without deleting canonical content or student progress.
 */
export async function removeCurriculumPlacement(
  placementId: number,
  client: DbClient = db
): Promise<boolean> {
  const existing = await getCurriculumPlacementById(placementId, client);
  if (!existing) return false;

  await client
    .delete(batchCurriculum)
    .where(eq(batchCurriculum.id, placementId));

  return true;
}

export interface ReorderPlacementItem {
  placementId: number;
  weekNumber: number;
  sequenceOrder: number;
}

/**
 * Updates weeks and sequence numbers for multiple placements.
 */
export async function reorderCurriculumPlacements(
  batchId: string,
  items: ReorderPlacementItem[],
  client: DbClient = db
): Promise<CurriculumPlacementItem[]> {
  for (const item of items) {
    await client
      .update(batchCurriculum)
      .set({
        weekNumber: item.weekNumber,
        sequenceOrder: item.sequenceOrder
      })
      .where(
        and(
          eq(batchCurriculum.id, item.placementId),
          eq(batchCurriculum.batchId, batchId)
        )
      );
  }

  return getBatchCurriculum(batchId, client);
}
