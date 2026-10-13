import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));
const authMock = vi.fn();
const revokeMock = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/db/session-store', () => ({ revokeAllSessionsForUser: (...a: unknown[]) => revokeMock(...a) }));

import { NextRequest } from 'next/server';
import { handleSignOut, isSameOriginRequest, sessionCookiesToClear, SIGN_OUT_PATH } from '@/lib/auth/sign-out';
import { STUDENT_SESSION_COOKIE } from '@/lib/auth/config';
import { isSessionCurrent } from '@/lib/auth/session-revocation';
import { POST } from '../../app/api/session/sign-out/route';

const ORIGIN = 'https://student.rms-careers.com';
const headers = (h: Record<string, string>) => new Headers(h);

/**
 * Audit PR-02: signing out through a Server Action let the Auth.js middleware re-issue the session
 * cookie in the same response, so the student stayed signed in. Sign-out is now a route handler
 * outside the middleware matcher that also revokes the session server-side.
 */
describe('student sign-out', () => {
  beforeEach(() => {
    authMock.mockReset();
    revokeMock.mockReset();
  });

  describe('middleware matcher', async () => {
    vi.doMock('next-auth', () => ({ default: () => ({ auth: () => undefined }) }));
    const { config } = await import('../../middleware');
    const pattern = new RegExp(`^${config.matcher[0]}$`);

    it('does not run (and so cannot refresh the session cookie) on the sign-out route', () => {
      expect(SIGN_OUT_PATH).toBe('/api/session/sign-out');
      expect(pattern.test(SIGN_OUT_PATH)).toBe(false);
    });

    it.each(['/overview', '/batches', '/profile'])('still protects %s', (p) => {
      expect(pattern.test(p)).toBe(true);
    });
  });

  describe('isSameOriginRequest (CSRF guard)', () => {
    it.each([
      [{ 'sec-fetch-site': 'same-origin' }, true],
      [{ 'sec-fetch-site': 'cross-site', origin: ORIGIN, host: 'student.rms-careers.com' }, false],
      [{ 'sec-fetch-site': 'same-site' }, false],
      [{ 'sec-fetch-site': 'none' }, false],
      [{ origin: ORIGIN, host: 'student.rms-careers.com' }, true],
      [{ origin: 'https://evil.example', host: 'student.rms-careers.com' }, false],
      [{ origin: 'null', host: 'student.rms-careers.com' }, false],
      [{ host: 'student.rms-careers.com' }, false],
      [{}, false]
    ])('%j -> %s', (h, expected) => {
      expect(isSameOriginRequest(headers(h))).toBe(expected);
    });
  });

  it('clears the session cookie and its chunks, never other cookies', () => {
    expect(sessionCookiesToClear([`${STUDENT_SESSION_COOKIE}.0`, `${STUDENT_SESSION_COOKIE}.1`, 'rms_active_cohort']).sort()).toEqual(
      [STUDENT_SESSION_COOKIE, `${STUDENT_SESSION_COOKIE}.0`, `${STUDENT_SESSION_COOKIE}.1`].sort()
    );
  });

  it('rejects a cross-site POST without revoking or touching cookies', async () => {
    const revoke = vi.fn();
    const result = await handleSignOut(
      { url: `${ORIGIN}${SIGN_OUT_PATH}`, headers: headers({ 'sec-fetch-site': 'cross-site' }), cookieNames: [STUDENT_SESSION_COOKIE] },
      { currentUserId: async () => 'u1', revokeSessions: revoke }
    );
    expect(result).toEqual({ status: 403, setCookies: [] });
    expect(revoke).not.toHaveBeenCalled();
  });

  it('revokes server-side, expires the cookie with __Host- attributes and redirects to /login (303)', async () => {
    const at = new Date('2026-10-11T10:00:00.000Z');
    const revoke = vi.fn();
    const result = await handleSignOut(
      { url: `${ORIGIN}/api/session/sign-out`, headers: headers({ 'sec-fetch-site': 'same-origin' }), cookieNames: [STUDENT_SESSION_COOKIE] },
      { currentUserId: async () => 'user-1', revokeSessions: revoke, now: () => at }
    );
    expect(revoke).toHaveBeenCalledWith('user-1', at);
    expect(result.status).toBe(303);
    expect(result.location).toBe(`${ORIGIN}/login`);
    expect(result.setCookies).toEqual([
      `${STUDENT_SESSION_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
    ]);
    for (const c of result.setCookies) expect(c).not.toMatch(/Domain=/i);
  });

  it('still clears the cookie when server-side revocation fails (and logs without details)', async () => {
    const logError = vi.fn();
    const result = await handleSignOut(
      { url: `${ORIGIN}${SIGN_OUT_PATH}`, headers: headers({ 'sec-fetch-site': 'same-origin' }), cookieNames: [] },
      { currentUserId: async () => 'u1', revokeSessions: async () => { throw new TypeError('db down postgres://secret'); }, logError }
    );
    expect(result.status).toBe(303);
    expect(result.setCookies).toHaveLength(1);
    expect(logError.mock.calls[0][0]).toBe('[sign-out] server-side revocation failed: TypeError');
  });

  it('revocation makes every earlier session invalid and leaves a later sign-in valid', () => {
    const signOutAt = new Date('2026-10-11T10:00:00.000Z');
    expect(isSessionCurrent(signOutAt.getTime() - 1, signOutAt)).toBe(false);
    expect(isSessionCurrent(signOutAt.getTime() + 1, signOutAt)).toBe(true);
  });

  describe('POST /api/session/sign-out (route)', () => {
    const request = (h: Record<string, string>) =>
      new NextRequest(`${ORIGIN}${SIGN_OUT_PATH}`, { method: 'POST', headers: { cookie: `${STUDENT_SESSION_COOKIE}=jwt; other=keep`, ...h } });

    it('responds with deletion-only Set-Cookie headers (no re-issued session) and no-store', async () => {
      authMock.mockResolvedValue({ user: { id: 'user-9' } });
      const res = await POST(request({ 'sec-fetch-site': 'same-origin' }));
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe(`${ORIGIN}/login`);
      expect(res.headers.get('cache-control')).toBe('no-store');
      const setCookies = res.headers.getSetCookie();
      expect(setCookies.length).toBeGreaterThan(0);
      for (const c of setCookies) expect(c).toMatch(new RegExp(`^${STUDENT_SESSION_COOKIE}(\\.\\d+)?=;`));
      expect(revokeMock).toHaveBeenCalledWith('user-9', expect.any(Date));
    });

    it('refuses a cross-site POST (403) and keeps the session untouched', async () => {
      authMock.mockResolvedValue({ user: { id: 'user-9' } });
      const res = await POST(request({ 'sec-fetch-site': 'cross-site' }));
      expect(res.status).toBe(403);
      expect(res.headers.getSetCookie()).toEqual([]);
      expect(revokeMock).not.toHaveBeenCalled();
    });

    it('works for an already signed-out browser (no revocation, cookie still expired)', async () => {
      authMock.mockResolvedValue(null);
      const res = await POST(request({ 'sec-fetch-site': 'same-origin' }));
      expect(res.status).toBe(303);
      expect(revokeMock).not.toHaveBeenCalled();
    });
  });

  it('no component signs out through a Server Action any more', () => {
    const root = path.resolve(__dirname, '../..');
    expect(existsSync(path.join(root, 'lib/actions/auth.ts'))).toBe(false);
    const dir = path.join(root, 'components/shell');
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    const sources = new Map(files.map((f) => [f, readFileSync(path.join(dir, f), 'utf8')]));
    const all = [...sources.values()].join('\n');
    expect(all).not.toMatch(/signOutAction|signOut\(/);

    // The one native POST form lives in SignOutButton (behind a confirmation dialog)...
    const formPattern = /action=\{SIGN_OUT_PATH\} method="post"/g;
    expect((sources.get('sign-out-button.tsx')!.match(formPattern) ?? []).length).toBe(1);
    expect((all.match(formPattern) ?? []).length).toBe(1);
    // ...and every place that offers sign-out renders it.
    for (const site of ['header.tsx', 'sidebar.tsx', 'mobile-nav.tsx', 'empty-enrollment.tsx']) {
      expect(sources.get(site), site).toMatch(/<SignOutButton\b/);
    }
  });
});
