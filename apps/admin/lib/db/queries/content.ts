import 'server-only';

import {
  db,
  contentItems,
  programs,
  batchCurriculum,
  type ContentItem,
  type ContentTypeEnum,
  type DbClient
} from '@rms/db';
import { eq, and, or, desc, count, ilike, isNull, sql } from 'drizzle-orm';

export type { ContentTypeEnum };

export interface ContentItemWithDetails {
  id: string;
  title: string;
  slug: string;
  contentType: ContentTypeEnum;
  description: string | null;
  programId: number | null;
  programName: string | null;
  programCode: string | null;
  isPublished: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lifecycleStatus: 'draft' | 'published' | 'archived';
  batchUsageCount: number;
}

export interface ContentFilterOptions {
  search?: string;
  programId?: number | null | 'all' | 'global';
  contentType?: ContentTypeEnum | 'all';
  status?: 'all' | 'draft' | 'published' | 'archived';
  limit?: number;
  offset?: number;
}

/**
 * Computes the lifecycle status from the item's is_published state and metadata.
 */
export function computeLifecycleStatus(
  isPublished: boolean,
  metadata?: Record<string, unknown> | null
): 'draft' | 'published' | 'archived' {
  if (metadata && (metadata.isArchived === true || metadata.status === 'archived')) {
    return 'archived';
  }
  if (isPublished) {
    return 'published';
  }
  return 'draft';
}

/**
 * Generates a clean URL slug from a title string.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Retrieves content items joined with parent program and batch placement count.
 * Single parameterized query avoids N+1 database roundtrips.
 */
export async function getContentItemsWithDetails(
  options: ContentFilterOptions = {},
  client: DbClient = db
): Promise<ContentItemWithDetails[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

    const conditions = [];

    // Search filter across title, slug, and description
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(contentItems.title, term),
          ilike(contentItems.slug, term),
          ilike(contentItems.description, term)
        )
      );
    }

    // Program filter (specific program, all, or global only)
    if (options.programId !== undefined && options.programId !== 'all') {
      if (options.programId === 'global' || options.programId === null) {
        conditions.push(isNull(contentItems.programId));
      } else if (typeof options.programId === 'number') {
        conditions.push(eq(contentItems.programId, options.programId));
      }
    }

    // Content Type filter
    if (options.contentType && options.contentType !== 'all') {
      conditions.push(eq(contentItems.contentType, options.contentType));
    }

    // Lifecycle status filter
    if (options.status && options.status !== 'all') {
      if (options.status === 'published') {
        conditions.push(
          and(
            eq(contentItems.isPublished, true),
            sql`COALESCE((${contentItems.metadata}->>'isArchived')::boolean, false) = false`
          )
        );
      } else if (options.status === 'draft') {
        conditions.push(
          and(
            eq(contentItems.isPublished, false),
            sql`COALESCE((${contentItems.metadata}->>'isArchived')::boolean, false) = false`
          )
        );
      } else if (options.status === 'archived') {
        conditions.push(
          sql`COALESCE((${contentItems.metadata}->>'isArchived')::boolean, false) = true`
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        isPublished: contentItems.isPublished,
        metadata: contentItems.metadata,
        createdAt: contentItems.createdAt,
        updatedAt: contentItems.updatedAt,
        batchUsageCount: count(batchCurriculum.id)
      })
      .from(contentItems)
      .leftJoin(programs, eq(contentItems.programId, programs.id))
      .leftJoin(batchCurriculum, eq(contentItems.id, batchCurriculum.contentItemId))
      .where(whereClause)
      .groupBy(contentItems.id, programs.name, programs.code)
      .orderBy(desc(contentItems.updatedAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    return rows.map((row) => ({
      ...row,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      lifecycleStatus: computeLifecycleStatus(
        row.isPublished,
        row.metadata as Record<string, unknown>
      ),
      batchUsageCount: Number(row.batchUsageCount || 0)
    }));
  } catch (error) {
    console.error('Error fetching content items with details:', error);
    return [];
  }
}

/**
 * Retrieves a single canonical content item by ID with full details.
 */
export async function getContentItemById(
  id: string,
  client: DbClient = db
): Promise<ContentItemWithDetails | null> {
  if (!id) return null;
  try {
    if (!process.env.POSTGRES_URL) return null;

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
        isPublished: contentItems.isPublished,
        metadata: contentItems.metadata,
        createdAt: contentItems.createdAt,
        updatedAt: contentItems.updatedAt,
        batchUsageCount: count(batchCurriculum.id)
      })
      .from(contentItems)
      .leftJoin(programs, eq(contentItems.programId, programs.id))
      .leftJoin(batchCurriculum, eq(contentItems.id, batchCurriculum.contentItemId))
      .where(eq(contentItems.id, id))
      .groupBy(contentItems.id, programs.name, programs.code)
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      lifecycleStatus: computeLifecycleStatus(
        row.isPublished,
        row.metadata as Record<string, unknown>
      ),
      batchUsageCount: Number(row.batchUsageCount || 0)
    };
  } catch (error) {
    console.error(`Error fetching content item by id ${id}:`, error);
    return null;
  }
}

