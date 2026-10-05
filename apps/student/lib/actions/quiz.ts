'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  quizzes,
  quizQuestions,
  quizAttempts,
  activities,
  studentStats,
  enrollments
} from '@rms/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getPracticeQuizForRunner } from '@/lib/db/queries/assessments';
import { getTodayDateIst } from '@/lib/types/overview';
import type {
  SubmitPracticeQuizInput,
  PracticeQuizSubmissionResult,
  QuestionGradingResult,
  QuestionType
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
