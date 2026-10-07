import 'server-only';

import { notFound } from 'next/navigation';
import {
  db,
  batches,
  programs,
  colleges,
  enrollments,
  batchCurriculum,
  contentItems,
  quizzes,
  quizAttempts,
  assignments,
  assignmentSubmissions,
  studentDsaProgress
} from '@rms/db';
import { eq, and, sql, asc } from 'drizzle-orm';
import { assertBatchEntitlement } from './entitlements';
import { getBatchProgressSummary } from './progress';
import type { ContentType, ContentItemMetadata } from '@/lib/types/library';
import type {
  CurriculumItem,
  CurriculumWeek,
  CurriculumItemStatus,
  BatchWorkspaceData,
  EnrolledBatchSummary
} from '@/lib/types/batch-workspace';

export type {
  CurriculumItem,
  CurriculumWeek,
  CurriculumItemStatus,
  BatchWorkspaceData,
  EnrolledBatchSummary
};

/**
 * Retrieves the complete chronological Batch Workspace dataset for an authenticated student.
 * Guarantees zero leakage of inaccessible batches or other cohorts' data.
 *
 * @param studentId Authenticated student ID (students.id).
 * @param batchId Target batch UUID.
 */
export async function getBatchWorkspace(
  studentId: number,
  batchId: string
): Promise<BatchWorkspaceData> {
  if (!studentId || !batchId || !process.env.POSTGRES_URL) {
    notFound();
  }

  // 1. Authorize: Throws 404 via Next.js notFound() if student is not actively/confirmed/completed enrolled in batchId
  const entitlement = await assertBatchEntitlement(studentId, batchId);

  try {
    // 2. Query Batch and Program details
    const [batchRecord] = await db
      .select({
        id: batches.id,
        name: batches.name,
        programId: batches.programId,
        programName: programs.name,
        programCode: programs.code,
        startDate: batches.startDate,
        endDate: batches.endDate,
        collegeName: colleges.name
      })
      .from(batches)
      .innerJoin(programs, eq(programs.id, batches.programId))
      .leftJoin(colleges, eq(colleges.id, batches.collegeId))
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batchRecord) {
      notFound();
    }

    // 3. Query all active enrolled batches for this student (for cohort switching context)
    const enrollmentRows = await db
      .select({
        batchId: batches.id,
        batchName: batches.name,
        programCode: programs.code,
        programName: programs.name
      })
      .from(enrollments)
      .innerJoin(batches, eq(batches.id, enrollments.batchId))
      .innerJoin(programs, eq(programs.id, enrollments.programId))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          sql`${enrollments.status} IN ('active', 'confirmed')`
        )
      );

    const activeEnrolledBatches: EnrolledBatchSummary[] = enrollmentRows.map((r) => ({
      batchId: r.batchId,
      batchName: r.batchName,
      programCode: r.programCode,
      programName: r.programName
    }));

    // 4. Query chronological batch curriculum
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
        description: contentItems.description,
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

    // 5. Query canonical progress summary via unified resolver
    const progressSummary = await getBatchProgressSummary(studentId, batchId);

    // 6. Map and group curriculum items by weekNumber
    const now = new Date();
    const weeksMap = new Map<number, CurriculumItem[]>();
    let totalCompleted = 0;

    for (const row of curriculumRows) {
      const meta = (row.metadata as ContentItemMetadata) || {};

      const progressRecord = progressSummary.itemsMap[row.contentItemId];
      const isCompleted = progressRecord?.status === 'completed';
      const isRevision = progressRecord?.status === 'needs_revision';
      const isInReview = progressRecord?.status === 'in_progress';

      if (isCompleted) {
        totalCompleted++;
      }

      const availableFrom = row.availableFrom ? new Date(row.availableFrom) : null;
      const dueAt = row.dueAt ? new Date(row.dueAt) : null;

      const isLocked = Boolean(availableFrom && availableFrom.getTime() > now.getTime());
      const isOverdue = Boolean(dueAt && dueAt.getTime() < now.getTime() && !isCompleted);
      const isArchived = Boolean(meta.isArchived === true || meta.status === 'archived');

      let status: CurriculumItemStatus = 'pending';
      if (isCompleted) {
        status = 'completed';
      } else if (isRevision) {
        status = 'needs_revision';
      } else if (isInReview) {
        status = 'in_review';
      } else if (isLocked) {
        status = 'locked';
      } else if (isOverdue) {
        status = 'overdue';
      } else if (isArchived) {
        status = 'archived';
      }

      const item: CurriculumItem = {
        id: row.id,
        batchId: row.batchId,
        contentItemId: row.contentItemId,
        title: row.title,
        slug: row.slug,
        contentType: row.contentType as ContentType,
        description: row.description,
        metadata: meta,
        weekNumber: row.weekNumber,
        sequenceOrder: row.sequenceOrder,
        isRequired: row.isRequired ?? true,
        availableFrom,
        dueAt,
        isCompleted,
        isLocked,
        isOverdue,
        isArchived,
        status
      };

      if (!weeksMap.has(row.weekNumber)) {
        weeksMap.set(row.weekNumber, []);
      }
      weeksMap.get(row.weekNumber)!.push(item);
    }

    const weeks: CurriculumWeek[] = Array.from(weeksMap.entries())
      .sort(([weekA], [weekB]) => weekA - weekB)
      .map(([weekNumber, items]) => ({
        weekNumber,
        items,
        totalCount: items.length,
        completedCount: items.filter((i) => i.isCompleted).length
      }));

    const totalMilestones = curriculumRows.length;
    const overallProgressPercent =
      totalMilestones > 0 ? Math.round((totalCompleted / totalMilestones) * 100) : 0;

    return {
      batch: {
        id: batchRecord.id,
        name: batchRecord.name,
        programId: batchRecord.programId,
        programName: batchRecord.programName,
        programCode: batchRecord.programCode,
        collegeName: batchRecord.collegeName,
        startDate: batchRecord.startDate,
        endDate: batchRecord.endDate
      },
      weeks,
      totalMilestones,
      completedMilestones: totalCompleted,
      overallProgressPercent,
      activeEnrolledBatches,
      isReadOnly: entitlement.enrollmentStatus === 'completed',
      enrollmentStatus: entitlement.enrollmentStatus
    };
  } catch (error: any) {
    if (error?.message === 'NEXT_NOT_FOUND' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }
    console.error('[BatchWorkspace] Error fetching batch workspace:', error);
    notFound();
  }
}
