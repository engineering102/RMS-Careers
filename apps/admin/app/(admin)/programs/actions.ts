'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import {
  createProgram,
  updateProgramStatus,
  updateProgramCollege,
  countProgramBatchesOutsideCollege,
  getProgramByCode,
  getProgramById,
  getCollegeById
} from '@/lib/db/queries';

const collegeIdSchema = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid('Please select a valid college').nullable());

export async function createProgramAction(formData: FormData) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const name = formData.get('name') as string;
    const code = (formData.get('code') as string)?.trim().toUpperCase();
    const description = formData.get('description') as string;
    const status = (formData.get('status') as 'draft' | 'active' | 'archived') || 'draft';
    const capacity = parseInt(formData.get('capacity') as string, 10) || 0;
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;

    if (!name || !code) {
      return { success: false, error: 'Program name and code are required.' };
    }

    // The form posts '__none__' for "no college"
    const rawCollegeId = formData.get('collegeId');
    const collegeParse = collegeIdSchema.safeParse(
      rawCollegeId === '__none__' ? null : rawCollegeId
    );
    if (!collegeParse.success) {
      return { success: false, error: collegeParse.error.errors[0]?.message || 'Invalid college.' };
    }
    const collegeId = collegeParse.data;
    if (collegeId) {
      const college = await getCollegeById(collegeId);
      if (!college) return { success: false, error: 'Selected college does not exist.' };
      if (!college.isActive) return { success: false, error: 'Selected college is inactive.' };
    }

    const existing = await getProgramByCode(code);
    if (existing) {
      return { success: false, error: `Program with code ${code} already exists.` };
    }

    await createProgram({
      name,
      code,
      description,
      status,
      capacity,
      collegeId,
      startDate: startDateStr ? new Date(startDateStr) : null,
      endDate: endDateStr ? new Date(endDateStr) : null
    });

    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    console.error('Error creating program:', error);
    return { success: false, error: 'Failed to create program.' };
  }
}

export async function updateProgramStatusAction(id: number, status: 'draft' | 'active' | 'archived') {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    await updateProgramStatus(id, status);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    console.error('Error updating program status:', error);
    return { success: false, error: 'Failed to update program status.' };
  }
}

/**
 * Changes (or clears, with null) the college of an existing program.
 * Keeping the college the program already has is always allowed, even if that
 * college has since been deactivated.
 */
export async function updateProgramCollegeAction(id: number, collegeIdInput: string | null) {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const collegeParse = collegeIdSchema.safeParse(collegeIdInput);
    if (!collegeParse.success) {
      return { success: false, error: collegeParse.error.errors[0]?.message || 'Invalid college.' };
    }
    const collegeId = collegeParse.data;

    const program = await getProgramById(id);
    if (!program) return { success: false, error: 'Program not found.' };

    if (collegeId !== program.collegeId) {
      if (collegeId) {
        const college = await getCollegeById(collegeId);
        if (!college) return { success: false, error: 'Selected college does not exist.' };
        if (!college.isActive) return { success: false, error: 'Selected college is inactive.' };
      }
      if ((await countProgramBatchesOutsideCollege(id, collegeId)) > 0) {
        return {
          success: false,
          error: 'This program has batches under a different college, so its college cannot be changed.'
        };
      }
    }

    await updateProgramCollege(id, collegeId);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    console.error('Error updating program college:', error);
    return { success: false, error: 'Failed to update program college.' };
  }
}
