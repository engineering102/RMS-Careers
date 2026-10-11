import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Regression for the production "Application error: a client-side exception" after sign-in.
 *
 * The sign-in Server Action used to redirect to `/` (the page the middleware captured as callbackUrl) or
 * `/dashboard`, both of which only `redirect('/overview')`. Next.js 15.5 makes an internal GET to the
 * redirect target and copies ITS response headers onto the action response; for a target that itself
 * redirects that copied a `Location: /overview` onto the 303, the browser's fetch followed it, got HTML,
 * and the Flight client threw "An unexpected response was received from the server".
 * Fix: the post-login target must always be a page that renders (never a redirect-only route).
 */

vi.mock('server-only', () => ({}));

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }));
vi.mock('@/lib/auth', () => ({ signIn }));

import { toPostLoginTarget, POST_LOGIN_HOME, REDIRECT_ONLY_ROUTES } from '../auth/callback-url';
import { loginAction } from '../../app/login/actions';

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  f.set('email', 'student@example.test');
  f.set('password', 'a-test-password');
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => signIn.mockReset().mockResolvedValue(undefined));

describe('toPostLoginTarget', () => {
  it('never returns a redirect-only route', () => {
    for (const input of ['/', '/dashboard', '/dashboard/', '/dashboard?x=1', '/#top', 'https://student.rms-careers.com/', undefined, '', 'foo', '//evil.test']) {
      expect(REDIRECT_ONLY_ROUTES.has(toPostLoginTarget(input)), String(input)).toBe(false);
      expect(toPostLoginTarget(input)).toBe(POST_LOGIN_HOME);
    }
  });

  it('keeps legitimate same-origin deep links', () => {
    expect(toPostLoginTarget('/assessments')).toBe('/assessments');
    expect(toPostLoginTarget('/profile?tab=career')).toBe('/profile?tab=career');
    expect(toPostLoginTarget('https://student.rms-careers.com/leaderboards')).toBe('/leaderboards');
  });
});

describe('loginAction passes a renderable redirectTo to signIn', () => {
  it.each([
    ['the root page captured by the middleware', '/'],
    ['the default /dashboard', '/dashboard'],
    ['no callback at all', '']
  ])('%s -> /overview', async (_label, callbackUrl) => {
    await loginAction({}, form(callbackUrl ? { callbackUrl } : {}));
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn.mock.calls[0][1].redirectTo).toBe('/overview');
  });

  it('keeps a deep link that renders', async () => {
    await loginAction({}, form({ callbackUrl: '/assessments' }));
    expect(signIn.mock.calls[0][1].redirectTo).toBe('/assessments');
  });
});

describe('drift guard: every redirect-only page route is covered', () => {
  const appDir = path.resolve(__dirname, '..', '..', 'app');

  function pages(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return pages(full);
      return name === 'page.tsx' ? [full] : [];
    });
  }
  const routeOf = (file: string) =>
    '/' +
    path
      .relative(appDir, path.dirname(file))
      .split(path.sep)
      .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')))
      .join('/');

  it('lists every static page whose whole body is a redirect()', () => {
    const redirectOnly = pages(appDir)
      .filter((f) => !f.includes('['))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return /\bredirect\(/.test(src) && !/<[A-Za-z]/.test(src.replace(/<[^>]*>/g, (m) => (/^<(\/|\w)/.test(m) ? m : ''))) && !/return\s*\(?\s*</.test(src);
      })
      .map(routeOf)
      .sort();
    expect(redirectOnly).toEqual([...REDIRECT_ONLY_ROUTES].sort());
  });
});
