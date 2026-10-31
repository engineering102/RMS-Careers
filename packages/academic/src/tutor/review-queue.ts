import 'server-only';

/**
 * Cross-batch review queue and review detail for tutors (tutor plan §8, §14.2). Everything is filtered by the
 * scope in SQL, so a submission of another batch is indistinguishable from one that does not exist.
 *
 * Queue: oldest first, ordered by (submitted_at, id), keyset-paginated with an opaque cursor; the per-status counts
 * are a separate grouped query.
 */
import { and, asc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  batches,
  contentItems,
  students,
  tutors,
  users,
  type SubmissionStatusEnum
} from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { inScope, isBatchInScope, type AcademicScope } from '../scope';
import { availableTransitions, type ReviewTransition } from '../review-rules';
import type { RubricCriterion } from '../projects';

export const REVIEW_QUEUE_PAGE_SIZE = 25;
export const REVIEW_STATUSES = ['submitted', 'under_review', 'resubmission_requested', 'approved'] as const;
/** The default view: work that needs a reviewer. */
export const OPEN_REVIEW_STATUSES: readonly SubmissionStatusEnum[] = ['submitted', 'under_review'];
const MAX_SEARCH_LENGTH = 100;

const reviewerUser = alias(users, 'reviewer_user');
const reviewerUserTutor = alias(tutors, 'reviewer_user_tutor');
const legacyReviewer = alias(tutors, 'legacy_reviewer');
const reviewerName = sql<string | null>`coalesce(${reviewerUserTutor.fullName}, ${reviewerUser.name}, ${legacyReviewer.fullName})`;

export interface ReviewQueueFilters {
  statuses?: readonly SubmissionStatusEnum[];
  batchId?: string;
  assignmentId?: string;
  /** Only submissions this user last acted on (their claims). */
  mineUserId?: string;
  /** Student name or roll number. */
  search?: string;
}

export interface ReviewQueueRow {
  submissionId: string;
  batchId: string;
  batchName: string;
  assignmentId: string;
  projectTitle: string;
  studentId: number;
  studentName: string;
  collegeRollNumber: string | null;
  status: SubmissionStatusEnum;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  /** Submitted again after a review (reviewed_at set while status is submitted). */
  isResubmission: boolean;
}

export interface ReviewQueuePage {
  rows: ReviewQueueRow[];
  nextCursor: string | null;
}

// ---- cursor ---------------------------------------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres timestamptz text, e.g. "2026-10-29 10:15:42.123456+00".
const PG_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/;

// Base64url via btoa/atob (both ASCII-only here), available in Workers and Node alike.
export function encodeQueueCursor(submittedAt: string, id: string): string {
  return btoa(JSON.stringify([submittedAt, id])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Null for anything that is not a cursor this module issued (treated as the first page). */
export function decodeQueueCursor(cursor: string | null | undefined): { submittedAt: string; id: string } | null {
  if (!cursor || cursor.length > 200) return null;
  try {
    const value = JSON.parse(atob(cursor.replace(/-/g, '+').replace(/_/g, '/')));
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [submittedAt, id] = value;
    if (typeof submittedAt !== 'string' || typeof id !== 'string') return null;
    if (!PG_TIMESTAMP.test(submittedAt) || !UUID.test(id)) return null;
    return { submittedAt, id };
  } catch {
    return null;
  }
}

// ---- queue ----------------------------------------------------------------------------------------------------------

function queueConditions(scope: AcademicScope, filters: ReviewQueueFilters): SQL[] {
  const conditions: (SQL | undefined)[] = [inScope(assignmentSubmissions.batchId, scope)];
  const statuses = filters.statuses?.length ? filters.statuses : null;
  if (statuses) conditions.push(inArray(assignmentSubmissions.status, [...statuses]));
  if (filters.batchId) conditions.push(eq(assignmentSubmissions.batchId, filters.batchId));
  if (filters.assignmentId) conditions.push(eq(assignmentSubmissions.assignmentId, filters.assignmentId));
  if (filters.mineUserId) conditions.push(eq(assignmentSubmissions.reviewedByUserId, filters.mineUserId));
  const search = filters.search?.trim().slice(0, MAX_SEARCH_LENGTH);
  if (search) {
    const term = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(students.fullName, term), ilike(students.collegeRollNumber, term)));
  }
  return conditions.filter((c): c is SQL => c !== undefined);
}

