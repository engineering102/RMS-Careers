import { buildSecurityHeaders } from './security-headers';

export default {
  transpilePackages: ['@rms/db', '@rms/auth'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        search: ''
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        search: ''
      }
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders({ isDev: process.env.NODE_ENV === 'development' }) }];
  }
};
