'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  quizzes,
  quizQuestions,
  quizAttempts,
  activities,
  studentStats,
  enrollments,
  batchCurriculum,
  contentItems
} from '@rms/db';
import { eq, and, or, sql } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getPracticeQuizForRunner } from '@/lib/db/queries/assessments';
import { getTodayDateIst } from '@/lib/types/overview';
import type {
  SubmitPracticeQuizInput,
  PracticeQuizSubmissionResult,
  QuestionGradingResult,
  QuestionType,
  StartFormalAttemptInput,
  StartFormalAttemptResult,
  SubmitFormalAssessmentInput,
  FormalAssessmentSubmissionResult
} from '@/lib/types/assessments';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getYesterdayDateIst(referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate);
  d.setDate(d.getDate() - 1);
  return getTodayDateIst(d);
}

/**
 * Normalizes an array of option IDs for consistent set comparison.
 */
function normalizeOptionIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids
    .map((id) => String(id).trim())
    .filter(Boolean)
    .sort();
}

/**
 * Compares two arrays of option IDs to determine full equality.
 */
function areOptionSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Server Action: Submits and grades a practice quiz attempt for the authenticated student.
 *
 * Security & Integrity Guarantees:
 * 1. Derives authenticated student ID server-side from session.
 * 2. Verifies student's enrollment entitlement to the quiz.
 * 3. Authoritative server-side grading (never trusts client scores or answers).
 * 4. Persists attempt history in `quiz_attempts` table.
 * 5. Idempotent XP allocation: First passing attempt awards +20 XP and updates daily streak.
 *    Subsequent retakes record attempt history but award 0 additional XP.
 * 6. Returns immediate question breakdown and explanations for practice review.
 */
