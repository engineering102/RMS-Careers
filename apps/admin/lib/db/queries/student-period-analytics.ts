import 'server-only';

import {
  db,
  batches,
  colleges,
  students,
  users,
  enrollments,
  contentItems,
  batchCurriculum,
  quizzes,
  quizAttempts,
  assignments,
  assignmentSubmissions,
  activities,
  type DbClient
} from '@rms/db';
import { and, eq, gte, inArray, isNotNull, lt, lte, or, sql } from 'drizzle-orm';
import type { ResolvedPeriod } from '@/lib/analytics/periods';
import {
  buildStudentPeriodReport,
  completionKey,
  type DueItem,
  type DueItemKind,
  type StudentPeriodReport
} from '@/lib/analytics/student-period-metrics';

export interface StudentPeriodAnalytics {
  batch: { id: string; name: string };
  college: { id: string; name: string } | null;
  period: ResolvedPeriod;
  report: StudentPeriodReport;
}

/** Activity types that count towards an active day (see lib/analytics/student-period-metrics.ts). */
const LEARNING_ACTIVITY_TYPES = sql`('lecture_completed', 'dsa_solved', 'quiz_completed')`;

/**
 * Per-student activity for one batch over a reporting period, plus the previous period of equal length.
 * A fixed number of aggregate queries regardless of batch size. Activity is batch-attributed
 * (activities.batch_id), matching the student portal's batch leaderboards.
 */
