import 'server-only';

// Moved from apps/admin/lib/db/queries/batch-projects.ts (tutor plan WS-4). Same SQL; the scope check in front of
// each query is new. apps/admin keeps its exported names as wrappers that pass adminScope().
import {
  batches,
  students,
  enrollments,
  contentItems,
  batchCurriculum,
  assignments,
  assignmentSubmissions,
  tutors,
  users,
  type SubmissionStatusEnum
} from '@rms/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import type { DbClient } from '@rms/db';
import { eq, and, sql, desc, inArray, ilike, or } from 'drizzle-orm';
import { isBatchInScope, type AcademicScope } from './scope';

// Reviewer attribution (migration 0006): reviewed_by_user_id names the account behind the last transition, admin or
// tutor. Display name: that user's tutor profile, else the user's name, else the legacy reviewed_by_tutor_id tutor
// (rows reviewed before 0006).
const reviewerUser = alias(users, 'reviewer_user');
const reviewerUserTutor = alias(tutors, 'reviewer_user_tutor');
const reviewerName = sql<string | null>`coalesce(${reviewerUserTutor.fullName}, ${reviewerUser.name}, ${tutors.fullName})`;
/** Exact `updated_at` (microseconds), the optimistic-concurrency token of review transitions. */
const submissionVersion = sql<string>`${assignmentSubmissions.updatedAt}::text`;

export interface RubricCriterion {
  id?: string;
  title: string;
  maxPoints: number;
  description?: string;
}

export interface BatchProjectOverviewItem {
  assignmentId: string;
  contentItemId: string;
  title: string;
  slug: string;
  description: string | null;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
  maxScore: number;
  rubricCriteria: RubricCriterion[];
  assignedStudentsCount: number;
  totalSubmissionsCount: number;
  submittedCount: number;
  underReviewCount: number;
  changesRequestedCount: number;
  approvedCount: number;
  latestSubmissionAt: Date | null;
}

export interface ProjectSubmissionListItem {
  submissionId: string;
  assignmentId: string;
  projectTitle: string;
  weekNumber: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  status: SubmissionStatusEnum;
  score: number | null;
  maxScore: number;
  githubUrl: string;
  liveUrl: string | null;
  notes: string | null;
  tutorFeedback: string | null;
  reviewedByTutorId: string | null;
  reviewedByTutorName: string | null;
  reviewedByUserId: string | null;
  /** Reviewer display name (see reviewerName). */
  reviewedByName: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  updatedAt: Date;
}

export interface ProjectSubmissionInspectorDetails {
  submissionId: string;
  batchId: string;
  batchName: string;
  assignmentId: string;
  projectTitle: string;
  projectDescription: string | null;
  weekNumber: number;
  dueAt: Date | null;
  maxScore: number;
  rubricCriteria: RubricCriterion[];
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  status: SubmissionStatusEnum;
  score: number | null;
  githubUrl: string;
  liveUrl: string | null;
  notes: string | null;
  tutorFeedback: string | null;
  reviewedByTutorId: string | null;
  reviewedByTutorName: string | null;
  reviewedByUserId: string | null;
  /** Reviewer display name (see reviewerName). */
  reviewedByName: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  updatedAt: Date;
  /** Pass back as expectedVersion when reviewing. */
  version: string;
  allowedTransitions: SubmissionStatusEnum[];
}

export interface ProjectSubmissionFilters {
  assignmentId?: string;
  status?: 'all' | SubmissionStatusEnum;
  search?: string;
}

/**
 * Retrieves an aggregated overview of all project assignments assigned to a batch via batchCurriculum.
 * Strict batch-isolation: all counts and stats are scoped strictly to the target batchId.
 */
