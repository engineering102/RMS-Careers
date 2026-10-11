/**
 * Admin sign-out (audit PR-02). Same design as the student portal (apps/student/lib/auth/sign-out.ts):
 * a route handler outside the middleware matcher, so the Auth.js middleware cannot re-issue the
 * session cookie in the sign-out response (it did when sign-out was a Server Action), plus
 * server-side revocation through `users.updated_at`, which lib/auth.ts `auth()` checks on every
 * server-side use (session-validation.ts). Signs the admin out on every device.
 */
import { adminSessionCookiesToClear, expiredCookieHeader } from './session-cookies';

export const SIGN_OUT_PATH = '/api/session/sign-out';

export interface HeaderReader {
  get(name: string): string | null;
}

/** CSRF guard: route handlers get no Origin check from Next.js. Fails closed without a signal. */
export function isSameOriginRequest(headers: HeaderReader): boolean {
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = headers.get('origin');
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export interface SignOutRequest {
  url: string;
  headers: HeaderReader;
  cookieNames: readonly string[];
}

export interface SignOutResult {
  status: number;
  location?: string;
  setCookies: string[];
}

export interface SignOutDeps {
  currentUserId(): Promise<string | null>;
  revokeSessions(userId: string, at: Date): Promise<void>;
  now?(): Date;
  logError?(message: string): void;
}

export async function handleSignOut(request: SignOutRequest, deps: SignOutDeps): Promise<SignOutResult> {
  if (!isSameOriginRequest(request.headers)) return { status: 403, setCookies: [] };
  try {
    const userId = await deps.currentUserId();
    if (userId) await deps.revokeSessions(userId, deps.now?.() ?? new Date());
  } catch (error) {
    (deps.logError ?? console.error)(
      `[sign-out] server-side revocation failed: ${error instanceof Error ? error.name : 'unknown'}`
    );
  }
  return {
    status: 303,
    location: new URL('/login', request.url).toString(),
    setCookies: adminSessionCookiesToClear(request.cookieNames).map(expiredCookieHeader)
  };
}
