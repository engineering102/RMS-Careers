const PRODUCTION_TUTOR_URL = 'https://tutor.rms-careers.com';
const LOCAL_TUTOR_URL = 'http://localhost:3003';

/**
 * Public base URL of the Tutor Portal, used to build links in emails sent by the tutor portal itself.
 * TUTOR_APP_URL wins; otherwise local development links point at localhost, never production.
 */
export function getTutorAppUrl(): string {
  const configured = process.env.TUTOR_APP_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? PRODUCTION_TUTOR_URL : LOCAL_TUTOR_URL;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(expiresAt);
}

export interface AccountLinkEmail {
  subject: string;
  text: string;
  html: string;
}

function renderLinkEmail(opts: {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  url: string;
  expiresAt: Date;
  footer: string;
  name?: string;
}): AccountLinkEmail {
  const expiry = formatExpiry(opts.expiresAt);
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  const text = `${greeting}\n\n${opts.intro}\n${opts.url}\n\nThis link expires on ${expiry}.\n\n${opts.footer}`;
  const html =
    `<main style="font-family:Arial,sans-serif;color:#12213f;max-width:600px;margin:auto">` +
    `<h1>RMS Careers</h1><h2>${escapeHtml(opts.heading)}</h2><p>${escapeHtml(greeting)}</p>` +
    `<p>${escapeHtml(opts.intro)}</p>` +
    `<p><a href="${escapeHtml(opts.url)}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(opts.cta)}</a></p>` +
    `<p>This link expires on ${expiry}.</p><p>${escapeHtml(opts.footer)}</p></main>`;
  return { subject: opts.subject, text, html };
}

export function renderActivationLinkEmail(input: { name?: string; token: string; expiresAt: Date }) {
  const url = new URL(`/activate?token=${input.token}`, getTutorAppUrl()).toString();
  return renderLinkEmail({
    subject: 'Activate your RMS Careers Tutor Portal account',
    heading: 'Activate your Tutor Portal account',
    intro: 'Set your password using the secure link below to activate your Tutor Portal account.',
    cta: 'Activate account',
    url,
    expiresAt: input.expiresAt,
    footer: 'If you were not expecting this email, you can ignore it.',
    name: input.name
  });
}

export function renderPasswordResetEmail(input: { name?: string; token: string; expiresAt: Date }) {
  const url = new URL(`/reset-password?token=${input.token}`, getTutorAppUrl()).toString();
  return renderLinkEmail({
    subject: 'Reset your RMS Careers Tutor Portal password',
    heading: 'Reset your password',
    intro: 'We received a request to reset your Tutor Portal password. Use the secure link below.',
    cta: 'Reset password',
    url,
    expiresAt: input.expiresAt,
    footer: 'If you did not request this, you can ignore this email; your password will not change.',
    name: input.name
  });
}

export type SendResult = { sent: true } | { sent: false; reason: 'provider_not_configured' | 'failed' };

/**
 * Sends one transactional email through the Resend HTTP API (no SDK, so it runs unchanged on Workers). Never throws
 * and never logs the recipient, the link or the token.
 */
export async function sendAccountEmail(to: string, email: AccountLinkEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[tutor-email] RESEND_API_KEY not configured; email skipped.');
    return { sent: false, reason: 'provider_not_configured' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'RMS Careers <notifications@rms-careers.com>',
        to: [to],
        subject: email.subject,
        text: email.text,
        html: email.html
      })
    });
    if (!response.ok) {
      console.error(`[tutor-email] Resend API error (HTTP ${response.status}).`);
      return { sent: false, reason: 'failed' };
    }
    return { sent: true };
  } catch (error) {
    console.error('[tutor-email] Email delivery failed:', error instanceof Error ? error.name : 'unknown');
    return { sent: false, reason: 'failed' };
  }
}
