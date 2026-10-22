/**
 * Public links to the authenticated portals that are not yet launched.
 *
 * The Tutor Portal does not exist in production yet: tutor.rms-careers.com has no DNS record (launch-readiness
 * L-5), so every public link to it stays hidden until launch. Launch procedure
 * (docs/plans/tutor-portal-implementation-plan.md §13.5): once the tutor Worker is deployed and
 * https://tutor.rms-careers.com/login answers, set TUTOR_PORTAL_LIVE to true and deploy the website. That one flag
 * restores the header, footer and /login links and the FAQ mention.
 */
export const TUTOR_PORTAL_LIVE = false;

export const TUTOR_PORTAL_URL = 'https://tutor.rms-careers.com';

export type PortalId = 'student' | 'tutor' | 'admin';

/** Whether a portal may be linked from the public website. Student and Admin are always live. */
export function isPortalVisible(id: PortalId, tutorLive: boolean = TUTOR_PORTAL_LIVE): boolean {
  return id !== 'tutor' || tutorLive;
}
