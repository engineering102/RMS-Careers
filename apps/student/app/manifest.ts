import type { MetadataRoute } from 'next';

// Web App Manifest, served at /manifest.webmanifest (public: excluded from the auth middleware matcher).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'RMS Careers Student Portal',
    short_name: 'RMS Student',
    description: 'Your RMS Careers batches, curriculum, assessments and DSA practice.',
    start_url: '/overview',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfbfb',
    theme_color: '#fbfbfb',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Overview', url: '/overview' },
      { name: 'Assessments', url: '/assessments' },
      { name: 'DSA Practice', url: '/dsa' }
    ]
  };
}
