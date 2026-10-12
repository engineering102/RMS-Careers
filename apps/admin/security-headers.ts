/**
 * HTTP security headers for the Admin Portal (audit F-10). Used by next.config.ts `headers()`.
 *
 * CSP notes, specific to this app:
 *  - script-src keeps 'unsafe-inline' (Next.js App Router hydration scripts); no third-party scripts.
 *  - img-src mirrors next.config `images.remotePatterns` (GitHub avatars, Vercel Blob).
 *  - form-action allows github.com for the GitHub OAuth sign-in hand-off.
 *  - The admin console must never be framed or indexed.
 *  - frame-src allows only the YouTube (privacy-enhanced) and Vimeo players, for the content builder's
 *    lecture preview. Custom embed URLs are not previewed in admin.
 *  - 'unsafe-eval' and ws: are added only in development (React refresh / HMR).
 */
export function buildSecurityHeaders({ isDev }: { isDev: boolean }): Array<{ key: string; value: string }> {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://github.com",
    ...(isDev ? [] : ['upgrade-insecure-requests'])
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }])
  ];
}
