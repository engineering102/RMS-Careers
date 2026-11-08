import 'server-only';

import { notFound } from 'next/navigation';
import {
  db,
  contentItems,
  programs,
  enrollments,
  batchCurriculum,
  activities,
  batches
} from '@rms/db';
import { eq, and, or, sql } from 'drizzle-orm';
import type { ContentItemMetadata } from '@/lib/types/library';
import type {
  ContentPlayerItem,
  VideoMetadata,
  ResourceMetadata,
  RelatedBatchContext
} from '@/lib/types/content';
import { enrollmentGrantsAccess } from '@/lib/db/access-policy';
import { DEFAULT_PROGRAM_CODE, DEFAULT_PROGRAM_NAME } from '@/lib/db/queries/library';
import { extractResourceMetadata, extractVideoMetadata } from '@/lib/content/metadata';

export type {
  ContentPlayerItem,
  VideoMetadata,
  ResourceMetadata,
  RelatedBatchContext
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Authorizes and retrieves a specific content item for the student.
 * Guarantees zero existence leakage for unauthorized, unpublished, or nonexistent content items.
 *
 * @param studentId Authenticated student ID (students.id).
 * @param contentItemId Target content item UUID.
 * @param batchId Optional cohort batch context for progress and navigation.
 */
export async function getContentItem(
  studentId: number,
  contentItemId: string,
  batchId?: string
): Promise<ContentPlayerItem> {
  if (!studentId || !contentItemId || !isValidUuid(contentItemId) || !process.env.POSTGRES_URL) {
    notFound();
  }

  try {
    // The student's access-granting enrollments (completed included: read-only history stays viewable), as
    // subqueries, so every read below can start at once instead of waiting for the enrollment list first.
    const enrolledProgramIds = sql`SELECT ${enrollments.programId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${studentId} AND ${enrollmentGrantsAccess({ includeCompleted: true })}`;
    const enrolledBatchIds = sql`SELECT ${enrollments.batchId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${studentId} AND ${enrollments.batchId} IS NOT NULL AND ${enrollmentGrantsAccess({ includeCompleted: true })}`;
    const requestedBatchId = batchId && isValidUuid(batchId) ? batchId : null;

    // One round-trip (was up to five sequential). Nothing is returned unless every check below passes; the extra
    // reads (completion, batch name) are discarded when one fails, so they reveal nothing.
    const [activeEnrollments, batchPlacements, [row], [completedActivity], [requestedBatch]] = await Promise.all([
      // 1. Student's enrollments: entitlement boundaries
      db
        .select({
          programId: enrollments.programId,
          batchId: enrollments.batchId,
          status: enrollments.status
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            enrollmentGrantsAccess({ includeCompleted: true })
          )
        ),
      // 2. Placements of this item in the student's batches (release dates)
      db
        .select({
          batchId: batchCurriculum.batchId,
          availableFrom: batchCurriculum.availableFrom
        })
        .from(batchCurriculum)
        .where(
          and(
            eq(batchCurriculum.contentItemId, contentItemId),
            sql`${batchCurriculum.batchId} IN (${enrolledBatchIds})`
          )
        ),
      // 3. The content item joined with its program (leftJoin so global content works). Accessible if it belongs
      // to an enrolled program OR is scheduled in an enrolled batch.
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
          isPublished: contentItems.isPublished
        })
        .from(contentItems)
        .leftJoin(programs, eq(programs.id, contentItems.programId))
        .where(
          and(
            eq(contentItems.id, contentItemId),
            eq(contentItems.isPublished, true),
            or(
              sql`${contentItems.programId} IN (${enrolledProgramIds})`,
              sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN (${enrolledBatchIds}))`
            )!
          )
        )
        .limit(1),
      // 4. Student's completion record
      db
        .select({
          createdAt: activities.createdAt
        })
        .from(activities)
        .where(
          and(
            eq(activities.studentId, studentId),
            eq(activities.activityType, 'lecture_completed'),
            eq(activities.referenceId, contentItemId)
          )
        )
        .limit(1),
      // 5. Name of the requested batch (used only if the student is enrolled in it and the item is placed there)
      requestedBatchId
        ? db
            .select({
              id: batches.id,
              name: batches.name
            })
            .from(batches)
            .where(eq(batches.id, requestedBatchId))
            .limit(1)
        : Promise.resolve([] as { id: string; name: string }[])
    ]);

    if (activeEnrollments.length === 0) {
      notFound();
    }

    const batchIds = Array.from(
      new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
    );

    // Release date availability if placed in student's batch(es)
    if (batchIds.length > 0) {
      if (batchId && isValidUuid(batchId) && batchIds.includes(batchId)) {
        // When accessed with specific enrolled batchId, verify release availability for that batch
        const targetPlacement = batchPlacements.find((p) => p.batchId === batchId);
        if (targetPlacement?.availableFrom && new Date(targetPlacement.availableFrom).getTime() > Date.now()) {
          notFound();
        }
      } else if (batchPlacements.length > 0) {
        // If no batchId specified or unenrolled batchId, but placed in student's enrolled batch(es), ensure at least one placement is released
        const hasAnyUnlocked = batchPlacements.some(
          (p) => !p.availableFrom || new Date(p.availableFrom).getTime() <= Date.now()
        );
        if (!hasAnyUnlocked) {
          notFound();
        }
      }
    }

    if (!row) {
      notFound();
    }

    const isCompleted = Boolean(completedActivity);
    const completedAt = completedActivity?.createdAt ?? null;

    // If batchId is provided, verify student has access and attach batch metadata
    let relatedBatchContext: RelatedBatchContext | null = null;
    if (batchId && isValidUuid(batchId) && batchIds.includes(batchId)) {
      const isPlacedInBatch = batchPlacements.some((p) => p.batchId === batchId);
      if (isPlacedInBatch && requestedBatch) {
        relatedBatchContext = {
          batchId: requestedBatch.id,
          batchName: requestedBatch.name
        };
      }
    }

    const metadata = (row.metadata as ContentItemMetadata) || {};

    return {
      id: row.id,
      programId: row.programId,
      programName: row.programName || DEFAULT_PROGRAM_NAME,
      programCode: row.programCode || DEFAULT_PROGRAM_CODE,
      title: row.title,
      slug: row.slug,
      contentType: row.contentType,
      description: row.description,
      metadata,
      isPublished: row.isPublished,
      isCompleted,
      completedAt,
      videoMetadata: extractVideoMetadata(metadata),
      resourceMetadata: extractResourceMetadata(metadata),
      relatedBatchContext
    };
  } catch (error: any) {
    if (error?.message === 'NEXT_NOT_FOUND' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }
    console.error('[ContentQuery] Failed to fetch content item:', error);
    notFound();
  }
}
