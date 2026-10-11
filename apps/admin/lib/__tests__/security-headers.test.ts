import { describe, expect, it } from 'vitest';
import adminConfig from '../../next.config';
import { buildSecurityHeaders } from '../../security-headers';

const header = (list: Array<{ key: string; value: string }>, key: string) => list.find((h) => h.key === key)?.value;

describe('Admin security headers (audit F-10)', () => {
  const prod = buildSecurityHeaders({ isDev: false });
  const csp = header(prod, 'Content-Security-Policy') ?? '';

  it('applies them to every route', async () => {
    const config = await adminConfig.headers();
    expect(config[0].source).toBe('/:path*');
    expect(config[0].headers.map((h) => h.key)).toEqual(expect.arrayContaining(['Content-Security-Policy', 'X-Frame-Options', 'X-Robots-Tag']));
  });

  it('cannot be framed or indexed', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(header(prod, 'X-Frame-Options')).toBe('DENY');
    expect(header(prod, 'X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('permits only the GitHub OAuth hand-off as an off-site form target', () => {
    expect(csp).toContain("form-action 'self' https://github.com");
  });

  it('allows images from the configured remote patterns only', () => {
    expect(csp).toContain('img-src');
    for (const pattern of adminConfig.images.remotePatterns) {
      expect(csp).toContain(`https://${pattern.hostname}`);
    }
  });

  it('has no eval or HTTP downgrade in production', () => {
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain('upgrade-insecure-requests');
    expect(header(prod, 'Strict-Transport-Security')).toContain('max-age=31536000');
  });
});
