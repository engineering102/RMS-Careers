'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  getBatchById,
  getContentItemById,
  getCurriculumPlacementById,
  addContentToBatch,
  updateCurriculumPlacement,
  removeCurriculumPlacement,
  reorderCurriculumPlacements,
  type CurriculumPlacementItem
} from '@/lib/db/queries';
import {
  addContentToBatchSchema,
  updatePlacementSchema,
  reorderPlacementsSchema
} from './schema';

const IMMUTABLE_BATCH_STATUSES = ['completed', 'archived'];

export async function addContentToBatchAction(
  batchId: string,
  formDataOrInput: FormData | Record<string, unknown>
): Promise<
  | { success: true; placement: CurriculumPlacementItem }
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

    // 2. Verify batch exists & mutability
    const batch = await getBatchById(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found.'
      };
    }

    if (IMMUTABLE_BATCH_STATUSES.includes(batch.status)) {
      return {
        success: false,
        error: `Cannot modify curriculum for a ${batch.status} batch.`
      };
    }

    // 3. Extract and validate input
    let rawData: Record<string, unknown>;
    if (formDataOrInput instanceof FormData) {
      rawData = {
        contentItemId: formDataOrInput.get('contentItemId'),
        weekNumber: formDataOrInput.get('weekNumber'),
        sequenceOrder: formDataOrInput.get('sequenceOrder') || undefined,
        isRequired: formDataOrInput.get('isRequired') === 'true',
        availableFrom: formDataOrInput.get('availableFrom') || undefined,
        dueAt: formDataOrInput.get('dueAt') || undefined
      };
    } else {
      rawData = formDataOrInput;
    }

    const validationResult = addContentToBatchSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Validation failed.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validationResult.error.flatten().fieldErrors
      };
    }

    const data = validationResult.data;

    // 4. Verify canonical content item exists
    const content = await getContentItemById(data.contentItemId);
    if (!content) {
      return {
        success: false,
        error: 'Canonical content item not found.'
      };
    }

    // 5. Verify content eligibility: Not archived
    if (content.lifecycleStatus === 'archived') {
      return {
        success: false,
        error: 'Archived content items cannot be newly placed in a curriculum.'
      };
    }

    // 6. Verify content eligibility: Published state
    if (!content.isPublished) {
      return {
        success: false,
        error: 'Draft content items cannot be placed in a curriculum. Publish the item first.'
      };
    }

    // 7. Verify program/global compatibility
    if (content.programId !== null && content.programId !== batch.programId) {
      return {
        success: false,
        error: 'Content item belongs to another program and cannot be added to this batch.'
      };
    }

    // 8. Add placement
    const placement = await addContentToBatch({
      batchId,
      contentItemId: data.contentItemId,
      weekNumber: data.weekNumber,
      sequenceOrder: data.sequenceOrder,
      isRequired: data.isRequired,
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null
    });

    revalidatePath(`/batches/${batchId}/curriculum`);
    revalidatePath(`/batches/${batchId}`);

    return {
      success: true,
      placement
    };
  } catch (error: any) {
    console.error('Error in addContentToBatchAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to add content to batch curriculum.'
    };
  }
}

export async function updatePlacementAction(
  batchId: string,
  placementId: number,
  formDataOrInput: FormData | Record<string, unknown>
): Promise<
  | { success: true; placement: CurriculumPlacementItem }
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

    // 2. Verify batch exists & mutability
    const batch = await getBatchById(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found.'
      };
    }

    if (IMMUTABLE_BATCH_STATUSES.includes(batch.status)) {
      return {
        success: false,
        error: `Cannot modify curriculum for a ${batch.status} batch.`
      };
    }

    // 3. Verify placement exists and belongs to this batch
    const placement = await getCurriculumPlacementById(placementId);
    if (!placement) {
      return {
        success: false,
        error: 'Curriculum placement not found.'
      };
    }

    if (placement.batchId !== batchId) {
      return {
        success: false,
        error: 'Placement does not belong to this batch.'
      };
    }

    // 4. Extract and validate input
    let rawData: Record<string, unknown>;
    if (formDataOrInput instanceof FormData) {
      rawData = {
        placementId,
        weekNumber: formDataOrInput.get('weekNumber') || undefined,
        sequenceOrder: formDataOrInput.get('sequenceOrder') || undefined,
        isRequired:
          formDataOrInput.get('isRequired') !== null
            ? formDataOrInput.get('isRequired') === 'true'
            : undefined,
        availableFrom: formDataOrInput.get('availableFrom') || undefined,
        dueAt: formDataOrInput.get('dueAt') || undefined
      };
    } else {
      rawData = { ...formDataOrInput, placementId };
    }

    const validationResult = updatePlacementSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || 'Validation failed.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validationResult.error.flatten().fieldErrors
      };
    }

    const data = validationResult.data;

    // 5. Update placement
    const updated = await updateCurriculumPlacement(placementId, {
      weekNumber: data.weekNumber,
      sequenceOrder: data.sequenceOrder,
      isRequired: data.isRequired,
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined
    });

    revalidatePath(`/batches/${batchId}/curriculum`);

    return {
      success: true,
      placement: updated
    };
  } catch (error: any) {
    console.error('Error in updatePlacementAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update curriculum placement.'
    };
  }
}

export async function removePlacementAction(
  batchId: string,
  placementId: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // 1. Authenticate administrator
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    // 2. Verify batch exists & mutability
    const batch = await getBatchById(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found.'
      };
    }

    if (IMMUTABLE_BATCH_STATUSES.includes(batch.status)) {
      return {
        success: false,
        error: `Cannot modify curriculum for a ${batch.status} batch.`
      };
    }

    // 3. Verify placement exists and belongs to this batch
    const placement = await getCurriculumPlacementById(placementId);
    if (!placement) {
      return {
        success: false,
        error: 'Curriculum placement not found.'
      };
    }

    if (placement.batchId !== batchId) {
      return {
        success: false,
        error: 'Placement does not belong to this batch.'
      };
    }

    // 4. Remove placement (only deletes batch_curriculum row, preserving canonical content)
    await removeCurriculumPlacement(placementId);

    revalidatePath(`/batches/${batchId}/curriculum`);

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error in removePlacementAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to remove curriculum placement.'
    };
  }
}

export async function reorderCurriculumAction(
  batchId: string,
  updates: { placementId: number; weekNumber: number; sequenceOrder: number }[]
): Promise<
  | { success: true; curriculum: CurriculumPlacementItem[] }
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

    // 2. Verify batch exists & mutability
    const batch = await getBatchById(batchId);
    if (!batch) {
      return {
        success: false,
        error: 'Batch not found.'
      };
    }

    if (IMMUTABLE_BATCH_STATUSES.includes(batch.status)) {
      return {
        success: false,
        error: `Cannot modify curriculum for a ${batch.status} batch.`
      };
    }

    // 3. Validate input
    const validationResult = reorderPlacementsSchema.safeParse({ items: updates });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || 'Invalid reorder parameters.'
      };
    }

    // 4. Execute reorder
    const updatedCurriculum = await reorderCurriculumPlacements(batchId, updates);

    revalidatePath(`/batches/${batchId}/curriculum`);

    return {
      success: true,
      curriculum: updatedCurriculum
    };
  } catch (error: any) {
    console.error('Error in reorderCurriculumAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to reorder curriculum placements.'
    };
  }
}
