'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import {
  getContentItemById,
  createContentItem,
  updateContentItem,
  updateContentLifecycle,
  getProgramById,
  getOrCreateQuizForContentItem,
  duplicateContentItem,
  getQuizByContentItemId,
  createQuizQuestionsBulk,
  getProjectAssignmentConfig,
  saveProjectRubric,
  type ContentItemWithDetails
} from '@/lib/db/queries';
import {
  createContentSchema,
  updateContentSchema,
  contentLifecycleActionSchema,
  type CreateContentInput,
  type UpdateContentInput
} from './schema';
import { buildStudentMetadataPatch, InvalidVideoUrlError } from '@/lib/content/student-metadata';
import { quizDefaultsFor } from '@/lib/content/types/registry';

export async function createContentAction(
  formDataOrInput: FormData | Record<string, unknown>
): Promise<
  | { success: true; item: ContentItemWithDetails }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    // 1. Authenticate administrator
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    // Extract payload
    let rawData: Record<string, unknown>;
    if (formDataOrInput instanceof FormData) {
      rawData = {
        title: formDataOrInput.get('title'),
        slug: formDataOrInput.get('slug') || undefined,
        contentType: formDataOrInput.get('contentType'),
        quizType: formDataOrInput.get('quizType') || undefined,
        description: formDataOrInput.get('description') || undefined,
        programId: formDataOrInput.get('programId') || undefined,
        isPublished: formDataOrInput.get('isPublished') === 'true',
        topic: formDataOrInput.get('topic') || undefined,
        resourceLink: formDataOrInput.get('resourceLink') || undefined,
        videoUrl: formDataOrInput.get('videoUrl') || undefined,
        durationMinutes: formDataOrInput.get('durationMinutes') || undefined,
        notesMarkdown: formDataOrInput.get('notesMarkdown') || undefined
      };
    } else {
      rawData = formDataOrInput;
    }

    // 2. Validate input
    const validationResult = createContentSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Validation failed.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validationResult.error.flatten().fieldErrors
      };
    }

    const data = validationResult.data;

    // 3. Verify program exists if programId is provided
    if (data.programId) {
      const program = await getProgramById(data.programId);
      if (!program) {
        return {
          success: false,
          error: 'Selected program does not exist.'
        };
      }
    }

    // 4. Construct metadata object, using the keys the student portal reads
    let metadata: Record<string, unknown>;
    try {
      metadata = buildStudentMetadataPatch({
        topic: data.topic || undefined,
        videoUrl: data.videoUrl || undefined,
        resourceLink: data.resourceLink || undefined,
        notes: data.notesMarkdown || undefined,
        durationMinutes: data.durationMinutes ?? undefined
      });
    } catch (err) {
      if (err instanceof InvalidVideoUrlError) {
        return { success: false, error: err.message, fieldErrors: { videoUrl: [err.message] } };
      }
      throw err;
    }

    // 5. Create canonical content item
    const newItem = await createContentItem({
      title: data.title,
      slug: data.slug || undefined,
      contentType: data.contentType,
      description: data.description || null,
      programId: data.programId || null,
      isPublished: data.isPublished,
      metadata
    });

    // 5b. If content item is a quiz, ensure 1-to-1 canonical quiz record is provisioned
    if (newItem.contentType === 'quiz') {
      try {
        await getOrCreateQuizForContentItem(newItem.id, quizDefaultsFor(data.quizType ?? 'practice'));
      } catch (quizErr) {
        console.warn('Could not auto-provision quiz row upon content creation:', quizErr);
      }
    }

    // 6. Invalidate content route cache
    revalidatePath('/content');

    return {
      success: true,
      item: newItem
    };
  } catch (error: any) {
    console.error('Error in createContentAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create content item.'
    };
  }
}

