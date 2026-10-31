'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import {
  getBatchById,
  createLiveSession,
  updateLiveSession,
  setLiveSessionPublished,
  deleteLiveSession
} from '@/lib/db/queries';
import { liveSessionSchema, type LiveSessionFormInput } from './schema';

type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const uuid = z.string().uuid();

function revalidate(batchId: string) {
  try {
    revalidatePath(`/batches/${batchId}/live-lectures`);
  } catch {
    // Safe fallback in test or CLI execution
  }
}

async function guard(batchId: string, sessionId?: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const authz = await requireAdmin();
  if (!authz.ok) return { ok: false, error: authz.error };
  if (!uuid.safeParse(batchId).success || (sessionId !== undefined && !uuid.safeParse(sessionId).success)) {
    return { ok: false, error: 'Invalid request.' };
  }
  if (!(await getBatchById(batchId))) return { ok: false, error: 'Batch not found.' };
  return { ok: true, userId: authz.userId };
}

function validation(input: LiveSessionFormInput) {
  const parsed = liveSessionSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    result: {
      success: false as const,
      error: parsed.error.errors[0]?.message || 'Check the highlighted fields.',
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  };
}

export async function createLiveSessionAction(batchId: string, input: LiveSessionFormInput): Promise<ActionResult> {
  try {
    const g = await guard(batchId);
    if (!g.ok) return { success: false, error: g.error };
    const v = validation(input);
    if (!v.ok) return v.result;
    await createLiveSession(batchId, v.data, g.userId);
    revalidate(batchId);
    return { success: true };
  } catch (error) {
    console.error('Error creating live session:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to save the live session.' };
  }
}

export async function updateLiveSessionAction(batchId: string, sessionId: string, input: LiveSessionFormInput): Promise<ActionResult> {
  try {
    const g = await guard(batchId, sessionId);
    if (!g.ok) return { success: false, error: g.error };
    const v = validation(input);
    if (!v.ok) return v.result;
    if (!(await updateLiveSession(batchId, sessionId, v.data))) return { success: false, error: 'Live session not found.' };
    revalidate(batchId);
    return { success: true };
  } catch (error) {
    console.error('Error updating live session:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to save the live session.' };
  }
}

export async function setLiveSessionPublishedAction(batchId: string, sessionId: string, isPublished: boolean): Promise<ActionResult> {
  try {
    const g = await guard(batchId, sessionId);
    if (!g.ok) return { success: false, error: g.error };
    if (typeof isPublished !== 'boolean') return { success: false, error: 'Invalid request.' };
    if (!(await setLiveSessionPublished(batchId, sessionId, isPublished))) return { success: false, error: 'Live session not found.' };
    revalidate(batchId);
    return { success: true };
  } catch (error) {
    console.error('Error publishing live session:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to update the live session.' };
  }
}

export async function deleteLiveSessionAction(batchId: string, sessionId: string): Promise<ActionResult> {
  try {
    const g = await guard(batchId, sessionId);
    if (!g.ok) return { success: false, error: g.error };
    if (!(await deleteLiveSession(batchId, sessionId))) return { success: false, error: 'Live session not found.' };
    revalidate(batchId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting live session:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to delete the live session.' };
  }
}
