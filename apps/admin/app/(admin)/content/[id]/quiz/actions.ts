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
  type QuizQuestionWithDetails
} from '@/lib/db/queries';
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
