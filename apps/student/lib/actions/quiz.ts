'use server';

import { revalidatePath } from 'next/cache';
import { db, quizQuestions, quizAttempts } from '@rms/db';
import { eq } from 'drizzle-orm';
import { requireStudentEntitlement, hasBatchAccess } from '@/lib/db/queries/entitlements';
import { getPracticeQuizForRunner, getPracticeAnswerKeyContext } from '@/lib/db/queries/assessments';
import { createFormalAssessmentRepository } from '@/lib/db/queries/formal-assessments';
import { startFormalAttempt, submitFormalAttempt } from '@/lib/services/formal-assessment';
import {
  gradeResponses,
  isAnswerKeyVisible,
  redactAnswerKey,
  sanitizeResponses
} from '@/lib/services/assessment-policy';
import { awardActivityXp } from '@/lib/services/xp-ledger';
import type {
  SubmitPracticeQuizInput,
  PracticeQuizSubmissionResult,
  StartFormalAttemptInput,
  StartFormalAttemptResult,
  SubmitFormalAssessmentInput,
  FormalAssessmentSubmissionResult
} from '@/lib/types/assessments';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRACTICE_QUIZ_XP = 20;

function isNavigationSignal(error: any): boolean {
  return Boolean(
    error?.message?.startsWith('REDIRECT:') ||
      error?.digest?.startsWith('NEXT_REDIRECT') ||
      error?.message === 'NEXT_NOT_FOUND' ||
      error?.digest?.startsWith('NEXT_NOT_FOUND')
  );
}

/**
 * Server Action: Submits and grades a practice quiz attempt for the authenticated student.
 *
 * Practice quizzes allow unlimited untimed retakes. Guarantees:
 * 1. Student id from the session; entitlement checked through getPracticeQuizForRunner.
 * 2. Server-side grading against the quiz's own questions (responses for other questions are dropped).
 * 3. XP: only the first passing attempt earns XP, enforced atomically by the ledger (awardActivityXp).
 * 4. Answer keys and explanations follow quizzes.show_explanations (see isAnswerKeyVisible).
 */
export async function submitPracticeQuizAttempt(
  input: SubmitPracticeQuizInput
): Promise<ActionResult<PracticeQuizSubmissionResult>> {
  try {
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const studentId = context.student.id;
    const { quizId, responses, batchId } = input;

    if (!quizId || !UUID_REGEX.test(quizId)) {
      return { success: false, error: 'Invalid assessment identifier', code: 'INVALID_ID' };
    }

    let quizRunnerData;
    try {
      quizRunnerData = await getPracticeQuizForRunner(studentId, quizId, batchId);
    } catch {
      return { success: false, error: 'Assessment not found or unavailable', code: 'NOT_FOUND' };
    }

    const authoritativeQuizId = quizRunnerData.id;

    // XP is attributed to a batch only when the student currently has access to it.
    const verifiedBatchId =
      batchId && UUID_REGEX.test(batchId) && (await hasBatchAccess(studentId, batchId)) ? batchId : null;

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
      .where(eq(quizQuestions.quizId, authoritativeQuizId))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    if (dbQuestions.length === 0) {
      return { success: false, error: 'Assessment contains no questions', code: 'EMPTY_QUIZ' };
    }

    const sanitized = sanitizeResponses(responses, dbQuestions);
    const grading = gradeResponses(dbQuestions, sanitized, quizRunnerData.passingScorePercent);
    const now = new Date();

    const [insertedAttempt] = await db
      .insert(quizAttempts)
      .values({
        quizId: authoritativeQuizId,
        studentId,
        batchId: verifiedBatchId,
        score: grading.score,
        maxScore: grading.maxScore,
        isPassed: grading.isPassed,
        responses: sanitized,
        startedAt: now,
        submittedAt: now
      })
      .returning({ id: quizAttempts.id });

    let xpAwarded = 0;
    if (grading.isPassed) {
      const award = await awardActivityXp({
        studentId,
        batchId: verifiedBatchId,
        activityType: 'quiz_completed',
        referenceId: authoritativeQuizId,
        xp: PRACTICE_QUIZ_XP,
        now
      });
      xpAwarded = award.xpAwarded;
    }
    const isFirstPass = xpAwarded > 0;

    const keyContext = await getPracticeAnswerKeyContext(studentId, authoritativeQuizId);
    const answerKeyVisible = isAnswerKeyVisible(keyContext.policy, keyContext.dueAt, now);

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
        score: grading.score,
        maxScore: grading.maxScore,
        percentage: grading.percentage,
        isPassed: grading.isPassed,
        isFirstPass,
        xpAwarded,
        submittedAt: now,
        answerKeyHidden: !answerKeyVisible,
        questionResults: answerKeyVisible ? grading.questionResults : redactAnswerKey(grading.questionResults)
      },
      message: grading.isPassed
        ? isFirstPass
          ? `Congratulations! Passed with ${grading.percentage}% (+${xpAwarded} XP earned)`
          : `Great job! Passed with ${grading.percentage}%`
        : `Scored ${grading.percentage}%. Review your answers and feel free to retake!`
    };
  } catch (error: any) {
    if (isNavigationSignal(error)) throw error;
    console.error('[Action:submitPracticeQuizAttempt] Error submitting practice quiz:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while grading your quiz. Please try again.',
      code: 'INTERNAL_ERROR'
    };
  }
}

// ==========================================
// FORMAL TIMED ASSESSMENTS
// Rules live in lib/services/formal-assessment.ts; these actions only bind the session.
// ==========================================

/**
 * Server Action: Initiates or resumes a formal timed assessment attempt for the student.
 * Enrollment, curriculum placement, schedule window and the single-attempt rule are enforced
 * server-side; concurrent starts are serialised so only one attempt can be created.
 */
export async function startFormalAssessmentAttempt(
  input: StartFormalAttemptInput
): Promise<ActionResult<StartFormalAttemptResult>> {
  try {
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const result = await startFormalAttempt(createFormalAssessmentRepository(), {
      studentId: context.student.id,
      quizId: input?.quizId,
      batchId: input?.batchId
    });

    if (result.success) {
      revalidatePath('/assessments');
      revalidatePath(`/assessments/${result.data.quizId}`);
    }
    return result;
  } catch (error: any) {
    if (isNavigationSignal(error)) throw error;
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
 * The quiz, batch, timing and answer-key visibility are all derived from the stored attempt; the
 * browser-supplied quizId/batchId must match it or the submission is rejected.
 */
export async function submitFormalAssessment(
  input: SubmitFormalAssessmentInput
): Promise<ActionResult<FormalAssessmentSubmissionResult>> {
  try {
    const context = await requireStudentEntitlement();
    if (!context.student) {
      return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const result = await submitFormalAttempt(createFormalAssessmentRepository(), {
      studentId: context.student.id,
      attemptId: input?.attemptId,
      quizId: input?.quizId,
      batchId: input?.batchId,
      responses: input?.responses,
      tabBlurCount: input?.tabBlurCount,
      isAutoSubmit: input?.isAutoSubmit
    });

    if (result.success) {
      revalidatePath('/assessments');
      revalidatePath(`/assessments/${result.data.quizId}`);
      revalidatePath('/overview');
      if (input?.batchId) revalidatePath(`/batches/${input.batchId}`);
    }
    return result;
  } catch (error: any) {
    if (isNavigationSignal(error)) throw error;
    console.error('[Action:submitFormalAssessment] Error submitting formal assessment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while processing your submission.',
      code: 'INTERNAL_ERROR'
    };
  }
}
