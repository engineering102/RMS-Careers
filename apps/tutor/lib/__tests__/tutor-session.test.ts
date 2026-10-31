import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TUTOR_SESSION_COOKIE, tutorAuthConfig } from '../auth/config';
import { loginErrorMessage } from '../auth/login-errors';
// middleware.ts only wraps the edge config with NextAuth; the matcher is what is tested here.
vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
import { config as middlewareConfig } from '../../middleware';

describe('tutor session cookie and lifetime', () => {
  it('uses a host-only __Host- cookie distinct from the admin and student portals', () => {
    const cookie = tutorAuthConfig.cookies?.sessionToken;
    expect(TUTOR_SESSION_COOKIE).toBe('__Host-tutor-sess');
    expect(cookie?.name).toBe(TUTOR_SESSION_COOKIE);
    expect(cookie?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    expect(cookie?.options).not.toHaveProperty('domain');
    expect(tutorAuthConfig.useSecureCookies).toBe(true);
    for (const other of ['__Host-student-sess', '__Host-rms-admin-sess']) expect(TUTOR_SESSION_COOKIE).not.toBe(other);
  });

  it('keeps the student portal lifetimes (30 days max, 24 h sliding refresh)', () => {
    expect(tutorAuthConfig.session).toMatchObject({ strategy: 'jwt', maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 });
    expect(tutorAuthConfig.pages?.signIn).toBe('/login');
  });
});

describe('middleware authorized callback', () => {
  const authorized = tutorAuthConfig.callbacks!.authorized!;
  const run = (auth: unknown, pathname: string) =>
    authorized({ auth: auth as never, request: { nextUrl: new URL(`https://tutor.rms-careers.com${pathname}`) } as never });
  const location = (result: unknown) => new URL((result as Response).headers.get('location')!);
  const tutor = { user: { id: 'u1', role: 'tutor' } };

  it('sends signed-out visitors to sign in', () => {
    expect(run(null, '/overview')).toBe(false);
    expect(run(null, '/batches/b-1')).toBe(false);
  });

  // GHSA-8fpg-xm3f-6cx3: an error-shaped auth object must count as signed out.
  it('treats an error-shaped auth object as signed out', () => {
    expect(run({ message: 'There was a problem with the server configuration.' }, '/overview')).toBe(false);
    expect(run({ user: undefined }, '/overview')).toBe(false);
  });

  it.each(['student', 'admin', 'super_admin', undefined])('refuses a %s session with /login?error=Unauthorized', (role) => {
    const result = run({ user: { id: 'u1', role } }, '/overview');
    expect(result).toBeInstanceOf(Response);
    expect(location(result).pathname).toBe('/login');
    expect(location(result).searchParams.get('error')).toBe('Unauthorized');
  });

  it('lets a tutor through', () => {
    expect(run(tutor, '/overview')).toBe(true);
    expect(run(tutor, '/batches/b-1/students')).toBe(true);
  });

  it.each(['/login', '/forgot-password', '/reset-password', '/resend-activation'])('serves %s signed out, sends a tutor to /overview', (route) => {
    expect(run(null, route)).toBe(true);
    expect(location(run(tutor, route)).pathname).toBe('/overview');
  });

  it('serves /login to a signed-in non-tutor without looping', () => {
    expect(run({ user: { id: 'u1', role: 'student' } }, '/login')).toBe(true);
  });

  it('always serves /activate', () => {
    expect(run(null, '/activate')).toBe(true);
    expect(run(tutor, '/activate')).toBe(true);
  });
});

describe('middleware matcher', () => {
  const [matcher] = middlewareConfig.matcher;
  const matches = (p: string) => new RegExp(`^${matcher}$`).test(p);

  it('skips api, static assets and the public auth routes', () => {
    for (const p of ['/api/auth/session', '/api/session/revoked', '/_next/static/x.js', '/favicon.ico', '/login', '/activate', '/forgot-password', '/reset-password', '/resend-activation']) {
      expect(matches(p), p).toBe(false);
    }
  });

  it('protects every other route', () => {
    for (const p of ['/', '/overview', '/batches/b-1', '/reviews', '/profile']) expect(matches(p), p).toBe(true);
  });

  it('lists the same public routes as the authorized callback', () => {
    const source = readFileSync(path.resolve(__dirname, '../auth/config.ts'), 'utf8');
    for (const route of ['login', 'forgot-password', 'reset-password', 'resend-activation']) expect(source).toContain(`'/${route}'`);
  });
});

describe('login error messages', () => {
  it('explains an ended session and a non-tutor account, never echoing the code', () => {
    expect(loginErrorMessage('SessionExpired')).toMatch(/session has ended/);
    expect(loginErrorMessage('Unauthorized')).toMatch(/cannot use the Tutor Portal/);
    expect(loginErrorMessage('<script>')).toBe('Sign-in could not be completed. Please try again.');
    expect(loginErrorMessage(undefined)).toBeNull();
  });
});
