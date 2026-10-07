'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  assignments,
  assignmentSubmissions,
  enrollments,
  batchCurriculum
} from '@rms/db';
import { eq, and } from 'drizzle-orm';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import type {
  SubmitProjectInput,
  SubmitProjectResult
} from '@/lib/types/projects';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/)?$/;

/**
 * Validates public accessibility of a GitHub repository via lightweight HEAD fetch.
 */
async function verifyPublicGithubRepo(url: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'RMS-Careers-Validator/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        valid: false,
        reason: 'GitHub repository not found or is private. Please ensure the repository is public.'
      };
    }

    if (!response.ok && response.status !== 405) {
      // Some servers might return 405 Method Not Allowed on HEAD, which still implies existence
      if (response.status >= 500) {
        // Upstream GitHub 5xx, do not hard-block legitimate submissions
        return { valid: true };
      }
      return {
        valid: false,
        reason: `GitHub returned status ${response.status}. Please check the repository URL.`
      };
    }

    return { valid: true };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        valid: false,
        reason: 'Connection to GitHub timed out. Please check your URL and try again.'
      };
    }
    // Network / DNS error
    return {
      valid: false,
      reason: 'Could not connect to GitHub. Please verify the URL is correct and accessible.'
    };
  }
}

/**
 * Submits or resubmits a project assignment for tutor evaluation.
 */
