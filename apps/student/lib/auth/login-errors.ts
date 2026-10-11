/**
 * Message for `/login?error=<code>` (audit D-08). Previously every code, including Auth.js
 * `Configuration` (server misconfiguration or outage), rendered "You do not have access", which made
 * incidents look like authorization problems. The query value is never echoed back.
 */
const MESSAGES: Record<string, string> = {
  // Set by the dashboard guard: signed out elsewhere, credentials changed, account deactivated or not a student.
  Unauthorized: 'Your session has ended or this account cannot use the Student Portal. Please sign in again.',
  AccessDenied: 'You do not have access to the Student Portal.',
  CredentialsSignin: 'Invalid email, password, or student account status.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again in a few minutes.',
  MissingCSRF: 'Your sign-in form expired. Please try again.'
};

export function loginErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : 'Sign-in could not be completed. Please try again.';
}
