'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  getBatchById,
  getBatchProjectSubmissionDetails,
  updateSubmissionReviewStatus,
  type ProjectSubmissionInspectorDetails
} from '@/lib/db/queries';
import {
  verifyPublicGithubRepo,
  type GithubValidationResult
} from '@/lib/services/github-validator';
import type { SubmissionStatusEnum } from '@rms/db';

export async function getSubmissionDetailsAction(
  batchId: string,
  submissionId: string
): Promise<
  | { success: true; data: ProjectSubmissionInspectorDetails }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId || !submissionId) {
      return { success: false, error: 'Invalid batch or submission identifier.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found.' };
    }

    const details = await getBatchProjectSubmissionDetails(batchId, submissionId);
    if (!details) {
      return {
        success: false,
        error: 'Submission not found or does not belong to this batch context.'
      };
    }

    return {
      success: true,
      data: details
    };
  } catch (error: any) {
    console.error('Error in getSubmissionDetailsAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to retrieve submission inspection details.'
    };
  }
}

export async function updateSubmissionReviewAction(
  batchId: string,
  submissionId: string,
  data: {
    newStatus: SubmissionStatusEnum;
    score?: number | null;
    feedback?: string | null;
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!batchId || !submissionId) {
      return { success: false, error: 'Invalid batch or submission identifier.' };
    }

    const batch = await getBatchById(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found.' };
    }

    const result = await updateSubmissionReviewStatus({
      batchId,
      submissionId,
      newStatus: data.newStatus,
      score: data.score,
      feedback: data.feedback,
      tutorUserId: session.user.id
    });

    if (result.success) {
      try {
        revalidatePath(`/batches/${batchId}/projects`);
      } catch {
        // Safe fallback in test or CLI execution
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error in updateSubmissionReviewAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update submission review.'
    };
  }
}

export async function validateGithubRepoAction(
  rawUrl: string
): Promise<
  | { success: true; data: GithubValidationResult }
  | { success: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    if (!rawUrl || !rawUrl.trim()) {
      return { success: false, error: 'GitHub repository URL is required.' };
    }

    const result = await verifyPublicGithubRepo(rawUrl.trim());
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Error in validateGithubRepoAction:', error);
    return {
      success: false,
      error: error?.message || 'Failed to validate GitHub repository.'
    };
  }
}
