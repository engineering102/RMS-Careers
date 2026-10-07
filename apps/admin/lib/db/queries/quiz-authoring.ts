import 'server-only';

import {
  db,
  quizzes,
  quizQuestions,
  quizAttempts,
  contentItems,
  type Quiz,
  type QuizQuestion,
  type DbClient,
  type QuizTypeEnum,
  type ExplanationPolicyEnum,
  type QuestionTypeEnum
} from '@rms/db';
import { eq, and, sql, count } from 'drizzle-orm';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestionWithDetails {
  id: number;
  quizId: string;
  questionText: string;
  questionType: QuestionTypeEnum;
  options: QuizOption[];
  correctOptionIds: string[];
  explanationText: string | null;
  points: number;
  sequenceOrder: number;
  createdAt: Date;
}

export interface QuizWithDetails {
  id: string;
  contentItemId: string;
  quizType: QuizTypeEnum;
  timeLimitMinutes: number | null;
  passingScorePercent: number;
  showExplanations: ExplanationPolicyEnum;
  createdAt: Date;
  updatedAt: Date;
  questions: QuizQuestionWithDetails[];
  questionCount: number;
  totalPoints: number;
  attemptCount: number;
}

export interface UpdateQuizConfigInput {
  quizType: QuizTypeEnum;
  timeLimitMinutes?: number | null;
  passingScorePercent?: number;
  showExplanations?: ExplanationPolicyEnum;
}

export interface CreateQuizQuestionInput {
  questionText: string;
  questionType: QuestionTypeEnum;
  options: QuizOption[];
  correctOptionIds: string[];
  explanationText?: string | null;
  points?: number;
  sequenceOrder?: number;
}

export interface UpdateQuizQuestionInput {
  questionText: string;
  questionType: QuestionTypeEnum;
  options: QuizOption[];
  correctOptionIds: string[];
  explanationText?: string | null;
  points?: number;
}

/**
 * Retrieves the quiz definition along with all questions and attempt counts for a canonical content item.
 */
export async function getQuizByContentItemId(
  contentItemId: string,
  client: DbClient = db
): Promise<QuizWithDetails | null> {
  try {
    if (!process.env.POSTGRES_URL) return null;

    const [quiz] = await client
      .select()
      .from(quizzes)
      .where(eq(quizzes.contentItemId, contentItemId))
      .limit(1);

    if (!quiz) {
      return null;
    }

    // Fetch questions ordered by sequenceOrder ASC, id ASC
    const questionsRows = await client
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

    // Fetch attempts count for historical safety check
    const [attemptCountRow] = await client
      .select({ count: count(quizAttempts.id) })
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quiz.id));

    const attemptCount = Number(attemptCountRow?.count || 0);

    const questions: QuizQuestionWithDetails[] = questionsRows.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      questionText: q.questionText,
      questionType: q.questionType,
      options: (Array.isArray(q.options) ? q.options : []) as QuizOption[],
      correctOptionIds: (Array.isArray(q.correctOptionIds) ? q.correctOptionIds : []) as string[],
      explanationText: q.explanationText,
      points: q.points,
      sequenceOrder: q.sequenceOrder,
      createdAt: q.createdAt
    }));

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    return {
      id: quiz.id,
      contentItemId: quiz.contentItemId,
      quizType: quiz.quizType,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingScorePercent: quiz.passingScorePercent,
      showExplanations: quiz.showExplanations,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      questions,
      questionCount: questions.length,
      totalPoints,
      attemptCount
    };
  } catch (error) {
    console.error('Error fetching quiz by contentItemId:', error);
    return null;
  }
}

/**
 * Retrieves or creates a canonical quiz entity attached 1-to-1 to a content item.
 */
export async function getOrCreateQuizForContentItem(
  contentItemId: string,
  defaults?: Partial<{
    quizType: QuizTypeEnum;
    timeLimitMinutes: number | null;
    passingScorePercent: number;
    showExplanations: ExplanationPolicyEnum;
  }>,
  client: DbClient = db
): Promise<QuizWithDetails> {
  const existing = await getQuizByContentItemId(contentItemId, client);
  if (existing) {
    return existing;
  }

  // Verify content item exists
  const [contentItem] = await client
    .select({ id: contentItems.id, contentType: contentItems.contentType })
    .from(contentItems)
    .where(eq(contentItems.id, contentItemId))
    .limit(1);

  if (!contentItem) {
    throw new Error(`Content item with ID ${contentItemId} does not exist.`);
  }

  if (contentItem.contentType !== 'quiz') {
    throw new Error(
      `Content item with ID ${contentItemId} is of type "${contentItem.contentType}", not "quiz".`
    );
  }

  // Insert default quiz row
  const [created] = await client
    .insert(quizzes)
    .values({
      contentItemId,
      quizType: defaults?.quizType || 'practice',
      timeLimitMinutes: defaults?.timeLimitMinutes ?? null,
      passingScorePercent: defaults?.passingScorePercent ?? 60,
      showExplanations: defaults?.showExplanations || 'immediate'
    })
    .returning();

  const details = await getQuizByContentItemId(contentItemId, client);
  if (!details) {
    throw new Error(`Failed to retrieve newly created quiz for content item ${contentItemId}.`);
  }
  return details;
}

/**
 * Updates quiz configuration (practice/formal, time limit, passing score, explanation policy).
 */
