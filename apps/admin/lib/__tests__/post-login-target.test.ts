import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { toPostLoginTarget, POST_LOGIN_HOME, REDIRECT_ONLY_ROUTES } from '../auth-redirect';

/**
 * Regression for the post-sign-in "Application error: a client-side exception" (see the student twin,
 * apps/student/lib/__tests__/post-login-target.test.ts). The login Server Action used to redirect to the
 * callbackUrl captured by the middleware, typically `/`, and `/` only does `redirect('/programs')`.
 * Next.js copies the headers of its internal fetch of the redirect target onto the action response, so a
 * redirecting target leaks `Location`, the browser follows it, receives HTML, and the Flight client throws.
 */
describe('toPostLoginTarget (admin)', () => {
  it('never returns a redirect-only route', () => {
    for (const input of ['/', '/?x=1', '/#top', 'https://admin.rms-careers.com/', undefined, '', 'foo', '//evil.test']) {
      expect(REDIRECT_ONLY_ROUTES.has(toPostLoginTarget(input)), String(input)).toBe(false);
      expect(toPostLoginTarget(input)).toBe(POST_LOGIN_HOME);
    }
  });

  it('keeps legitimate same-origin deep links and strips the origin', () => {
    expect(toPostLoginTarget('/batches')).toBe('/batches');
    expect(toPostLoginTarget('/enrollments?status=pending')).toBe('/enrollments?status=pending');
    expect(toPostLoginTarget('https://admin.rms-careers.com/colleges')).toBe('/colleges');
  });
});

describe('admin login page', () => {
  it('routes both sign-in actions through toPostLoginTarget', () => {
    const src = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'login', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/redirectTo:\s*searchParams\.callbackUrl/);
    expect((src.match(/toPostLoginTarget\(searchParams\.callbackUrl\)/g) ?? []).length).toBe(2);
  });
});

describe('drift guard: every redirect-only page route is covered', () => {
  const appDir = path.resolve(__dirname, '..', '..', 'app');
  const pages = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return pages(full);
      return name === 'page.tsx' ? [full] : [];
    });
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
        return /\bredirect\(/.test(src) && !/return\s*\(?\s*</.test(src) && !/<[A-Z][A-Za-z]*[\s>/]/.test(src);
      })
      .map(routeOf)
      .sort();
    expect(redirectOnly).toEqual([...REDIRECT_ONLY_ROUTES].sort());
  });
});

describe('toPostLoginTarget (admin): open-redirect bypasses (final review)', () => {
  const hostile = [
    'https://evil.test//evil2.com/x',
    'https://evil.test///evil2.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '/\/evil.com',
    '/\u0000/evil.com',
    'javascript:alert(1)'
  ];
  for (const value of hostile) {
    it(`never leaves the origin: ${JSON.stringify(value)}`, () => {
      const out = toPostLoginTarget(value);
      expect(new URL(out, 'https://admin.example').origin).toBe('https://admin.example');
    });
  }
  it('still accepts ordinary deep links with query strings', () => {
    expect(toPostLoginTarget('/batches/3/analytics?x=1#top')).toBe('/batches/3/analytics?x=1#top');
  });
});
