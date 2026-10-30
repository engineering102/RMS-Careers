'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import {
  createTutorAccount,
  reissueTutorInvitation,
  setTutorActive,
  type TutorInvitation
} from '@/lib/db/queries';
import { sendTutorInvitationEmail } from '@/lib/email';
import { getTutorPortalUrl } from '@/lib/email/tutor-portal-url';

/** Why an invitation email was not sent; the account itself was saved. */
export type InvitationNotSent = 'portal_not_live' | 'provider_not_configured' | 'delivery_failed';

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const createTutorSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(254),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, 'Full name is required')
    .max(120, 'Full name must not exceed 120 characters'),
  headline: z
    .string()
    .trim()
    .max(160, 'Headline must not exceed 160 characters')
    .nullish()
    .transform((v) => (v ? v : null))
});

const tutorIdSchema = z.string().uuid('Invalid tutor identifier');

const CREATE_ERRORS = {
  student_email: 'This email belongs to a student. Tutor accounts need an email that is not used by a student.',
  admin_email:
    'This email belongs to an administrator. Use a separate email for the tutor account: admin sign-in must not be usable on the tutor portal.',
  already_tutor: 'A tutor with this email already exists.',
  email_in_use: 'This email is already used by another account.'
} as const;

/** Sends the invitation after the account is committed. Never throws; reports why nothing was sent. */
async function deliverInvitation(
  invitation: TutorInvitation
): Promise<{ emailSent: true } | { emailSent: false; reason: InvitationNotSent }> {
  const portalUrl = getTutorPortalUrl();
  if (!portalUrl) return { emailSent: false, reason: 'portal_not_live' };
  const result = await sendTutorInvitationEmail({
    tutorName: invitation.fullName,
    tutorEmail: invitation.email,
    activationUrl: `${portalUrl}/activate?token=${invitation.rawToken}`,
    expiresAt: invitation.expiresAt
  });
  if (result.success) return { emailSent: true };
  console.error('[tutors] invitation email not sent:', result.reason ?? 'delivery_failed');
  return { emailSent: false, reason: result.reason ?? 'delivery_failed' };
}

export async function createTutorAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResult<{ emailSent: true } | { emailSent: false; reason: InvitationNotSent }>> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const raw =
      input instanceof FormData
        ? { email: input.get('email') ?? undefined, fullName: input.get('fullName') ?? undefined, headline: input.get('headline') ?? undefined }
        : input;
    const parsed = createTutorSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Validation failed.',
        fieldErrors: parsed.error.flatten().fieldErrors
      };
    }

    const created = await createTutorAccount(parsed.data);
    if (!created.ok) {
      return { success: false, error: CREATE_ERRORS[created.code], fieldErrors: { email: [CREATE_ERRORS[created.code]] } };
    }

    const delivery = await deliverInvitation(created.invitation);
    revalidatePath('/tutors');
    return { success: true, data: delivery };
  } catch (error) {
    console.error('Error creating tutor:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to create the tutor account.' };
  }
}

export async function resendTutorInvitationAction(
  tutorId: string
): Promise<ActionResult<{ emailSent: true } | { emailSent: false; reason: InvitationNotSent }>> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };
    if (!tutorIdSchema.safeParse(tutorId).success) return { success: false, error: 'Invalid tutor identifier.' };

    // Do not invalidate the previous link when no new one could be emailed.
    if (!getTutorPortalUrl()) {
      return { success: false, error: 'The tutor portal is not live yet, so no invitation can be sent. Accounts stay pending until launch.' };
    }

    const reissued = await reissueTutorInvitation(tutorId);
    if (!reissued.ok) {
      const errors = {
        not_found: 'Tutor not found.',
        already_active: 'This tutor has already activated their account.',
        inactive: 'Reactivate this tutor before sending an invitation.'
      } as const;
      return { success: false, error: errors[reissued.code] };
    }

    const delivery = await deliverInvitation(reissued.invitation);
    revalidatePath('/tutors');
    return { success: true, data: delivery };
  } catch (error) {
    console.error('Error resending tutor invitation:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to resend the invitation.' };
  }
}

export async function setTutorActiveAction(tutorId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };
    if (!tutorIdSchema.safeParse(tutorId).success || typeof isActive !== 'boolean') {
      return { success: false, error: 'Invalid request.' };
    }

    if (!(await setTutorActive(tutorId, isActive))) return { success: false, error: 'Tutor not found.' };
    revalidatePath('/tutors');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error updating tutor status:', error instanceof Error ? error.name : 'unknown');
    return { success: false, error: 'Failed to update the tutor.' };
  }
}
