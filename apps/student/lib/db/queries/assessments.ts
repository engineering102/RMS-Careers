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
  FormalAssessmentSummary,
  FormalAssessmentRunnerData,
  FormalAttemptStatus,
  ClientQuizQuestion,
  QuizQuestionOption,
  QuestionGradingResult,
  QuestionType
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
      sql`${contentItems.id} IN (SELECT ${batchCurriculum.contentItemId} FROM ${batchCurriculum} WHERE ${batchCurriculum.batchId} IN ${batchIds} AND (${batchCurriculum.availableFrom} IS NULL OR ${batchCurriculum.availableFrom} <= NOW()))`
    );
  }

  if (entitlementConditions.length === 0) {
    notFound();
  }

  if (batchId && isValidUuid(batchId)) {
    if (!batchIds.includes(batchId)) {
      notFound();
    }

    const [placement] = await db
      .select({ availableFrom: batchCurriculum.availableFrom })
      .from(batchCurriculum)
      .innerJoin(quizzes, eq(quizzes.contentItemId, batchCurriculum.contentItemId))
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          or(eq(quizzes.id, quizOrContentId), eq(quizzes.contentItemId, quizOrContentId))
        )
      )
      .limit(1);

    if (placement?.availableFrom && new Date(placement.availableFrom).getTime() > Date.now()) {
      notFound();
    }
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
    .leftJoin(programs, eq(programs.id, contentItems.programId))
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
    programName: row.programName || 'General',
    programCode: row.programCode || 'GEN',
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

/**
 * Detects whether a quiz identifier corresponds to a 'practice' or 'formal' assessment.
 */
export async function getAssessmentType(
  quizOrContentId: string
): Promise<'practice' | 'formal' | null> {
  if (!isValidUuid(quizOrContentId)) {
    return null;
  }

  const [row] = await db
    .select({ quizType: quizzes.quizType })
    .from(quizzes)
    .where(
      or(
        eq(quizzes.id, quizOrContentId),
        eq(quizzes.contentItemId, quizOrContentId)
      )
    )
    .limit(1);

  return (row?.quizType as 'practice' | 'formal') ?? null;
}

/**
 * Retrieves formal timed assessments scheduled for the student's active enrolled batches.
 */
