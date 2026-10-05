import 'server-only';

import {
  db,
  contentItems,
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  batches,
  enrollments
} from '@rms/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import type {
  ProjectAssignmentDetail,
  ProjectAssignmentCardData,
  RubricCriterion,
  ProjectSubmissionStatus
} from '@/lib/types/projects';

/**
 * Validates that an enrolled student can access a project assignment,
 * fetching assignment specifications, batch milestones, and existing submission records.
 */
export async function getProjectAssignmentForStudent(
  studentId: number,
  contentItemId: string,
  targetBatchId?: string
): Promise<ProjectAssignmentDetail | null> {
  // 1. Authorize student enrollment
  const studentEnrollments = await db
    .select({
      batchId: enrollments.batchId,
      batchName: batches.name
    })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        inArray(enrollments.status, ['active', 'confirmed'])
      )
    );

  if (studentEnrollments.length === 0) {
    return null;
  }

  const validEnrollments = studentEnrollments.filter(
    (e): e is { batchId: string; batchName: string } => Boolean(e.batchId)
  );

  if (validEnrollments.length === 0) {
    return null;
  }

  const enrolledBatchIds = validEnrollments.map((e) => e.batchId);

  // 2. Fetch the content item
  const [contentRow] = await db
    .select({
      id: contentItems.id,
      title: contentItems.title,
      description: contentItems.description,
      contentType: contentItems.contentType,
      programId: contentItems.programId
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.id, contentItemId),
        eq(contentItems.contentType, 'project')
      )
    )
    .limit(1);

  if (!contentRow) {
    return null;
  }

  // 3. Resolve batch context & schedule window
  let resolvedBatchId: string = targetBatchId || '';
  let batchName = '';
  let availableFrom: Date | null = null;
  let dueAt: Date | null = null;

  if (resolvedBatchId) {
    // Ensure student is actually enrolled in targetBatchId
    const matched = validEnrollments.find((e) => e.batchId === resolvedBatchId);
    if (!matched) {
      return null;
    }
    batchName = matched.batchName;

    const [currRow] = await db
      .select({
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt
      })
      .from(batchCurriculum)
      .where(
        and(
          eq(batchCurriculum.contentItemId, contentItemId),
          eq(batchCurriculum.batchId, resolvedBatchId)
        )
      )
      .limit(1);

    if (currRow) {
      availableFrom = currRow.availableFrom ? new Date(currRow.availableFrom) : null;
      dueAt = currRow.dueAt ? new Date(currRow.dueAt) : null;
    }
  } else {
    // Find the first enrolled batch that includes this project in its curriculum
    const currRows = await db
      .select({
        batchId: batchCurriculum.batchId,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt
      })
      .from(batchCurriculum)
      .where(
        and(
          eq(batchCurriculum.contentItemId, contentItemId),
          inArray(batchCurriculum.batchId, enrolledBatchIds)
        )
      )
      .limit(1);

    if (currRows.length > 0) {
      resolvedBatchId = currRows[0].batchId;
      const matched = validEnrollments.find((e) => e.batchId === resolvedBatchId);
      batchName = matched?.batchName || '';
      availableFrom = currRows[0].availableFrom ? new Date(currRows[0].availableFrom) : null;
      dueAt = currRows[0].dueAt ? new Date(currRows[0].dueAt) : null;
    } else {
      // Fallback to the first enrolled batch
      resolvedBatchId = validEnrollments[0].batchId;
      batchName = validEnrollments[0].batchName;
    }
  }

  // 4. Fetch or ensure assignment configuration
  let [assignmentRow] = await db
    .select({
      id: assignments.id,
      rubricCriteria: assignments.rubricCriteria,
      maxScore: assignments.maxScore
    })
    .from(assignments)
    .where(eq(assignments.contentItemId, contentItemId))
    .limit(1);

  if (!assignmentRow) {
    // If no assignment record exists yet, create a default assignment row
    const [created] = await db
      .insert(assignments)
      .values({
        contentItemId,
        rubricCriteria: [
          {
            title: 'Code Quality & Structure',
            maxPoints: 40,
            description: 'Clean, modular, and maintainable codebase adhering to industry conventions.'
          },
          {
            title: 'Feature Completeness',
            maxPoints: 40,
            description: 'All functional requirements implemented as specified in project brief.'
          },
          {
            title: 'Documentation & Git Commits',
            maxPoints: 20,
            description: 'Informative README with setup guide and structured, semantic commit history.'
          }
        ],
        maxScore: 100
      })
      .returning({
        id: assignments.id,
        rubricCriteria: assignments.rubricCriteria,
        maxScore: assignments.maxScore
      });

    assignmentRow = created;
  }

  // 5. Fetch existing submission for this student, assignment, and batch
  const [submissionRow] = await db
    .select({
      id: assignmentSubmissions.id,
      assignmentId: assignmentSubmissions.assignmentId,
      studentId: assignmentSubmissions.studentId,
      batchId: assignmentSubmissions.batchId,
      githubUrl: assignmentSubmissions.githubUrl,
      liveUrl: assignmentSubmissions.liveUrl,
      notes: assignmentSubmissions.notes,
      status: assignmentSubmissions.status,
      score: assignmentSubmissions.score,
      tutorFeedback: assignmentSubmissions.tutorFeedback,
      reviewedByTutorId: assignmentSubmissions.reviewedByTutorId,
      reviewedAt: assignmentSubmissions.reviewedAt,
      submittedAt: assignmentSubmissions.submittedAt,
      updatedAt: assignmentSubmissions.updatedAt
    })
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, assignmentRow.id),
        eq(assignmentSubmissions.studentId, studentId),
        eq(assignmentSubmissions.batchId, resolvedBatchId)
      )
    )
    .limit(1);

  const now = new Date();
  const isAvailable = !availableFrom || now >= availableFrom;
  const isPastDue = Boolean(dueAt && now > dueAt);

  let submissionSummary = null;
  if (submissionRow) {
    const status = submissionRow.status as ProjectSubmissionStatus;
    // Resubmission rule: allowed when 'submitted' or 'resubmission_requested', locked when 'under_review' or 'approved'
    const canResubmit = status === 'submitted' || status === 'resubmission_requested';

    submissionSummary = {
      id: submissionRow.id,
      assignmentId: submissionRow.assignmentId,
      studentId: submissionRow.studentId,
      batchId: submissionRow.batchId,
      githubUrl: submissionRow.githubUrl,
      liveUrl: submissionRow.liveUrl,
      notes: submissionRow.notes,
      status,
      score: submissionRow.score,
      tutorFeedback: submissionRow.tutorFeedback,
      reviewedByTutorId: submissionRow.reviewedByTutorId,
      reviewedAt: submissionRow.reviewedAt ? new Date(submissionRow.reviewedAt) : null,
      submittedAt: new Date(submissionRow.submittedAt),
      updatedAt: new Date(submissionRow.updatedAt),
      canResubmit
    };
  }

  const rawRubric = Array.isArray(assignmentRow.rubricCriteria)
    ? (assignmentRow.rubricCriteria as RubricCriterion[])
    : [];

  return {
    assignmentId: assignmentRow.id,
    contentItemId: contentRow.id,
    title: contentRow.title,
    description: contentRow.description,
    programId: contentRow.programId,
    rubricCriteria: rawRubric,
    maxScore: assignmentRow.maxScore,
    batchId: resolvedBatchId,
    batchName,
    availableFrom,
    dueAt,
    isAvailable,
    isPastDue,
    submission: submissionSummary
  };
}