export async function updateContentAction(
  id: string,
  formDataOrInput: FormData | Record<string, unknown>
): Promise<
  | { success: true; item: ContentItemWithDetails }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  try {
    // 1. Authenticate administrator
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    // 2. Extract payload
    let rawData: Record<string, unknown>;
    if (formDataOrInput instanceof FormData) {
      rawData = {
        id,
        title: formDataOrInput.get('title'),
        slug: formDataOrInput.get('slug') || undefined,
        contentType: formDataOrInput.get('contentType'),
        description: formDataOrInput.get('description') || undefined,
        programId: formDataOrInput.get('programId') || undefined,
        isPublished:
          formDataOrInput.get('isPublished') !== null
            ? formDataOrInput.get('isPublished') === 'true'
            : undefined,
        topic: formDataOrInput.get('topic') || undefined,
        resourceLink: formDataOrInput.get('resourceLink') || undefined,
        videoUrl: formDataOrInput.get('videoUrl') || undefined,
        durationMinutes: formDataOrInput.get('durationMinutes') || undefined,
        notesMarkdown: formDataOrInput.get('notesMarkdown') || undefined
      };
    } else {
      rawData = { ...formDataOrInput, id };
    }

    // 3. Validate input
    const validationResult = updateContentSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Validation failed.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validationResult.error.flatten().fieldErrors
      };
    }

    const data = validationResult.data;

    // 4. Verify existing content item exists
    const existing = await getContentItemById(id);
    if (!existing) {
      return {
        success: false,
        error: 'Target content item does not exist.'
      };
    }

    // External tests keep their own metadata and student surface (Assessments), so they never change type.
    if (
      data.contentType &&
      data.contentType !== existing.contentType &&
      (data.contentType === 'external_test' || existing.contentType === 'external_test')
    ) {
      return {
        success: false,
        error: 'External tests cannot be converted to or from another content type.'
      };
    }

    // 5. Verify program exists if programId is changing and not null
    if (data.programId) {
      const program = await getProgramById(data.programId);
      if (!program) {
        return {
          success: false,
          error: 'Selected program does not exist.'
        };
      }
    }

    // 6. Construct metadata update, using the keys the student portal reads
    let metadataUpdate: Record<string, unknown>;
    try {
      metadataUpdate = buildStudentMetadataPatch({
        topic: data.topic,
        videoUrl: data.videoUrl,
        resourceLink: data.resourceLink,
        notes: data.notesMarkdown,
        durationMinutes: data.durationMinutes
      });
    } catch (err) {
      if (err instanceof InvalidVideoUrlError) {
        return { success: false, error: err.message, fieldErrors: { videoUrl: [err.message] } };
      }
      throw err;
    }

    // 7. Update canonical content item in-place
    const updated = await updateContentItem(id, {
      title: data.title,
      slug: data.slug || undefined,
      contentType: data.contentType,
      description: data.description !== undefined ? data.description : undefined,
      programId: data.programId !== undefined ? data.programId : undefined,
      isPublished: data.isPublished,
      metadata: Object.keys(metadataUpdate).length > 0 ? metadataUpdate : undefined
    });

    revalidatePath('/content');

    return {
      success: true,
      item: updated
    };
  } catch (error: any) {
    console.error('Error in updateContentAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update content item.'
    };
  }
}

export async function updateContentLifecycleAction(
  id: string,
  action: 'publish' | 'unpublish' | 'archive' | 'unarchive'
): Promise<
  | { success: true; item: ContentItemWithDetails }
  | { success: false; error: string }
> {
  try {
    // 1. Authenticate administrator
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    // 2. Validate input
    const validationResult = contentLifecycleActionSchema.safeParse({ id, action });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Invalid lifecycle action parameters.'
      };
    }

    // 3. Verify content item exists
    const existing = await getContentItemById(id);
    if (!existing) {
      return {
        success: false,
        error: 'Target content item does not exist.'
      };
    }

    // 4. Update lifecycle state
    const updated = await updateContentLifecycle(id, action);

    revalidatePath('/content');

    return {
      success: true,
      item: updated
    };
  } catch (error: any) {
    console.error('Error in updateContentLifecycleAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update content lifecycle.'
    };
  }
}

/**
 * Duplicates a content item as a new draft, with what was authored for it: a quiz keeps its settings
 * and questions, a project keeps its rubric. A DSA sheet is only a pointer to a catalogue sheet by
 * slug, so a copy would point nowhere and is refused.
 */
export async function duplicateContentAction(
  id: unknown
): Promise<
  | { success: true; item: ContentItemWithDetails; warning?: string }
  | { success: false; error: string }
> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsedId = z.string().uuid().safeParse(id);
    if (!parsedId.success) return { success: false, error: 'Invalid content ID.' };

    const source = await getContentItemById(parsedId.data);
    if (!source) return { success: false, error: 'Content item not found.' };
    if (source.contentType === 'dsa_sheet') {
      return { success: false, error: 'A DSA sheet item links to a catalogue sheet by its slug, so it cannot be duplicated.' };
    }

    const copy = await duplicateContentItem(source);

    // The copy exists from here on: a failure below is reported, not thrown, so the admin can finish it by hand.
    let warning: string | undefined;
    try {
      if (source.contentType === 'quiz') {
        const quiz = await getQuizByContentItemId(source.id);
        const copiedQuiz = await getOrCreateQuizForContentItem(
          copy.id,
          quiz
            ? {
                quizType: quiz.quizType,
                timeLimitMinutes: quiz.timeLimitMinutes,
                passingScorePercent: quiz.passingScorePercent,
                showExplanations: quiz.showExplanations
              }
            : quizDefaultsFor('practice')
        );
        if (quiz && quiz.questions.length > 0) {
          await createQuizQuestionsBulk(
            copiedQuiz.id,
            quiz.questions.map((q) => ({
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options,
              correctOptionIds: q.correctOptionIds,
              explanationText: q.explanationText,
              points: q.points
            }))
          );
        }
      } else if (source.contentType === 'project') {
        const config = await getProjectAssignmentConfig(source.id);
        if (config && config.rubricCriteria.length > 0) await saveProjectRubric(copy.id, config.rubricCriteria);
      }
    } catch (error) {
      console.error('Duplicate: copying authored parts failed:', error instanceof Error ? error.message : 'unknown');
      warning =
        source.contentType === 'quiz'
          ? 'The copy was created, but its questions could not be copied. Add them in the quiz workbench.'
          : 'The copy was created, but its rubric could not be copied. Set it in the builder.';
    }

    revalidatePath('/content');
    return { success: true, item: copy, warning };
  } catch (error) {
    console.error('Error in duplicateContentAction:', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Failed to duplicate the content item. Please try again.' };
  }
}
