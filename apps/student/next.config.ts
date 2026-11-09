import type { NextConfig } from 'next';
import { buildSecurityHeaders } from './security-headers';

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/db', '@rms/auth', '@rms/academic'],
  experimental: {
    // One stylesheet per page instead of two. With chunking on, Next split the theme fonts' @font-face rules into
    // a second render-blocking CSS file, which cost ~150 ms of first paint on signed-in pages (Lighthouse mobile).
    // The app has a single global stylesheet plus font rules, so merging has no ordering risk.
    cssChunking: false
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          ...buildSecurityHeaders({ isDev: process.env.NODE_ENV === 'development' })
        ]
      }
    ];
  }
};

export default nextConfig;
