'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  getContentItemById,
  createContentItem,
  updateContentItem,
  updateContentLifecycle,
  getProgramById,
  getOrCreateQuizForContentItem,
  type ContentItemWithDetails
} from '@/lib/db/queries';
import {
  createContentSchema,
  updateContentSchema,
  contentLifecycleActionSchema,
  type CreateContentInput,
  type UpdateContentInput
} from './schema';

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

    // 4. Construct metadata object
    const metadata: Record<string, unknown> = {};
    if (data.topic) metadata.topic = data.topic;
    if (data.resourceLink) metadata.resourceLink = data.resourceLink;
    if (data.videoUrl) metadata.videoUrl = data.videoUrl;
    if (data.durationMinutes !== undefined && data.durationMinutes !== null) {
      metadata.durationMinutes = data.durationMinutes;
    }
    if (data.notesMarkdown) metadata.notesMarkdown = data.notesMarkdown;

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
        await getOrCreateQuizForContentItem(newItem.id);
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

    // 6. Construct metadata update
    const metadataUpdate: Record<string, unknown> = {};
    if (data.topic !== undefined) metadataUpdate.topic = data.topic;
    if (data.resourceLink !== undefined) metadataUpdate.resourceLink = data.resourceLink;
    if (data.videoUrl !== undefined) metadataUpdate.videoUrl = data.videoUrl;
    if (data.durationMinutes !== undefined) metadataUpdate.durationMinutes = data.durationMinutes;
    if (data.notesMarkdown !== undefined) metadataUpdate.notesMarkdown = data.notesMarkdown;

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
