'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  getOrCreateQuizForContentItem,
  updateQuizConfig,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  reorderQuizQuestions,
  createQuizQuestionsBulk,
  getQuizByContentItemId,
  type QuizQuestionWithDetails
} from '@/lib/db/queries';
import { requireAdmin } from '@/lib/authz';
import { MAX_IMPORT_QUESTIONS } from '@/lib/content/quiz-import';
import {
  quizConfigSchema,
  quizQuestionSchema,
  reorderQuestionsSchema,
  type QuizConfigInput,
  type QuizQuestionInput
} from './schema';
import type { Quiz } from '@rms/db';

export async function saveQuizConfigAction(
  contentItemId: string,
  rawInput: Record<string, unknown>
): Promise<
  | { success: true; quiz: Quiz }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    const validation = quizConfigSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid quiz configuration.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validation.error.flatten().fieldErrors
      };
    }

    const data = validation.data;
    const quizDetails = await getOrCreateQuizForContentItem(contentItemId);
    const updatedQuiz = await updateQuizConfig(quizDetails.id, data);

    revalidatePath('/content');
    revalidatePath(`/content/${contentItemId}/quiz`);

    return {
      success: true,
      quiz: updatedQuiz
    };
  } catch (error: any) {
    console.error('Error in saveQuizConfigAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to save quiz configuration.'
    };
  }
}

export async function createQuestionAction(
  contentItemId: string,
  quizId: string,
  rawInput: Record<string, unknown>
): Promise<
  | { success: true; question: QuizQuestionWithDetails }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    const validation = quizQuestionSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid question data.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validation.error.flatten().fieldErrors
      };
    }

    const created = await createQuizQuestion(quizId, validation.data);

    revalidatePath(`/content/${contentItemId}/quiz`);

    return {
      success: true,
      question: created
    };
  } catch (error: any) {
    console.error('Error in createQuestionAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create question.'
    };
  }
}

export async function updateQuestionAction(
  contentItemId: string,
  questionId: number,
  rawInput: Record<string, unknown>
): Promise<
  | { success: true; question: QuizQuestionWithDetails }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    const validation = quizQuestionSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid question data.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validation.error.flatten().fieldErrors
      };
    }

    const updated = await updateQuizQuestion(questionId, validation.data);

    revalidatePath(`/content/${contentItemId}/quiz`);

    return {
      success: true,
      question: updated
    };
  } catch (error: any) {
    console.error('Error in updateQuestionAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update question.'
    };
  }
}

export async function deleteQuestionAction(
  contentItemId: string,
  questionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    const result = await deleteQuizQuestion(questionId);
    if (!result.success) {
      return result;
    }

    revalidatePath(`/content/${contentItemId}/quiz`);

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteQuestionAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete question.'
    };
  }
}

export async function reorderQuestionsAction(
  contentItemId: string,
  quizId: string,
  rawInput: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    const validation = reorderQuestionsSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid reorder data.'
      };
    }

    await reorderQuizQuestions(quizId, validation.data.questionIds);

    revalidatePath(`/content/${contentItemId}/quiz`);

    return { success: true };
  } catch (error: any) {
    console.error('Error in reorderQuestionsAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to reorder questions.'
    };
  }
}

/**
 * Adds many questions at once (the workbench's paste import). Every question passes the same schema
 * as the single-question form, and nothing is saved unless all of them are valid.
 */
export async function importQuestionsAction(
  contentItemId: string,
  quizId: string,
  rawQuestions: unknown
): Promise<{ success: true; questions: QuizQuestionWithDetails[] } | { success: false; error: string }> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return { success: false, error: 'There are no questions to import.' };
    }
    if (rawQuestions.length > MAX_IMPORT_QUESTIONS) {
      return { success: false, error: `Import at most ${MAX_IMPORT_QUESTIONS} questions at a time.` };
    }

    const valid: QuizQuestionInput[] = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const parsed = quizQuestionSchema.safeParse(rawQuestions[i]);
      if (!parsed.success) {
        return {
          success: false,
          error: `Question ${i + 1}: ${parsed.error.errors[0]?.message || 'is not valid.'} Nothing was imported.`
        };
      }
      valid.push(parsed.data);
    }

    // The quiz id comes from the client: only accept the quiz that belongs to this content item.
    const quiz = await getQuizByContentItemId(contentItemId);
    if (!quiz || quiz.id !== quizId) return { success: false, error: 'Quiz not found. Reload the page and try again.' };

    const questions = await createQuizQuestionsBulk(
      quiz.id,
      valid.map(({ sequenceOrder: _ignored, ...q }) => q)
    );

    revalidatePath(`/content/${contentItemId}/quiz`);
    revalidatePath(`/content/${contentItemId}`);
    revalidatePath('/content');
    return { success: true, questions };
  } catch (error) {
    console.error('Error in importQuestionsAction:', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Failed to import the questions. Please try again.' };
  }
}
