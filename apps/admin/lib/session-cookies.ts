import { ADMIN_SESSION_COOKIE } from './auth.config';

/**
 * Admin session cookie names that sign-out and revocation must clear: the pinned cookie
 * (auth.config.ts) plus the Auth.js default names used before it was pinned, each with optional
 * `.N` chunk suffixes. Pure; shared by /api/session/sign-out and /api/session/revoked.
 */
const LEGACY_SESSION_COOKIE_PATTERN = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export function isAdminSessionCookie(name: string): boolean {
  if (name === ADMIN_SESSION_COOKIE) return true;
  if (name.startsWith(`${ADMIN_SESSION_COOKIE}.`) && /^\d+$/.test(name.slice(ADMIN_SESSION_COOKIE.length + 1))) return true;
  return LEGACY_SESSION_COOKIE_PATTERN.test(name);
}

/** Pinned name always, plus every session cookie (legacy or chunked) present on the request. */
export function adminSessionCookiesToClear(requestCookieNames: readonly string[]): string[] {
  return [...new Set([ADMIN_SESSION_COOKIE, ...requestCookieNames.filter(isAdminSessionCookie)])];
}

/** Prefixed cookies are only accepted (and so only deleted) with Secure; legacy plain names were set without it. */
export function requiresSecure(name: string): boolean {
  return name.startsWith('__Host-') || name.startsWith('__Secure-');
}

export function expiredCookieHeader(name: string): string {
  return `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${requiresSecure(name) ? '; Secure' : ''}`;
}
