'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCollegeById, getProgramById, createBatch, getBatchById, updateBatch } from '@/lib/db/queries';
import { requireAdmin } from '@/lib/authz';
import { createBatchSchema, updateBatchSchema, type CreateBatchInput } from './schema';

export async function createBatchAction(
  formDataOrInput: FormData | Record<string, unknown>
) {
  try {
    // 1. Authenticate administrator
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    // Extract raw payload
    let rawData: Record<string, unknown>;
    if (formDataOrInput instanceof FormData) {
      rawData = {
        name: formDataOrInput.get('name'),
        collegeId: formDataOrInput.get('collegeId'),
        programId: formDataOrInput.get('programId'),
        startDate: formDataOrInput.get('startDate'),
        endDate: formDataOrInput.get('endDate'),
        status: formDataOrInput.get('status') || 'active'
      };
    } else {
      rawData = formDataOrInput;
    }

    // 2. Validate input
    const validationResult = createBatchSchema.safeParse(rawData);
    if (!validationResult.success) {
      const firstError =
        validationResult.error.errors[0]?.message || 'Validation failed.';
      return {
        success: false,
        error: firstError,
        fieldErrors: validationResult.error.flatten().fieldErrors
      };
    }

    const { name, collegeId, programId, startDate, endDate, status } =
      validationResult.data;

    // 3. Verify referenced college exists
    const college = await getCollegeById(collegeId);
    if (!college) {
      return {
        success: false,
        error: 'Selected college does not exist.'
      };
    }
    if (!college.isActive) {
      return {
        success: false,
        error: 'Selected college is inactive.'
      };
    }

    // 4. Verify referenced program exists
    const program = await getProgramById(programId);
    if (!program) {
      return {
        success: false,
        error: 'Selected program does not exist.'
      };
    }

    // 5. Verify program belongs to selected college (college/program consistency)
    if (program.collegeId !== collegeId) {
      return {
        success: false,
        error: 'Selected program does not belong to the selected college.'
      };
    }

    // 6. Insert batch
    const newBatch = await createBatch({
      name,
      collegeId,
      programId,
      startDate,
      endDate,
      status
    });

    // 7. Invalidate and refresh cache
    revalidatePath('/batches');

    return {
      success: true,
      batch: newBatch
    };
  } catch (error: any) {
    console.error('Error in createBatchAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create batch.'
    };
  }
}

export type UpdateBatchResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Edits a batch's name, timeline and status. Status decides student access: students can open a
 * batch only while it is active or completed, and a completed or archived batch has a read-only
 * curriculum.
 */
export async function updateBatchAction(batchId: unknown, rawInput: unknown): Promise<UpdateBatchResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const id = z.string().uuid().safeParse(batchId);
    if (!id.success) return { success: false, error: 'Invalid request.' };

    const parsed = updateBatchSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Validation failed.',
        fieldErrors: parsed.error.flatten().fieldErrors
      };
    }

    const existing = await getBatchById(id.data);
    if (!existing) return { success: false, error: 'Batch not found.' };

    const updated = await updateBatch(id.data, parsed.data);
    if (!updated) return { success: false, error: 'Batch not found.' };

    revalidatePath('/batches');
    revalidatePath(`/batches/${id.data}`, 'layout');
    revalidatePath('/overview');

    return { success: true, message: `Batch "${updated.name}" updated.` };
  } catch (error) {
    console.error('Error in updateBatchAction:', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Failed to update the batch. Please try again.' };
  }
}
