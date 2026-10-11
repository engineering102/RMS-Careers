import type { NextConfig } from 'next';
import { buildSecurityHeaders } from './security-headers';

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/db', '@rms/auth'],
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