export async function submitProjectAssignment(
  input: SubmitProjectInput
): Promise<ActionResult<SubmitProjectResult>> {
  try {
    // 1. Authenticate student session
    const context = await requireStudentEntitlement();
    if (!context.hasActiveEntitlement || !context.student) {
      return {
        success: false,
        error: 'Unauthorized: Student session is required.',
        code: 'UNAUTHORIZED'
      };
    }

    const studentId = context.student.id;
    const { assignmentId, contentItemId, batchId, githubUrl, liveUrl, notes } = input;

    // 2. Validate input format
    if (!assignmentId || !UUID_REGEX.test(assignmentId)) {
      return { success: false, error: 'Invalid assignment identifier.', code: 'INVALID_INPUT' };
    }
    if (!contentItemId || !UUID_REGEX.test(contentItemId)) {
      return { success: false, error: 'Invalid content item identifier.', code: 'INVALID_INPUT' };
    }
    if (!batchId || !UUID_REGEX.test(batchId)) {
      return { success: false, error: 'Invalid batch identifier.', code: 'INVALID_INPUT' };
    }

    const cleanGithubUrl = (githubUrl || '').trim();
    if (!cleanGithubUrl || !GITHUB_REPO_REGEX.test(cleanGithubUrl)) {
      return {
        success: false,
        error: 'Please provide a valid GitHub repository URL in the format: https://github.com/owner/repository',
        code: 'INVALID_GITHUB_URL'
      };
    }

    const cleanLiveUrl = (liveUrl || '').trim() || null;
    if (cleanLiveUrl) {
      try {
        const parsed = new URL(cleanLiveUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return {
            success: false,
            error: 'Live demo URL must use HTTP or HTTPS protocol.',
            code: 'INVALID_LIVE_URL'
          };
        }
      } catch {
        return {
          success: false,
          error: 'Please provide a valid live demo URL.',
          code: 'INVALID_LIVE_URL'
        };
      }
    }

    const cleanNotes = (notes || '').trim() || null;
    if (cleanNotes && cleanNotes.length > 2000) {
      return {
        success: false,
        error: 'Project notes must not exceed 2000 characters.',
        code: 'NOTES_TOO_LONG'
      };
    }

    // 3. Verify batch entitlement
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.batchId, batchId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    if (!enrollment) {
      return {
        success: false,
        error: 'You are not actively enrolled in this batch.',
        code: 'UNAUTHORIZED_BATCH'
      };
    }

    // 4. Verify assignment exists and matches content item
    const [assignment] = await db
      .select({
        id: assignments.id,
        contentItemId: assignments.contentItemId
      })
      .from(assignments)
      .where(
        and(
          eq(assignments.id, assignmentId),
          eq(assignments.contentItemId, contentItemId)
        )
      )
      .limit(1);

    if (!assignment) {
      return {
        success: false,
        error: 'Project assignment specification not found.',
        code: 'ASSIGNMENT_NOT_FOUND'
      };
    }

    // 4b. Verify project release availability in batch curriculum
    const [curriculumRecord] = await db
      .select({ availableFrom: batchCurriculum.availableFrom })
      .from(batchCurriculum)
      .where(
        and(
          eq(batchCurriculum.batchId, batchId),
          eq(batchCurriculum.contentItemId, contentItemId)
        )
      )
      .limit(1);

    if (
      curriculumRecord?.availableFrom &&
      new Date(curriculumRecord.availableFrom).getTime() > Date.now()
    ) {
      return {
        success: false,
        error: 'This project assignment is not yet available for submission.',
        code: 'NOT_YET_AVAILABLE'
      };
    }

    // 5. Lightweight GitHub HEAD validation
    const repoCheck = await verifyPublicGithubRepo(cleanGithubUrl);
    if (!repoCheck.valid) {
      return {
        success: false,
        error: repoCheck.reason || 'GitHub repository is inaccessible.',
        code: 'REPO_INACCESSIBLE'
      };
    }

    const now = new Date();

    // 6. Check existing submission & enforce State Machine
    const [existingSubmission] = await db
      .select({
        id: assignmentSubmissions.id,
        status: assignmentSubmissions.status
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.studentId, studentId),
          eq(assignmentSubmissions.batchId, batchId)
        )
      )
      .limit(1);

    let submissionId: string;
    let isResubmission = false;

    if (existingSubmission) {
      isResubmission = true;
      const status = existingSubmission.status;

      // Resubmission rule: locked once status is 'under_review' or 'approved'
      if (status === 'under_review') {
        return {
          success: false,
          error: 'Your submission is currently under review by a tutor and cannot be updated.',
          code: 'LOCKED_UNDER_REVIEW'
        };
      }

      if (status === 'approved') {
        return {
          success: false,
          error: 'This project has already been approved and cannot be resubmitted.',
          code: 'ALREADY_APPROVED'
        };
      }

      // Allowed for 'submitted' or 'resubmission_requested'
      await db
        .update(assignmentSubmissions)
        .set({
          githubUrl: cleanGithubUrl,
          liveUrl: cleanLiveUrl,
          notes: cleanNotes,
          status: 'submitted', // resets resubmission_requested back to submitted
          submittedAt: now,
          updatedAt: now
        })
        .where(eq(assignmentSubmissions.id, existingSubmission.id));

      submissionId = existingSubmission.id;
    } else {
      // Initial submission
      const [inserted] = await db
        .insert(assignmentSubmissions)
        .values({
          assignmentId,
          studentId,
          batchId,
          githubUrl: cleanGithubUrl,
          liveUrl: cleanLiveUrl,
          notes: cleanNotes,
          status: 'submitted',
          submittedAt: now,
          updatedAt: now
        })
        .returning({ id: assignmentSubmissions.id });

      submissionId = inserted.id;
    }

    // 7. Revalidate related paths
    revalidatePath(`/content/${contentItemId}`);
    revalidatePath(`/batches/${batchId}`);
    revalidatePath('/assessments');
    revalidatePath('/overview');

    return {
      success: true,
      data: {
        submissionId,
        status: 'submitted',
        submittedAt: now,
        isResubmission
      },
      message: isResubmission
        ? 'Project resubmission updated successfully.'
        : 'Project submitted successfully for tutor review.'
    };
  } catch (error) {
    console.error('[Action:submitProjectAssignment] Error submitting project:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while processing your submission.',
      code: 'INTERNAL_ERROR'
    };
  }
}