export async function getBatchProjectsOverview(
  client: DbClient,
  scope: AcademicScope,
  batchId: string
): Promise<BatchProjectOverviewItem[]> {
  if (!isBatchInScope(scope, batchId)) return [];
  try {

    // 1. Verify batch exists
    const [batch] = await client
      .select({ id: batches.id })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) {
      return [];
    }

    // 2. Count active eligible students enrolled in this batch
    const [enrolledCountRow] = await client
      .select({
        count: sql<number>`count(distinct ${enrollments.studentId})::int`
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.batchId, batchId),
          sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
        )
      );

    const assignedStudentsCount = enrolledCountRow?.count || 0;

    // 3. Query all project content items placed in this batch curriculum
    const assignedRows = await client
      .select({
        contentItemId: batchCurriculum.contentItemId,
        weekNumber: batchCurriculum.weekNumber,
        sequenceOrder: batchCurriculum.sequenceOrder,
        isRequired: batchCurriculum.isRequired,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt,
        title: contentItems.title,
        slug: contentItems.slug,
        description: contentItems.description,
        assignmentId: assignments.id,
        maxScore: assignments.maxScore,
        rubricCriteria: assignments.rubricCriteria
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .innerJoin(assignments, eq(assignments.contentItemId, contentItems.id))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(contentItems.contentType, 'project')
        )
      )
      .orderBy(batchCurriculum.weekNumber, batchCurriculum.sequenceOrder);

    if (assignedRows.length === 0) {
      return [];
    }

    const assignmentIds = assignedRows.map((r) => r.assignmentId);

    // 4. Query submissions grouped by assignment and status for this batch
    const submissions = await client
      .select({
        assignmentId: assignmentSubmissions.assignmentId,
        status: assignmentSubmissions.status,
        submittedAt: assignmentSubmissions.submittedAt
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.batchId, batchId),
          inArray(assignmentSubmissions.assignmentId, assignmentIds)
        )
      );

    // Group submission statistics
    const statsMap = new Map<
      string,
      {
        total: number;
        submitted: number;
        underReview: number;
        changesRequested: number;
        approved: number;
        latestSubmissionAt: Date | null;
      }
    >();

    for (const sub of submissions) {
      const existing = statsMap.get(sub.assignmentId) || {
        total: 0,
        submitted: 0,
        underReview: 0,
        changesRequested: 0,
        approved: 0,
        latestSubmissionAt: null
      };

      existing.total += 1;
      if (sub.status === 'submitted') existing.submitted++;
      else if (sub.status === 'under_review') existing.underReview++;
      else if (sub.status === 'resubmission_requested') existing.changesRequested++;
      else if (sub.status === 'approved') existing.approved++;

      if (
        sub.submittedAt &&
        (!existing.latestSubmissionAt || new Date(sub.submittedAt) > existing.latestSubmissionAt)
      ) {
        existing.latestSubmissionAt = new Date(sub.submittedAt);
      }

      statsMap.set(sub.assignmentId, existing);
    }

    return assignedRows.map((row) => {
      const stats = statsMap.get(row.assignmentId);
      const rawRubric = Array.isArray(row.rubricCriteria) ? row.rubricCriteria : [];

      return {
        assignmentId: row.assignmentId,
        contentItemId: row.contentItemId,
        title: row.title,
        slug: row.slug,
        description: row.description,
        weekNumber: row.weekNumber,
        sequenceOrder: row.sequenceOrder,
        isRequired: row.isRequired,
        availableFrom: row.availableFrom,
        dueAt: row.dueAt,
        maxScore: row.maxScore || 100,
        rubricCriteria: rawRubric as RubricCriterion[],
        assignedStudentsCount,
        totalSubmissionsCount: stats?.total || 0,
        submittedCount: stats?.submitted || 0,
        underReviewCount: stats?.underReview || 0,
        changesRequestedCount: stats?.changesRequested || 0,
        approvedCount: stats?.approved || 0,
        latestSubmissionAt: stats?.latestSubmissionAt || null
      };
    });
  } catch (error) {
    console.error('Error fetching batch projects overview:', error);
    return [];
  }
}

/**
 * Retrieves submissions for project assignments within a batch with operational filters.
 * Strict batch-isolation: only submissions matching batchId are returned.
 */
