import 'server-only';

import {
  db,
  activities,
  assignments,
  assignmentSubmissions,
  batchCurriculum,
  batches,
  contentItems,
  externalAssessmentRecords,
  programs,
  quizAttempts,
  quizzes,
  students,
  type DbClient
} from '@rms/db';
import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import type { ResolvedPeriod } from '@/lib/analytics/periods';
import { completionKey, type DueItemKind, type PeriodSummary, type StudentPeriodRow } from '@/lib/analytics/student-period-metrics';
import {
  batchAverages,
  bucketActivity,
  buildWeekProgress,
  type ActivityBucket,
  type BatchAverages,
  type CurriculumItem,
  type WeekProgress
} from '@/lib/analytics/report-card';
import { getStudentPeriodAnalytics } from './student-period-analytics';

export interface StudentReportCard {
  batch: { id: string; name: string; startDate: Date | null; endDate: Date | null };
  college: { id: string; name: string } | null;
  programName: string | null;
  student: StudentPeriodRow & { year: number | null };
  period: ResolvedPeriod;
  batchSummary: PeriodSummary;
  batchAverages: BatchAverages;
  activity: ActivityBucket[];
  weekProgress: WeekProgress[];
  quizHistory: Array<{
    title: string;
    submittedAt: Date;
    score: number;
    maxScore: number;
    percent: number | null;
    isPassed: boolean;
    inPeriod: boolean;
  }>;
  projects: Array<{
    title: string;
    status: string;
    score: number | null;
    maxScore: number;
    submittedAt: Date;
    reviewedAt: Date | null;
  }>;
  externalTests: Array<{
    name: string;
    provider: string;
    obtainedScore: number;
    maxScore: number;
    percentile: number | null;
    importedAt: Date;
  }>;
}

/** Most recent quiz attempts shown on a card. */
const QUIZ_HISTORY_LIMIT = 30;

/**
 * One student's report card for a batch and period. Returns null when the batch does not exist or the
 * student has no active, confirmed or completed enrollment in it.
 */
