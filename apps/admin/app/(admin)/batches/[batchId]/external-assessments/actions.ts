'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  getBatchById,
  persistExternalAssessmentImport,
  deleteExternalAssessmentRecord
} from '@/lib/db/queries';
import {
  parseExternalAssessmentCsv,
  validateAndMatchAssessmentRows,
  type AssessmentDefaultMeta,
  type ValidationPreviewResult
} from '@/lib/services/external-assessment-parser';

export async function previewExternalAssessmentCsvAction(
  batchId: string,
  csvContent: string,
  defaultMeta: AssessmentDefaultMeta
): Promise<
  | { success: true; data: ValidationPreviewResult }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId) {
      return { success: false, error: 'Invalid batch identifier.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found.' };
    }

    // 1. Parse CSV structure
    const parseResult = parseExternalAssessmentCsv(csvContent);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error || 'Failed to parse CSV file.' };
    }

    // 2. Validate rows against batch cohort enrollment and constraints
    const preview = await validateAndMatchAssessmentRows(
      batchId,
      parseResult.rows,
      defaultMeta
    );

    return {
      success: true,
      data: preview
    };
  } catch (error: any) {
    console.error('Error in previewExternalAssessmentCsvAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to process and validate CSV preview.'
    };
  }
}

export async function confirmExternalAssessmentImportAction(
  batchId: string,
  payload: {
    duplicateStrategy: 'update' | 'skip';
    rows: Array<{
      studentId: number;
      assessmentCode: string;
      assessmentName: string;
      provider: string;
      maxScore: number;
      obtainedScore: number;
      percentile?: number | null;
    }>;
  }
): Promise<{
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  message?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'Unauthorized access. Admin authentication required.'
      };
    }

    if (!batchId) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'Invalid batch identifier.'
      };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return {
        success: false,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: 'Batch not found.'
      };
    }

    const result = await persistExternalAssessmentImport({
      batchId,
      userId: session.user.id,
      duplicateStrategy: payload.duplicateStrategy,
      rows: payload.rows
    });

    if (result.success) {
      try {
        revalidatePath(`/batches/${batchId}/external-assessments`);
      } catch {
        // Safe fallback in test or CLI execution
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error in confirmExternalAssessmentImportAction:', error);
    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      error: error?.message || 'Failed to persist external assessment import.'
    };
  }
}

export async function deleteExternalAssessmentRecordAction(
  batchId: string,
  recordId: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId || !recordId) {
      return { success: false, error: 'Invalid batch or record identifier.' };
    }

    const res = await deleteExternalAssessmentRecord(batchId, recordId);
    if (res.success) {
      try {
        revalidatePath(`/batches/${batchId}/external-assessments`);
      } catch {
        // Safe fallback
      }
    }
    return res;
  } catch (error: any) {
    console.error('Error in deleteExternalAssessmentRecordAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to delete external assessment record.'
    };
  }
}
