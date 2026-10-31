export interface TutorInvitationEmailData {
  tutorName: string;
  tutorEmail: string;
  activationUrl: string;
  expiresAt: Date;
}

/** Admin-entered text is escaped before it goes into HTML (scale/security audit H-1). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTutorInvitationEmail(data: TutorInvitationEmailData) {
  const subject = 'Activate your RMS Careers Tutor Portal account';
  const expiry = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(
    data.expiresAt
  );
  const name = escapeHtml(data.tutorName);
  const url = escapeHtml(data.activationUrl);
  const text = `Hello ${data.tutorName},\n\nYou have been invited to the RMS Careers Tutor Portal. Set your password by ${expiry}:\n${data.activationUrl}\n\nIf you were not expecting this invitation, contact the RMS Careers team.`;
  const html = `<main style="font-family:Arial,sans-serif;color:#12213f;max-width:600px;margin:auto"><h1>RMS Careers</h1><h2>Activate your Tutor Portal account</h2><p>Hello ${name},</p><p>You have been invited to the RMS Careers Tutor Portal, where you review project submissions and follow the progress of your assigned batches. Set your password using the secure link below.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Activate account</a></p><p>This link expires on ${expiry}. Each new invitation replaces the previous link.</p><p>If you were not expecting this invitation, contact the RMS Careers team.</p></main>`;
  return { subject, html, text };
}
