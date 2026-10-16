// Response-body checks (pure module). They confirm a response is the RIGHT page, not merely a 200: Next.js
// renders error boundaries, not-found pages and streamed redirects with status 200 once a loading.tsx boundary
// has flushed, so the status code alone proves little.
//
// Markers are matched against the VISIBLE html only (inline <script> removed): every App Router page embeds the
// server-rendered not-found boundary in its inline Flight payload, so "Resource Not Found" is inside the
// <script> data of perfectly healthy pages. Streamed content (Suspense) arrives as hidden <div>s, not scripts.

const APP_ERROR = /id="__next_error__"|Application error: a (client|server)-side exception|Unable to load dashboard/i;
const NOT_FOUND = /Resource Not Found|404 · Page Not Found/;
// notFound() thrown after a loading.tsx boundary flushed is streamed: the 404 UI then exists only in the Flight
// data, tagged with this digest (Next 15; NEXT_NOT_FOUND in older versions). Healthy pages never carry it.
const NOT_FOUND_DIGEST = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;
const STREAMED_REDIRECT = /NEXT_REDIRECT|id="__next-page-redirect"/;
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const LOGIN_FORM = /type="password"/i;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** HTML with inline scripts removed (see header). */
export function visibleHtml(body) {
  return String(body ?? '').replace(SCRIPT, '');
}

export function hasAppError(body) {
  const b = String(body ?? '');
  return /id="__next_error__"/.test(b) || APP_ERROR.test(visibleHtml(b));
}

export function isNotFoundPage(body) {
  return NOT_FOUND_DIGEST.test(String(body ?? '')) || NOT_FOUND.test(visibleHtml(body));
}

export function isLoginPage(body) {
  return LOGIN_FORM.test(visibleHtml(body));
}

export function hasStreamedRedirect(body) {
  return STREAMED_REDIRECT.test(String(body ?? ''));
}

/** The dashboard shell prints the signed-in student's full name; a different name means crossed sessions. */
export function showsStudent(body, fullName) {
  return Boolean(fullName) && visibleHtml(body).includes(fullName);
}

/** An authenticated student page that rendered normally for this student. */
export function isHealthyStudentPage(body, fullName) {
  const visible = visibleHtml(body);
  return !hasAppError(body) && !NOT_FOUND_DIGEST.test(String(body ?? '')) && !NOT_FOUND.test(visible) && !LOGIN_FORM.test(visible) && !hasStreamedRedirect(body) && Boolean(fullName) && visible.includes(fullName);
}

/** Unique same-site paths matching /<segment>/<value> found in hrefs, e.g. /programs/:code. Bounded. */
export function extractPaths(body, segment, limit = 20) {
  const re = new RegExp(`href="/${segment}/([A-Za-z0-9_-]{1,80})"`, 'g');
  const out = new Set();
  for (const m of String(body ?? '').matchAll(re)) {
    out.add(m[1]);
    if (out.size >= limit) break;
  }
  return [...out];
}

export function extractUuids(body, segment, limit = 50) {
  const re = new RegExp(`/${segment}/(${UUID})`, 'gi');
  const out = new Set();
  for (const m of String(body ?? '').matchAll(re)) {
    out.add(m[1].toLowerCase());
    if (out.size >= limit) break;
  }
  return [...out];
}

/**
 * Parse a Server Action response (React Flight rows "<hex id>:<json>"). Returns the first row that looks like
 * the action's structured result ({ success: boolean, ... }), or null.
 */
export function parseActionResult(body) {
  for (const line of String(body ?? '').split('\n')) {
    const m = line.match(/^[0-9a-f]+:(\{.*\})\s*$/);
    if (!m) continue;
    try {
      const value = JSON.parse(m[1]);
      if (value && typeof value === 'object' && typeof value.success === 'boolean') return value;
      // Some Next versions inline the action result into the root row as `a`.
      if (value?.a && typeof value.a === 'object' && typeof value.a.success === 'boolean') return value.a;
    } catch {
      // not JSON: a different row type
    }
  }
  return null;
}
