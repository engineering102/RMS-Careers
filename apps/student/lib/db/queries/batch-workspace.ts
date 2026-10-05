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

  // 1. Authorize: Throws 404 via Next.js notFound() if student is not actively enrolled in batchId
  await assertBatchEntitlement(studentId, batchId);

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

    // 5. Query student completion records
    const completedQuizContentItemIds = new Set<string>();
    const completedAssignmentContentItemIds = new Set<string>();
    const completedDsaSlugs = new Set<string>();

    if (curriculumRows.length > 0) {
      // Completed / passed quizzes
      const passedQuizzes = await db
        .select({ contentItemId: quizzes.contentItemId })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
        .where(
          and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.isPassed, true)
          )
        );
      passedQuizzes.forEach((pq) => {
        if (pq.contentItemId) completedQuizContentItemIds.add(pq.contentItemId);
      });

      // Submitted project assignments
      const submittedProjects = await db
        .select({ contentItemId: assignments.contentItemId })
        .from(assignmentSubmissions)
        .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
        .where(eq(assignmentSubmissions.studentId, studentId));
      submittedProjects.forEach((sp) => {
        if (sp.contentItemId) completedAssignmentContentItemIds.add(sp.contentItemId);
      });

      // Solved DSA problems
      const solvedDsa = await db
        .select({ problemSlug: studentDsaProgress.problemSlug })
        .from(studentDsaProgress)
        .where(
          and(
            eq(studentDsaProgress.studentId, studentId),
            eq(studentDsaProgress.isCompleted, true)
          )
        );
      solvedDsa.forEach((d) => {
        if (d.problemSlug) completedDsaSlugs.add(d.problemSlug);
      });
    }

    // 6. Map and group curriculum items by weekNumber
    const now = new Date();
    const weeksMap = new Map<number, CurriculumItem[]>();
    let totalCompleted = 0;

    for (const row of curriculumRows) {
      const meta = (row.metadata as ContentItemMetadata) || {};

      let isCompleted = false;
      if (row.contentType === 'quiz') {
        isCompleted = completedQuizContentItemIds.has(row.contentItemId);
      } else if (row.contentType === 'project') {
        isCompleted = completedAssignmentContentItemIds.has(row.contentItemId);
      } else if (row.contentType === 'dsa_sheet') {
        isCompleted = completedDsaSlugs.has(row.slug);
      }

      if (isCompleted) {
        totalCompleted++;
      }

      const availableFrom = row.availableFrom ? new Date(row.availableFrom) : null;
      const dueAt = row.dueAt ? new Date(row.dueAt) : null;

      const isLocked = Boolean(availableFrom && availableFrom.getTime() > now.getTime());
      const isOverdue = Boolean(dueAt && dueAt.getTime() < now.getTime() && !isCompleted);

      let status: CurriculumItemStatus = 'pending';
      if (isCompleted) {
        status = 'completed';
      } else if (isLocked) {
        status = 'locked';
      } else if (isOverdue) {
        status = 'overdue';
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
        availableFrom,
        dueAt,
        isCompleted,
        isLocked,
        isOverdue,
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
      activeEnrolledBatches
    };
  } catch (error: any) {
    if (error?.message === 'NEXT_NOT_FOUND' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }
    console.error('[BatchWorkspace] Error fetching batch workspace:', error);
    notFound();
  }
}
