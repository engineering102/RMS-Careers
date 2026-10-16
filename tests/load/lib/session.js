// Authenticated HTTP for one VU, using the applications' real Auth.js v5 credentials flow:
//   GET  /api/auth/csrf                    -> csrfToken (+ csrf cookie in the VU's jar)
//   POST /api/auth/callback/credentials    -> 302 + session cookie on success, 302 to /login?error=...&code=... otherwise
// This is the endpoint the login form's Server Action calls internally; it applies the same per-IP and
// per-account limits and the same bcrypt verification (apps/student/lib/auth.ts, apps/admin/lib/auth.ts).
//
// Secrets: the password is read from the environment by the caller and only ever placed in the POST body.
// The session cookie value is kept in VU memory and sent explicitly; it is never logged. Do NOT run this
// suite with --http-debug=full, which prints request bodies and cookies.
//
// Why the cookie is sent explicitly: both portals mark their session cookie Secure (`__Host-` prefix). k6's
// jar, like any RFC 6265 client, will not return a Secure cookie over plain http, which is what a local
// workerd target uses. Sending it from VU memory works the same over http and https.
import http from 'k6/http';
import { loginDuration, loginSuccess, rateLimited, sessionLost } from './metrics.js';

export const STUDENT_SESSION_COOKIE = '__Host-student-sess';
export const ADMIN_SESSION_COOKIE = '__Host-rms-admin-sess';

function sessionCookieFrom(res, name) {
  const list = res.cookies?.[name];
  if (list && list.length > 0 && list[0].value) return list[0].value;
  return null;
}

/**
 * @param {{ base: string, cookieName: string, fields: Record<string,string>, landing: string }} opts
 * @returns {{ ok: boolean, cookie: string|null, rateLimited: boolean, status: number }}
 */
export function signIn(opts) {
  const started = Date.now();
  const csrf = http.get(`${opts.base}/api/auth/csrf`, { tags: { name: '/api/auth/csrf', kind: 'auth' } });
  let token = null;
  try {
    token = csrf.json('csrfToken');
  } catch {
    token = null;
  }
  if (csrf.status !== 200 || !token) {
    loginDuration.add(Date.now() - started);
    loginSuccess.add(false);
    return { ok: false, cookie: null, rateLimited: false, status: csrf.status };
  }

  const res = http.post(
    `${opts.base}/api/auth/callback/credentials`,
    { ...opts.fields, csrfToken: token, callbackUrl: `${opts.base}${opts.landing}` },
    { redirects: 0, tags: { name: '/api/auth/callback/credentials', kind: 'auth' } }
  );
  loginDuration.add(Date.now() - started);

  const location = String(res.headers.Location ?? res.headers.location ?? '');
  const limited = /code=rate_limited/.test(location);
  if (limited) rateLimited.add(1);
  const cookie = sessionCookieFrom(res, opts.cookieName);
  const ok = res.status >= 300 && res.status < 400 && !/[?&]error=/.test(location) && Boolean(cookie);
  loginSuccess.add(ok);
  return { ok, cookie: ok ? cookie : null, rateLimited: limited, status: res.status };
}

/** One VU's signed-in client. Re-signs in once if the session stops working. */
export class Session {
  constructor({ base, cookieName, fields, landing }) {
    this.base = base;
    this.cookieName = cookieName;
    this.fields = fields;
    this.landing = landing;
    this.cookie = null;
  }

  ensure() {
    if (this.cookie) return true;
    const r = signIn({ base: this.base, cookieName: this.cookieName, fields: this.fields, landing: this.landing });
    this.cookie = r.cookie;
    return r.ok;
  }

  params(name, kind, extra = {}) {
    return {
      redirects: 0,
      cookies: this.cookie ? { [this.cookieName]: { value: this.cookie, replace: true } } : {},
      tags: { name, kind },
      ...extra
    };
  }

  /** GET a page. A redirect to /login means the session was lost: sign in again once and retry. */
  get(path, name, kind = 'page') {
    let res = http.get(`${this.base}${path}`, this.params(name, kind));
    if (res.status >= 300 && res.status < 400 && /\/login/.test(String(res.headers.Location ?? ''))) {
      sessionLost.add(1);
      this.cookie = null;
      if (this.ensure()) res = http.get(`${this.base}${path}`, this.params(name, kind));
    }
    return res;
  }

  /**
   * Invoke a Next.js Server Action the way the browser does: POST to the page path with the build-specific
   * action id, a same-origin Origin header (Next's CSRF check) and the arguments as a JSON array.
   */
  action(path, actionId, args, name) {
    return http.post(`${this.base}${path}`, JSON.stringify(args), this.params(name, 'action', {
      headers: {
        'Next-Action': actionId,
        Accept: 'text/x-component',
        'Content-Type': 'text/plain;charset=UTF-8',
        Origin: this.base
      }
    }));
  }
}
