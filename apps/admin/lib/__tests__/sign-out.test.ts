import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('server-only', () => ({}));
const authMock = vi.fn();
const revokeMock = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }));
vi.mock('@/lib/db/queries/session-store', () => ({ revokeAllSessionsForUser: (...a: unknown[]) => revokeMock(...a) }));

import { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, authConfig } from '@/lib/auth.config';
import { handleSignOut, isSameOriginRequest, SIGN_OUT_PATH } from '@/lib/sign-out';
import { adminSessionCookiesToClear, isAdminSessionCookie } from '@/lib/session-cookies';
import { evaluateAdminSession } from '@/lib/session-validation';
import { POST } from '../../app/api/session/sign-out/route';

const ORIGIN = 'https://admin.rms-careers.com';

/** Audit PR-02 / PR-10: admin sign-out must end the session; the session cookie mode is pinned. */
describe('admin session cookie (auth.config.ts)', () => {
  it('pins one host-only Secure cookie for middleware, route handlers and Server Actions alike', () => {
    expect(ADMIN_SESSION_COOKIE).toBe('__Host-rms-admin-sess');
    expect(authConfig.useSecureCookies).toBe(true);
    expect(authConfig.cookies?.sessionToken).toEqual({
      name: ADMIN_SESSION_COOKIE,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true }
    });
  });

  it('middleware and the server instance share that config', () => {
    const root = path.resolve(__dirname, '../..');
    expect(readFileSync(path.join(root, 'middleware.ts'), 'utf8')).toMatch(/NextAuth\(authConfig\)/);
    expect(readFileSync(path.join(root, 'lib/auth.ts'), 'utf8')).toMatch(/\.\.\.authConfig/);
  });
});

describe('admin sign-out', () => {
  beforeEach(() => {
    authMock.mockReset();
    revokeMock.mockReset();
  });

  it('the sign-out route is outside the middleware matcher', async () => {
    vi.doMock('next-auth', () => ({ default: () => ({ auth: () => undefined }) }));
    const { config } = await import('../../middleware');
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    expect(pattern.test(SIGN_OUT_PATH)).toBe(false);
    expect(pattern.test('/programs')).toBe(true);
  });

  it.each([
    [{ 'sec-fetch-site': 'same-origin' }, true],
    [{ 'sec-fetch-site': 'cross-site' }, false],
    [{ origin: ORIGIN, host: 'admin.rms-careers.com' }, true],
    [{ origin: 'https://student.rms-careers.com', host: 'admin.rms-careers.com' }, false],
    [{}, false]
  ])('same-origin guard %j -> %s', (h, expected) => {
    expect(isSameOriginRequest(new Headers(h))).toBe(expected);
  });

  it('clears the pinned cookie plus legacy Auth.js names and chunks only', () => {
    expect(isAdminSessionCookie('__Host-rms-admin-sess.1')).toBe(true);
    expect(isAdminSessionCookie('__Host-authjs.csrf-token')).toBe(false);
    expect(adminSessionCookiesToClear(['authjs.session-token', '__Secure-authjs.session-token.0', 'x']).sort()).toEqual(
      ['__Host-rms-admin-sess', '__Secure-authjs.session-token.0', 'authjs.session-token'].sort()
    );
  });

  it('revokes server-side and redirects with deletion-only cookies', async () => {
    const at = new Date('2026-10-11T10:00:00Z');
    const revoke = vi.fn();
    const result = await handleSignOut(
      { url: `${ORIGIN}${SIGN_OUT_PATH}`, headers: new Headers({ 'sec-fetch-site': 'same-origin' }), cookieNames: ['authjs.session-token'] },
      { currentUserId: async () => 'admin-1', revokeSessions: revoke, now: () => at }
    );
    expect(revoke).toHaveBeenCalledWith('admin-1', at);
    expect(result.status).toBe(303);
    expect(result.location).toBe(`${ORIGIN}/login`);
    expect(result.setCookies).toContain('__Host-rms-admin-sess=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure');
    expect(result.setCookies).toContain('authjs.session-token=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
  });

  it('a session issued before sign-out fails server-side revalidation; a later one passes', () => {
    const signOutAt = new Date('2026-10-11T10:00:00Z');
    const record = { id: 'a', status: 'active', roles: ['super_admin'], updatedAt: signOutAt };
    expect(evaluateAdminSession({ userId: 'a', issuedAtMs: signOutAt.getTime() - 1000 }, record).ok).toBe(false);
    expect(evaluateAdminSession({ userId: 'a', issuedAtMs: signOutAt.getTime() + 1000 }, record).ok).toBe(true);
  });

  it('POST route: cross-site is refused; same-origin returns 303 with only expired session cookies', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-7' } });
    const mk = (site: string) =>
      new NextRequest(`${ORIGIN}${SIGN_OUT_PATH}`, { method: 'POST', headers: { 'sec-fetch-site': site, cookie: '__Host-rms-admin-sess=jwt' } });

    const denied = await POST(mk('cross-site'));
    expect(denied.status).toBe(403);
    expect(revokeMock).not.toHaveBeenCalled();

    const ok = await POST(mk('same-origin'));
    expect(ok.status).toBe(303);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    const cookies = ok.headers.getSetCookie();
    expect(cookies).toEqual(['__Host-rms-admin-sess=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure']);
    expect(revokeMock).toHaveBeenCalledWith('admin-7', expect.any(Date));
  });

  it('the user menu posts to the route instead of calling signOut() in a Server Action', () => {
    const root = path.resolve(__dirname, '../..');
    const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
    const confirm = read('components/sign-out-confirm.tsx');
    const menu = read('app/(admin)/user-menu.tsx');
    const user = read('app/(admin)/user.tsx');
    // The native POST form lives behind the confirmation dialog the user menu opens.
    expect(confirm).toMatch(/<form ref=\{formRef\} action=\{SIGN_OUT_PATH\} method="post"/);
    expect(menu).toMatch(/<SignOutConfirm\b/);
    expect(user).toMatch(/<UserMenu\b/);
    for (const src of [confirm, menu, user]) expect(src).not.toMatch(/signOut\(/);
  });
});
