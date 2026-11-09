import type { MetadataRoute } from 'next';

// Web App Manifest, served at /manifest.webmanifest. Makes the public site installable as a PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'RMS Careers',
    short_name: 'RMS Careers',
    description:
      'Career-readiness programs, curriculum, and free DSA practice for B.Tech engineering students.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f9fc',
    theme_color: '#2563eb',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Programs', url: '/programs' },
      { name: 'DSA Practice', url: '/learn/dsa' }
    ]
  };
}
