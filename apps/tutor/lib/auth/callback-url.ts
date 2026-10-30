/**
 * Post-login redirect target, same-origin paths only (audit F-24). A relative path is kept; an absolute
 * URL is reduced to its path; protocol-relative (`//host`, `/\host`) and unparseable values are dropped
 * instead of throwing (previously `/login?callbackUrl=foo` rendered a 500).
 */
export function toSafeCallbackPath(callbackUrl: string | undefined | null): string | undefined {
  if (!callbackUrl) return undefined;
  let path: string;
  if (callbackUrl.startsWith('/')) {
    path = callbackUrl;
  } else {
    try {
      path = new URL(callbackUrl).pathname;
    } catch {
      return undefined;
    }
  }
  return isSameOriginPath(path) ? path : undefined;
}

/**
 * True only for a path a browser resolves on the current origin. Checked on the FINAL path, not the
 * input: `https://evil.test//evil2.com` reduces to the protocol-relative `//evil2.com`, and WHATWG URL
 * parsing deletes tab/CR/LF, so `/<TAB>/evil.com` becomes `//evil.com`. Backslashes are treated as
 * slashes by browsers.
 */
export function isSameOriginPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\\\u0000-\u001f\u007f]/.test(path);
}

/** Where a tutor lands after sign-in when there is no usable deep link. A page that renders. */
export const POST_LOGIN_HOME = '/overview';

/**
 * Routes whose whole page is `redirect(...)`. They must never be a post-login target: Next.js copies the
 * response headers of its internal fetch of the redirect target onto the Server Action response, so a
 * redirecting target leaks a `Location` header, the browser follows it, receives HTML, and the Flight
 * client throws "An unexpected response was received from the server". Guarded by
 * lib/__tests__/post-login-target.test.ts, which fails if a new redirect-only page is added.
 */
export const REDIRECT_ONLY_ROUTES: ReadonlySet<string> = new Set(['/']);

/** The `redirectTo` for the sign-in action: a safe same-origin path that renders (never a redirect-only route). */
export function toPostLoginTarget(callbackUrl: string | undefined | null): string {
  const safe = toSafeCallbackPath(callbackUrl);
  if (!safe) return POST_LOGIN_HOME;
  const pathname = safe.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return REDIRECT_ONLY_ROUTES.has(pathname) ? POST_LOGIN_HOME : safe;
}
