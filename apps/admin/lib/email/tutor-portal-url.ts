/**
 * Base URL of the Tutor Portal for links in admin-sent emails, or null when invitations must not be sent.
 *
 * Unlike the Student Portal URL there is deliberately no production fallback: until the tutor portal is deployed,
 * tutor.rms-careers.com does not resolve, so an emailed link would be dead. Tutor accounts can still be created; set
 * TUTOR_APP_URL on the admin Worker at launch (docs/plans/tutor-portal-implementation-plan.md §13.5) and use
 * "Resend invitation" for accounts created before then. Local development falls back to the local tutor app.
 */
export function getTutorPortalUrl(): string | null {
  const configured = process.env.TUTOR_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production' ? null : 'http://localhost:3003';
}
