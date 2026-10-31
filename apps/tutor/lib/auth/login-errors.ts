/**
 * Message for `/login?error=<code>` (same design as the student portal, audit D-08). The query value is never echoed
 * back.
 */
const MESSAGES: Record<string, string> = {
  // Set by /api/session/revoked: signed out elsewhere, password changed, account deactivated or unassigned role.
  SessionExpired: 'Your session has ended. Please sign in again.',
  // Set by /api/session/revoked?reason=password-changed after the tutor changed their password on /profile.
  PasswordChanged: 'Your password was changed and you were signed out everywhere. Sign in with the new password.',
  // Set by the middleware: signed in, but not as a tutor.
  Unauthorized: 'This account cannot use the Tutor Portal. Please sign in with your tutor account.',
  AccessDenied: 'You do not have access to the Tutor Portal.',
  CredentialsSignin: 'Invalid email, password, or tutor account status.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again in a few minutes.',
  MissingCSRF: 'Your sign-in form expired. Please try again.'
};

export function loginErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : 'Sign-in could not be completed. Please try again.';
}