export async function getStudentReportCard(
  batchId: string,
  studentId: number,
  period: ResolvedPeriod,
  now: Date = new Date(),
  client: DbClient = db
): Promise<StudentReportCard | null> {
  if (!process.env.POSTGRES_URL) return null;

  const base = await getStudentPeriodAnalytics(batchId, period, now, client);
  const row = base?.report.rows.find((r) => r.studentId === studentId);
  if (!base || !row) return null;

  const [batchRows, studentRows, dailyRows, curriculumRows, quizRows, projectRows, externalRows] =
    await Promise.all([
      client
        .select({
          startDate: batches.startDate,
          endDate: batches.endDate,
          programName: programs.name
        })
        .from(batches)
        .leftJoin(programs, eq(programs.id, batches.programId))
        .where(eq(batches.id, batchId))
        .limit(1),

      client.select({ year: students.year }).from(students).where(eq(students.id, studentId)).limit(1),

      client
        .select({
          date: activities.activityDateIst,
          activityType: activities.activityType,
          count: sql<number>`count(*)::int`
        })
        .from(activities)
        .where(
          and(
            eq(activities.studentId, studentId),
            eq(activities.batchId, batchId),
            gte(activities.activityDateIst, period.from),
            lte(activities.activityDateIst, period.to)
          )
        )
        .groupBy(activities.activityDateIst, activities.activityType),

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
            sql`${contentItems.contentType} IN ('lecture', 'quiz', 'project')`
          )
        )
        .orderBy(batchCurriculum.weekNumber, batchCurriculum.sequenceOrder),

      client
        .select({
          quizId: quizAttempts.quizId,
          title: contentItems.title,
          submittedAt: quizAttempts.submittedAt,
          score: quizAttempts.score,
          maxScore: quizAttempts.maxScore,
          isPassed: quizAttempts.isPassed
        })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
        .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
        .where(
          and(
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.batchId, batchId),
            isNotNull(quizAttempts.submittedAt)
          )
        )
        .orderBy(desc(quizAttempts.submittedAt))
        .limit(QUIZ_HISTORY_LIMIT),

      client
        .select({
          assignmentId: assignmentSubmissions.assignmentId,
          title: contentItems.title,
          status: assignmentSubmissions.status,
          score: assignmentSubmissions.score,
          maxScore: assignments.maxScore,
          submittedAt: assignmentSubmissions.submittedAt,
          reviewedAt: assignmentSubmissions.reviewedAt
        })
        .from(assignmentSubmissions)
        .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
        .innerJoin(contentItems, eq(contentItems.id, assignments.contentItemId))
        .where(
          and(eq(assignmentSubmissions.studentId, studentId), eq(assignmentSubmissions.batchId, batchId))
        )
        .orderBy(desc(assignmentSubmissions.submittedAt)),

      client
        .select({
          name: externalAssessmentRecords.assessmentName,
          provider: externalAssessmentRecords.provider,
          obtainedScore: externalAssessmentRecords.obtainedScore,
          maxScore: externalAssessmentRecords.maxScore,
          percentile: externalAssessmentRecords.percentile,
          importedAt: externalAssessmentRecords.importedAt
        })
        .from(externalAssessmentRecords)
        .where(
          and(
            eq(externalAssessmentRecords.studentId, studentId),
            eq(externalAssessmentRecords.batchId, batchId)
          )
        )
        .orderBy(desc(externalAssessmentRecords.importedAt))
    ]);

  // Curriculum completion, as of now (same rules as the period report's due items).
  const items: CurriculumItem[] = [];
  for (const r of curriculumRows) {
    const kind = r.contentType as DueItemKind;
    const refId = kind === 'lecture' ? r.contentItemId : kind === 'quiz' ? r.quizId : r.assignmentId;
    if (!refId) continue;
    items.push({ kind, refId, title: r.title, weekNumber: r.weekNumber, dueAt: r.dueAt });
  }
  const lectureIds = items.filter((i) => i.kind === 'lecture').map((i) => i.refId);
  const quizIds = items.filter((i) => i.kind === 'quiz').map((i) => i.refId);

  const [lectureDone, quizDone] = await Promise.all([
    lectureIds.length > 0
      ? client
          .select({ refId: activities.referenceId })
          .from(activities)
          .where(
            and(
              eq(activities.studentId, studentId),
              eq(activities.activityType, 'lecture_completed'),
              inArray(activities.referenceId, lectureIds)
            )
          )
      : Promise.resolve([]),
    quizIds.length > 0
      ? client
          .selectDistinct({ refId: quizAttempts.quizId })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.studentId, studentId),
              inArray(quizAttempts.quizId, quizIds),
              isNotNull(quizAttempts.submittedAt)
            )
          )
      : Promise.resolve([])
  ]);

  const completions = new Set<string>();
  for (const r of lectureDone) completions.add(completionKey(studentId, 'lecture', r.refId));
  for (const r of quizDone) completions.add(completionKey(studentId, 'quiz', r.refId));
  for (const r of projectRows) completions.add(completionKey(studentId, 'project', r.assignmentId));

  const inPeriod = (d: Date) => d >= period.startUtc && d < period.endUtcExclusive;
  const batchInfo = batchRows[0];

  return {
    batch: {
      id: base.batch.id,
      name: base.batch.name,
      startDate: batchInfo?.startDate ?? null,
      endDate: batchInfo?.endDate ?? null
    },
    college: base.college,
    programName: batchInfo?.programName ?? null,
    student: { ...row, year: studentRows[0]?.year ?? null },
    period,
    batchSummary: base.report.summary,
    batchAverages: batchAverages(base.report),
    activity: bucketActivity(dailyRows, period),
    weekProgress: buildWeekProgress(studentId, items, completions),
    quizHistory: quizRows.map((q) => ({
      title: q.title,
      submittedAt: q.submittedAt as Date,
      score: q.score,
      maxScore: q.maxScore,
      percent: q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : null,
      isPassed: q.isPassed,
      inPeriod: inPeriod(q.submittedAt as Date)
    })),
    projects: projectRows.map((p) => ({
      title: p.title,
      status: p.status,
      score: p.score,
      maxScore: p.maxScore,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt
    })),
    externalTests: externalRows
  };
}
