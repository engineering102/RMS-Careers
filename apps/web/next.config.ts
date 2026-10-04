import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@rms/db'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        search: ''
      }
    ]
  }
};

export default nextConfig;
