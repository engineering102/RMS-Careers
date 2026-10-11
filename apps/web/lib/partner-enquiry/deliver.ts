import 'server-only';

import type { PartnerEnquiry } from './schema';

/**
 * Delivers a validated partner enquiry to the partnerships inbox through Resend's HTTP API (the
 * provider the admin and student apps already use), via fetch so apps/web needs no extra dependency.
 *
 * Configuration (Worker secrets, never shipped to the browser):
 *   RESEND_API_KEY      provider key
 *   EMAIL_FROM          verified sender, e.g. "RMS Careers <no-reply@rms-careers.com>"
 *   PARTNER_ENQUIRY_TO  recipient inbox (comma-separated for several)
 * Missing configuration is reported as `not_configured`; the caller must not claim delivery.
 */

export type DeliveryOutcome =
  | { delivered: true; id?: string }
  | { delivered: false; reason: 'not_configured' | 'delivery_failed' };

export interface DeliveryEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  PARTNER_ENQUIRY_TO?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Header-safe single line (no CR/LF, bounded). */
function oneLine(value: string, max = 150): string {
  return value.replace(/[\r\n]+/g, ' ').slice(0, max);
}

export function renderPartnerEnquiryEmail(enquiry: PartnerEnquiry): { subject: string; text: string; html: string } {
  const rows: Array<[string, string]> = [
    ['Name', enquiry.fullName],
    ['Role', enquiry.role],
    ['Email', enquiry.email],
    ['Mobile', enquiry.mobile],
    ['Institution', enquiry.institutionName],
    ['Institution type', enquiry.institutionType],
    ['Location', `${enquiry.city}, ${enquiry.state}`],
    ['Website', enquiry.website || '-'],
    ['Student strength', enquiry.studentStrength],
    ['Branches', enquiry.branches || '-'],
    ['Batches', enquiry.batches || '-'],
    ['Objectives', enquiry.objectives.length ? enquiry.objectives.join(', ') : '-'],
    ['Timeline', enquiry.timeline],
    ['Additional notes', enquiry.additionalNotes || '-']
  ];
  const subject = oneLine(`Partner enquiry: ${enquiry.institutionName} (${enquiry.city})`);
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html =
    '<h2>New institutional partner enquiry</h2><table cellpadding="6" style="border-collapse:collapse">' +
    rows
      .map(([k, v]) => `<tr><th align="left" style="vertical-align:top">${escapeHtml(k)}</th><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
      .join('') +
    '</table>';
  return { subject, text, html };
}

export async function deliverPartnerEnquiry(
  enquiry: PartnerEnquiry,
  env: DeliveryEnv = process.env as DeliveryEnv,
  fetchImpl: typeof fetch = fetch
): Promise<DeliveryOutcome> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  const to = (env.PARTNER_ENQUIRY_TO ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (!apiKey || !from || to.length === 0) {
    console.error('[partner-enquiry] Delivery not configured (RESEND_API_KEY / EMAIL_FROM / PARTNER_ENQUIRY_TO).');
    return { delivered: false, reason: 'not_configured' };
  }

  const { subject, text, html } = renderPartnerEnquiryEmail(enquiry);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: enquiry.email, subject, text, html }),
      signal: controller.signal
    });
    if (!response.ok) {
      console.error('[partner-enquiry] Provider rejected the message, status', response.status);
      return { delivered: false, reason: 'delivery_failed' };
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { delivered: true, id: body.id };
  } catch (error) {
    console.error('[partner-enquiry] Delivery error:', error instanceof Error ? error.name : 'unknown');
    return { delivered: false, reason: 'delivery_failed' };
  } finally {
    clearTimeout(timer);
  }
}