export async function getReviewQueue(
  client: DbClient,
  scope: AcademicScope,
  filters: ReviewQueueFilters = {},
  cursor?: string | null,
  pageSize: number = REVIEW_QUEUE_PAGE_SIZE
): Promise<ReviewQueuePage> {
  if (filters.batchId && !isBatchInScope(scope, filters.batchId)) return { rows: [], nextCursor: null };
  const conditions = queueConditions(scope, filters);
  const after = decodeQueueCursor(cursor);
  if (after) {
    conditions.push(
      sql`(${assignmentSubmissions.submittedAt}, ${assignmentSubmissions.id}) > (${after.submittedAt}::timestamptz, ${after.id}::uuid)`
    );
  }

  const rows = await client
    .select({
      submissionId: assignmentSubmissions.id,
      batchId: assignmentSubmissions.batchId,
      batchName: batches.name,
      assignmentId: assignmentSubmissions.assignmentId,
      projectTitle: contentItems.title,
      studentId: students.id,
      studentName: students.fullName,
      collegeRollNumber: students.collegeRollNumber,
      status: assignmentSubmissions.status,
      submittedAt: assignmentSubmissions.submittedAt,
      submittedAtText: sql<string>`${assignmentSubmissions.submittedAt}::text`,
      reviewedAt: assignmentSubmissions.reviewedAt,
      reviewedByUserId: assignmentSubmissions.reviewedByUserId,
      reviewedByName: reviewerName
    })
    .from(assignmentSubmissions)
    .innerJoin(batches, eq(batches.id, assignmentSubmissions.batchId))
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .leftJoin(legacyReviewer, eq(legacyReviewer.id, assignmentSubmissions.reviewedByTutorId))
    .leftJoin(reviewerUser, eq(reviewerUser.id, assignmentSubmissions.reviewedByUserId))
    .leftJoin(reviewerUserTutor, eq(reviewerUserTutor.userId, assignmentSubmissions.reviewedByUserId))
    .where(and(...conditions))
    .orderBy(asc(assignmentSubmissions.submittedAt), asc(assignmentSubmissions.id))
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const last = page[page.length - 1];
  return {
    rows: page.map(({ submittedAtText: _text, ...r }) => ({
      ...r,
      submittedAt: new Date(r.submittedAt),
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null,
      isResubmission: r.status === 'submitted' && r.reviewedAt !== null
    })),
    nextCursor: rows.length > pageSize && last ? encodeQueueCursor(last.submittedAtText, last.submissionId) : null
  };
}

/** Submissions per status for the same filters (statuses aside), for the queue's tabs. */
export async function getReviewQueueCounts(
  client: DbClient,
  scope: AcademicScope,
  filters: Omit<ReviewQueueFilters, 'statuses'> = {}
): Promise<Record<SubmissionStatusEnum, number>> {
  const counts: Record<SubmissionStatusEnum, number> = { submitted: 0, under_review: 0, resubmission_requested: 0, approved: 0 };
  if (filters.batchId && !isBatchInScope(scope, filters.batchId)) return counts;
  const rows = await client
    .select({ status: assignmentSubmissions.status, count: sql<number>`count(*)::int` })
    .from(assignmentSubmissions)
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .where(and(...queueConditions(scope, filters)))
    .groupBy(assignmentSubmissions.status);
  for (const r of rows) counts[r.status] = Number(r.count);
  return counts;
}

// ---- detail ---------------------------------------------------------------------------------------------------------

export interface ReviewSubmissionDetail {
  submissionId: string;
  batchId: string;
  batchName: string;
  assignmentId: string;
  projectTitle: string;
  projectDescription: string | null;
  weekNumber: number | null;
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
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  submittedAt: Date;
  isResubmission: boolean;
  /** Pass back as expectedVersion when reviewing. */
  version: string;
  /** What a tutor may do next (never the admin-only overrides). */
  transitions: ReviewTransition[];
}

/** Authorization and fetch in one statement: null for unknown and out-of-scope submissions alike. */
export async function getReviewSubmission(
  client: DbClient,
  scope: AcademicScope,
  submissionId: string
): Promise<ReviewSubmissionDetail | null> {
  if (!UUID.test(submissionId)) return null;
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
      reviewedByUserId: assignmentSubmissions.reviewedByUserId,
      reviewedByName: reviewerName,
      reviewedAt: assignmentSubmissions.reviewedAt,
      submittedAt: assignmentSubmissions.submittedAt,
      version: sql<string>`${assignmentSubmissions.updatedAt}::text`
    })
    .from(assignmentSubmissions)
    .innerJoin(batches, eq(batches.id, assignmentSubmissions.batchId))
    .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
    .innerJoin(students, eq(students.id, assignmentSubmissions.studentId))
    .leftJoin(
      batchCurriculum,
      and(eq(batchCurriculum.batchId, assignmentSubmissions.batchId), eq(batchCurriculum.contentItemId, assignments.contentItemId))
    )
    .leftJoin(legacyReviewer, eq(legacyReviewer.id, assignmentSubmissions.reviewedByTutorId))
    .leftJoin(reviewerUser, eq(reviewerUser.id, assignmentSubmissions.reviewedByUserId))
    .leftJoin(reviewerUserTutor, eq(reviewerUserTutor.userId, assignmentSubmissions.reviewedByUserId))
    .where(and(eq(assignmentSubmissions.id, submissionId), inScope(assignmentSubmissions.batchId, scope)))
    .limit(1);
  if (!row) return null;

  return {
    ...row,
    maxScore: row.maxScore || 100,
    rubricCriteria: (Array.isArray(row.rubricCriteria) ? row.rubricCriteria : []) as RubricCriterion[],
    dueAt: row.dueAt ? new Date(row.dueAt) : null,
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
    submittedAt: new Date(row.submittedAt),
    isResubmission: row.status === 'submitted' && row.reviewedAt !== null,
    transitions: availableTransitions(row.status, 'tutor')
  };
}
