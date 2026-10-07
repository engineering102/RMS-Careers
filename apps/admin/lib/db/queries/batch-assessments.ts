import 'server-only';

import {
  db,
  batches,
  colleges,
  programs,
  students,
  enrollments,
  contentItems,
  batchCurriculum,
  quizzes,
  quizQuestions,
  quizAttempts,
  type DbClient,
  type QuizTypeEnum
} from '@rms/db';
import { eq, and, or, sql, desc, asc, inArray, ilike } from 'drizzle-orm';

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

export interface QuestionResultDetail {
  questionId: number;
  questionText: string;
  questionType: string;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  selectedOptionIds: string[];
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanationText: string | null;
}

export interface AttemptInspectorDetails {
  attemptId: string;
  batchId: string;
  batchName: string;
  quizId: string;
  assessmentTitle: string;
  quizType: QuizTypeEnum;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  collegeRollNumber: string | null;
  status: 'completed' | 'in_progress';
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  tabBlurCount: number;
  isFlagged: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  durationSeconds: number | null;
  questions: QuestionResultDetail[];
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
  batchId: string,
  client: DbClient = db
): Promise<BatchAssessmentOverviewItem[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

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
  batchId: string,
  quizId: string,
  filters: AttemptFilters = {},
  client: DbClient = db
): Promise<AttemptListItem[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];

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

/**
 * Retrieves full attempt inspector details with question-level breakdown for an authorized Admin.
 * Cross-batch isolation invariant: validates that the attempt strictly belongs to batchId.
 */
export async function getBatchAttemptDetails(
  batchId: string,
  attemptId: string,
  client: DbClient = db
): Promise<AttemptInspectorDetails | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    // 1. Fetch attempt and verify strict batch ownership
    const [row] = await client
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        batchId: quizAttempts.batchId,
        batchName: batches.name,
        studentId: students.id,
        studentName: students.fullName,
        studentEmail: students.email,
        collegeRollNumber: students.collegeRollNumber,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        isPassed: quizAttempts.isPassed,
        responses: quizAttempts.responses,
        tabBlurCount: quizAttempts.tabBlurCount,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt,
        assessmentTitle: contentItems.title,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        passingScorePercent: quizzes.passingScorePercent
      })
      .from(quizAttempts)
      .innerJoin(batches, eq(batches.id, quizAttempts.batchId))
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .where(
        and(
          eq(quizAttempts.id, attemptId),
          eq(quizAttempts.batchId, batchId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    // 2. Fetch authoritative questions for this quiz
    const questionsRows = await client
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionType: quizQuestions.questionType,
        options: quizQuestions.options,
        correctOptionIds: quizQuestions.correctOptionIds,
        explanationText: quizQuestions.explanationText,
        points: quizQuestions.points,
        sequenceOrder: quizQuestions.sequenceOrder
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, row.quizId))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    const studentResponses = (row.responses || {}) as Record<string, string[]>;

    // 3. Map question result details
    const questionDetails: QuestionResultDetail[] = questionsRows.map((q) => {
      const selected = Array.isArray(studentResponses[String(q.id)])
        ? studentResponses[String(q.id)]
        : Array.isArray(studentResponses[q.id])
        ? (studentResponses[q.id] as string[])
        : [];

      const correct = (Array.isArray(q.correctOptionIds) ? q.correctOptionIds : []) as string[];
      const normalizedSelected = [...selected].sort();
      const normalizedCorrect = [...correct].sort();

      const isCorrect =
        normalizedSelected.length === normalizedCorrect.length &&
        normalizedSelected.every((val, idx) => val === normalizedCorrect[idx]);

      const earnedPoints = isCorrect ? q.points : 0;

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        earnedPoints,
        isCorrect,
        selectedOptionIds: selected,
        options: (Array.isArray(q.options) ? q.options : []) as { id: string; text: string }[],
        correctOptionIds: correct,
        explanationText: q.explanationText
      };
    });

    const percentage =
      row.maxScore > 0 ? Math.round((row.score / row.maxScore) * 100) : 0;
    const status: 'completed' | 'in_progress' = row.submittedAt ? 'completed' : 'in_progress';
    const durationSeconds = row.submittedAt
      ? Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)
      : null;

    return {
      attemptId: row.attemptId,
      batchId: row.batchId!,
      batchName: row.batchName,
      quizId: row.quizId,
      assessmentTitle: row.assessmentTitle,
      quizType: row.quizType,
      timeLimitMinutes: row.timeLimitMinutes,
      passingScorePercent: row.passingScorePercent,
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      collegeRollNumber: row.collegeRollNumber,
      status,
      score: row.score,
      maxScore: row.maxScore,
      percentage,
      isPassed: row.isPassed,
      tabBlurCount: row.tabBlurCount || 0,
      isFlagged: (row.tabBlurCount || 0) >= 3,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      durationSeconds,
      questions: questionDetails
    };
  } catch (error) {
    console.error('Error fetching attempt details:', error);
    return null;
  }
}

