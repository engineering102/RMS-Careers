/**
 * HTTP security headers for the Student Portal (audit F-10). Used by next.config.ts `headers()`.
 *
 * CSP notes, specific to this app:
 *  - script-src keeps 'unsafe-inline' (Next.js App Router hydration scripts); no third-party scripts.
 *  - frame-src allows https: because lecture videos are embedded from admin-configured providers
 *    (YouTube-nocookie, Vimeo, or a custom https embed URL); http:, data: and javascript: frames are blocked.
 *  - 'unsafe-eval' and ws: are added only in development (React refresh / HMR).
 */
export function buildSecurityHeaders({ isDev }: { isDev: boolean }): Array<{ key: string; value: string }> {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "frame-src 'self' https:",
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
