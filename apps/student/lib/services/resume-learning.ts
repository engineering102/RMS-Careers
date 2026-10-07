import 'server-only';

import {
  db,
  enrollments,
  batches,
  batchCurriculum,
  contentItems,
  activities
} from '@rms/db';
import { eq, and, sql, desc, asc, inArray, gte } from 'drizzle-orm';
import { getBatchProgressSummary } from '@/lib/db/queries/progress';
import type { ResumeLearningTarget, NextCurriculumItemTarget } from '@/lib/types/progress';
import type { ContentType } from '@/lib/types/library';

/**
 * Resolves the deterministic Resume Learning Target for an authenticated student.
 * Ranks active cohorts deterministically, resolves multi-source progress, and selects
 * the highest priority actionable item according to the pedagogical priority tree.
 *
 * @param studentId Authenticated student ID (students.id).
 */
export async function getResumeLearningTarget(
  studentId: number
): Promise<ResumeLearningTarget> {
  if (!studentId || !process.env.POSTGRES_URL) {
    return { hasTarget: false, hasNoEnrollments: true };
  }

  try {
    // 1. Fetch all active and confirmed enrollments
    const activeEnrollments = await db
      .select({
        batchId: enrollments.batchId,
        batchName: batches.name,
        enrolledAt: enrollments.createdAt,
        startDate: batches.startDate
      })
      .from(enrollments)
      .innerJoin(batches, eq(batches.id, enrollments.batchId))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          sql`${enrollments.status} IN ('active', 'confirmed')`
        )
      );

    if (activeEnrollments.length === 0) {
      return { hasTarget: false, hasNoEnrollments: true };
    }

    const batchIds = activeEnrollments
      .map((e) => e.batchId)
      .filter((id): id is string => Boolean(id));

    // 2. Select primary batch deterministically:
    // Criterion 1: Batch with the most imminent uncompleted deadline (dueAt > NOW())
    // Criterion 2: Batch with the most recent learning activity
    // Criterion 3: Earliest enrollment / start date
    let selectedBatch = activeEnrollments[0];

    if (activeEnrollments.length > 1) {
      const now = new Date();

      // Query upcoming deadlines across active batches
      const upcomingDeadlines = await db
        .select({
          batchId: batchCurriculum.batchId,
          dueAt: batchCurriculum.dueAt
        })
        .from(batchCurriculum)
        .where(
          and(
            inArray(batchCurriculum.batchId, batchIds),
            gte(batchCurriculum.dueAt, now)
          )
        )
        .orderBy(asc(batchCurriculum.dueAt))
        .limit(1);

      if (upcomingDeadlines.length > 0 && upcomingDeadlines[0].batchId) {
        const matchingBatch = activeEnrollments.find(
          (b) => b.batchId === upcomingDeadlines[0].batchId
        );
        if (matchingBatch) {
          selectedBatch = matchingBatch;
        }
      } else {
        // Query most recent activity across batches
        const recentActivities = await db
          .select({
            batchId: activities.batchId
          })
          .from(activities)
          .where(
            and(
              eq(activities.studentId, studentId),
              inArray(activities.batchId, batchIds)
            )
          )
          .orderBy(desc(activities.createdAt))
          .limit(1);

        if (recentActivities.length > 0 && recentActivities[0].batchId) {
          const matchingBatch = activeEnrollments.find(
            (b) => b.batchId === recentActivities[0].batchId
          );
          if (matchingBatch) {
            selectedBatch = matchingBatch;
          }
        }
      }
    }

    const targetBatchId = selectedBatch.batchId!;
    const targetBatchName = selectedBatch.batchName || 'Cohort Batch';

    // 3. Resolve unified progress summary for the selected batch
    const progressSummary = await getBatchProgressSummary(studentId, targetBatchId);

    // 4. Query chronological published curriculum items
    const curriculumRows = await db
      .select({
        id: batchCurriculum.id,
        contentItemId: batchCurriculum.contentItemId,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        isRequired: batchCurriculum.isRequired
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .where(
        and(
          eq(batchCurriculum.batchId, targetBatchId),
          eq(contentItems.isPublished, true)
        )
      )
      .orderBy(
        asc(batchCurriculum.weekNumber),
        asc(batchCurriculum.sequenceOrder),
        asc(batchCurriculum.id)
      );

    const now = new Date();
    const unlockedItems: typeof curriculumRows = [];
    const lockedItems: typeof curriculumRows = [];

    for (const item of curriculumRows) {
      const isLocked = item.availableFrom && new Date(item.availableFrom).getTime() > now.getTime();
      if (isLocked) {
        lockedItems.push(item);
      } else {
        unlockedItems.push(item);
      }
    }

    // 5. Separate incomplete unlocked items
    const incompleteItems = unlockedItems.filter((item) => {
      const record = progressSummary.itemsMap[item.contentItemId];
      return !record || record.status !== 'completed';
    });

    if (incompleteItems.length > 0) {
      // Prioritization rules:
      // Priority 1: Project with status needs_revision
      const revisionItem = incompleteItems.find((item) => {
        const record = progressSummary.itemsMap[item.contentItemId];
        return record?.status === 'needs_revision';
      });

      if (revisionItem) {
        return {
          hasTarget: true,
          batchId: targetBatchId,
          batchName: targetBatchName,
          contentItemId: revisionItem.contentItemId,
          contentTitle: revisionItem.title,
          contentType: revisionItem.contentType as ContentType,
          weekNumber: revisionItem.weekNumber,
          sequenceOrder: revisionItem.sequenceOrder,
          dueAt: revisionItem.dueAt ? new Date(revisionItem.dueAt) : null,
          status: 'needs_revision',
          reason: 'in_progress_resubmission',
          completionPercentage: progressSummary.overallPercentage
        };
      }

      // Priority 2: Earliest incomplete item with upcoming dueAt
      const dueSoonItems = incompleteItems
        .filter((item) => item.dueAt && new Date(item.dueAt).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

      if (dueSoonItems.length > 0) {
        const dueSoonItem = dueSoonItems[0];
        const record = progressSummary.itemsMap[dueSoonItem.contentItemId];
        return {
          hasTarget: true,
          batchId: targetBatchId,
          batchName: targetBatchName,
          contentItemId: dueSoonItem.contentItemId,
          contentTitle: dueSoonItem.title,
          contentType: dueSoonItem.contentType as ContentType,
          weekNumber: dueSoonItem.weekNumber,
          sequenceOrder: dueSoonItem.sequenceOrder,
          dueAt: dueSoonItem.dueAt ? new Date(dueSoonItem.dueAt) : null,
          status: record?.status === 'in_progress' ? 'in_progress' : 'not_started',
          reason: 'due_soon',
          completionPercentage: progressSummary.overallPercentage
        };
      }

      // Priority 3: First incomplete item in curriculum sequence
      const nextSequentialItem = incompleteItems[0];
      const record = progressSummary.itemsMap[nextSequentialItem.contentItemId];
      return {
        hasTarget: true,
        batchId: targetBatchId,
        batchName: targetBatchName,
        contentItemId: nextSequentialItem.contentItemId,
        contentTitle: nextSequentialItem.title,
        contentType: nextSequentialItem.contentType as ContentType,
        weekNumber: nextSequentialItem.weekNumber,
        sequenceOrder: nextSequentialItem.sequenceOrder,
        dueAt: nextSequentialItem.dueAt ? new Date(nextSequentialItem.dueAt) : null,
        status: record?.status === 'in_progress' ? 'in_progress' : 'not_started',
        reason: 'next_in_sequence',
        completionPercentage: progressSummary.overallPercentage
      };
    }

    // 6. All unlocked items completed!
    // Check if future locked weeks exist
    if (lockedItems.length > 0) {
      const earliestFutureDate = lockedItems.reduce<Date | null>((earliest, curr) => {
        if (!curr.availableFrom) return earliest;
        const d = new Date(curr.availableFrom);
        if (!earliest || d < earliest) return d;
        return earliest;
      }, null);

      return {
        hasTarget: false,
        isCaughtUp: true,
        batchId: targetBatchId,
        batchName: targetBatchName,
        nextUnlockDate: earliestFutureDate,
        completionPercentage: progressSummary.overallPercentage
      };
    }

    // 7. Entire curriculum completed
    return {
      hasTarget: false,
      isCurriculumCompleted: true,
      batchId: targetBatchId,
      batchName: targetBatchName,
      completionPercentage: 100
    };
  } catch (error) {
    console.error('[ResumeLearning] Failed to resolve resume learning target:', error);
    return { hasTarget: false };
  }
}

/**
 * Resolves the next chronological curriculum item in a batch sequence.
 * Guarantees the target item is published, released (unlocked), and strictly sequential.
 *
 * @param studentId Authenticated student ID (students.id).
 * @param currentContentItemId UUID of the current content item.
 * @param batchId Cohort batch UUID.
 */
export async function getNextCurriculumItem(
  studentId: number,
  currentContentItemId: string,
  batchId?: string
): Promise<NextCurriculumItemTarget | null> {
  if (!studentId || !currentContentItemId || !batchId || !process.env.POSTGRES_URL) {
    return null;
  }

  try {
    const now = new Date();

    const curriculumRows = await db
      .select({
        contentItemId: batchCurriculum.contentItemId,
        title: contentItems.title,
        contentType: contentItems.contentType,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        availableFrom: batchCurriculum.availableFrom
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(contentItems.isPublished, true)
        )
      )
      .orderBy(
        asc(batchCurriculum.weekNumber),
        asc(batchCurriculum.sequenceOrder),
        asc(batchCurriculum.id)
      );

    const currentIndex = curriculumRows.findIndex(
      (r) => r.contentItemId === currentContentItemId
    );

    if (currentIndex === -1 || currentIndex >= curriculumRows.length - 1) {
      return null;
    }

    const nextRow = curriculumRows[currentIndex + 1];

    // Ensure next item is unlocked
    if (nextRow.availableFrom && new Date(nextRow.availableFrom).getTime() > now.getTime()) {
      return null;
    }

    return {
      contentItemId: nextRow.contentItemId,
      title: nextRow.title,
      contentType: nextRow.contentType as ContentType,
      weekNumber: nextRow.weekNumber,
      sequenceOrder: nextRow.sequenceOrder
    };
  } catch (error) {
    console.error('[NextCurriculumItem] Error resolving next curriculum item:', error);
    return null;
  }
}
