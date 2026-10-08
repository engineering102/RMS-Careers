/**
 * Base URL of the Student Portal for links in admin-sent emails.
 * STUDENT_APP_URL wins; otherwise local development links point at the local student app
 * (port 3002) instead of silently falling back to production.
 */
export function getStudentPortalUrl(): string {
  const configured = process.env.STUDENT_APP_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? 'https://student.rms-careers.com' : 'http://localhost:3002';
}
