import { describe, expect, it } from 'vitest';
import webConfig from '../../next.config';
import { buildSecurityHeaders } from '../../security-headers';

const header = (list: Array<{ key: string; value: string }>, key: string) => list.find((h) => h.key === key)?.value;

describe('Website security headers (audit F-10)', () => {
  const prod = buildSecurityHeaders({ isDev: false });
  const csp = header(prod, 'Content-Security-Policy') ?? '';

  it('applies them to every route and stays indexable', async () => {
    const config = (await webConfig.headers?.()) ?? [];
    expect(config[0].source).toBe('/:path*');
    expect(config[0].headers.map((h) => h.key)).not.toContain('X-Robots-Tag');
    expect(config[0].headers.map((h) => h.key)).toContain('Content-Security-Policy');
  });

  it('allows Google Analytics (GA4) script and beacons, nothing else off-site', () => {
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com");
    expect(csp).toMatch(/connect-src 'self' https:\/\/\*\.google-analytics\.com/);
    expect(csp).not.toMatch(/script-src[^;]*\*(?!\.)/);
  });

  it('cannot be framed and does not frame others', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(header(prod, 'X-Frame-Options')).toBe('DENY');
  });

  it('has no eval in production', () => {
    expect(csp).not.toContain('unsafe-eval');
    expect(header(buildSecurityHeaders({ isDev: true }), 'Content-Security-Policy')).toContain('unsafe-eval');
  });
});
