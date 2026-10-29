import 'server-only';

// Moved from apps/admin/lib/db/queries/batch-assessments.ts (tutor plan WS-4). Same SQL; the scope check in front
// of each query is new. Summary data only: per-question responses and answer keys (getBatchAttemptDetails) stay
// admin-only in apps/admin (plan decision D-7).
import {
  batches,
  students,
  enrollments,
  contentItems,
  batchCurriculum,
  quizzes,
  quizAttempts,
  type QuizTypeEnum
} from '@rms/db/schema';
import type { DbClient } from '@rms/db';
import { eq, and, or, sql, desc, inArray, ilike } from 'drizzle-orm';
import { isBatchInScope, type AcademicScope } from './scope';

export interface BatchAssessmentOverviewItem {
  quizId: string;
  contentItemId: string;
  title: string;
  slug: string;
  quizType: QuizTypeEnum;
  weekNumber: number;
  sequenceOrder: number;
  isRequired: boolean;
  availableFrom: Date | null;
  dueAt: Date | null;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  eligibleStudentsCount: number;
  attemptsStarted: number;
  attemptsCompleted: number;
  attemptsInProgress: number;
  averageScore: number | null;
  averagePercentage: number | null;
  passRatePercent: number | null;
  flaggedCount: number;
  latestActivityAt: Date | null;
}

export interface AttemptListItem {
  attemptId: string;
  quizId: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  status: 'completed' | 'in_progress';
  tabBlurCount: number;
  isFlagged: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  durationSeconds: number | null;
}

export interface AttemptFilters {
  search?: string;
  status?: 'all' | 'completed' | 'in_progress';
  result?: 'all' | 'passed' | 'failed';
  anomaly?: 'all' | 'flagged' | 'normal';
}

/**
 * Retrieves an aggregated overview of all assessments assigned to a batch via batchCurriculum.
 * Strict batch-isolation: all counts and stats are scoped strictly to the target batchId.
 */
export async function getBatchAssessmentsOverview(
  client: DbClient,
  scope: AcademicScope,
  batchId: string
): Promise<BatchAssessmentOverviewItem[]> {
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

    const eligibleStudentsCount = enrolledCountRow?.count || 0;

    // 3. Query all quiz content items placed in this batch curriculum
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
        quizId: quizzes.id,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        passingScorePercent: quizzes.passingScorePercent
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(contentItems.contentType, 'quiz')
        )
      )
      .orderBy(batchCurriculum.weekNumber, batchCurriculum.sequenceOrder);

    if (assignedRows.length === 0) {
      return [];
    }

    const quizIds = assignedRows.map((r) => r.quizId);

    // 4. Aggregate student attempts scoped strictly to this batchId and assigned quizzes
    const attemptStats = await client
      .select({
        quizId: quizAttempts.quizId,
        totalAttempts: sql<number>`count(${quizAttempts.id})::int`,
        completedAttempts: sql<number>`count(case when ${quizAttempts.submittedAt} is not null then 1 end)::int`,
        inProgressAttempts: sql<number>`count(case when ${quizAttempts.submittedAt} is null then 1 end)::int`,
        avgScore: sql<number | null>`avg(${quizAttempts.score})::float`,
        avgPercentage: sql<number | null>`avg(case when ${quizAttempts.maxScore} > 0 then (${quizAttempts.score} * 100 / ${quizAttempts.maxScore}) else 0 end)::float`,
        passedCount: sql<number>`count(case when ${quizAttempts.isPassed} = true and ${quizAttempts.submittedAt} is not null then 1 end)::int`,
        flaggedCount: sql<number>`count(case when ${quizAttempts.tabBlurCount} >= 3 then 1 end)::int`,
        latestActivityAt: sql<Date | null>`max(coalesce(${quizAttempts.submittedAt}, ${quizAttempts.startedAt}))`
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.batchId, batchId),
          inArray(quizAttempts.quizId, quizIds)
        )
      )
      .groupBy(quizAttempts.quizId);

    const statsMap = new Map<string, (typeof attemptStats)[number]>();
    for (const stat of attemptStats) {
      statsMap.set(stat.quizId, stat);
    }

    // 5. Combine into comprehensive overview items
    return assignedRows.map((row) => {
      const stats = statsMap.get(row.quizId);
      const attemptsStarted = stats?.totalAttempts || 0;
      const attemptsCompleted = stats?.completedAttempts || 0;
      const attemptsInProgress = stats?.inProgressAttempts || 0;
      const passedCount = stats?.passedCount || 0;
      const passRatePercent =
        attemptsCompleted > 0 ? Math.round((passedCount / attemptsCompleted) * 100) : null;

      return {
        quizId: row.quizId,
        contentItemId: row.contentItemId,
        title: row.title,
        slug: row.slug,
        quizType: row.quizType,
        weekNumber: row.weekNumber,
        sequenceOrder: row.sequenceOrder,
        isRequired: row.isRequired,
        availableFrom: row.availableFrom,
        dueAt: row.dueAt,
        timeLimitMinutes: row.timeLimitMinutes,
        passingScorePercent: row.passingScorePercent,
        eligibleStudentsCount,
        attemptsStarted,
        attemptsCompleted,
        attemptsInProgress,
        averageScore: stats?.avgScore !== null && stats?.avgScore !== undefined ? Math.round(Number(stats.avgScore) * 10) / 10 : null,
        averagePercentage: stats?.avgPercentage !== null && stats?.avgPercentage !== undefined ? Math.round(Number(stats.avgPercentage)) : null,
        passRatePercent,
        flaggedCount: stats?.flaggedCount || 0,
        latestActivityAt: stats?.latestActivityAt ? new Date(stats.latestActivityAt) : null
      };
    });
  } catch (error) {
    console.error('Error fetching batch assessments overview:', error);
    return [];
  }
}