export async function getStudentFormalAssessments(
  studentId: number
): Promise<FormalAssessmentSummary[]> {
  // 1. Fetch active enrollments with batch IDs
  const activeEnrollments = await db
    .select({
      batchId: enrollments.batchId
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        sql`${enrollments.status} IN ('active', 'confirmed')`
      )
    );

  const batchIds = Array.from(
    new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
  );

  if (batchIds.length === 0) {
    return [];
  }

  // 2. Query formal quizzes scheduled in batch_curriculum for these batches
  const rows = await db
    .select({
      id: quizzes.id,
      contentItemId: contentItems.id,
      programId: contentItems.programId,
      programName: programs.name,
      programCode: programs.code,
      batchId: batches.id,
      batchName: batches.name,
      title: contentItems.title,
      slug: contentItems.slug,
      description: contentItems.description,
      timeLimitMinutes: quizzes.timeLimitMinutes,
      passingScorePercent: quizzes.passingScorePercent,
      availableFrom: batchCurriculum.availableFrom,
      dueAt: batchCurriculum.dueAt
    })
    .from(batchCurriculum)
    .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
    .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
    .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
    .innerJoin(programs, eq(programs.id, contentItems.programId))
    .where(
      and(
        eq(quizzes.quizType, 'formal'),
        eq(contentItems.contentType, 'quiz'),
        eq(contentItems.isPublished, true),
        inArray(batchCurriculum.batchId, batchIds)
      )
    )
    .orderBy(batchCurriculum.dueAt, contentItems.title);

  if (rows.length === 0) {
    return [];
  }

  const quizIds = rows.map((r) => r.id);

  // 3. Question count and points aggregation
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

  // 4. Student's attempts for these formal quizzes
  const attempts = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      batchId: quizAttempts.batchId,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      isPassed: quizAttempts.isPassed,
      tabBlurCount: quizAttempts.tabBlurCount,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.studentId, studentId),
        inArray(quizAttempts.quizId, quizIds)
      )
    );

  const attemptsByQuizAndBatch = new Map<string, (typeof attempts)[0]>();
  for (const a of attempts) {
    const key = `${a.quizId}:${a.batchId ?? ''}`;
    attemptsByQuizAndBatch.set(key, a);
    attemptsByQuizAndBatch.set(a.quizId, a);
  }

  const now = new Date();

  return rows.map((row) => {
    const qStats = questionStatsMap.get(row.id) ?? { count: 0, totalPoints: 0 };
    const attempt =
      attemptsByQuizAndBatch.get(`${row.id}:${row.batchId}`) ??
      attemptsByQuizAndBatch.get(row.id);

    let status: FormalAttemptStatus = 'available';
    const availableFrom = row.availableFrom ? new Date(row.availableFrom) : null;
    const dueAt = row.dueAt ? new Date(row.dueAt) : null;
    const timeLimitMinutes = row.timeLimitMinutes ?? 30;

    let attemptData = null;

    if (attempt) {
      const startedAt = new Date(attempt.startedAt);
      const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
      const pct =
        attempt.maxScore > 0 ? Math.round((attempt.score * 100) / attempt.maxScore) : 0;

      attemptData = {
        id: attempt.id,
        startedAt,
        submittedAt,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: pct,
        isPassed: attempt.isPassed,
        tabBlurCount: attempt.tabBlurCount
      };

      if (submittedAt) {
        status = 'submitted';
      } else {
        const deadline = startedAt.getTime() + timeLimitMinutes * 60 * 1000;
        const graceDeadline = deadline + 2 * 60 * 1000;
        if (now.getTime() > graceDeadline) {
          status = 'auto_submitted';
        } else {
          status = 'in_progress';
        }
      }
    } else {
      if (availableFrom && now < availableFrom) {
        status = 'upcoming';
      } else if (dueAt && now > dueAt) {
        status = 'closed';
      } else {
        status = 'available';
      }
    }

    return {
      id: row.id,
      contentItemId: row.contentItemId,
      programId: row.programId,
      programName: row.programName,
      programCode: row.programCode,
      batchId: row.batchId,
      batchName: row.batchName,
      title: row.title,
      slug: row.slug,
      description: row.description,
      timeLimitMinutes,
      passingScorePercent: row.passingScorePercent,
      questionCount: qStats.count,
      totalPoints: qStats.totalPoints,
      availableFrom,
      dueAt,
      status,
      attempt: attemptData
    };
  });
}

/**
 * Retrieves formal timed assessment runner data for an authorized student.
 * Supports resolution by either quizzes.id or contentItems.id.
 *
 * CRITICAL SECURITY INVARIANT:
 * Authoritative correctOptionIds and explanationText are excluded from the client payload during attempt.
 *
 * Anti-probing: If not entitled, unauthenticated, unpublished, or nonexistent, throws notFound().
 */
