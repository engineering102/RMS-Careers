import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/db', '@rms/auth'],
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  }
};

export default nextConfig;
