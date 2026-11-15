import 'server-only';

import { db, contentItems, programs, enrollments, batchCurriculum } from '@rms/db';
import { eq, ne, and, or, inArray, ilike, sql, desc, asc } from 'drizzle-orm';
import type {
  ContentType,
  ContentItemMetadata,
  LibraryItem,
  LibraryFilterParams,
  LibraryQueryResult
} from '@/lib/types/library';
import { enrollmentGrantsAccess } from '@/lib/db/access-policy';
import {
  CONTENT_SUBJECT_RULES,
  CONTENT_SUBJECT_SLUGS,
  FALLBACK_SUBJECT_SLUG,
  resolveContentSubject
} from '@rms/db/content-subjects';
import { isLibrarySubject, LIBRARY_SUBJECTS } from '@/lib/data/library-subjects';

export type {
  ContentType,
  ContentItemMetadata,
  LibraryItem,
  LibraryFilterParams,
  LibraryQueryResult
};

/** Display fallbacks for program-independent (central) content. */
export const DEFAULT_PROGRAM_NAME = 'RMS Careers';
export const DEFAULT_PROGRAM_CODE = 'RMS';

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
 * Content is accessible if it belongs to an enrolled program OR is scheduled in an enrolled batch.
 */
function buildEntitlementConditions(programIds: number[], batchIds: string[]) {
  const conditions = [];
  if (programIds.length > 0) {
    conditions.push(inArray(contentItems.programId, programIds));
  }
  if (batchIds.length > 0) {
    conditions.push(
      sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN ${batchIds})`
    );
  }
  return conditions;
}

const sqlLiteral = (value: string) => sql.raw(`'${value.replace(/'/g, "''")}'`);

/**
 * SQL mirror of resolveContentSubject: the stored metadata.subject when it is a known slug, else the first
 * keyword rule matching topic + category + title, else 'general'. The slugs and patterns are code constants and
 * are inlined rather than bound, so the expression is textually identical in SELECT, GROUP BY and ORDER BY.
 */
function subjectSql() {
  const stored = sql`${contentItems.metadata}->>'subject'`;
  const text = sql`lower(concat_ws(' ', nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', ''), ${contentItems.title}))`;
  const known = sql.join(CONTENT_SUBJECT_SLUGS.map(sqlLiteral), sql`, `);
  const rules = sql.join(
    CONTENT_SUBJECT_RULES.map((rule) => sql`WHEN ${text} ~ ${sqlLiteral(rule.pattern)} THEN ${sqlLiteral(rule.slug)}`),
    sql` `
  );
  return sql<string>`CASE WHEN ${stored} IN (${known}) THEN ${stored} ${rules} ELSE ${sqlLiteral(FALLBACK_SUBJECT_SLUG)} END`;
}

/** Position of a row's subject in the display order (General last). */
function subjectRankSql() {
  const order = sql.join(LIBRARY_SUBJECTS.map((s) => sqlLiteral(s.slug)), sql`, `);
  return sql`array_position(ARRAY[${order}]::text[], ${subjectSql()})`;
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
            enrollmentGrantsAccess()
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
    const entitlementConditions = buildEntitlementConditions(programIds, batchIds);

    // External tests are batch-scheduled and live on the Assessments page, not in the library.
    const baseWhereClauses = [
      eq(contentItems.isPublished, true),
      ne(contentItems.contentType, 'external_test'),
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

    // 5b. Apply subject filter (unknown slugs are ignored rather than returning an always-empty list)
    const subjectFilter = options?.filters?.subject?.trim();
    const activeSubject = subjectFilter && isLibrarySubject(subjectFilter) ? subjectFilter : null;
    if (activeSubject) {
      baseWhereClauses.push(sql`${subjectSql()} = ${activeSubject}`);
    }

    const finalWhereClause = and(...baseWhereClauses);

    // Available topics span the student's authorized scope (within the open category, if any)
    const topicAuthClauses = [
      eq(contentItems.isPublished, true),
      ne(contentItems.contentType, 'external_test'),
      or(...entitlementConditions)!
    ];
    if (contentTypeFilter && contentTypeFilter !== 'all') {
      topicAuthClauses.push(eq(contentItems.contentType, contentTypeFilter));
    }
    if (activeSubject) {
      topicAuthClauses.push(sql`${subjectSql()} = ${activeSubject}`);
    }

    // 6–8. Count, page of items and available topics are independent: one round-trip instead of three.
    const [[countRow], rows, topicRows] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(contentItems)
        .where(finalWhereClause),
      db
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
        // leftJoin: content_items.program_id is nullable (central content is placed via batch_curriculum)
        .leftJoin(programs, eq(programs.id, contentItems.programId))
        .where(finalWhereClause)
        .orderBy(
          ...(options?.filters?.groupBySubject ? [subjectRankSql()] : []),
          desc(contentItems.createdAt),
          asc(contentItems.title)
        )
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          topic: sql<string>`DISTINCT coalesce(nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', ''))`
        })
        .from(contentItems)
        .where(
          and(
            ...topicAuthClauses,
            sql`coalesce(nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', '')) IS NOT NULL`
          )
        )
    ]);

    const totalCount = countRow?.total || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

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
        programName: r.programName ?? DEFAULT_PROGRAM_NAME,
        programCode: r.programCode ?? DEFAULT_PROGRAM_CODE,
        title: r.title,
        slug: r.slug,
        contentType: r.contentType as ContentType,
        description: r.description,
        metadata: meta,
        topic,
        subject: resolveContentSubject({
          subject: meta.subject,
          topic: meta.topic,
          category: meta.category,
          title: r.title
        }),
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

