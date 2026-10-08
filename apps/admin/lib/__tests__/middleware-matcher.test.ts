import { describe, it, expect, vi } from 'vitest';

// Only the exported matcher config is under test; avoid loading Auth.js (needs next/server).
vi.mock('next-auth', () => ({ default: () => ({ auth: () => undefined }) }));
vi.mock('@/lib/auth.config', () => ({ authConfig: {} }));

import { config } from '../../middleware';

/**
 * The matcher lists the paths the auth middleware does NOT run on (negative lookahead).
 * Regression: a bare `enroll` prefix exempted the protected /enrollments pages from authentication.
 */
const pattern = new RegExp(`^${config.matcher[0]}$`);
const isProtected = (path: string) => pattern.test(path);

describe('admin middleware matcher', () => {
  it.each(['/enrollments', '/enrollments/import', '/programs', '/colleges', '/batches/abc/analytics', '/content', '/'])(
    'runs auth on %s',
    (path) => {
      expect(isProtected(path)).toBe(true);
    }
  );

  it.each(['/enroll/CRP-2026', '/api/auth/session', '/_next/static/chunks/a.js', '/_next/image', '/favicon.ico'])(
    'does not run auth on public path %s',
    (path) => {
      expect(isProtected(path)).toBe(false);
    }
  );
});