export async function updateQuizConfig(
  quizId: string,
  input: UpdateQuizConfigInput,
  client: DbClient = db
): Promise<Quiz> {
  const updatePayload: Record<string, unknown> = {
    quizType: input.quizType,
    timeLimitMinutes: input.quizType === 'formal' ? input.timeLimitMinutes ?? 30 : input.timeLimitMinutes ?? null,
    passingScorePercent: input.passingScorePercent ?? 60,
    showExplanations: input.showExplanations ?? (input.quizType === 'practice' ? 'immediate' : 'after_deadline'),
    updatedAt: new Date()
  };

  const [updated] = await client
    .update(quizzes)
    .set(updatePayload)
    .where(eq(quizzes.id, quizId))
    .returning();

  if (!updated) {
    throw new Error(`Quiz with ID ${quizId} not found.`);
  }

  return updated;
}

/**
 * Creates a new question within a quiz bank, appending it to the end of the sequence.
 */
export async function createQuizQuestion(
  quizId: string,
  input: CreateQuizQuestionInput,
  client: DbClient = db
): Promise<QuizQuestionWithDetails> {
  // Determine next sequence order if not specified
  let seq = input.sequenceOrder;
  if (seq === undefined || seq === null) {
    const [maxSeqRow] = await client
      .select({ maxSeq: sql<number | null>`max(${quizQuestions.sequenceOrder})` })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));
    seq = (maxSeqRow?.maxSeq ?? -1) + 1;
  }

  const [created] = await client
    .insert(quizQuestions)
    .values({
      quizId,
      questionText: input.questionText.trim(),
      questionType: input.questionType,
      options: input.options,
      correctOptionIds: input.correctOptionIds,
      explanationText: input.explanationText?.trim() || null,
      points: input.points ?? 1,
      sequenceOrder: seq
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create quiz question.');
  }

  return {
    id: created.id,
    quizId: created.quizId,
    questionText: created.questionText,
    questionType: created.questionType,
    options: (Array.isArray(created.options) ? created.options : []) as QuizOption[],
    correctOptionIds: (Array.isArray(created.correctOptionIds) ? created.correctOptionIds : []) as string[],
    explanationText: created.explanationText,
    points: created.points,
    sequenceOrder: created.sequenceOrder,
    createdAt: created.createdAt
  };
}

/**
 * Updates an existing question's content, options, correct answers, or points.
 */
export async function updateQuizQuestion(
  questionId: number,
  input: UpdateQuizQuestionInput,
  client: DbClient = db
): Promise<QuizQuestionWithDetails> {
  const [updated] = await client
    .update(quizQuestions)
    .set({
      questionText: input.questionText.trim(),
      questionType: input.questionType,
      options: input.options,
      correctOptionIds: input.correctOptionIds,
      explanationText: input.explanationText?.trim() || null,
      points: input.points ?? 1
    })
    .where(eq(quizQuestions.id, questionId))
    .returning();

  if (!updated) {
    throw new Error(`Quiz question with ID ${questionId} not found.`);
  }

  return {
    id: updated.id,
    quizId: updated.quizId,
    questionText: updated.questionText,
    questionType: updated.questionType,
    options: (Array.isArray(updated.options) ? updated.options : []) as QuizOption[],
    correctOptionIds: (Array.isArray(updated.correctOptionIds) ? updated.correctOptionIds : []) as string[],
    explanationText: updated.explanationText,
    points: updated.points,
    sequenceOrder: updated.sequenceOrder,
    createdAt: updated.createdAt
  };
}

/**
 * Deletes a question safely:
 * Rejects deletion if historical student attempts already exist for the quiz.
 */
export async function deleteQuizQuestion(
  questionId: number,
  client: DbClient = db
): Promise<{ success: boolean; error?: string }> {
  // Find question to obtain quizId
  const [question] = await client
    .select({ quizId: quizQuestions.quizId })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, questionId))
    .limit(1);

  if (!question) {
    return { success: false, error: 'Question not found.' };
  }

  // Historical attempt safety: check if student attempts already exist
  const [attemptCountRow] = await client
    .select({ count: count(quizAttempts.id) })
    .from(quizAttempts)
    .where(eq(quizAttempts.quizId, question.quizId));

  const attemptCount = Number(attemptCountRow?.count || 0);
  if (attemptCount > 0) {
    return {
      success: false,
      error: `Cannot delete question: This assessment already has ${attemptCount} student attempt(s). Modifying or deleting questions would invalidate historical evaluation records.`
    };
  }

  // Delete question
  await client.delete(quizQuestions).where(eq(quizQuestions.id, questionId));

  // Re-normalize remaining sequence orders for this quiz
  const remaining = await client
    .select({ id: quizQuestions.id })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, question.quizId))
    .orderBy(quizQuestions.sequenceOrder, quizQuestions.id);

  for (let i = 0; i < remaining.length; i++) {
    await client
      .update(quizQuestions)
      .set({ sequenceOrder: i })
      .where(eq(quizQuestions.id, remaining[i].id));
  }

  return { success: true };
}

/**
 * Reorders questions within a quiz according to the provided array of question IDs.
 */
export async function reorderQuizQuestions(
  quizId: string,
  questionIdsInOrder: number[],
  client: DbClient = db
): Promise<void> {
  for (let i = 0; i < questionIdsInOrder.length; i++) {
    const qId = questionIdsInOrder[i];
    await client
      .update(quizQuestions)
      .set({ sequenceOrder: i })
      .where(and(eq(quizQuestions.id, qId), eq(quizQuestions.quizId, quizId)));
  }
}