/**
 * Fetches all project assignments across the student's active enrolled batches.
 */
export async function getStudentProjectAssignments(
  studentId: number
): Promise<ProjectAssignmentCardData[]> {
  // 1. Get active enrollments
  const studentEnrollments = await db
    .select({
      batchId: enrollments.batchId,
      batchName: batches.name
    })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        inArray(enrollments.status, ['active', 'confirmed'])
      )
    );

  if (studentEnrollments.length === 0) {
    return [];
  }

  const validEnrollments = studentEnrollments.filter(
    (e): e is { batchId: string; batchName: string } => Boolean(e.batchId)
  );

  if (validEnrollments.length === 0) {
    return [];
  }

  const enrolledBatchIds = validEnrollments.map((e) => e.batchId);
  const batchNameMap = new Map<string, string>(
    validEnrollments.map((e) => [e.batchId, e.batchName])
  );

  // 2. Fetch all project content items in the enrolled curriculum
  const rows = await db
    .select({
      contentItemId: contentItems.id,
      title: contentItems.title,
      description: contentItems.description,
      batchId: batchCurriculum.batchId,
      dueAt: batchCurriculum.dueAt,
      assignmentId: assignments.id,
      maxScore: assignments.maxScore
    })
    .from(batchCurriculum)
    .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
    .leftJoin(assignments, eq(assignments.contentItemId, contentItems.id))
    .where(
      and(
        inArray(batchCurriculum.batchId, enrolledBatchIds),
        eq(contentItems.contentType, 'project')
      )
    );

  if (rows.length === 0) {
    return [];
  }

  // 3. Fetch submissions for these assignments by this student
  const assignmentIds = rows.map((r) => r.assignmentId).filter(Boolean) as string[];

  const submissions =
    assignmentIds.length > 0
      ? await db
          .select({
            id: assignmentSubmissions.id,
            assignmentId: assignmentSubmissions.assignmentId,
            batchId: assignmentSubmissions.batchId,
            status: assignmentSubmissions.status,
            score: assignmentSubmissions.score,
            submittedAt: assignmentSubmissions.submittedAt,
            reviewedAt: assignmentSubmissions.reviewedAt
          })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.studentId, studentId),
              inArray(assignmentSubmissions.assignmentId, assignmentIds),
              inArray(assignmentSubmissions.batchId, enrolledBatchIds)
            )
          )
      : [];

  const submissionMap = new Map<string, (typeof submissions)[0]>();
  for (const s of submissions) {
    submissionMap.set(`${s.assignmentId}-${s.batchId}`, s);
  }

  return rows.map((r) => {
    const sub = r.assignmentId ? submissionMap.get(`${r.assignmentId}-${r.batchId}`) : null;

    return {
      assignmentId: r.assignmentId || '',
      contentItemId: r.contentItemId,
      title: r.title,
      description: r.description,
      batchId: r.batchId,
      batchName: batchNameMap.get(r.batchId) || 'Enrolled Batch',
      dueAt: r.dueAt ? new Date(r.dueAt) : null,
      maxScore: r.maxScore || 100,
      submission: sub
        ? {
            id: sub.id,
            status: sub.status as ProjectSubmissionStatus,
            score: sub.score,
            submittedAt: new Date(sub.submittedAt),
            reviewedAt: sub.reviewedAt ? new Date(sub.reviewedAt) : null
          }
        : null
    };
  });
}
