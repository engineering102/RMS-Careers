'use server';

import { revalidatePath } from 'next/cache';
import { createProgram, updateProgramStatus, getProgramByCode } from '@/lib/db/queries';

export async function createProgramAction(formData: FormData) {
  try {
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
    await updateProgramStatus(id, status);
    revalidatePath('/programs');
    return { success: true };
  } catch (error) {
    console.error('Error updating program status:', error);
    return { success: false, error: 'Failed to update program status.' };
  }
}
