/**
 * HTTP security headers for the public website (audit F-10). Used by next.config.ts `headers()`.
 *
 * CSP notes, specific to this app:
 *  - script-src keeps 'unsafe-inline': Next.js App Router hydration and the pre-paint theme script are
 *    inline, and a nonce-based policy would force every statically generated page to render
 *    dynamically. The remaining directives still block plugins, <base> hijacking, framing and
 *    off-site form posts, and pin scripts/connections to this origin plus Google Analytics (GA4).
 *  - 'unsafe-eval' and ws: are added only in development (React refresh / HMR).
 */
export function buildSecurityHeaders({ isDev }: { isDev: boolean }): Array<{ key: string; value: string }> {
  const ga = ['https://www.googletagmanager.com'];
  const gaBeacons = ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'];

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${ga.join(' ')}${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://avatars.githubusercontent.com ${gaBeacons.join(' ')}`,
    "font-src 'self' data:",
    `connect-src 'self' ${gaBeacons.join(' ')}${isDev ? ' ws: wss:' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests'])
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }])
  ];
}
