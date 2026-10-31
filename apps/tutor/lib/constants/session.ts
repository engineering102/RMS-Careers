/** Sign-out route handler (outside the middleware matcher; see lib/auth/sign-out.ts). */
export const SIGN_OUT_PATH = '/api/session/sign-out';

/** Clears a session that is still signed but no longer authorised, then shows /login (see app/api/session/revoked). */
export const SESSION_REVOKED_PATH = '/api/session/revoked';
