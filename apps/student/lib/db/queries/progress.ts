import 'server-only';

import { notFound } from 'next/navigation';
import {
  db,
  batches,
  batchCurriculum,
  contentItems,
  activities,
  quizzes,
  quizAttempts,
  assignments,
  assignmentSubmissions,
  studentDsaProgress
} from '@rms/db';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { assertBatchEntitlement } from './entitlements';
import type {
  ContentCompletionStatus,
  ContentProgressRecord,
  WeekProgressSummary,
  BatchProgressSummary
} from '@/lib/types/progress';
import type { ContentType, ContentItemMetadata } from '@/lib/types/library';

export type {
  ContentCompletionStatus,
  ContentProgressRecord,
  WeekProgressSummary,
  BatchProgressSummary
};

/**
 * Resolves the unified, multi-source BatchProgressSummary for an authenticated student in a batch.
 * Guarantees zero N+1 queries by executing parallelized batched lookups across completion sources.
 *
 * @param studentId Authenticated student ID (students.id).
 * @param batchId Target cohort batch UUID.
 */
export async function getBatchProgressSummary(
  studentId: number,
  batchId: string
): Promise<BatchProgressSummary> {
  if (!studentId || !batchId || !process.env.POSTGRES_URL) {
    notFound();
  }

  // 1. Authorize: Guarantees the student is actively/confirmed/completed enrolled in the batch
  const entitlement = await assertBatchEntitlement(studentId, batchId);

  try {
    const batchName = entitlement.batchName || 'Cohort Batch';

    const curriculumRows = await db
      .select({
        id: batchCurriculum.id,
        batchId: batchCurriculum.batchId,
        contentItemId: batchCurriculum.contentItemId,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        isRequired: batchCurriculum.isRequired,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        metadata: contentItems.metadata,
        isPublished: contentItems.isPublished
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

    if (curriculumRows.length === 0) {
      return {
        batchId,
        batchName,
        totalRequiredItems: 0,
        completedRequiredItems: 0,
        overallPercentage: 0,
        weeks: [],
        itemsMap: {}
      };
    }

    // 3. Classify content item IDs for batched queries
    const lectureContentItemIds: string[] = [];
    const quizContentItemIds: string[] = [];
    const projectContentItemIds: string[] = [];
    const dsaSheetSlugs: string[] = [];

    for (const row of curriculumRows) {
      const type = row.contentType as ContentType;
      if (type === 'lecture' || type === 'notes' || type === 'resource') {
        lectureContentItemIds.push(row.contentItemId);
      } else if (type === 'quiz') {
        quizContentItemIds.push(row.contentItemId);
      } else if (type === 'project') {
        projectContentItemIds.push(row.contentItemId);
      } else if (type === 'dsa_sheet') {
        const meta = (row.metadata as ContentItemMetadata) || {};
        const slug = (typeof meta.slug === 'string' ? meta.slug : row.slug) || '';
        if (slug) dsaSheetSlugs.push(slug);
      }
    }

    // 4. Concurrently query all 4 completion sources in single batched queries
    const [
      activityRecords,
      quizAttemptRecords,
      projectSubmissionRecords,
      dsaProgressRecords
    ] = await Promise.all([
      // Lectures/notes/resources completion from activities (global to student)
      lectureContentItemIds.length > 0
        ? db
            .select({
              referenceId: activities.referenceId,
              createdAt: activities.createdAt
            })
            .from(activities)
            .where(
              and(
                eq(activities.studentId, studentId),
                eq(activities.activityType, 'lecture_completed'),
                inArray(activities.referenceId, lectureContentItemIds)
              )
            )
        : Promise.resolve([]),

      // Quiz attempts with pass status (content-scoped credit)
      quizContentItemIds.length > 0
        ? db
            .select({
              contentItemId: quizzes.contentItemId,
              isPassed: quizAttempts.isPassed,
              score: quizAttempts.score,
              maxScore: quizAttempts.maxScore,
              submittedAt: quizAttempts.submittedAt
            })
            .from(quizAttempts)
            .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
            .where(
              and(
                eq(quizAttempts.studentId, studentId),
                inArray(quizzes.contentItemId, quizContentItemIds)
              )
            )
        : Promise.resolve([]),

      // Project assignment submissions (batch-scoped)
      projectContentItemIds.length > 0
        ? db
            .select({
              contentItemId: assignments.contentItemId,
              status: assignmentSubmissions.status,
              score: assignmentSubmissions.score,
              submittedAt: assignmentSubmissions.submittedAt,
              reviewedAt: assignmentSubmissions.reviewedAt
            })
            .from(assignmentSubmissions)
            .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
            .where(
              and(
                eq(assignmentSubmissions.studentId, studentId),
                eq(assignmentSubmissions.batchId, batchId),
                inArray(assignments.contentItemId, projectContentItemIds)
              )
            )
        : Promise.resolve([]),

      // DSA problems completion (global to student)
      dsaSheetSlugs.length > 0
        ? db
            .select({
              problemSlug: studentDsaProgress.problemSlug,
              isCompleted: studentDsaProgress.isCompleted,
              completedAt: studentDsaProgress.completedAt
            })
            .from(studentDsaProgress)
            .where(
              and(
                eq(studentDsaProgress.studentId, studentId),
                inArray(studentDsaProgress.problemSlug, dsaSheetSlugs)
              )
            )
        : Promise.resolve([])
    ]);

    // 5. Index completion lookups in memory
    const lectureCompletedMap = new Map<string, { completedAt: Date }>();
    for (const act of activityRecords) {
      if (act.referenceId) {
        lectureCompletedMap.set(act.referenceId, { completedAt: act.createdAt });
      }
    }

    const quizMap = new Map<
      string,
      { isPassed: boolean; score: number; maxScore: number; completedAt: Date | null; hasAttempts: boolean }
    >();
    for (const qa of quizAttemptRecords) {
      if (!qa.contentItemId) continue;
      const prev = quizMap.get(qa.contentItemId);
      const isPassed = qa.isPassed === true || (qa.isPassed === undefined && !('isPassed' in qa));
      if (!prev) {
        quizMap.set(qa.contentItemId, {
          isPassed,
          score: qa.score ?? 0,
          maxScore: qa.maxScore,
          completedAt: qa.submittedAt ?? null,
          hasAttempts: true
        });
      } else {
        // If any attempt passed, record is passed
        if (isPassed && !prev.isPassed) {
          prev.isPassed = true;
          prev.score = qa.score ?? prev.score;
          prev.maxScore = qa.maxScore ?? prev.maxScore;
          prev.completedAt = qa.submittedAt ?? prev.completedAt;
        }
      }
    }

    const projectMap = new Map<
      string,
      {
        status: string;
        score: number | null;
        completedAt: Date | null;
      }
    >();
    for (const sub of projectSubmissionRecords) {
      if (sub.contentItemId) {
        projectMap.set(sub.contentItemId, {
          status: sub.status,
          score: sub.score,
          completedAt: sub.reviewedAt || sub.submittedAt || null
        });
      }
    }

    const dsaMap = new Map<string, { isCompleted: boolean; completedAt: Date | null }>();
    for (const dsa of dsaProgressRecords) {
      if (dsa.problemSlug) {
        dsaMap.set(dsa.problemSlug, {
          isCompleted: Boolean(dsa.isCompleted),
          completedAt: dsa.completedAt ?? null
        });
      }
    }

    // 6. Aggregate completion records for each curriculum item
    const itemsMap: Record<string, ContentProgressRecord> = {};
    let totalRequiredItems = 0;
    let completedRequiredItems = 0;

    const weeksMap = new Map<
      number,
      {
        totalItems: number;
        completedItems: number;
        availableFrom: Date | null;
      }
    >();

    const now = new Date();

    for (const row of curriculumRows) {
      const type = row.contentType as ContentType;
      let status: ContentCompletionStatus = 'not_started';
      let completedAt: Date | null = null;
      let score: number | null = null;
      let maxScore: number | null = null;
      let details: ContentProgressRecord['details'] = undefined;

      if (type === 'lecture' || type === 'notes' || type === 'resource') {
        const act = lectureCompletedMap.get(row.contentItemId);
        if (act) {
          status = 'completed';
          completedAt = act.completedAt;
        }
      } else if (type === 'quiz') {
        const qz = quizMap.get(row.contentItemId);
        if (qz) {
          score = qz.score;
          maxScore = qz.maxScore;
          details = { isPassed: qz.isPassed };
          if (qz.isPassed) {
            status = 'completed';
            completedAt = qz.completedAt;
          } else if (qz.hasAttempts) {
            status = 'in_progress';
          }
        }
      } else if (type === 'project') {
        const prj = projectMap.get(row.contentItemId);
        if (prj) {
          score = prj.score;
          details = { submissionStatus: prj.status };
          if (prj.status === 'approved') {
            status = 'completed';
            completedAt = prj.completedAt;
          } else if (prj.status === 'resubmission_requested') {
            status = 'needs_revision';
          } else if (prj.status === 'submitted' || prj.status === 'under_review') {
            status = 'in_progress';
          }
        }
      } else if (type === 'dsa_sheet') {
        const meta = (row.metadata as ContentItemMetadata) || {};
        const slug = (typeof meta.slug === 'string' ? meta.slug : row.slug) || '';
        const dsa = slug ? dsaMap.get(slug) : undefined;
        if (dsa && dsa.isCompleted) {
          status = 'completed';
          completedAt = dsa.completedAt;
          details = { problemSlug: slug };
        }
      }

      itemsMap[row.contentItemId] = {
        contentItemId: row.contentItemId,
        contentType: type,
        status,
        completedAt,
        score,
        maxScore,
        details
      };

      const isRequired = row.isRequired ?? true;
      if (isRequired) {
        totalRequiredItems++;
        if (status === 'completed') {
          completedRequiredItems++;
        }
      }

      // Group week progress
      const weekNum = row.weekNumber;
      if (!weeksMap.has(weekNum)) {
        weeksMap.set(weekNum, {
          totalItems: 0,
          completedItems: 0,
          availableFrom: row.availableFrom ? new Date(row.availableFrom) : null
        });
      }

      const weekData = weeksMap.get(weekNum)!;
      weekData.totalItems++;
      if (status === 'completed') {
        weekData.completedItems++;
      }
      if (row.availableFrom) {
        const rowAvail = new Date(row.availableFrom);
        if (!weekData.availableFrom || rowAvail < weekData.availableFrom) {
          weekData.availableFrom = rowAvail;
        }
      }
    }

    // 7. Calculate week summaries
    const weeks: WeekProgressSummary[] = Array.from(weeksMap.entries())
      .sort(([wA], [wB]) => wA - wB)
      .map(([weekNumber, data]) => {
        const isUnlocked = !data.availableFrom || data.availableFrom.getTime() <= now.getTime();
        const percentage =
          data.totalItems > 0 ? Math.round((data.completedItems / data.totalItems) * 100) : 0;
        return {
          weekNumber,
          totalItems: data.totalItems,
          completedItems: data.completedItems,
          percentage,
          isUnlocked,
          availableFrom: data.availableFrom
        };
      });

    const overallPercentage =
      totalRequiredItems > 0
        ? Math.round((completedRequiredItems / totalRequiredItems) * 100)
        : 0;

    return {
      batchId,
      batchName,
      totalRequiredItems,
      completedRequiredItems,
      overallPercentage,
      weeks,
      itemsMap
    };
  } catch (error: any) {
    if (error?.message === 'NEXT_NOT_FOUND' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }
    console.error('[ProgressQuery] Error resolving batch progress summary:', error);
    notFound();
  }
}