export interface LibraryCategorySummary {
  contentType: ContentType;
  itemCount: number;
  topicCount: number;
}

/**
 * Per-content-type totals for the My Library category hub, scoped to the same
 * entitlement rules as getLibraryItems. Types with no accessible items are omitted.
 */
export async function getLibraryCategorySummaries(options: {
  enrolledProgramIds: number[];
  enrolledBatchIds: string[];
}): Promise<LibraryCategorySummary[]> {
  const { enrolledProgramIds, enrolledBatchIds } = options;

  if (!process.env.POSTGRES_URL) return [];
  if (enrolledProgramIds.length === 0 && enrolledBatchIds.length === 0) return [];

  try {
    const rows = await db
      .select({
        contentType: contentItems.contentType,
        itemCount: sql<number>`count(*)::int`,
        topicCount: sql<number>`count(DISTINCT coalesce(nullif(${contentItems.metadata}->>'topic', ''), nullif(${contentItems.metadata}->>'category', '')))::int`
      })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.isPublished, true),
          ne(contentItems.contentType, 'external_test'),
          or(...buildEntitlementConditions(enrolledProgramIds, enrolledBatchIds))!
        )
      )
      .groupBy(contentItems.contentType);

    return rows.map((r) => ({
      contentType: r.contentType as ContentType,
      itemCount: Number(r.itemCount) || 0,
      topicCount: Number(r.topicCount) || 0
    }));
  } catch (error) {
    console.error('[Library] Error retrieving library category summaries:', error);
    return [];
  }
}

export interface LibrarySubjectCount {
  subject: string;
  itemCount: number;
}

/**
 * Item totals per subject, in display order, scoped to the same entitlement rules as getLibraryItems and
 * optionally to one content type. Subjects with no accessible items are omitted.
 */
export async function getLibrarySubjectCounts(options: {
  enrolledProgramIds: number[];
  enrolledBatchIds: string[];
  contentType?: ContentType | 'all';
}): Promise<LibrarySubjectCount[]> {
  const { enrolledProgramIds, enrolledBatchIds, contentType } = options;

  if (!process.env.POSTGRES_URL) return [];
  if (enrolledProgramIds.length === 0 && enrolledBatchIds.length === 0) return [];

  try {
    const clauses = [
      eq(contentItems.isPublished, true),
      ne(contentItems.contentType, 'external_test'),
      or(...buildEntitlementConditions(enrolledProgramIds, enrolledBatchIds))!
    ];
    if (contentType && contentType !== 'all') {
      clauses.push(eq(contentItems.contentType, contentType));
    }

    const subject = subjectSql();
    const rows = await db
      .select({ subject, itemCount: sql<number>`count(*)::int` })
      .from(contentItems)
      .where(and(...clauses))
      .groupBy(subject);

    const counts = new Map(rows.map((r) => [r.subject, Number(r.itemCount) || 0]));
    return LIBRARY_SUBJECTS.filter((s) => (counts.get(s.slug) ?? 0) > 0).map((s) => ({
      subject: s.slug,
      itemCount: counts.get(s.slug)!
    }));
  } catch (error) {
    console.error('[Library] Error retrieving library subject counts:', error);
    return [];
  }
}
