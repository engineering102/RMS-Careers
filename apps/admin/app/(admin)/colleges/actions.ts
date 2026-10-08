'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/authz';
import {
  createCollege,
  updateCollege,
  updateCollegeStatus,
  getCollegeByCode,
  getCollegeById
} from '@/lib/db/queries';
import { DuplicateCollegeCodeError } from '@/lib/utils/college';
import { collegeSchema, updateCollegeSchema, collegeStatusSchema } from './schema';

type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function readForm(input: FormData | Record<string, unknown>): Record<string, unknown> {
  if (!(input instanceof FormData)) return input;
  return {
    id: input.get('id') ?? undefined,
    name: input.get('name') ?? undefined,
    code: input.get('code') ?? undefined,
    city: input.get('city') ?? undefined,
    state: input.get('state') ?? undefined
  };
}

function duplicateError(code: string): ActionResult {
  return {
    success: false,
    error: `A college with code ${code} already exists.`,
    fieldErrors: { code: ['This code is already in use'] }
  };
}

export async function createCollegeAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult> {
  try {
    const authz = await requireSuperAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = collegeSchema.safeParse(readForm(input));
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Validation failed.',
        fieldErrors: parsed.error.flatten().fieldErrors
      };
    }

    if (await getCollegeByCode(parsed.data.code)) return duplicateError(parsed.data.code);

    await createCollege(parsed.data);
    revalidatePath('/colleges');
    return { success: true };
  } catch (error) {
    if (error instanceof DuplicateCollegeCodeError) return duplicateError(error.code);
    console.error('Error creating college:', error);
    return { success: false, error: 'Failed to create college.' };
  }
}

export async function updateCollegeAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult> {
  try {
    const authz = await requireSuperAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = updateCollegeSchema.safeParse(readForm(input));
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Validation failed.',
        fieldErrors: parsed.error.flatten().fieldErrors
      };
    }
    const { id, ...data } = parsed.data;

    const current = await getCollegeById(id);
    if (!current) return { success: false, error: 'College not found.' };

    const clash = await getCollegeByCode(data.code);
    if (clash && clash.id !== id) return duplicateError(data.code);

    const updated = await updateCollege(id, data);
    if (!updated) return { success: false, error: 'College not found.' };

    revalidatePath('/colleges');
    return { success: true };
  } catch (error) {
    if (error instanceof DuplicateCollegeCodeError) return duplicateError(error.code);
    console.error('Error updating college:', error);
    return { success: false, error: 'Failed to update college.' };
  }
}

/**
 * Status change only: never deletes the college or touches students, programs,
 * batches or enrollments.
 */
export async function setCollegeActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const authz = await requireSuperAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = collegeStatusSchema.safeParse({ id, isActive });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' };
    }

    const updated = await updateCollegeStatus(parsed.data.id, parsed.data.isActive);
    if (!updated) return { success: false, error: 'College not found.' };

    revalidatePath('/colleges');
    return { success: true };
  } catch (error) {
    console.error('Error updating college status:', error);
    return { success: false, error: 'Failed to update college status.' };
  }
}
