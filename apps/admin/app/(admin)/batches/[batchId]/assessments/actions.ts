'use server';

import { auth } from '@/lib/auth';
import {
  getBatchById,
  getBatchAttemptDetails,
  generateBatchAssessmentCsv,
  type AttemptInspectorDetails
} from '@/lib/db/queries';

export async function getAttemptDetailsAction(
  batchId: string,
  attemptId: string
): Promise<
  | { success: true; data: AttemptInspectorDetails }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId || !attemptId) {
      return { success: false, error: 'Invalid batch or attempt identifier.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found.' };
    }

    const details = await getBatchAttemptDetails(batchId, attemptId);
    if (!details) {
      return {
        success: false,
        error: 'Attempt not found or does not belong to this batch context.'
      };
    }

    return {
      success: true,
      data: details
    };
  } catch (error: any) {
    console.error('Error in getAttemptDetailsAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to retrieve attempt inspection details.'
    };
  }
}

export async function exportAssessmentCsvAction(
  batchId: string,
  quizId?: string
): Promise<
  | { success: true; data: { filename: string; csvContent: string } }
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

    const exportData = await generateBatchAssessmentCsv(batchId, quizId);
    if (!exportData) {
      return { success: false, error: 'Failed to generate assessment CSV report.' };
    }

    return {
      success: true,
      data: exportData
    };
  } catch (error: any) {
    console.error('Error in exportAssessmentCsvAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to export assessment results CSV.'
    };
  }
}
