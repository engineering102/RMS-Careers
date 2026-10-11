/**
 * Student sign-out (audit PR-02). Pure helpers plus a handler factory; the route lives at
 * app/api/session/sign-out/route.ts.
 *
 * Why a route handler and not a Server Action: a Server Action is a POST to the current page, so the
 * Auth.js middleware runs on it, sees the still-valid session cookie and appends a refreshed
 * Set-Cookie (sliding session) AFTER the action's deletion. The last header wins and the session
 * survives sign-out. `/api/*` is excluded from the middleware matcher, so nothing can re-issue the
 * cookie here.
 *
 * Deleting the cookie is not enough on its own (a copied JWT would stay valid for up to 30 days), so
 * the handler also revokes server-side: it stamps `users.updated_at`, and every session issued
 * before that moment is rejected by the entitlement guard (session-revocation.ts). This signs the
 * student out on every device, which is the intended behaviour for shared lab computers.
 */
import { STUDENT_SESSION_COOKIE } from './config';

export { SIGN_OUT_PATH } from '../constants/session';

/** Header subset the checks need (a Fetch `Headers` satisfies it). */
export interface HeaderReader {
  get(name: string): string | null;
}

/**
 * CSRF guard for the sign-out POST. Server Actions get an Origin check from Next.js; a route handler
 * does not, so it is done here. Fails closed when the browser sends neither signal.
 */
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

/** The session cookie and any Auth.js chunks of it (`name.0`, `name.1`, ...) present on the request. */
export function sessionCookiesToClear(requestCookieNames: readonly string[]): string[] {
  const chunk = new RegExp(`^${STUDENT_SESSION_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+$`);
  const names = new Set<string>([STUDENT_SESSION_COOKIE]);
  for (const name of requestCookieNames) if (chunk.test(name)) names.add(name);
  return [...names];
}

export interface SignOutRequest {
  url: string;
  headers: HeaderReader;
  cookieNames: readonly string[];
}

export interface SignOutResult {
  status: number;
  location?: string;
  /** Serialized Set-Cookie values; the cookie attributes match those used when it was issued. */
  setCookies: string[];
}

export interface SignOutDeps {
  /** Signed-in user id from the (unrevalidated) JWT, or null. */
  currentUserId(): Promise<string | null>;
  /** Server-side revocation of every session of this user issued before `at`. */
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
    // The cookie is still cleared below; a failed revocation only leaves copies of the token alive.
    (deps.logError ?? console.error)(
      `[sign-out] server-side revocation failed: ${error instanceof Error ? error.name : 'unknown'}`
    );
  }

  return {
    status: 303,
    location: new URL('/login', request.url).toString(),
    setCookies: sessionCookiesToClear(request.cookieNames).map(
      // __Host- cookies must be deleted with the same constraints they were set with (Secure, Path=/, no Domain).
      (name) => `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
    )
  };
}
