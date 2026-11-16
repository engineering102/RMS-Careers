import 'server-only';

import {
  db,
  assignmentSubmissions,
  batchCurriculum,
  batchLiveSessions,
  batches,
  colleges,
  enrollments,
  programs,
  tutorBatchAssignments,
  tutors,
  users
} from '@rms/db';
import { and, count, countDistinct, desc, eq, inArray, sql } from 'drizzle-orm';
import type { AdminOverview } from '@/lib/overview/attention';

const EMPTY: AdminOverview = {
  counts: { activePrograms: 0, studentsWithAccess: 0, pendingEnrollments: 0, tutorsPendingActivation: 0 },
  batches: []
};

/**
 * Everything the Overview page shows, in five parallel read-only queries. Per-batch numbers are
 * scalar subqueries on one batch select, so the cost does not grow with a query per batch.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  try {
    if (!process.env.POSTGRES_URL) return EMPTY;

    const [batchRows, programRows, accessRows, pendingRows, tutorRows] = await Promise.all([
      db
        .select({
          id: batches.id,
          name: batches.name,
          status: batches.status,
          collegeCode: colleges.code,
          programCode: programs.code,
          startDate: batches.startDate,
          endDate: batches.endDate,
          studentCount: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.batchId} = ${batches.id} and ${enrollments.status} in ('active', 'confirmed'))`,
          pendingCount: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.batchId} = ${batches.id} and ${enrollments.status} = 'pending')`,
          tutorCount: sql<number>`(select count(*)::int from ${tutorBatchAssignments} where ${tutorBatchAssignments.batchId} = ${batches.id})`,
          curriculumCount: sql<number>`(select count(*)::int from ${batchCurriculum} where ${batchCurriculum.batchId} = ${batches.id})`,
          awaitingReviewCount: sql<number>`(select count(*)::int from ${assignmentSubmissions} where ${assignmentSubmissions.batchId} = ${batches.id} and ${assignmentSubmissions.status} in ('submitted', 'under_review'))`,
          unpublishedLiveSessionCount: sql<number>`(select count(*)::int from ${batchLiveSessions} where ${batchLiveSessions.batchId} = ${batches.id} and ${batchLiveSessions.isPublished} = false)`
        })
        .from(batches)
        .innerJoin(colleges, eq(batches.collegeId, colleges.id))
        .innerJoin(programs, eq(batches.programId, programs.id))
        .where(inArray(batches.status, ['draft', 'active']))
        .orderBy(desc(batches.createdAt)),
      db.select({ cnt: count() }).from(programs).where(eq(programs.status, 'active')),
      db
        .select({ cnt: countDistinct(enrollments.studentId) })
        .from(enrollments)
        .where(inArray(enrollments.status, ['active', 'confirmed'])),
      db.select({ cnt: count() }).from(enrollments).where(eq(enrollments.status, 'pending')),
      db
        .select({ cnt: count() })
        .from(tutors)
        .innerJoin(users, eq(users.id, tutors.userId))
        .where(and(eq(tutors.isActive, true), eq(users.status, 'pending_activation')))
    ]);

    return {
      counts: {
        activePrograms: Number(programRows[0]?.cnt ?? 0),
        studentsWithAccess: Number(accessRows[0]?.cnt ?? 0),
        pendingEnrollments: Number(pendingRows[0]?.cnt ?? 0),
        tutorsPendingActivation: Number(tutorRows[0]?.cnt ?? 0)
      },
      batches: batchRows.map((r) => ({
        ...r,
        studentCount: Number(r.studentCount ?? 0),
        pendingCount: Number(r.pendingCount ?? 0),
        tutorCount: Number(r.tutorCount ?? 0),
        curriculumCount: Number(r.curriculumCount ?? 0),
        awaitingReviewCount: Number(r.awaitingReviewCount ?? 0),
        unpublishedLiveSessionCount: Number(r.unpublishedLiveSessionCount ?? 0)
      }))
    };
  } catch (error) {
    console.error('Error fetching admin overview:', error instanceof Error ? error.message : 'unknown');
    return EMPTY;
  }
}