/**
 * Checks whether a given slug is unique in the specified scope (program or global).
 */
export async function isSlugAvailable(
  slug: string,
  programId: number | null,
  excludeId?: string,
  client: DbClient = db
): Promise<boolean> {
  try {
    if (!process.env.POSTGRES_URL) return true;

    const conditions = [
      eq(contentItems.slug, slug),
      programId !== null ? eq(contentItems.programId, programId) : isNull(contentItems.programId)
    ];

    if (excludeId) {
      conditions.push(sql`${contentItems.id} != ${excludeId}`);
    }

    const [existing] = await client
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(and(...conditions))
      .limit(1);

    return !existing;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }
}

export interface CreateContentItemInput {
  title: string;
  slug?: string;
  contentType: ContentTypeEnum;
  description?: string | null;
  programId?: number | null;
  isPublished?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a new canonical content item in the centralized library.
 */
export async function createContentItem(
  input: CreateContentItemInput,
  client: DbClient = db
): Promise<ContentItemWithDetails> {
  const cleanTitle = input.title.trim();
  const rawSlug = input.slug?.trim() || generateSlug(cleanTitle);

  // Guarantee slug uniqueness within scope
  let candidateSlug = rawSlug;
  const isAvailable = await isSlugAvailable(candidateSlug, input.programId || null, undefined, client);
  if (!isAvailable) {
    candidateSlug = `${rawSlug}-${Date.now().toString().slice(-4)}`;
  }

  const [created] = await client
    .insert(contentItems)
    .values({
      title: cleanTitle,
      slug: candidateSlug,
      contentType: input.contentType,
      description: input.description || null,
      programId: input.programId || null,
      isPublished: input.isPublished ?? false,
      metadata: input.metadata || {}
    })
    .returning();

  const fetched = await getContentItemById(created.id, client);
  if (!fetched) {
    throw new Error('Failed to retrieve newly created content item.');
  }
  return fetched;
}

export interface UpdateContentItemInput {
  title?: string;
  slug?: string;
  contentType?: ContentTypeEnum;
  description?: string | null;
  programId?: number | null;
  isPublished?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Updates an existing canonical content item in-place preserving its primary key ID.
 */
export async function updateContentItem(
  id: string,
  input: UpdateContentItemInput,
  client: DbClient = db
): Promise<ContentItemWithDetails> {
  const existing = await getContentItemById(id, client);
  if (!existing) {
    throw new Error(`Content item with ID ${id} not found.`);
  }

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date()
  };

  if (input.title !== undefined) {
    updateValues.title = input.title.trim();
  }

  if (input.slug !== undefined && input.slug.trim()) {
    const newSlug = input.slug.trim();
    const targetProgramId = input.programId !== undefined ? input.programId : existing.programId;
    const isAvail = await isSlugAvailable(newSlug, targetProgramId, id, client);
    if (!isAvail) {
      throw new Error(`Slug "${newSlug}" is already in use for this scope.`);
    }
    updateValues.slug = newSlug;
  }

  if (input.contentType !== undefined) {
    updateValues.contentType = input.contentType;
  }

  if (input.description !== undefined) {
    updateValues.description = input.description;
  }

  if (input.programId !== undefined) {
    updateValues.programId = input.programId;
  }

  if (input.isPublished !== undefined) {
    updateValues.isPublished = input.isPublished;
  }

  if (input.metadata !== undefined) {
    updateValues.metadata = {
      ...(existing.metadata || {}),
      ...input.metadata
    };
  }

  await client
    .update(contentItems)
    .set(updateValues)
    .where(eq(contentItems.id, id));

  const updated = await getContentItemById(id, client);
  if (!updated) {
    throw new Error('Failed to retrieve updated content item.');
  }
  return updated;
}

/**
 * Updates the lifecycle state (draft, published, archived) of a canonical content item.
 */
export async function updateContentLifecycle(
  id: string,
  action: 'publish' | 'unpublish' | 'archive' | 'unarchive',
  client: DbClient = db
): Promise<ContentItemWithDetails> {
  const existing = await getContentItemById(id, client);
  if (!existing) {
    throw new Error(`Content item with ID ${id} not found.`);
  }

  const currentMeta = { ...(existing.metadata || {}) };

  let isPublished = existing.isPublished;

  switch (action) {
    case 'publish':
      isPublished = true;
      currentMeta.isArchived = false;
      delete currentMeta.archivedAt;
      break;

    case 'unpublish':
      isPublished = false;
      break;

    case 'archive':
      isPublished = false;
      currentMeta.isArchived = true;
      currentMeta.archivedAt = new Date().toISOString();
      break;

    case 'unarchive':
      isPublished = false;
      currentMeta.isArchived = false;
      delete currentMeta.archivedAt;
      break;
  }

  await client
    .update(contentItems)
    .set({
      isPublished,
      metadata: currentMeta,
      updatedAt: new Date()
    })
    .where(eq(contentItems.id, id));

  const updated = await getContentItemById(id, client);
  if (!updated) {
    throw new Error('Failed to retrieve updated content item.');
  }
  return updated;
}
