import type { NextConfig } from 'next';
import { buildSecurityHeaders } from './security-headers';

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/db'],
  devIndicators: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        search: ''
      }
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders({ isDev: process.env.NODE_ENV === 'development' }) }];
  }
};

export default nextConfig;
