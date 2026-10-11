import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/session/revoked/route';

/** Audit F-09: a revoked-but-signed admin JWT is cleared, so /login does not bounce it back into the app. */
describe('GET /api/session/revoked', () => {
  it('clears every Auth.js session cookie (incl. chunks) and redirects to /login', () => {
    const request = new NextRequest('https://admin.rms-careers.com/api/session/revoked', {
      headers: {
        cookie: '__Secure-authjs.session-token.0=a; __Secure-authjs.session-token.1=b; authjs.session-token=c; other=keep'
      }
    });

    const response = GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://admin.rms-careers.com/login?error=SessionExpired');
    const cleared = response.cookies.getAll();
    expect(cleared.map((c) => c.name).sort()).toEqual([
      '__Secure-authjs.session-token.0',
      '__Secure-authjs.session-token.1',
      'authjs.session-token'
    ]);
    for (const cookie of cleared) {
      expect(cookie.value).toBe('');
      expect(cookie.maxAge).toBe(0);
      expect(cookie.secure).toBe(cookie.name.startsWith('__Secure-'));
    }
  });

  it('also clears the pinned __Host- admin session cookie with Secure (audit PR-10)', () => {
    const response = GET(
      new NextRequest('https://admin.rms-careers.com/api/session/revoked', {
        headers: { cookie: '__Host-rms-admin-sess=a; __Host-rms-admin-sess.1=b' }
      })
    );
    const cleared = response.cookies.getAll();
    expect(cleared.map((c) => c.name).sort()).toEqual(['__Host-rms-admin-sess', '__Host-rms-admin-sess.1']);
    for (const cookie of cleared) expect(cookie.secure).toBe(true);
  });

  it('redirects to /login on the same origin only', () => {
    const response = GET(new NextRequest('https://admin.rms-careers.com/api/session/revoked?next=https://evil.test'));
    expect(new URL(response.headers.get('location')!).origin).toBe('https://admin.rms-careers.com');
  });
});
