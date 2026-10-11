import { describe, it, expect } from 'vitest';
import { toSafeCallbackPath, toPostLoginTarget, POST_LOGIN_HOME } from '../auth/callback-url';

describe('toSafeCallbackPath (audit F-24)', () => {
  it('keeps same-origin paths', () => {
    expect(toSafeCallbackPath('/assessments/123?batchId=b')).toBe('/assessments/123?batchId=b');
  });

  it('reduces absolute URLs to their path (no off-site redirect)', () => {
    expect(toSafeCallbackPath('https://evil.test/overview')).toBe('/overview');
  });

  it('drops protocol-relative and unparseable values instead of throwing', () => {
    expect(toSafeCallbackPath('//evil.test/x')).toBeUndefined();
    expect(toSafeCallbackPath('/\\evil.test')).toBeUndefined();
    expect(toSafeCallbackPath('foo')).toBeUndefined();
    expect(toSafeCallbackPath(undefined)).toBeUndefined();
  });
});

describe('toSafeCallbackPath: open-redirect bypasses (final review)', () => {
  // Every value below must never resolve to another origin when a browser follows it.
  const hostile = [
    'https://evil.test//evil2.com/x', // absolute URL whose pathname is protocol-relative
    'https://evil.test///evil2.com',
    '/\t/evil.com', // WHATWG URL parsing deletes tab/CR/LF => //evil.com
    '/\n/evil.com',
    '/\r/evil.com',
    '/\/evil.com',
    '/\u0000/evil.com',
    'javascript:alert(1)',
    'data:text/html,x'
  ];
  for (const value of hostile) {
    it(`never leaves the origin: ${JSON.stringify(value)}`, () => {
      for (const out of [toSafeCallbackPath(value), toPostLoginTarget(value)]) {
        if (out === undefined) continue;
        expect(new URL(out, 'https://student.example').origin).toBe('https://student.example');
      }
      expect(toPostLoginTarget(value) === POST_LOGIN_HOME || new URL(toPostLoginTarget(value), 'https://student.example').origin === 'https://student.example').toBe(true);
    });
  }
  it('still accepts ordinary deep links with query strings', () => {
    expect(toPostLoginTarget('/assessments/9?batchId=b#top')).toBe('/assessments/9?batchId=b#top');
  });
});
