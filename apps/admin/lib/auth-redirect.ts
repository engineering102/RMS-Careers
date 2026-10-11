/**
 * Post-login redirect target for the admin sign-in Server Actions: a same-origin path that RENDERS.
 *
 * Next.js copies the response headers of its internal fetch of the redirect target onto the Server
 * Action response. If the target is itself a redirect (`/` does `redirect('/programs')`), a `Location`
 * header leaks onto the action's 303, the browser follows it, receives HTML, and the Flight client throws
 * "An unexpected response was received from the server". The middleware captures the page the admin first
 * requested (usually `/`) as callbackUrl, so this happened on a normal sign-in.
 * Guarded by lib/__tests__/post-login-target.test.ts, which fails if a new redirect-only page is added.
 */
export const POST_LOGIN_HOME = '/programs';

/** Routes whose whole page is `redirect(...)` (app/(admin)/page.tsx). */
export const REDIRECT_ONLY_ROUTES: ReadonlySet<string> = new Set(['/']);

/**
 * True only for a path a browser resolves on the current origin. Checked on the FINAL path:
 * `https://evil.test//evil2.com` reduces to the protocol-relative `//evil2.com`, and WHATWG URL parsing
 * deletes tab/CR/LF, so `/<TAB>/evil.com` becomes `//evil.com`. Backslashes are treated as slashes.
 */
export function isSameOriginPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\\\u0000-\u001f\u007f]/.test(path);
}

export function toPostLoginTarget(callbackUrl: string | undefined | null): string {
  if (!callbackUrl) return POST_LOGIN_HOME;
  let path: string;
  if (callbackUrl.startsWith('/')) {
    path = callbackUrl;
  } else {
    try {
      const u = new URL(callbackUrl);
      path = `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return POST_LOGIN_HOME;
    }
  }
  if (!isSameOriginPath(path)) return POST_LOGIN_HOME;
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return REDIRECT_ONLY_ROUTES.has(pathname) ? POST_LOGIN_HOME : path;
}
