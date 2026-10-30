'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import { addTutorToBatch, removeTutorFromBatch } from '@/lib/db/queries';

type ActionResult = { success: true; message: string } | { success: false; error: string };

const idsSchema = z.object({
  batchId: z.string().uuid('Invalid batch identifier'),
  tutorId: z.string().uuid('Invalid tutor identifier')
});

function revalidate(batchId: string) {
  try {
    revalidatePath(`/batches/${batchId}`);
    revalidatePath('/batches');
    revalidatePath('/tutors');
  } catch {
    // Safe fallback in test or CLI execution
  }
}

/** Gives a tutor access to this batch in the Tutor Portal. Assigning an already assigned tutor is a no-op. */
export async function assignTutorAction(batchId: string, tutorId: string): Promise<ActionResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };
    const parsed = idsSchema.safeParse({ batchId, tutorId });
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Invalid request.' };

    const result = await addTutorToBatch(tutorId, batchId);
    if (!result.ok) {
      const errors = {
        tutor_not_found: 'Tutor not found.',
        tutor_inactive: 'This tutor is deactivated. Reactivate them on the Tutors page first.',
        batch_not_found: 'Batch not found.'
      } as const;
      return { success: false, error: errors[result.code] };
    }

    revalidate(batchId);
    return { success: true, message: result.created ? 'Tutor assigned to this batch.' : 'This tutor was already assigned.' };
  } catch (error) {
    console.error('Error assigning tutor:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to assign the tutor.' };
  }
}

/** Ends the tutor's access to this batch on their next request. Reviews they made are kept. */
export async function unassignTutorAction(batchId: string, tutorId: string): Promise<ActionResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };
    const parsed = idsSchema.safeParse({ batchId, tutorId });
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Invalid request.' };

    if (!(await removeTutorFromBatch(tutorId, batchId))) {
      return { success: false, error: 'This tutor is not assigned to this batch.' };
    }
    revalidate(batchId);
    return { success: true, message: 'Tutor removed from this batch.' };
  } catch (error) {
    console.error('Error unassigning tutor:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to remove the tutor.' };
  }
}