/**
 * Generates an institutional CSV string containing assessment results scoped to a batch.
 */
export async function generateBatchAssessmentCsv(
  batchId: string,
  quizId?: string,
  client: DbClient = db
): Promise<{ filename: string; csvContent: string } | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    const [batch] = await client
      .select({ id: batches.id, name: batches.name })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batch) return null;

    const conditions = [eq(quizAttempts.batchId, batchId)];
    if (quizId) {
      conditions.push(eq(quizAttempts.quizId, quizId));
    }

    const rows = await client
      .select({
        attemptId: quizAttempts.id,
        quizTitle: contentItems.title,
        quizType: quizzes.quizType,
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
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .where(and(...conditions))
      .orderBy(contentItems.title, students.fullName);

    const headers = [
      'Batch ID',
      'Batch Name',
      'Assessment Title',
      'Assessment Type',
      'Student Name',
      'Student Email',
      'Roll Number',
      'Attempt Status',
      'Score',
      'Max Score',
      'Percentage',
      'Result',
      'Tab Blur Count',
      'Flagged Anomaly',
      'Started At (UTC)',
      'Submitted At (UTC)',
      'Duration (Minutes)'
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const percentage = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      const status = r.submittedAt ? 'Completed' : 'In Progress';
      const result = r.submittedAt ? (r.isPassed ? 'Passed' : 'Failed') : 'Pending';
      const isFlagged = (r.tabBlurCount || 0) >= 3 ? 'Yes' : 'No';
      const durationMin = r.submittedAt
        ? (Math.round(((new Date(r.submittedAt).getTime() - new Date(r.startedAt).getTime()) / 60000) * 10) / 10).toString()
        : 'N/A';

      const line = [
        escapeCsv(batch.id),
        escapeCsv(batch.name),
        escapeCsv(r.quizTitle),
        escapeCsv(r.quizType),
        escapeCsv(r.studentName),
        escapeCsv(r.studentEmail),
        escapeCsv(r.collegeRollNumber || ''),
        escapeCsv(status),
        r.score,
        r.maxScore,
        `${percentage}%`,
        escapeCsv(result),
        r.tabBlurCount || 0,
        escapeCsv(isFlagged),
        escapeCsv(r.startedAt ? new Date(r.startedAt).toISOString() : ''),
        escapeCsv(r.submittedAt ? new Date(r.submittedAt).toISOString() : ''),
        escapeCsv(durationMin)
      ].join(',');

      csvLines.push(line);
    }

    const safeBatchName = batch.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `assessment_results_${safeBatchName}_${timestamp}.csv`;

    return {
      filename,
      csvContent: csvLines.join('\n')
    };
  } catch (error) {
    console.error('Error generating assessment CSV:', error);
    return null;
  }
}
