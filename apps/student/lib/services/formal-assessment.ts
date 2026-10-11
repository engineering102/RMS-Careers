import type {
  ExplanationPolicy,
  FormalAssessmentSubmissionResult,
  StartFormalAttemptResult
} from '@/lib/types/assessments';
import {
  FORMAL_SUBMISSION_GRACE_MS,
  formalAttemptDeadline,
  gradeResponses,
  isFormalAnswerKeyVisible,
  sanitizeResponses,
  type GradableQuestion
} from './assessment-policy';

/**
 * Formal (timed, single-attempt) assessment lifecycle.
 *
 * Trust model: the student id comes from the session; everything else that decides WHAT is graded,
 * WHERE it counts and WHEN answers are revealed comes from server-side records bound to the attempt.
 * Browser-supplied quiz/batch ids are only accepted as a consistency check and are rejected when they
 * disagree with the attempt. The repository is injected so these rules are unit-testable without a
 * database; the Drizzle implementation lives in lib/db/queries/formal-assessments.ts.
 */

export interface FormalAttemptRecord {
  id: string;
  quizId: string;
  studentId: number;
  batchId: string | null;
  startedAt: Date;
  submittedAt: Date | null;
}

export interface FormalQuizPlacement {
  quizId: string;
  contentItemId: string;
  batchId: string;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  showExplanations: ExplanationPolicy;
  availableFrom: Date | null;
  dueAt: Date | null;
}

export interface FinalizeAttemptInput {
  attemptId: string;
  studentId: number;
  score: number;
  maxScore: number;
  isPassed: boolean;
  responses: Record<string, string[]>;
  tabBlurCount: number;
  submittedAt: Date;
}

export interface FormalAssessmentRepository {
  /** The attempt only if it belongs to this student. */
  findOwnedAttempt(attemptId: string, studentId: number): Promise<FormalAttemptRecord | null>;
  /** Any attempt (submitted or not) by this student for this quiz, across batches. */
  findAttemptForQuiz(quizId: string, studentId: number): Promise<FormalAttemptRecord | null>;
  /** Student currently holds an access-granting enrollment in the batch (lifecycle rules applied). */
  hasBatchAccess(studentId: number, batchId: string): Promise<boolean>;
  /** Published formal quiz placed in this batch's curriculum, looked up by quiz id or content item id. */
  findFormalPlacement(quizOrContentId: string, batchId: string): Promise<FormalQuizPlacement | null>;
  getQuestions(quizId: string): Promise<GradableQuestion[]>;
  createAttempt(input: { quizId: string; studentId: number; batchId: string; maxScore: number; startedAt: Date }): Promise<{ id: string }>;
  /** Atomically finalises an unsubmitted attempt. Returns false if it was already submitted. */
  finalizeAttempt(input: FinalizeAttemptInput): Promise<boolean>;
  /** Idempotent quiz XP award (ledger + stats). */
  awardQuizXp(input: { studentId: number; batchId: string; quizId: string; xp: number; now: Date }): Promise<{ xpAwarded: number }>;
  /** Serialises start requests for one (quiz, student) pair. */
  withStartLock<T>(quizId: string, studentId: number, fn: (repo: FormalAssessmentRepository) => Promise<T>): Promise<T>;
}

export type ServiceResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string };

export const FORMAL_QUIZ_XP = 20;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_REGEX.test(v);

const fail = (code: string, error: string): { success: false; error: string; code: string } => ({ success: false, error, code });

export async function startFormalAttempt(
  repo: FormalAssessmentRepository,
  input: { studentId: number; quizId: unknown; batchId: unknown; now?: Date }
): Promise<ServiceResult<StartFormalAttemptResult>> {
  const { studentId, quizId, batchId } = input;
  const now = input.now ?? new Date();

  if (!isUuid(quizId)) return fail('INVALID_ID', 'Invalid assessment identifier');
  if (!isUuid(batchId)) return fail('INVALID_ID', 'Invalid batch identifier');

  if (!(await repo.hasBatchAccess(studentId, batchId))) {
    return fail('FORBIDDEN', 'You are not enrolled in this batch.');
  }

  const placement = await repo.findFormalPlacement(quizId, batchId);
  if (!placement) return fail('NOT_FOUND', 'Formal assessment not found or unavailable.');

  if (placement.availableFrom && now < placement.availableFrom) {
    return fail('NOT_OPEN_YET', 'Assessment is not yet open.');
  }

  return repo.withStartLock(placement.quizId, studentId, async (locked) => {
    const existing = await locked.findAttemptForQuiz(placement.quizId, studentId);
    if (existing) {
      if (existing.submittedAt) {
        return fail('ALREADY_SUBMITTED', 'You have already submitted this formal assessment. Only one attempt is permitted.');
      }
      if (existing.batchId !== batchId) {
        // One attempt per quiz overall: an attempt opened through another batch cannot be resumed here.
        return fail('ATTEMPT_IN_OTHER_BATCH', 'This assessment is already in progress for another batch.');
      }
      const deadline = formalAttemptDeadline(existing.startedAt, placement.timeLimitMinutes);
      if (now.getTime() > deadline.getTime()) {
        return fail('TIME_EXPIRED', 'The time limit for your attempt has expired.');
      }
      return {
        success: true as const,
        data: {
          attemptId: existing.id,
          quizId: placement.quizId,
          batchId,
          startedAt: existing.startedAt,
          authoritativeDeadline: deadline,
          timeLimitMinutes: placement.timeLimitMinutes ?? 30
        },
        message: 'Resuming active assessment attempt.'
      };
    }

    // New attempts only inside the schedule window.
    if (placement.dueAt && now > placement.dueAt) {
      return fail('DEADLINE_PASSED', 'Assessment deadline has passed.');
    }

    const questions = await locked.getQuestions(placement.quizId);
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const created = await locked.createAttempt({ quizId: placement.quizId, studentId, batchId, maxScore, startedAt: now });

    return {
      success: true as const,
      data: {
        attemptId: created.id,
        quizId: placement.quizId,
        batchId,
        startedAt: now,
        authoritativeDeadline: formalAttemptDeadline(now, placement.timeLimitMinutes),
        timeLimitMinutes: placement.timeLimitMinutes ?? 30
      },
      message: 'Assessment started. Good luck!'
    };
  });
}

