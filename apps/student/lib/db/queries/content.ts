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
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import type { ContentItemMetadata } from '@/lib/types/library';
import type {
  ContentPlayerItem,
  VideoMetadata,
  ResourceMetadata,
  RelatedBatchContext
} from '@/lib/types/content';

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
 * Extracts normalized VideoMetadata from content item metadata.
 */
function extractVideoMetadata(metadata: ContentItemMetadata): VideoMetadata | null {
  const providerRaw = typeof metadata.provider === 'string' ? metadata.provider.toLowerCase() : '';
  const videoId = typeof metadata.videoId === 'string' ? metadata.videoId.trim() : '';

  if (!videoId && !providerRaw) {
    return null;
  }

  let provider: 'vimeo' | 'youtube' | 'custom' = 'custom';
  if (providerRaw.includes('vimeo')) {
    provider = 'vimeo';
  } else if (providerRaw.includes('youtube')) {
    provider = 'youtube';
  }

  const durationMinutes =
    typeof metadata.durationMinutes === 'number'
      ? metadata.durationMinutes
      : typeof metadata.duration === 'number'
        ? metadata.duration
        : undefined;

  const durationSeconds =
    typeof metadata.durationSeconds === 'number'
      ? metadata.durationSeconds
      : durationMinutes !== undefined
        ? durationMinutes * 60
        : undefined;

  const aspectRatio =
    metadata.aspectRatio === '4:3' || metadata.aspectRatio === '16:9'
      ? metadata.aspectRatio
      : '16:9';

  return {
    provider,
    videoId,
    aspectRatio,
    durationMinutes,
    durationSeconds
  };
}

/**
 * Extracts normalized ResourceMetadata from content item metadata.
 */
function extractResourceMetadata(metadata: ContentItemMetadata): ResourceMetadata | null {
  const documentUrl =
    typeof metadata.documentUrl === 'string'
      ? metadata.documentUrl
      : typeof metadata.url === 'string'
        ? metadata.url
        : undefined;

  const notes = typeof metadata.notes === 'string' ? metadata.notes : undefined;
  const topic = typeof metadata.topic === 'string' ? metadata.topic : undefined;
  const category = typeof metadata.category === 'string' ? metadata.category : undefined;
  const fileType = typeof metadata.fileType === 'string' ? metadata.fileType : undefined;

  if (!documentUrl && !notes && !topic && !category) {
    return null;
  }

  return {
    documentUrl,
    notes,
    topic,
    category,
    fileType
  };
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
    // 1. Resolve student's enrollments to establish entitlement boundaries
    const activeEnrollments = await db
      .select({
        programId: enrollments.programId,
        batchId: enrollments.batchId,
        status: enrollments.status
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
        )
      );

    if (activeEnrollments.length === 0) {
      notFound();
    }

    const programIds = Array.from(new Set(activeEnrollments.map((e) => e.programId).filter(Boolean)));
    const batchIds = Array.from(
      new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
    );

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

    if (entitlementConditions.length === 0) {
      notFound();
    }

    // 3. Check release date availability if placed in student's batch(es)
    let batchPlacements: { batchId: string; availableFrom: Date | null }[] = [];
    if (batchIds.length > 0) {
      batchPlacements = await db
        .select({
          batchId: batchCurriculum.batchId,
          availableFrom: batchCurriculum.availableFrom
        })
        .from(batchCurriculum)
        .where(
          and(
            eq(batchCurriculum.contentItemId, contentItemId),
            inArray(batchCurriculum.batchId, batchIds)
          )
        );

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

    // 4. Query the content item joined with its program (leftJoin so global content works)
    const [row] = await db
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
          or(...entitlementConditions)!
        )
      )
      .limit(1);

    if (!row) {
      notFound();
    }

    // 4. Query student's completion record from activities table
    const [completedActivity] = await db
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
      .limit(1);

    const isCompleted = Boolean(completedActivity);
    const completedAt = completedActivity?.createdAt ?? null;

    // 5. If batchId is provided, verify student has access and retrieve batch metadata
    let relatedBatchContext: RelatedBatchContext | null = null;
    if (batchId && isValidUuid(batchId) && batchIds.includes(batchId)) {
      const isPlacedInBatch = batchPlacements.some((p) => p.batchId === batchId);
      if (isPlacedInBatch) {
        const [batchRecord] = await db
          .select({
            id: batches.id,
            name: batches.name
          })
          .from(batches)
          .where(eq(batches.id, batchId))
          .limit(1);

        if (batchRecord) {
          relatedBatchContext = {
            batchId: batchRecord.id,
            batchName: batchRecord.name
          };
        }
      }
    }

    const metadata = (row.metadata as ContentItemMetadata) || {};

    return {
      id: row.id,
      programId: row.programId,
      programName: row.programName || 'General',
      programCode: row.programCode || 'GEN',
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
