import 'server-only';

import { Resend } from 'resend';
import {
  renderEnrollmentConfirmationEmail,
  type EnrollmentConfirmationEmailData
} from './templates/enrollment-confirmation';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  reason?: 'provider_not_configured' | 'delivery_failed';
  error?: string;
}

/**
 * Sends an official registration acknowledgement email to the student.
 * Safe operation: Does NOT throw or break caller workflows if credentials are missing or API fails.
 */
export async function sendEnrollmentConfirmationEmail(
  data: EnrollmentConfirmationEmailData
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.log(
      `[Email Service] RESEND_API_KEY is not configured. Skipping confirmation email dispatch to ${data.studentEmail}.`
    );
    return {
      success: false,
      reason: 'provider_not_configured'
    };
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.EMAIL_FROM || 'Academy Enrollment <onboarding@resend.dev>';

    const { subject, html, text } = renderEnrollmentConfirmationEmail(data);

    const response = await resend.emails.send({
      from: fromAddress,
      to: [data.studentEmail],
      subject,
      html,
      text
    });

    if (response.error) {
      console.error('[Email Service] Resend API error:', response.error);
      return {
        success: false,
        reason: 'delivery_failed',
        error: response.error.message
      };
    }

    console.log(
      `[Email Service] Confirmation email sent successfully to ${data.studentEmail}. Message ID: ${response.data?.id}`
    );

    return {
      success: true,
      messageId: response.data?.id
    };
  } catch (error) {
    console.error('[Email Service] Network/API exception while sending email:', error);
    return {
      success: false,
      reason: 'delivery_failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