export async function submitFormalAttempt(
  repo: FormalAssessmentRepository,
  input: {
    studentId: number;
    attemptId: unknown;
    quizId?: unknown;
    batchId?: unknown;
    responses: unknown;
    tabBlurCount: unknown;
    isAutoSubmit?: unknown;
    now?: Date;
  }
): Promise<ServiceResult<FormalAssessmentSubmissionResult>> {
  const { studentId } = input;
  const now = input.now ?? new Date();

  if (!isUuid(input.attemptId)) return fail('INVALID_ID', 'Invalid submission parameters');

  // 1. Ownership: the attempt must belong to the session's student.
  const attempt = await repo.findOwnedAttempt(input.attemptId, studentId);
  if (!attempt) return fail('NOT_FOUND', 'Assessment attempt not found or unauthorized');

  // 2. Client-supplied ids are a consistency check only; they never select what is graded.
  if (input.quizId !== undefined && input.quizId !== null && input.quizId !== attempt.quizId) {
    return fail('ATTEMPT_MISMATCH', 'Submission does not match the assessment attempt.');
  }
  if (input.batchId !== undefined && input.batchId !== null && input.batchId !== attempt.batchId) {
    return fail('ATTEMPT_MISMATCH', 'Submission does not match the assessment attempt.');
  }

  if (attempt.submittedAt) {
    return fail('ALREADY_SUBMITTED', 'This attempt has already been submitted and finalized.');
  }
  if (!attempt.batchId) return fail('NOT_FOUND', 'Formal assessment configuration not found');

  // 3. Eligibility now, not just when the attempt was opened.
  if (!(await repo.hasBatchAccess(studentId, attempt.batchId))) {
    return fail('FORBIDDEN', 'You no longer have access to this batch.');
  }

  // 4. Authoritative configuration: the exact quiz of the attempt, placed in the attempt's batch.
  const placement = await repo.findFormalPlacement(attempt.quizId, attempt.batchId);
  if (!placement || placement.quizId !== attempt.quizId) {
    return fail('NOT_FOUND', 'Formal assessment configuration not found');
  }

  // 5. Server-authoritative timing.
  const deadline = formalAttemptDeadline(attempt.startedAt, placement.timeLimitMinutes);
  if (now.getTime() > deadline.getTime() + FORMAL_SUBMISSION_GRACE_MS) {
    return fail('DEADLINE_EXCEEDED', 'The assessment time limit and submission window have expired.');
  }
  const isAutoSubmitted = Boolean(input.isAutoSubmit) || now.getTime() > deadline.getTime();

  // 6. Grade against the attempt's own quiz.
  const questions = await repo.getQuestions(attempt.quizId);
  if (questions.length === 0) return fail('EMPTY_QUIZ', 'Assessment contains no questions');

  const responses = sanitizeResponses(input.responses, questions);
  const grading = gradeResponses(questions, responses, placement.passingScorePercent);
  const tabBlurCount = Math.max(0, Math.min(Number(input.tabBlurCount) || 0, 500));

  // 7. Single finalisation: concurrent or repeated submits lose the race here and change nothing.
  const finalized = await repo.finalizeAttempt({
    attemptId: attempt.id,
    studentId,
    score: grading.score,
    maxScore: grading.maxScore,
    isPassed: grading.isPassed,
    responses,
    tabBlurCount,
    submittedAt: now
  });
  if (!finalized) {
    return fail('ALREADY_SUBMITTED', 'This attempt has already been submitted and finalized.');
  }

  // 8. XP only for the request that finalised the attempt.
  let xpAwarded = 0;
  if (grading.isPassed) {
    const award = await repo.awardQuizXp({ studentId, batchId: attempt.batchId, quizId: attempt.quizId, xp: FORMAL_QUIZ_XP, now });
    xpAwarded = award.xpAwarded;
  }

  const visible = isFormalAnswerKeyVisible(placement.showExplanations, placement.dueAt, now);

  return {
    success: true,
    data: {
      attemptId: attempt.id,
      quizId: attempt.quizId,
      score: grading.score,
      maxScore: grading.maxScore,
      percentage: grading.percentage,
      isPassed: grading.isPassed,
      isFirstPass: xpAwarded > 0,
      xpAwarded,
      submittedAt: now,
      isAutoSubmitted,
      tabBlurCount,
      explanationsSuppressed: !visible,
      publishDate: placement.showExplanations === 'never' ? null : placement.dueAt,
      questionResults: visible ? grading.questionResults : undefined
    },
    message: grading.isPassed
      ? `Assessment submitted successfully! Passed with ${grading.percentage}%.`
      : `Assessment submitted. Scored ${grading.percentage}%.`
  };
}
