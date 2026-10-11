import type { ExplanationPolicy, QuestionGradingResult, QuestionType } from '@/lib/types/assessments';

/**
 * Pure assessment rules shared by practice quizzes, formal assessments and the runner queries.
 * No database access here, so every rule is unit-testable in isolation.
 */

/** Network-transit tolerance after a formal attempt's authoritative deadline. */
export const FORMAL_SUBMISSION_GRACE_MS = 2 * 60 * 1000;
export const DEFAULT_FORMAL_TIME_LIMIT_MINUTES = 30;

export interface GradableQuestion {
  id: number;
  questionText: string;
  questionType: string;
  correctOptionIds: unknown;
  explanationText: string | null;
  points: number;
}

export interface GradingOutcome {
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  questionResults: QuestionGradingResult[];
}

export function normalizeOptionIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => String(id).trim())
    .filter(Boolean)
    .sort();
}

function areOptionSetsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

/**
 * Keeps only responses for questions that belong to the graded quiz, so a client cannot persist
 * arbitrary keys into quiz_attempts.responses.
 */
export function sanitizeResponses(
  responses: unknown,
  questions: readonly { id: number }[]
): Record<string, string[]> {
  const source = responses && typeof responses === 'object' ? (responses as Record<string, unknown>) : {};
  const out: Record<string, string[]> = {};
  for (const q of questions) {
    const raw = source[String(q.id)];
    if (raw !== undefined) out[String(q.id)] = normalizeOptionIds(raw);
  }
  return out;
}

/** Server-authoritative grading against the supplied (trusted) question set. */
export function gradeResponses(
  questions: readonly GradableQuestion[],
  responses: Record<string, string[]>,
  passingScorePercent: number
): GradingOutcome {
  let score = 0;
  let maxScore = 0;
  const questionResults: QuestionGradingResult[] = [];

  for (const q of questions) {
    const selectedOptionIds = normalizeOptionIds(responses[String(q.id)] ?? []);
    const correctOptionIds = normalizeOptionIds(q.correctOptionIds);
    const isCorrect = areOptionSetsEqual(selectedOptionIds, correctOptionIds);
    const earnedPoints = isCorrect ? q.points : 0;
    score += earnedPoints;
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

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percentage, isPassed: percentage >= passingScorePercent, questionResults };
}

/**
 * Whether correct answers and explanations may be shown right now.
 *  - immediate      : always (after the student has submitted).
 *  - after_deadline : once the batch due date has passed. With no due date there is no deadline to wait
 *                     for, so they are shown after submission (the pre-existing behaviour).
 *  - never          : never.
 * An unknown policy value fails closed.
 */
export function isAnswerKeyVisible(
  policy: ExplanationPolicy | string | null | undefined,
  dueAt: Date | null,
  now: Date
): boolean {
  if (policy === 'immediate') return true;
  if (policy === 'after_deadline') return !dueAt || now.getTime() >= dueAt.getTime();
  return false;
}

/**
 * Formal assessments keep their original invariant (nothing before the batch due date, so a submitted
 * student cannot pass the key to classmates who have not sat it yet); the configured policy can only
 * make that stricter, e.g. `never`.
 */
export function isFormalAnswerKeyVisible(
  policy: ExplanationPolicy | string | null | undefined,
  dueAt: Date | null,
  now: Date
): boolean {
  if (dueAt && now.getTime() < dueAt.getTime()) return false;
  return policy === 'immediate' || policy === 'after_deadline';
}

/** Strips the answer key and explanations while keeping the student's own selections and score. */
export function redactAnswerKey(results: readonly QuestionGradingResult[]): QuestionGradingResult[] {
  return results.map((r) => ({ ...r, correctOptionIds: [], explanationText: null }));
}

export function formalAttemptDeadline(startedAt: Date, timeLimitMinutes: number | null | undefined): Date {
  const minutes = timeLimitMinutes ?? DEFAULT_FORMAL_TIME_LIMIT_MINUTES;
  return new Date(startedAt.getTime() + minutes * 60 * 1000);
}
