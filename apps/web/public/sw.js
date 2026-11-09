/*
 * RMS Careers public-site service worker.
 *
 * Deliberately small and conservative:
 *  - Page navigations are network-first. A copy of each successfully loaded page is kept so it can be
 *    shown offline; if neither network nor cache has it, the precached /offline page is shown.
 *  - Content-hashed build assets (/_next/static) and site images/icons are cache-first.
 *  - Everything else (RSC payloads, Server Actions, /api, cross-origin such as GA) goes straight to the
 *    network and is never cached.
 *
 * Bump VERSION to drop every old cache on the next activation.
 * Kill switch: replace this file with one whose install calls skipWaiting() and whose activate deletes
 * all caches and calls self.registration.unregister().
 */
const VERSION = 'v1';
const PAGES = `rms-pages-${VERSION}`;
const ASSETS = `rms-assets-${VERSION}`;
const OFFLINE_URL = '/offline';
const MAX_PAGES = 40;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    if (new URL(keys[i].url).pathname !== OFFLINE_URL) await cache.delete(keys[i]);
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches
        .open(PAGES)
        .then((cache) => cache.put(request, copy))
        .then(() => trimCache(PAGES, MAX_PAGES));
    }
    return response;
  } catch {
    const cache = await caches.open(PAGES);
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match(OFFLINE_URL)) || Response.error();
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
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirstAsset(request));
  }
});
