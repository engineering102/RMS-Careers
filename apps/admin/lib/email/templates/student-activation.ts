export interface StudentActivationEmailData { studentName: string; studentEmail: string; activationUrl: string; expiresAt: Date; }

export function renderStudentActivationEmail(data: StudentActivationEmailData) {
  const subject = 'Activate your RMS Careers Student Portal account';
  const expiry = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(data.expiresAt);
  const text = `Hello ${data.studentName},\n\nActivate your RMS Careers Student Portal account by ${expiry}:\n${data.activationUrl}\n\nIf you were not expecting this invitation, contact your institutional coordinator.`;
  const html = `<main style="font-family:Arial,sans-serif;color:#12213f;max-width:600px;margin:auto"><h1>RMS Careers</h1><h2>Activate your Student Portal account</h2><p>Hello ${data.studentName},</p><p>Your institution has provisioned your RMS Careers Student Portal account. Set your password using the secure link below.</p><p><a href="${data.activationUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Activate account</a></p><p>This link expires on ${expiry}.</p><p>If you were not expecting this invitation, contact your institutional coordinator.</p></main>`;
  return { subject, html, text };
}