/**
 * Retrieves attempts for a specific assessment within a batch with flexible operational filters.
 * Strict batch-isolation: only attempts matching batchId and quizId are returned.
 */
export async function getBatchAssessmentAttempts(
  client: DbClient,
  scope: AcademicScope,
  batchId: string,
  quizId: string,
  filters: AttemptFilters = {}
): Promise<AttemptListItem[]> {
  if (!isBatchInScope(scope, batchId)) return [];
  try {

    // Verify quiz is assigned to this batch
    const [assigned] = await client
      .select({ id: batchCurriculum.id })
      .from(batchCurriculum)
      .innerJoin(quizzes, eq(quizzes.contentItemId, batchCurriculum.contentItemId))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(quizzes.id, quizId)
        )
      )
      .limit(1);

    if (!assigned) {
      return [];
    }

    const conditions = [
      eq(quizAttempts.batchId, batchId),
      eq(quizAttempts.quizId, quizId)
    ];

    if (filters.status === 'completed') {
      conditions.push(sql`${quizAttempts.submittedAt} IS NOT NULL`);
    } else if (filters.status === 'in_progress') {
      conditions.push(sql`${quizAttempts.submittedAt} IS NULL`);
    }

    if (filters.result === 'passed') {
      conditions.push(eq(quizAttempts.isPassed, true));
    } else if (filters.result === 'failed') {
      conditions.push(
        and(
          eq(quizAttempts.isPassed, false),
          sql`${quizAttempts.submittedAt} IS NOT NULL`
        )!
      );
    }

    if (filters.anomaly === 'flagged') {
      conditions.push(sql`${quizAttempts.tabBlurCount} >= 3`);
    } else if (filters.anomaly === 'normal') {
      conditions.push(sql`${quizAttempts.tabBlurCount} < 3`);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(students.fullName, term),
          ilike(students.email, term),
          ilike(students.collegeRollNumber, term)
        )!
      );
    }

    const rows = await client
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentId: students.id,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed,
        tabBlurCount: quizAttempts.tabBlurCount,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt
      })
      .from(quizAttempts)
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .where(and(...conditions))
      .orderBy(desc(quizAttempts.startedAt));

    return rows.map((r) => {
      const percentage =
        r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      const status: 'completed' | 'in_progress' = r.submittedAt ? 'completed' : 'in_progress';
      const durationSeconds = r.submittedAt
        ? Math.round((new Date(r.submittedAt).getTime() - new Date(r.startedAt).getTime()) / 1000)
        : null;

      return {
        attemptId: r.attemptId,
        quizId: r.quizId,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        collegeRollNumber: r.collegeRollNumber,
        score: r.score,
        maxScore: r.maxScore,
        percentage,
        isPassed: r.isPassed,
        status,
        tabBlurCount: r.tabBlurCount || 0,
        isFlagged: (r.tabBlurCount || 0) >= 3,
        startedAt: r.startedAt,
        submittedAt: r.submittedAt,
        durationSeconds
      };
    });
  } catch (error) {
    console.error('Error fetching batch assessment attempts:', error);
    return [];
  }
}
