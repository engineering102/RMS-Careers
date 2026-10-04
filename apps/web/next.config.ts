import type { NextConfig } from 'next';

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
  }
};

export default nextConfig;
