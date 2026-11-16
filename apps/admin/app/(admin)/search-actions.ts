'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import { searchEverything, type GlobalSearchResult } from '@/lib/db/queries';

const termSchema = z.string().trim().min(2).max(80);

export type GlobalSearchActionResult =
  | { success: true; data: GlobalSearchResult[] }
  | { success: false; error: string };

/** Backs the Ctrl+K palette. Read-only; colleges are returned to super administrators only. */
export async function globalSearchAction(rawTerm: unknown): Promise<GlobalSearchActionResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = termSchema.safeParse(rawTerm);
    if (!parsed.success) return { success: true, data: [] };

    const data = await searchEverything(parsed.data, { includeColleges: authz.role === 'super_admin' });
    return { success: true, data };
  } catch (error) {
    console.error('Error in globalSearchAction:', error instanceof Error ? error.message : 'unknown');
    return { success: false, error: 'Search failed. Please try again.' };
  }
}
