'use server';

import { revalidatePath } from 'next/cache';
import { db, students } from '@rms/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import type {
  UpdateStudentCareerProfileInput,
  StudentCareerProfile
} from '@/lib/types/profile';

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

const URL_REGEX = /^https?:\/\/.+/i;
const GITHUB_REGEX = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/)?$/i;
const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+(?:\/)?$/i;

const updateProfileSchema = z.object({
  githubUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || GITHUB_REGEX.test(val),
      'Please provide a valid GitHub profile URL (e.g. https://github.com/username)'
    ),
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || LINKEDIN_REGEX.test(val),
      'Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)'
    ),
  portfolioUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || URL_REGEX.test(val),
      'Please provide a valid website URL starting with https:// or http://'
    ),
  targetCompanies: z
    .string()
    .trim()
    .max(255, 'Target companies list must be under 255 characters')
    .optional()
    .nullable(),
  primaryLanguage: z
    .string()
    .trim()
    .max(50, 'Primary language must be under 50 characters')
    .optional()
    .nullable()
});

/**
 * Server Action to update editable career fields for an authenticated student.
 * Guarantees student isolation: studentId comes exclusively from session entitlement.
 */
export async function updateStudentProfileAction(
  input: UpdateStudentCareerProfileInput
): Promise<ActionResult<StudentCareerProfile>> {
  try {
    const context = await requireStudentEntitlement();

    if (!context.isActive || !context.student) {
      return {
        success: false,
        error: 'Unauthorized student session',
        code: 'UNAUTHORIZED'
      };
    }

    const studentId = context.student.id;

    // Validate input payload
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid profile information',
        code: 'VALIDATION_ERROR'
      };
    }

    const cleanData = {
      githubUrl: parsed.data.githubUrl || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      portfolioUrl: parsed.data.portfolioUrl || null,
      targetCompanies: parsed.data.targetCompanies || null,
      primaryLanguage: parsed.data.primaryLanguage || null,
      updatedAt: new Date()
    };

    const [updated] = await db
      .update(students)
      .set(cleanData)
      .where(eq(students.id, studentId))
      .returning({
        githubUrl: students.githubUrl,
        linkedinUrl: students.linkedinUrl,
        portfolioUrl: students.portfolioUrl,
        targetCompanies: students.targetCompanies,
        primaryLanguage: students.primaryLanguage
      });

    if (!updated) {
      return {
        success: false,
        error: 'Student record not found',
        code: 'NOT_FOUND'
      };
    }

    revalidatePath('/profile');
    revalidatePath('/overview');

    return {
      success: true,
      data: updated,
      message: 'Career profile updated successfully'
    };
  } catch (err) {
    console.error('[updateStudentProfileAction] Error:', err);
    return {
      success: false,
      error: 'Failed to update profile information',
      code: 'INTERNAL_ERROR'
    };
  }
}
