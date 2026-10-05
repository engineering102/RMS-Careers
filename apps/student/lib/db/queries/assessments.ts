import 'server-only';

import { notFound } from 'next/navigation';
import {
  db,
  quizzes,
  quizQuestions,
  quizAttempts,
  contentItems,
  programs,
  enrollments,
  batches,
  batchCurriculum,
  activities
} from '@rms/db';
import { eq, and, or, sql, inArray, desc } from 'drizzle-orm';
import type {
  PracticeQuizSummary,
  PracticeQuizRunnerData,
  ClientQuizQuestion,
  QuizQuestionOption
} from '@/lib/types/assessments';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Retrieves all practice quizzes entitled to the authenticated student based on active enrollments.
 * Aggregates the student's attempt history (count, best score, pass status, last attempt date).
 *
 * @param studentId Authenticated student ID
 */
export async function getStudentPracticeQuizzes(
  studentId: number
): Promise<PracticeQuizSummary[]> {
  // 1. Fetch active/confirmed enrollments to determine program and batch access boundaries
  const activeEnrollments = await db
    .select({
      programId: enrollments.programId,
      batchId: enrollments.batchId
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        sql`${enrollments.status} IN ('active', 'confirmed')`
      )
    );

  if (activeEnrollments.length === 0) {
    return [];
  }

  const programIds = Array.from(
    new Set(activeEnrollments.map((e) => e.programId).filter(Boolean))
  );
  const batchIds = Array.from(
    new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
  );

  const entitlementConditions = [];
  if (programIds.length > 0) {
    entitlementConditions.push(inArray(contentItems.programId, programIds));
  }
  if (batchIds.length > 0) {
    entitlementConditions.push(
      sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN ${batchIds})`
    );
  }

  if (entitlementConditions.length === 0) {
    return [];
  }

  // 2. Query practice quizzes joined with contentItems and programs
  const rows = await db
    .select({
      id: quizzes.id,
      contentItemId: contentItems.id,
      programId: contentItems.programId,
      programName: programs.name,
      programCode: programs.code,
      title: contentItems.title,
      slug: contentItems.slug,
      description: contentItems.description,
      quizType: quizzes.quizType,
      passingScorePercent: quizzes.passingScorePercent
    })
    .from(quizzes)
    .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
    .innerJoin(programs, eq(programs.id, contentItems.programId))
    .where(
      and(
        eq(quizzes.quizType, 'practice'),
        eq(contentItems.contentType, 'quiz'),
        eq(contentItems.isPublished, true),
        or(...entitlementConditions)!
      )
    )
    .orderBy(programs.name, contentItems.title);

  if (rows.length === 0) {
    return [];
  }

  const quizIds = rows.map((r) => r.id);

  // 3. Aggregate question count and total points per quiz
  const questionAggs = await db
    .select({
      quizId: quizQuestions.quizId,
      count: sql<number>`count(${quizQuestions.id})::int`,
      totalPoints: sql<number>`coalesce(sum(${quizQuestions.points}), 0)::int`
    })
    .from(quizQuestions)
    .where(inArray(quizQuestions.quizId, quizIds))
    .groupBy(quizQuestions.quizId);

  const questionStatsMap = new Map<string, { count: number; totalPoints: number }>();
  for (const q of questionAggs) {
    questionStatsMap.set(q.quizId, { count: q.count, totalPoints: q.totalPoints });
  }

  // 4. Aggregate student's attempts for these quizzes
  const attemptAggs = await db
    .select({
      quizId: quizAttempts.quizId,
      attemptCount: sql<number>`count(${quizAttempts.id})::int`,
      bestScore: sql<number>`max(${quizAttempts.score})::int`,
      bestPercentage: sql<number>`max(case when ${quizAttempts.maxScore} > 0 then (${quizAttempts.score} * 100 / ${quizAttempts.maxScore}) else 0 end)::int`,
      hasPassed: sql<boolean>`bool_or(${quizAttempts.isPassed})`,
      lastAttemptAt: sql<Date | null>`max(${quizAttempts.submittedAt})`
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.studentId, studentId),
        inArray(quizAttempts.quizId, quizIds)
      )
    )
    .groupBy(quizAttempts.quizId);

  const attemptStatsMap = new Map<
    string,
    {
      attemptCount: number;
      bestScore: number | null;
      bestPercentage: number | null;
      hasPassed: boolean;
      lastAttemptAt: Date | null;
    }
  >();

  for (const a of attemptAggs) {
    attemptStatsMap.set(a.quizId, {
      attemptCount: a.attemptCount,
      bestScore: a.bestScore,
      bestPercentage: a.bestPercentage,
      hasPassed: Boolean(a.hasPassed),
      lastAttemptAt: a.lastAttemptAt ? new Date(a.lastAttemptAt) : null
    });
  }

  // 5. Build domain summaries
  return rows.map((row) => {
    const qStats = questionStatsMap.get(row.id) ?? { count: 0, totalPoints: 0 };
    const aStats = attemptStatsMap.get(row.id) ?? {
      attemptCount: 0,
      bestScore: null,
      bestPercentage: null,
      hasPassed: false,
      lastAttemptAt: null
    };

    return {
      id: row.id,
      contentItemId: row.contentItemId,
      programId: row.programId,
      programName: row.programName,
      programCode: row.programCode,
      title: row.title,
      slug: row.slug,
      description: row.description,
      quizType: row.quizType as 'practice',
      passingScorePercent: row.passingScorePercent,
      questionCount: qStats.count,
      totalPoints: qStats.totalPoints,
      attemptCount: aStats.attemptCount,
      bestScore: aStats.bestScore,
      bestPercentage: aStats.bestPercentage,
      isPassed: aStats.hasPassed,
      lastAttemptAt: aStats.lastAttemptAt
    };
  });
}

/**
 * Retrieves client-safe practice quiz runner data for an authorized student.
 * Supports resolution by either quizzes.id or contentItems.id.
 *
 * CRITICAL SECURITY INVARIANT:
 * Authoritative correctOptionIds and explanationText are excluded from the client payload.
 *
 * Anti-probing: If not entitled, unauthenticated, unpublished, or nonexistent, throws notFound().
 */
export async function getPracticeQuizForRunner(
  studentId: number,
  quizOrContentId: string,
  batchId?: string
): Promise<PracticeQuizRunnerData> {
  if (!isValidUuid(quizOrContentId)) {
    notFound();
  }

  // 1. Verify student enrollments
  const activeEnrollments = await db
    .select({
      programId: enrollments.programId,
      batchId: enrollments.batchId
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        sql`${enrollments.status} IN ('active', 'confirmed')`
      )
    );

  if (activeEnrollments.length === 0) {
    notFound();
  }

  const programIds = Array.from(
    new Set(activeEnrollments.map((e) => e.programId).filter(Boolean))
  );
  const batchIds = Array.from(
    new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
  );

  const entitlementConditions = [];
  if (programIds.length > 0) {
    entitlementConditions.push(inArray(contentItems.programId, programIds));
  }
  if (batchIds.length > 0) {
    entitlementConditions.push(
      sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN ${batchIds})`
    );
  }

  if (entitlementConditions.length === 0) {
    notFound();
  }

  // 2. Fetch the quiz by quizzes.id OR contentItems.id
  const [row] = await db
    .select({
      id: quizzes.id,
      contentItemId: contentItems.id,
      programId: contentItems.programId,
      programName: programs.name,
      programCode: programs.code,
      title: contentItems.title,
      description: contentItems.description,
      quizType: quizzes.quizType,
      passingScorePercent: quizzes.passingScorePercent
    })
    .from(quizzes)
    .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
    .innerJoin(programs, eq(programs.id, contentItems.programId))
    .where(
      and(
        or(
          eq(quizzes.id, quizOrContentId),
          eq(contentItems.id, quizOrContentId)
        ),
        eq(quizzes.quizType, 'practice'),
        eq(contentItems.contentType, 'quiz'),
        eq(contentItems.isPublished, true),
        or(...entitlementConditions)!
      )
    )
    .limit(1);

  if (!row) {
    notFound();
  }

  // 3. Fetch questions with strict client-safe field projection
  // NEVER project correctOptionIds or explanationText here
  const rawQuestions = await db
    .select({
      id: quizQuestions.id,
      questionText: quizQuestions.questionText,
      questionType: quizQuestions.questionType,
      options: quizQuestions.options,
      points: quizQuestions.points,
      sequenceOrder: quizQuestions.sequenceOrder
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, row.id))
    .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

  const questions: ClientQuizQuestion[] = rawQuestions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType as 'single_choice' | 'multiple_choice',
    options: (Array.isArray(q.options) ? q.options : []) as QuizQuestionOption[],
    points: q.points,
    sequenceOrder: q.sequenceOrder
  }));

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // 4. Query student's previous attempts for this quiz
  const studentAttempts = await db
    .select({
      id: quizAttempts.id,
      isPassed: quizAttempts.isPassed
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, row.id),
        eq(quizAttempts.studentId, studentId)
      )
    );

  const previousAttemptsCount = studentAttempts.length;
  const hasPassedPreviously = studentAttempts.some((a) => a.isPassed);

  // 5. Batch context verification if supplied
  let relatedBatchContext: { batchId: string; batchName: string } | null = null;
  if (batchId && isValidUuid(batchId) && batchIds.includes(batchId)) {
    const [batchRecord] = await db
      .select({
        id: batches.id,
        name: batches.name
      })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batchRecord) {
      relatedBatchContext = {
        batchId: batchRecord.id,
        batchName: batchRecord.name
      };
    }
  }

  return {
    id: row.id,
    contentItemId: row.contentItemId,
    programName: row.programName,
    programCode: row.programCode,
    title: row.title,
    description: row.description,
    passingScorePercent: row.passingScorePercent,
    questions,
    totalPoints,
    previousAttemptsCount,
    hasPassedPreviously,
    relatedBatchContext
  };
}
