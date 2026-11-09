/*
 * RMS Careers Student Portal service worker.
 *
 * Privacy first: portal pages carry a signed-in student's data and are used on shared lab computers, so
 * NO page HTML, RSC payload or API response is ever stored. Only the offline fallback page (no personal
 * data) and content-hashed build assets / app icons are cached.
 *  - Page navigations: always the network; when it fails, the precached /offline page.
 *  - /_next/static and /icons: cache-first.
 *  - Everything else (Server Actions, /api, RSC fetches, cross-origin video embeds) is not intercepted.
 *
 * Bump VERSION to drop every old cache on the next activation.
 * Kill switch: replace this file with one whose install calls skipWaiting() and whose activate deletes
 * all caches and calls self.registration.unregister().
 */
const VERSION = 'v1';
const SHELL = `rms-student-shell-${VERSION}`;
const ASSETS = `rms-student-assets-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload', credentials: 'omit' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(OFFLINE_URL, { cacheName: SHELL })) || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkOrOffline(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirstAsset(request));
  }
});