export async function getFormalAssessmentForRunner(
  studentId: number,
  quizOrContentId: string,
  batchId?: string
): Promise<FormalAssessmentRunnerData> {
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

  const batchIds = Array.from(
    new Set(activeEnrollments.map((e) => e.batchId).filter((id): id is string => Boolean(id)))
  );

  if (batchIds.length === 0) {
    notFound();
  }

  // 2. Fetch the formal quiz row and curriculum window
  const query = db
    .select({
      id: quizzes.id,
      contentItemId: contentItems.id,
      programName: programs.name,
      programCode: programs.code,
      batchId: batches.id,
      batchName: batches.name,
      title: contentItems.title,
      description: contentItems.description,
      timeLimitMinutes: quizzes.timeLimitMinutes,
      passingScorePercent: quizzes.passingScorePercent,
      showExplanations: quizzes.showExplanations,
      availableFrom: batchCurriculum.availableFrom,
      dueAt: batchCurriculum.dueAt
    })
    .from(batchCurriculum)
    .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
    .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
    .innerJoin(batches, eq(batches.id, batchCurriculum.batchId))
    .leftJoin(programs, eq(programs.id, contentItems.programId))
    .where(
      and(
        or(
          eq(quizzes.id, quizOrContentId),
          eq(contentItems.id, quizOrContentId)
        ),
        eq(quizzes.quizType, 'formal'),
        eq(contentItems.contentType, 'quiz'),
        eq(contentItems.isPublished, true),
        inArray(batchCurriculum.batchId, batchIds),
        batchId && isValidUuid(batchId) ? eq(batchCurriculum.batchId, batchId) : sql`TRUE`
      )
    )
    .limit(1);

  const [row] = await query;
  if (!row) {
    notFound();
  }

  const timeLimitMinutes = row.timeLimitMinutes ?? 30;
  const availableFrom = row.availableFrom ? new Date(row.availableFrom) : null;
  const dueAt = row.dueAt ? new Date(row.dueAt) : null;
  const now = new Date();

  // 3. Fetch questions with strict client-safe field projection (NO correctOptionIds, NO explanationText)
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

  // 4. Query student's attempt for this formal quiz
  const [attempt] = await db
    .select({
      id: quizAttempts.id,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      isPassed: quizAttempts.isPassed,
      responses: quizAttempts.responses,
      tabBlurCount: quizAttempts.tabBlurCount,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, row.id),
        eq(quizAttempts.studentId, studentId)
      )
    )
    .limit(1);

  let status: FormalAttemptStatus = 'available';
  let activeAttempt = null;
  let completedAttempt = null;

  if (attempt) {
    const startedAt = new Date(attempt.startedAt);
    const deadline = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
    const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;

    if (submittedAt) {
      status = 'submitted';
      const pct =
        attempt.maxScore > 0 ? Math.round((attempt.score * 100) / attempt.maxScore) : 0;

      // Post-deadline explanation policy:
      // Explanations suppressed until batch_curriculum.dueAt has elapsed
      const explanationsSuppressed = Boolean(dueAt && now < dueAt);

      let questionResults: QuestionGradingResult[] | undefined = undefined;

      if (!explanationsSuppressed) {
        // Authoritative questions for results breakdown
        const dbQuestions = await db
          .select({
            id: quizQuestions.id,
            questionText: quizQuestions.questionText,
            questionType: quizQuestions.questionType,
            correctOptionIds: quizQuestions.correctOptionIds,
            explanationText: quizQuestions.explanationText,
            points: quizQuestions.points
          })
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, row.id))
          .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

        const studentResponses = (attempt.responses && typeof attempt.responses === 'object'
          ? (attempt.responses as Record<string, string[]>)
          : {}) as Record<string, string[]>;

        questionResults = dbQuestions.map((q) => {
          const rawSelected = studentResponses[q.id];
          const selectedOptionIds = Array.isArray(rawSelected)
            ? rawSelected.map(String).sort()
            : [];
          const correctOptionIds = Array.isArray(q.correctOptionIds)
            ? (q.correctOptionIds as string[]).map(String).sort()
            : [];
          const isCorrect =
            selectedOptionIds.length === correctOptionIds.length &&
            selectedOptionIds.every((val, idx) => val === correctOptionIds[idx]);

          return {
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.questionType as QuestionType,
            points: q.points,
            earnedPoints: isCorrect ? q.points : 0,
            isCorrect,
            selectedOptionIds,
            correctOptionIds,
            explanationText: q.explanationText
          };
        });
      }

      completedAttempt = {
        id: attempt.id,
        startedAt,
        submittedAt,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: pct,
        isPassed: attempt.isPassed,
        tabBlurCount: attempt.tabBlurCount,
        isAutoSubmitted: false,
        explanationsSuppressed,
        publishDate: dueAt,
        questionResults
      };
    } else {
      const remainingMs = deadline.getTime() - now.getTime();
      const graceDeadline = deadline.getTime() + 2 * 60 * 1000;

      if (now.getTime() > graceDeadline) {
        status = 'auto_submitted';
      } else {
        status = 'in_progress';
        activeAttempt = {
          id: attempt.id,
          startedAt,
          authoritativeDeadline: deadline,
          remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
          responses: (attempt.responses && typeof attempt.responses === 'object'
            ? attempt.responses
            : {}) as Record<number, string[]>,
          tabBlurCount: attempt.tabBlurCount
        };
      }
    }
  } else {
    if (availableFrom && now < availableFrom) {
      status = 'upcoming';
    } else if (dueAt && now > dueAt) {
      status = 'closed';
    } else {
      status = 'available';
    }
  }

  return {
    id: row.id,
    contentItemId: row.contentItemId,
    programName: row.programName || 'General',
    programCode: row.programCode || 'GEN',
    batchId: row.batchId,
    batchName: row.batchName,
    title: row.title,
    description: row.description,
    timeLimitMinutes,
    passingScorePercent: row.passingScorePercent,
    questions,
    totalPoints,
    availableFrom,
    dueAt,
    status,
    activeAttempt,
    completedAttempt
  };
}