export async function submitPracticeQuizAttempt(
  input: SubmitPracticeQuizInput
): Promise<ActionResult<PracticeQuizSubmissionResult>> {
  try {
    // 1. Authorize session
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { quizId, responses, batchId } = input;

    // 2. Validate quiz ID format
    if (!quizId || !UUID_REGEX.test(quizId)) {
      return { success: false, error: 'Invalid assessment identifier', code: 'INVALID_ID' };
    }

    // 3. Verify student entitlement to this practice quiz
    let quizRunnerData;
    try {
      quizRunnerData = await getPracticeQuizForRunner(studentId, quizId, batchId);
    } catch {
      return { success: false, error: 'Assessment not found or unavailable', code: 'NOT_FOUND' };
    }

    const authoritativeQuizId = quizRunnerData.id;

    // 4. Validate batch context if provided
    let verifiedBatchId: string | null = null;
    if (batchId && UUID_REGEX.test(batchId)) {
      const [enrollment] = await db
        .select({ batchId: enrollments.batchId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.batchId, batchId),
            sql`${enrollments.status} IN ('active', 'confirmed')`
          )
        )
        .limit(1);

      if (enrollment) {
        verifiedBatchId = batchId;
      }
    }

    // 5. Fetch authoritative questions directly from database with answer keys
    const dbQuestions = await db
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionType: quizQuestions.questionType,
        correctOptionIds: quizQuestions.correctOptionIds,
        explanationText: quizQuestions.explanationText,
        points: quizQuestions.points,
        sequenceOrder: quizQuestions.sequenceOrder
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, authoritativeQuizId))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    if (dbQuestions.length === 0) {
      return { success: false, error: 'Assessment contains no questions', code: 'EMPTY_QUIZ' };
    }

    // 6. Grade each question server-authoritatively
    let totalScore = 0;
    let maxScore = 0;
    const questionResults: QuestionGradingResult[] = [];

    const studentResponses = responses && typeof responses === 'object' ? responses : {};

    for (const q of dbQuestions) {
      const rawStudentSelected = studentResponses[q.id] ?? [];
      const selectedOptionIds = normalizeOptionIds(rawStudentSelected);
      const correctOptionIds = normalizeOptionIds(q.correctOptionIds);

      const isCorrect = areOptionSetsEqual(selectedOptionIds, correctOptionIds);
      const earnedPoints = isCorrect ? q.points : 0;

      totalScore += earnedPoints;
      maxScore += q.points;

      questionResults.push({
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType as QuestionType,
        points: q.points,
        earnedPoints,
        isCorrect,
        selectedOptionIds,
        correctOptionIds,
        explanationText: q.explanationText
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isPassed = percentage >= quizRunnerData.passingScorePercent;

    const now = new Date();
    const todayIst = getTodayDateIst(now);
    const yesterdayIst = getYesterdayDateIst(now);

    // 7. Persist attempt in quiz_attempts table
    const [insertedAttempt] = await db
      .insert(quizAttempts)
      .values({
        quizId: authoritativeQuizId,
        studentId,
        batchId: verifiedBatchId,
        score: totalScore,
        maxScore,
        isPassed,
        responses: studentResponses,
        startedAt: now,
        submittedAt: now
      })
      .returning({ id: quizAttempts.id });

    // 8. XP & Streak logic (Idempotent for practice quizzes)
    // Only the FIRST passing attempt awards XP (20 XP).
    let xpAwarded = 0;
    let isFirstPass = false;

    if (isPassed) {
      // Check if student has already received XP for this quiz
      const [existingActivity] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(
          and(
            eq(activities.studentId, studentId),
            eq(activities.activityType, 'quiz_completed'),
            eq(activities.referenceId, authoritativeQuizId)
          )
        )
        .limit(1);

      if (!existingActivity) {
        // First pass: award 20 XP
        xpAwarded = 20;
        isFirstPass = true;

        await db
          .insert(activities)
          .values({
            studentId,
            batchId: verifiedBatchId,
            activityType: 'quiz_completed',
            referenceId: authoritativeQuizId,
            xpAwarded,
            activityDateIst: todayIst,
            createdAt: now
          })
          .onConflictDoNothing();

        // Update student_stats (total XP, current/longest streak, level)
        const [stats] = await db
          .select({
            studentId: studentStats.studentId,
            totalXp: studentStats.totalXp,
            currentStreak: studentStats.currentStreak,
            longestStreak: studentStats.longestStreak,
            lastActivityDateIst: studentStats.lastActivityDateIst
          })
          .from(studentStats)
          .where(eq(studentStats.studentId, studentId))
          .limit(1);

        if (stats) {
          const prevActivity = stats.lastActivityDateIst;
          let newCurrentStreak = stats.currentStreak;

          if (prevActivity === todayIst) {
            // Already active today; streak unchanged
          } else if (prevActivity === yesterdayIst) {
            // Consecutive day
            newCurrentStreak += 1;
          } else {
            // Fresh streak or missed day
            newCurrentStreak = 1;
          }

          const newLongestStreak = Math.max(stats.longestStreak, newCurrentStreak);
          const newTotalXp = stats.totalXp + xpAwarded;
          const newLevel = Math.floor(newTotalXp / 100) + 1;

          await db
            .update(studentStats)
            .set({
              totalXp: newTotalXp,
              currentLevel: newLevel,
              currentStreak: newCurrentStreak,
              longestStreak: newLongestStreak,
              lastActivityDateIst: todayIst,
              updatedAt: now
            })
            .where(eq(studentStats.studentId, studentId));
        }
      }
    }

    // 9. Revalidate relevant Next.js routes
    revalidatePath('/assessments');
    revalidatePath(`/assessments/${authoritativeQuizId}`);
    revalidatePath(`/assessments/${quizRunnerData.contentItemId}`);
    revalidatePath('/overview');
    if (verifiedBatchId) {
      revalidatePath(`/batches/${verifiedBatchId}`);
    }

    return {
      success: true,
      data: {
        attemptId: insertedAttempt.id,
        quizId: authoritativeQuizId,
        score: totalScore,
        maxScore,
        percentage,
        isPassed,
        isFirstPass,
        xpAwarded,
        submittedAt: now,
        questionResults
      },
      message: isPassed
        ? isFirstPass
          ? `Congratulations! Passed with ${percentage}% (+${xpAwarded} XP earned)`
          : `Great job! Passed with ${percentage}%`
        : `Scored ${percentage}%. Review the explanations below and feel free to retake!`
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
    ) {
      throw error;
    }
    console.error('[Action:submitPracticeQuizAttempt] Error submitting practice quiz:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while grading your quiz. Please try again.',
      code: 'INTERNAL_ERROR'
    };
  }
}

// ==========================================
// SLICE 12: FORMAL TIMED ASSESSMENTS ACTIONS
// ==========================================

/**
 * Server Action: Initiates or resumes a formal timed assessment attempt for the student.
 *
 * Authoritative Timing & Lifecycle Guarantees:
 * 1. Checks student's active enrollment in the target batch.
 * 2. Enforces availableFrom and dueAt schedule window server-side.
 * 3. Enforces Single Attempt Policy: If already submitted, blocks new attempt.
 * 4. If an in-progress attempt already exists, returns original startedAt and authoritative deadline
 *    (preventing page refresh or tab reopening from resetting the timer).
 * 5. If no attempt exists, creates attempt with authoritative startedAt = now().
 */
export async function startFormalAssessmentAttempt(
  input: StartFormalAttemptInput
): Promise<ActionResult<StartFormalAttemptResult>> {
  try {
    // 1. Authorize session
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { quizId, batchId } = input;

    if (!quizId || !UUID_REGEX.test(quizId)) {
      return { success: false, error: 'Invalid assessment identifier', code: 'INVALID_ID' };
    }
    if (!batchId || !UUID_REGEX.test(batchId)) {
      return { success: false, error: 'Invalid batch identifier', code: 'INVALID_ID' };
    }

    // 2. Verify student's active enrollment in this batch
    const [enrollment] = await db
      .select({ batchId: enrollments.batchId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.batchId, batchId),
          sql`${enrollments.status} IN ('active', 'confirmed')`
        )
      )
      .limit(1);

    if (!enrollment) {
      return { success: false, error: 'You are not enrolled in this batch.', code: 'FORBIDDEN' };
    }

    // 3. Fetch formal quiz & curriculum window
    const [row] = await db
      .select({
        id: quizzes.id,
        contentItemId: contentItems.id,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt
      })
      .from(batchCurriculum)
      .innerJoin(contentItems, eq(contentItems.id, batchCurriculum.contentItemId))
      .innerJoin(quizzes, eq(quizzes.contentItemId, contentItems.id))
      .where(
        and(
          or(eq(quizzes.id, quizId), eq(contentItems.id, quizId)),
          eq(batchCurriculum.batchId, batchId),
          eq(quizzes.quizType, 'formal'),
          eq(contentItems.contentType, 'quiz'),
          eq(contentItems.isPublished, true)
        )
      )
      .limit(1);

    if (!row) {
      return { success: false, error: 'Formal assessment not found or unavailable.', code: 'NOT_FOUND' };
    }

    const authoritativeQuizId = row.id;
    const timeLimitMinutes = row.timeLimitMinutes ?? 30;
    const now = new Date();

    // 4. Verify schedule window (availableFrom and dueAt)
    if (row.availableFrom && now < new Date(row.availableFrom)) {
      return { success: false, error: 'Assessment is not yet open.', code: 'NOT_OPEN_YET' };
    }
    if (row.dueAt && now > new Date(row.dueAt)) {
      return { success: false, error: 'Assessment deadline has passed.', code: 'DEADLINE_PASSED' };
    }

    // 5. Check if an attempt already exists (Single Attempt Policy)
    const [existingAttempt] = await db
      .select({
        id: quizAttempts.id,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, authoritativeQuizId),
          eq(quizAttempts.studentId, studentId)
        )
      )
      .limit(1);

    if (existingAttempt) {
      if (existingAttempt.submittedAt) {
        return {
          success: false,
          error: 'You have already submitted this formal assessment. Only one attempt is permitted.',
          code: 'ALREADY_SUBMITTED'
        };
      }

      // Existing in-progress attempt (e.g. page refresh or resume)
      const startedAt = new Date(existingAttempt.startedAt);
      const deadline = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);

      if (now.getTime() > deadline.getTime()) {
        // Authoritative time limit has expired
        return {
          success: false,
          error: 'The time limit for your attempt has expired.',
          code: 'TIME_EXPIRED'
        };
      }

      return {
        success: true,
        data: {
          attemptId: existingAttempt.id,
          quizId: authoritativeQuizId,
          batchId,
          startedAt,
          authoritativeDeadline: deadline,
          timeLimitMinutes
        },
        message: 'Resuming active assessment attempt.'
      };
    }

    // 6. Calculate total points from quiz questions
    const [qAgg] = await db
      .select({
        totalPoints: sql<number>`coalesce(sum(${quizQuestions.points}), 0)::int`
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, authoritativeQuizId));

    const totalPoints = qAgg?.totalPoints ?? 0;

    // 7. Initialize new attempt with startedAt = now()
    const authoritativeDeadline = new Date(now.getTime() + timeLimitMinutes * 60 * 1000);

    const [insertedAttempt] = await db
      .insert(quizAttempts)
      .values({
        quizId: authoritativeQuizId,
        studentId,
        batchId,
        score: 0,
        maxScore: totalPoints,
        isPassed: false,
        responses: {},
        tabBlurCount: 0,
        startedAt: now,
        submittedAt: null
      })
      .returning({ id: quizAttempts.id });

    revalidatePath('/assessments');
    revalidatePath(`/assessments/${authoritativeQuizId}`);

    return {
      success: true,
      data: {
        attemptId: insertedAttempt.id,
        quizId: authoritativeQuizId,
        batchId,
        startedAt: now,
        authoritativeDeadline,
        timeLimitMinutes
      },
      message: 'Assessment started. Good luck!'
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
    ) {
      throw error;
    }
    console.error('[Action:startFormalAssessmentAttempt] Error starting assessment:', error);
    return {
      success: false,
      error: 'Failed to start assessment. Please try again.',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Server Action: Submits and grades a formal timed assessment attempt.
 *
 * Security & Integrity Guarantees:
 * 1. Derives authenticated student ID from server session.
 * 2. Verifies attempt ownership and single-submission lifecycle (rejects double submission).
 * 3. Enforces authoritative server deadline (timeLimitMinutes + 2 minutes grace).
 * 4. Records tabBlurCount telemetry in quiz_attempts.
 * 5. Authoritative server-side grading (never trusts client score/percentage).
 * 6. Explanations Suppression: Withholds explanations until batch_curriculum.dueAt has passed.
 * 7. Idempotent XP: Awards 20 XP on first passing attempt, updating student stats and streak.
 */
export async function submitFormalAssessment(
  input: SubmitFormalAssessmentInput
): Promise<ActionResult<FormalAssessmentSubmissionResult>> {
  try {
    // 1. Authorize session
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { attemptId, quizId, batchId, responses, tabBlurCount, isAutoSubmit } = input;

    if (!attemptId || !UUID_REGEX.test(attemptId) || !quizId || !UUID_REGEX.test(quizId)) {
      return { success: false, error: 'Invalid submission parameters', code: 'INVALID_ID' };
    }

    // 2. Fetch the attempt and verify ownership
    const [attempt] = await db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentId: quizAttempts.studentId,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.id, attemptId),
          eq(quizAttempts.studentId, studentId)
        )
      )
      .limit(1);

    if (!attempt) {
      return { success: false, error: 'Assessment attempt not found or unauthorized', code: 'NOT_FOUND' };
    }

    // Concurrency / Race Condition Guard: If already finalized, do not re-finalize
    if (attempt.submittedAt) {
      return {
        success: false,
        error: 'This attempt has already been submitted and finalized.',
        code: 'ALREADY_SUBMITTED'
      };
    }

    // 3. Fetch quiz and curriculum metadata
    const [quizRow] = await db
      .select({
        id: quizzes.id,
        quizType: quizzes.quizType,
        timeLimitMinutes: quizzes.timeLimitMinutes,
        passingScorePercent: quizzes.passingScorePercent,
        availableFrom: batchCurriculum.availableFrom,
        dueAt: batchCurriculum.dueAt
      })
      .from(quizzes)
      .innerJoin(contentItems, eq(contentItems.id, quizzes.contentItemId))
      .leftJoin(
        batchCurriculum,
        and(
          eq(batchCurriculum.contentItemId, contentItems.id),
          eq(batchCurriculum.batchId, batchId)
        )
      )
      .where(
        and(
          or(eq(quizzes.id, quizId), eq(quizzes.id, attempt.quizId)),
          eq(quizzes.quizType, 'formal')
        )
      )
      .limit(1);

    if (!quizRow) {
      return { success: false, error: 'Formal assessment configuration not found', code: 'NOT_FOUND' };
    }

    const timeLimitMinutes = quizRow.timeLimitMinutes ?? 30;
    const now = new Date();
    const startedAt = new Date(attempt.startedAt);
    const deadline = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
    const graceDeadline = new Date(deadline.getTime() + 2 * 60 * 1000); // 2 min network-transit tolerance

    // Strict rejection if submission arrives beyond authoritative deadline + 2 minutes network latency
    if (now.getTime() > graceDeadline.getTime()) {
      return {
        success: false,
        error: 'The assessment time limit and submission window have expired.',
        code: 'DEADLINE_EXCEEDED'
      };
    }

    // Submissions reaching server past the authoritative deadline are strictly classified as auto-submitted
    const finalIsAutoSubmitted = Boolean(isAutoSubmit || now.getTime() > deadline.getTime());

    // 4. Fetch authoritative questions
    const dbQuestions = await db
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionType: quizQuestions.questionType,
        correctOptionIds: quizQuestions.correctOptionIds,
        explanationText: quizQuestions.explanationText,
        points: quizQuestions.points,
        sequenceOrder: quizQuestions.sequenceOrder
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizRow.id))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    if (dbQuestions.length === 0) {
      return { success: false, error: 'Assessment contains no questions', code: 'EMPTY_QUIZ' };
    }

    // 5. Authoritative server grading
    let totalScore = 0;
    let maxScore = 0;
    const studentResponses = responses && typeof responses === 'object' ? responses : {};
    const questionResults: QuestionGradingResult[] = [];

    for (const q of dbQuestions) {
      const rawStudentSelected = studentResponses[q.id] ?? [];
      const selectedOptionIds = normalizeOptionIds(rawStudentSelected);
      const correctOptionIds = normalizeOptionIds(q.correctOptionIds);

      const isCorrect = areOptionSetsEqual(selectedOptionIds, correctOptionIds);
      const earnedPoints = isCorrect ? q.points : 0;

      totalScore += earnedPoints;
      maxScore += q.points;

      questionResults.push({
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType as QuestionType,
        points: q.points,
        earnedPoints,
        isCorrect,
        selectedOptionIds,
        correctOptionIds,
        explanationText: q.explanationText
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isPassed = percentage >= quizRow.passingScorePercent;
    const sanitizedTabBlurCount = Math.max(0, Math.min(Number(tabBlurCount) || 0, 500));

    // 6. Persist finalized attempt in database
    await db
      .update(quizAttempts)
      .set({
        score: totalScore,
        maxScore,
        isPassed,
        responses: studentResponses,
        tabBlurCount: sanitizedTabBlurCount,
        submittedAt: now
      })
      .where(eq(quizAttempts.id, attempt.id));

    // 7. Post-Deadline Explanations suppression
    const dueAt = quizRow.dueAt ? new Date(quizRow.dueAt) : null;
    const explanationsSuppressed = Boolean(dueAt && now < dueAt);

    // 8. XP & Streak Allocation
    const todayIst = getTodayDateIst(now);
    const yesterdayIst = getYesterdayDateIst(now);
    let xpAwarded = 0;
    let isFirstPass = false;

    if (isPassed) {
      const [existingActivity] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(
          and(
            eq(activities.studentId, studentId),
            eq(activities.activityType, 'quiz_completed'),
            eq(activities.referenceId, quizRow.id)
          )
        )
        .limit(1);

      if (!existingActivity) {
        xpAwarded = 20;
        isFirstPass = true;

        await db
          .insert(activities)
          .values({
            studentId,
            batchId,
            activityType: 'quiz_completed',
            referenceId: quizRow.id,
            xpAwarded,
            activityDateIst: todayIst,
            createdAt: now
          })
          .onConflictDoNothing();

        // Update student stats
        const [stats] = await db
          .select({
            studentId: studentStats.studentId,
            totalXp: studentStats.totalXp,
            currentStreak: studentStats.currentStreak,
            longestStreak: studentStats.longestStreak,
            lastActivityDateIst: studentStats.lastActivityDateIst
          })
          .from(studentStats)
          .where(eq(studentStats.studentId, studentId))
          .limit(1);

        if (stats) {
          const prevActivity = stats.lastActivityDateIst;
          let newCurrentStreak = stats.currentStreak;

          if (prevActivity === todayIst) {
            // Unchanged
          } else if (prevActivity === yesterdayIst) {
            newCurrentStreak += 1;
          } else {
            newCurrentStreak = 1;
          }

          const newLongestStreak = Math.max(stats.longestStreak, newCurrentStreak);
          const newTotalXp = stats.totalXp + xpAwarded;
          const newLevel = Math.floor(newTotalXp / 100) + 1;

          await db
            .update(studentStats)
            .set({
              totalXp: newTotalXp,
              currentLevel: newLevel,
              currentStreak: newCurrentStreak,
              longestStreak: newLongestStreak,
              lastActivityDateIst: todayIst,
              updatedAt: now
            })
            .where(eq(studentStats.studentId, studentId));
        }
      }
    }

    revalidatePath('/assessments');
    revalidatePath(`/assessments/${quizRow.id}`);
    revalidatePath('/overview');
    if (batchId) {
      revalidatePath(`/batches/${batchId}`);
    }

    return {
      success: true,
      data: {
        attemptId: attempt.id,
        quizId: quizRow.id,
        score: totalScore,
        maxScore,
        percentage,
        isPassed,
        isFirstPass,
        xpAwarded,
        submittedAt: now,
        isAutoSubmitted: finalIsAutoSubmitted,
        tabBlurCount: sanitizedTabBlurCount,
        explanationsSuppressed,
        publishDate: dueAt,
        questionResults: explanationsSuppressed ? undefined : questionResults
      },
      message: isPassed
        ? `Assessment submitted successfully! Passed with ${percentage}%.`
        : `Assessment submitted. Scored ${percentage}%.`
    };
  } catch (error: any) {
    if (
      error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
    ) {
      throw error;
    }
    console.error('[Action:submitFormalAssessment] Error submitting formal assessment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while processing your submission.',
      code: 'INTERNAL_ERROR'
    };
  }
}
