import { describe, expect, it } from 'vitest';
import studentConfig from '../../next.config';
import { buildSecurityHeaders } from '../../security-headers';

const header = (list: Array<{ key: string; value: string }>, key: string) => list.find((h) => h.key === key)?.value;

describe('Student indexing protection', () => {
  it('emits noindex and nofollow for every Student Portal route', async () => {
    const headers = await studentConfig.headers?.();
    expect(headers).toHaveLength(1);
    expect(headers?.[0].source).toBe('/:path*');
    expect(headers?.[0].headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  });
});

describe('Student security headers (audit F-10)', () => {
  const prod = buildSecurityHeaders({ isDev: false });
  const csp = header(prod, 'Content-Security-Policy') ?? '';

  it('applies the security headers to every route', async () => {
    const headers = (await studentConfig.headers?.())?.[0].headers ?? [];
    for (const key of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']) {
      expect(headers.map((h) => h.key)).toContain(key);
    }
  });

  it('forbids framing, plugins, base hijacking and off-site form posts', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(header(prod, 'X-Frame-Options')).toBe('DENY');
  });

  it('keeps scripts and connections first-party and never allows eval in production', () => {
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'(;|$)/);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toMatch(/connect-src 'self'(;|$)/);
  });

  it('allows lecture embeds over https only', () => {
    expect(csp).toContain("frame-src 'self' https:");
    expect(csp).not.toMatch(/frame-src[^;]*(http:|data:|\*)/);
  });

  it('sends HSTS and upgrade-insecure-requests only in production', () => {
    expect(header(prod, 'Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(csp).toContain('upgrade-insecure-requests');
    const dev = buildSecurityHeaders({ isDev: true });
    expect(header(dev, 'Strict-Transport-Security')).toBeUndefined();
    expect(header(dev, 'Content-Security-Policy')).toContain("'unsafe-eval'");
  });
});
