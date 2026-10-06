'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getCollegeById, getProgramById, createBatch } from '@/lib/db/queries';
import { createBatchSchema, type CreateBatchInput } from './schema';

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
