'use server';

import { headers } from 'next/headers';
import { partnerEnquirySchema, type PartnerEnquiryResult } from '@/lib/partner-enquiry/schema';
import { deliverPartnerEnquiry } from '@/lib/partner-enquiry/deliver';
import { PUBLIC_FORM_LIMIT, accountKey, enforceRateLimit, ipKey, trustedClientIp } from '@/lib/security/request-limits';
import { partnerEnquiryContent } from '@/lib/data/homepage-content';

/**
 * Institutional partner enquiry (audit F-03): validated server-side, rate limited, delivered through
 * the configured provider. Success is reported only when the provider accepted the message.
 */
export async function submitPartnerEnquiry(raw: unknown): Promise<PartnerEnquiryResult> {
  const { submission } = partnerEnquiryContent;

  const parsed = partnerEnquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return { success: false, code: 'invalid', error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const limit = await enforceRateLimit(PUBLIC_FORM_LIMIT, [
    ipKey('partner-enquiry', trustedClientIp(await headers())),
    accountKey('partner-enquiry', parsed.data.email)
  ]);
  if (!limit.allowed) {
    return { success: false, code: 'rate_limited', error: submission.rateLimitedMessage };
  }

  // Honeypot filled: accept silently without sending (a bot gets no signal to adapt to).
  if (parsed.data.company_website_hp && parsed.data.company_website_hp.trim() !== '') {
    console.warn('[partner-enquiry] Honeypot triggered; enquiry discarded.');
    return { success: true };
  }

  const outcome = await deliverPartnerEnquiry(parsed.data);
  if (!outcome.delivered) {
    return { success: false, code: outcome.reason, error: submission.failureMessage };
  }
  return { success: true };
}
