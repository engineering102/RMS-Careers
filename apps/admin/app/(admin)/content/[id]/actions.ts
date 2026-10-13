'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz';
import {
  getContentItemById,
  getProgramById,
  saveProjectRubric,
  updateContentItem,
  type ContentItemWithDetails
} from '@/lib/db/queries';
import { InvalidVideoUrlError } from '@/lib/content/student-metadata';
import { contentBuilderSchema, type ContentBuilderInput } from './schema';
import { builderMetadataPatch } from './metadata-patch';

export type ContentBuilderResult =
  | { success: true; item: ContentItemWithDetails }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      /** Set when the details were saved but a later step (the project rubric) failed. */
      savedItem?: ContentItemWithDetails;
    };

/**
 * Saves everything the content builder edits in one go: basics, the type-specific fields (stored under
 * the metadata keys the student portal reads), and, for projects, the rubric.
 */
export async function saveContentBuilderAction(input: ContentBuilderInput): Promise<ContentBuilderResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = contentBuilderSchema.safeParse(input);
    if (!parsed.success) {
      // Keyed by full path (e.g. "rubric.1.maxPoints") so the builder can mark the exact criterion field.
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Please check the highlighted fields.',
        fieldErrors
      };
    }
    const data = parsed.data;

    const existing = await getContentItemById(data.id);
    if (!existing) return { success: false, error: 'Content item not found.' };
    // The builder never changes an item's type.
    if (data.contentType !== existing.contentType) {
      return { success: false, error: 'This item’s content type cannot be changed here. Reload the page and try again.' };
    }

    if (data.programId !== null && !(await getProgramById(data.programId))) {
      return { success: false, error: 'Selected program does not exist.' };
    }

    let metadata: Record<string, unknown>;
    try {
      metadata = builderMetadataPatch(data);
    } catch (err) {
      if (err instanceof InvalidVideoUrlError) {
        return { success: false, error: err.message, fieldErrors: { videoUrl: [err.message] } };
      }
      throw err;
    }

    const item = await updateContentItem(data.id, {
      title: data.title,
      slug: data.slug,
      description: data.description.trim() || null,
      programId: data.programId,
      metadata
    });

    revalidatePath('/content');
    revalidatePath(`/content/${data.id}`);

    if (data.contentType === 'project') {
      // Not in one transaction with the details above (neon-http), so report a partial save honestly.
      try {
        await saveProjectRubric(
          data.id,
          data.rubric.map((c) => ({
            title: c.title,
            maxPoints: c.maxPoints,
            ...(c.description ? { description: c.description } : {})
          }))
        );
      } catch (error) {
        console.error('Error saving project rubric:', error);
        return {
          success: false,
          error: 'Details saved, but the rubric could not be saved. Please save again.',
          savedItem: item
        };
      }
    }

    return { success: true, item };
  } catch (error) {
    console.error('Error in saveContentBuilderAction:', error);
    const message = error instanceof Error ? error.message : '';
    // Slug clashes surface from updateContentItem as a readable message.
    if (message.includes('already in use')) {
      return { success: false, error: message, fieldErrors: { slug: [message] } };
    }
    return { success: false, error: 'Could not save this content item. Please try again.' };
  }
}
