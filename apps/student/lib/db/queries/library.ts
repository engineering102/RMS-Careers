import 'server-only';

import { db, contentItems, programs, enrollments, batchCurriculum } from '@rms/db';
import { eq, and, or, inArray, ilike, sql, desc, asc } from 'drizzle-orm';
import type {
  ContentType,
  ContentItemMetadata,
  LibraryItem,
  LibraryFilterParams,
  LibraryQueryResult
} from '@/lib/types/library';

export type {
  ContentType,
  ContentItemMetadata,
  LibraryItem,
  LibraryFilterParams,
  LibraryQueryResult
};

export const ALL_CONTENT_TYPES: ContentType[] = [
  'lecture',
  'notes',
  'dsa_sheet',
  'quiz',
  'project',
  'resource'
];

/**
 * Escapes special characters for SQL ILIKE queries to prevent pattern injection.
 */
function escapeIlikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&').trim();
}

/**
 * Retrieves the non-chronological, searchable, topic-filtered learning content catalog
 * accessible to the authenticated student based on their active program enrollments.
 *
 * @param studentId Authenticated student ID (students.id).
 * @param options Optional pre-resolved enrolled program/batch IDs and filter parameters.
 */
export async function getLibraryItems(
  studentId: number,
  options?: {
    enrolledProgramIds?: number[];
    enrolledBatchIds?: string[];
    filters?: LibraryFilterParams;
  }
): Promise<LibraryQueryResult> {
  const page = Math.max(1, options?.filters?.page || 1);
  const pageSize = Math.min(Math.max(1, options?.filters?.limit || 24), 100);
  const offset = (page - 1) * pageSize;

  const emptyResult: LibraryQueryResult = {
    items: [],
    totalCount: 0,
    page,
    pageSize,
    totalPages: 0,
    availableTopics: [],
    availableContentTypes: ALL_CONTENT_TYPES
  };

  if (!studentId || !process.env.POSTGRES_URL) {
    return emptyResult;
  }

  try {
    // 1. Resolve student's active enrolled programs and batches if not provided
    let programIds = options?.enrolledProgramIds;
    let batchIds = options?.enrolledBatchIds;

    if (!programIds || !batchIds) {
      const activeEnrollments = await db
        .select({
          programId: enrollments.programId,
          batchId: enrollments.batchId
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            sql`${enrollments.status} IN ('active', 'confirmed')`
          )
        );

      programIds = Array.from(new Set(activeEnrollments.map((e) => e.programId).filter(Boolean)));
      batchIds = Array.from(
        new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
      );
    }

    // If student has no active enrollments, return empty library
    if (programIds.length === 0 && batchIds.length === 0) {
      return emptyResult;
    }

    // 2. Build entitlement authorization conditions
    // Content is accessible if it belongs to an enrolled program OR is scheduled in an enrolled batch
    const entitlementConditions = [];
    if (programIds.length > 0) {
      entitlementConditions.push(inArray(contentItems.programId, programIds));
    }
    if (batchIds.length > 0) {
      entitlementConditions.push(
        sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN ${batchIds})`
      );
    }

    const baseWhereClauses = [
      eq(contentItems.isPublished, true),
      or(...entitlementConditions)!
    ];

    // 3. Apply search query filter
    const rawQuery = options?.filters?.query?.trim();
    if (rawQuery) {
      const escaped = escapeIlikePattern(rawQuery);
      const searchPattern = `%${escaped}%`;

      baseWhereClauses.push(
        or(
          ilike(contentItems.title, searchPattern),
          ilike(contentItems.description, searchPattern),
          sql`(${contentItems.metadata}->>'topic') ILIKE ${searchPattern}`,
          sql`(${contentItems.metadata}->>'category') ILIKE ${searchPattern}`
        )!
      );
    }

    // 4. Apply content_type filter
    const contentTypeFilter = options?.filters?.contentType;
    if (contentTypeFilter && contentTypeFilter !== 'all') {
      baseWhereClauses.push(eq(contentItems.contentType, contentTypeFilter));
    }

    // 5. Apply topic/category filter
    const topicFilter = options?.filters?.topic?.trim();
    if (topicFilter && topicFilter !== 'all') {
      baseWhereClauses.push(
        or(
          sql`(${contentItems.metadata}->>'topic') = ${topicFilter}`,
          sql`(${contentItems.metadata}->>'category') = ${topicFilter}`
        )!
      );
    }

    const finalWhereClause = and(...baseWhereClauses);

    // 6. Execute Count Query
    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(contentItems)
      .where(finalWhereClause);

    const totalCount = countRow?.total || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // 7. Execute Data Query
    const rows = await db
      .select({
        id: contentItems.id,
        programId: contentItems.programId,
        programName: programs.name,
        programCode: programs.code,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        description: contentItems.description,
        metadata: contentItems.metadata,
        isPublished: contentItems.isPublished,
        createdAt: contentItems.createdAt,
        updatedAt: contentItems.updatedAt
      })
      .from(contentItems)
      .innerJoin(programs, eq(programs.id, contentItems.programId))
      .where(finalWhereClause)
      .orderBy(desc(contentItems.createdAt), asc(contentItems.title))
      .limit(pageSize)
      .offset(offset);

    // 8. Fetch Available Topics across the student's authorized scope
    const topicAuthClauses = [
      eq(contentItems.isPublished, true),
      or(...entitlementConditions)!
    ];

    const topicRows = await db
      .select({
        topic: sql<string>`DISTINCT coalesce(nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', ''))`
      })
      .from(contentItems)
      .where(
        and(
          ...topicAuthClauses,
          sql`coalesce(nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', '')) IS NOT NULL`
        )
      );

    const availableTopics = topicRows
      .map((r) => r.topic)
      .filter((t): t is string => Boolean(t))
      .sort((a, b) => a.localeCompare(b));

    // Map rows to LibraryItem
    const items: LibraryItem[] = rows.map((r) => {
      const meta = (r.metadata as ContentItemMetadata) || {};
      const topic = meta.topic || meta.category || 'General';

      return {
        id: r.id,
        programId: r.programId,
        programName: r.programName,
        programCode: r.programCode,
        title: r.title,
        slug: r.slug,
        contentType: r.contentType as ContentType,
        description: r.description,
        metadata: meta,
        topic,
        isPublished: r.isPublished,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      availableTopics,
      availableContentTypes: ALL_CONTENT_TYPES
    };
  } catch (error) {
    console.error('[Library] Error retrieving accessible library items:', error);
    return emptyResult;
  }
}