export async function getBatchProjectSubmissions(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  filters: ProjectSubmissionFilters = {}
): Promise<ProjectSubmissionListItem[]> {
  if (!isBatchInScope(scope, batchId)) return [];
  try {

    const conditions = [eq(assignmentSubmissions.batchId, batchId)];

    if (filters.assignmentId) {
      conditions.push(eq(assignmentSubmissions.assignmentId, filters.assignmentId));
    }

    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(assignmentSubmissions.status, filters.status));
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(students.fullName, term),
          ilike(students.email, term),
          ilike(students.collegeRollNumber, term),
          ilike(assignmentSubmissions.githubUrl, term)
        )!
      );
    }

    const rows = await client
      .select({
        submissionId: assignmentSubmissions.id,
        assignmentId: assignmentSubmissions.assignmentId,
        projectTitle: contentItems.title,
        weekNumber: batchCurriculum.weekNumber,
        studentId: students.id,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        maxScore: assignments.maxScore,
        githubUrl: assignmentSubmissions.githubUrl,
        liveUrl: assignmentSubmissions.liveUrl,
        notes: assignmentSubmissions.notes,
        tutorFeedback: assignmentSubmissions.tutorFeedback,
        reviewedByTutorId: assignmentSubmissions.reviewedByTutorId,
        reviewedByTutorName: tutors.fullName,
        reviewedByUserId: assignmentSubmissions.reviewedByUserId,
        reviewedByName: reviewerName,
        reviewedAt: assignmentSubmissions.reviewedAt,
        submittedAt: assignmentSubmissions.submittedAt,
        updatedAt: assignmentSubmissions.updatedAt
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
      .innerJoin(
        batchCurriculum,
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(batchCurriculum.contentItemId, assignments.contentItemId)
        )
      )
      .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
      .leftJoin(tutors, eq(tutors.id, assignmentSubmissions.reviewedByTutorId))
      .leftJoin(reviewerUser, eq(reviewerUser.id, assignmentSubmissions.reviewedByUserId))
      .leftJoin(reviewerUserTutor, eq(reviewerUserTutor.userId, assignmentSubmissions.reviewedByUserId))
      .where(and(...conditions))
      .orderBy(desc(assignmentSubmissions.submittedAt));

    return rows.map((r) => ({
      submissionId: r.submissionId,
      assignmentId: r.assignmentId,
      projectTitle: r.projectTitle,
      weekNumber: r.weekNumber,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      collegeRollNumber: r.collegeRollNumber,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore || 100,
      githubUrl: r.githubUrl,
      liveUrl: r.liveUrl,
      notes: r.notes,
      tutorFeedback: r.tutorFeedback,
      reviewedByTutorId: r.reviewedByTutorId,
      reviewedByTutorName: r.reviewedByTutorName || null,
      reviewedByUserId: r.reviewedByUserId ?? null,
      reviewedByName: r.reviewedByName || r.reviewedByTutorName || null,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null,
      submittedAt: new Date(r.submittedAt),
      updatedAt: new Date(r.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching batch project submissions:', error);
    return [];
  }
}

/**
 * Retrieves full details for an individual project submission.
 * Cross-batch isolation invariant: validates that the submission strictly belongs to batchId.
 */
export async function getBatchProjectSubmissionDetails(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  submissionId: string
): Promise<ProjectSubmissionInspectorDetails | null> {
  if (!isBatchInScope(scope, batchId)) return null;
  try {

    const [row] = await client
      .select({
        submissionId: assignmentSubmissions.id,
        batchId: assignmentSubmissions.batchId,
        batchName: batches.name,
        assignmentId: assignmentSubmissions.assignmentId,
        projectTitle: contentItems.title,
        projectDescription: contentItems.description,
        weekNumber: batchCurriculum.weekNumber,
        dueAt: batchCurriculum.dueAt,
        maxScore: assignments.maxScore,
        rubricCriteria: assignments.rubricCriteria,
        studentId: students.id,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
        githubUrl: assignmentSubmissions.githubUrl,
        liveUrl: assignmentSubmissions.liveUrl,
        notes: assignmentSubmissions.notes,
        tutorFeedback: assignmentSubmissions.tutorFeedback,
        reviewedByTutorId: assignmentSubmissions.reviewedByTutorId,
        reviewedByTutorName: tutors.fullName,
        reviewedByUserId: assignmentSubmissions.reviewedByUserId,
        reviewedByName: reviewerName,
        reviewedAt: assignmentSubmissions.reviewedAt,
        submittedAt: assignmentSubmissions.submittedAt,
        updatedAt: assignmentSubmissions.updatedAt,
        version: submissionVersion
      })
      .from(assignmentSubmissions)
      .innerJoin(batches, eq(batches.id, assignmentSubmissions.batchId))
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
      .innerJoin(
        batchCurriculum,
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(batchCurriculum.contentItemId, assignments.contentItemId)
        )
      )
      .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
      .leftJoin(tutors, eq(tutors.id, assignmentSubmissions.reviewedByTutorId))
      .leftJoin(reviewerUser, eq(reviewerUser.id, assignmentSubmissions.reviewedByUserId))
      .leftJoin(reviewerUserTutor, eq(reviewerUserTutor.userId, assignmentSubmissions.reviewedByUserId))
      .where(
        and(
          eq(assignmentSubmissions.id, submissionId),
          eq(assignmentSubmissions.batchId, batchId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const rawRubric = Array.isArray(row.rubricCriteria) ? row.rubricCriteria : [];
    const allowedTransitions = computeAllowedTransitions(row.status);

    return {
      submissionId: row.submissionId,
      batchId: row.batchId,
      batchName: row.batchName,
      assignmentId: row.assignmentId,
      projectTitle: row.projectTitle,
      projectDescription: row.projectDescription,
      weekNumber: row.weekNumber,
      dueAt: row.dueAt ? new Date(row.dueAt) : null,
      maxScore: row.maxScore || 100,
      rubricCriteria: rawRubric as RubricCriterion[],
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      collegeRollNumber: row.collegeRollNumber,
      status: row.status,
      score: row.score,
      githubUrl: row.githubUrl,
      liveUrl: row.liveUrl,
      notes: row.notes,
      tutorFeedback: row.tutorFeedback,
      reviewedByTutorId: row.reviewedByTutorId,
      reviewedByTutorName: row.reviewedByTutorName || null,
      reviewedByUserId: row.reviewedByUserId ?? null,
      reviewedByName: row.reviewedByName || row.reviewedByTutorName || null,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
      submittedAt: new Date(row.submittedAt),
      updatedAt: new Date(row.updatedAt),
      version: row.version,
      allowedTransitions
    };
  } catch (error) {
    console.error('Error fetching batch project submission details:', error);
    return null;
  }
}

/**
 * State machine logic: returns valid forward transitions for a given submission status.
 */
export function computeAllowedTransitions(status: SubmissionStatusEnum): SubmissionStatusEnum[] {
  switch (status) {
    case 'submitted':
      return ['under_review'];
    case 'under_review':
      return ['resubmission_requested', 'approved'];
    case 'resubmission_requested':
      return ['under_review'];
    case 'approved':
      return []; // Terminal state
    default:
      return [];
  }
}
