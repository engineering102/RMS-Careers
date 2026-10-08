const PRODUCTION_STUDENT_URL = 'https://student.rms-careers.com';
const LOCAL_STUDENT_URL = 'http://localhost:3002';

/**
 * Public base URL of the Student Portal, used to build links in emails.
 * STUDENT_APP_URL wins; otherwise local development links point at localhost, never production.
 */
export function getStudentAppUrl(): string {
  const configured = process.env.STUDENT_APP_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? PRODUCTION_STUDENT_URL : LOCAL_STUDENT_URL;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const url = new URL(`/activate?token=${input.token}`, getStudentAppUrl()).toString();
  return renderLinkEmail({
    subject: 'Activate your RMS Careers Student Portal account',
    heading: 'Activate your Student Portal account',
    intro: 'Set your password using the secure link below to activate your account.',
    cta: 'Activate account',
    url,
    expiresAt: input.expiresAt,
    footer: 'If you were not expecting this email, you can ignore it.',
    name: input.name
  });
}

export function renderPasswordResetEmail(input: { name?: string; token: string; expiresAt: Date }) {
  const url = new URL(`/reset-password?token=${input.token}`, getStudentAppUrl()).toString();
  return renderLinkEmail({
    subject: 'Reset your RMS Careers password',
    heading: 'Reset your password',
    intro: 'We received a request to reset your Student Portal password. Use the secure link below.',
    cta: 'Reset password',
    url,
    expiresAt: input.expiresAt,
    footer: 'If you did not request this, you can ignore this email; your password will not change.',
    name: input.name
  });
}