export async function getStudentPeriodAnalytics(
  batchId: string,
  period: ResolvedPeriod,
  now: Date = new Date(),
  client: DbClient = db
): Promise<StudentPeriodAnalytics | null> {
  if (!process.env.POSTGRES_URL) return null;

  const [batch] = await client
    .select({ id: batches.id, name: batches.name, collegeId: batches.collegeId })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);
  if (!batch) return null;

  const prevFrom = period.previous.from;
  const curFrom = period.from;
  const curTo = period.to;

  const [collegeRows, enrolled, activityRows, attemptRows, submissionRows, dueRows] = await Promise.all([
    client
      .select({ id: colleges.id, name: colleges.name })
      .from(colleges)
      .where(eq(colleges.id, batch.collegeId))
      .limit(1),

    client
      .select({
        studentId: students.id,
        fullName: students.fullName,
        email: students.email,
        collegeRollNumber: students.collegeRollNumber,
        branch: students.branch,
        lastLoginAt: users.lastLoginAt
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .leftJoin(users, eq(users.id, students.userId))
      .where(
        and(
          eq(enrollments.batchId, batchId),
          sql`${enrollments.status} IN ('active', 'confirmed', 'completed')`
        )
      ),

    client
      .select({
        studentId: activities.studentId,
        activeDays: sql<number>`count(distinct ${activities.activityDateIst}) filter (where ${activities.activityDateIst} >= ${curFrom} and ${activities.activityType} in ${LEARNING_ACTIVITY_TYPES})::int`,
        prevActiveDays: sql<number>`count(distinct ${activities.activityDateIst}) filter (where ${activities.activityDateIst} >= ${prevFrom} and ${activities.activityDateIst} < ${curFrom} and ${activities.activityType} in ${LEARNING_ACTIVITY_TYPES})::int`,
        lecturesCompleted: sql<number>`count(*) filter (where ${activities.activityDateIst} >= ${curFrom} and ${activities.activityType} = 'lecture_completed')::int`,
        dsaSolved: sql<number>`count(*) filter (where ${activities.activityDateIst} >= ${curFrom} and ${activities.activityType} = 'dsa_solved')::int`,
        xp: sql<number>`coalesce(sum(${activities.xpAwarded}) filter (where ${activities.activityDateIst} >= ${curFrom}), 0)::int`,
        prevXp: sql<number>`coalesce(sum(${activities.xpAwarded}) filter (where ${activities.activityDateIst} >= ${prevFrom} and ${activities.activityDateIst} < ${curFrom}), 0)::int`,
        lastActiveDate: sql<string | null>`max(${activities.activityDateIst}) filter (where ${activities.activityType} in ${LEARNING_ACTIVITY_TYPES})`
      })
      .from(activities)
      .where(and(eq(activities.batchId, batchId), lte(activities.activityDateIst, curTo)))
      .groupBy(activities.studentId),

    client
      .select({
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.batchId, batchId),
          gte(quizAttempts.submittedAt, period.startUtc),
          lt(quizAttempts.submittedAt, period.endUtcExclusive)
        )
      ),

    client
      .select({
        studentId: assignmentSubmissions.studentId,
        status: assignmentSubmissions.status,
        submittedAt: assignmentSubmissions.submittedAt,
        reviewedAt: assignmentSubmissions.reviewedAt
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.batchId, batchId),
          or(
            and(
              gte(assignmentSubmissions.submittedAt, period.startUtc),
              lt(assignmentSubmissions.submittedAt, period.endUtcExclusive)
            ),
            and(
              eq(assignmentSubmissions.status, 'approved'),
              gte(assignmentSubmissions.reviewedAt, period.startUtc),
              lt(assignmentSubmissions.reviewedAt, period.endUtcExclusive)
            )
          )
        )
      ),

    client
      .select({
        contentItemId: batchCurriculum.contentItemId,
        contentType: contentItems.contentType,
        title: contentItems.title,
        weekNumber: batchCurriculum.weekNumber,
        dueAt: batchCurriculum.dueAt,
        quizId: quizzes.id,
        assignmentId: assignments.id
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .leftJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
      .leftJoin(assignments, eq(assignments.contentItemId, contentItems.id))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(batchCurriculum.isRequired, true),
          isNotNull(batchCurriculum.dueAt),
          lt(batchCurriculum.dueAt, period.endUtcExclusive),
          sql`${contentItems.contentType} IN ('lecture', 'quiz', 'project')`
        )
      )
      .orderBy(batchCurriculum.dueAt)
  ]);

  const dueItems: DueItem[] = [];
  for (const row of dueRows) {
    const kind = row.contentType as DueItemKind;
    const refId =
      kind === 'lecture' ? row.contentItemId : kind === 'quiz' ? row.quizId : row.assignmentId;
    if (!refId || !row.dueAt) continue; // a quiz/project without its detail row cannot be completed
    dueItems.push({ kind, refId, title: row.title, weekNumber: row.weekNumber, dueAt: row.dueAt });
  }

  // Completion of due items, as of now. Lecture completion is one activity row per student and lecture
  // regardless of batch, so it is not batch-filtered; quiz completion is any submitted attempt.
  const studentIds = enrolled.map((s) => s.studentId);
  const idsOf = (kind: DueItemKind) => dueItems.filter((i) => i.kind === kind).map((i) => i.refId);
  const lectureIds = idsOf('lecture');
  const quizIds = idsOf('quiz');
  const projectIds = idsOf('project');
  const hasStudents = studentIds.length > 0;

  const [lectureDone, quizDone, projectDone] = await Promise.all([
    hasStudents && lectureIds.length > 0
      ? client
          .select({ studentId: activities.studentId, refId: activities.referenceId })
          .from(activities)
          .where(
            and(
              eq(activities.activityType, 'lecture_completed'),
              inArray(activities.referenceId, lectureIds),
              inArray(activities.studentId, studentIds)
            )
          )
      : Promise.resolve([]),
    hasStudents && quizIds.length > 0
      ? client
          .selectDistinct({ studentId: quizAttempts.studentId, refId: quizAttempts.quizId })
          .from(quizAttempts)
          .where(
            and(
              inArray(quizAttempts.quizId, quizIds),
              inArray(quizAttempts.studentId, studentIds),
              isNotNull(quizAttempts.submittedAt)
            )
          )
      : Promise.resolve([]),
    hasStudents && projectIds.length > 0
      ? client
          .select({ studentId: assignmentSubmissions.studentId, refId: assignmentSubmissions.assignmentId })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.batchId, batchId),
              inArray(assignmentSubmissions.assignmentId, projectIds)
            )
          )
      : Promise.resolve([])
  ]);

  const completions = new Set<string>();
  for (const r of lectureDone) completions.add(completionKey(r.studentId, 'lecture', r.refId));
  for (const r of quizDone) completions.add(completionKey(r.studentId, 'quiz', r.refId));
  for (const r of projectDone) completions.add(completionKey(r.studentId, 'project', r.refId));

  const inWindow = (d: Date | null) =>
    d !== null && d >= period.startUtc && d < period.endUtcExclusive;

  const report = buildStudentPeriodReport({
    period,
    now,
    students: enrolled,
    activity: activityRows,
    quizAttempts: attemptRows,
    submissions: submissionRows.map((s) => ({
      studentId: s.studentId,
      submittedInPeriod: inWindow(s.submittedAt),
      approvedInPeriod: s.status === 'approved' && inWindow(s.reviewedAt)
    })),
    dueItems,
    completions
  });

  return {
    batch: { id: batch.id, name: batch.name },
    college: collegeRows[0] ?? null,
    period,
    report
  };
}
