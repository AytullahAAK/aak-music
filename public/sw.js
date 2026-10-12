const SHELL_CACHE = 'aak-shell-v1';
const STATIC_CACHE = 'aak-static-v1';
const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/images/aak-app-icon-192.png',
  '/images/aak-app-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('aak-') && ![SHELL_CACHE, STATIC_CACHE].includes(key)).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

function isNeverCache(url, request) {
  return url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET' ||
    request.headers.has('range') ||
    /\.(?:mp3|m4a|aac|wav|ogg|flac|mp4|webm|mov)(?:$|\?)/i.test(url.pathname) ||
    request.destination === 'audio' || request.destination === 'video';
}

async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (isNeverCache(url, request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok && response.type === 'basic' && response.headers.get('content-type')?.includes('text/html')) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put('/', response.clone());
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return await cache.match('/offline.html') || await cache.match('/') || Response.error();
    }));
    return;
  }

  const isHashedBuildAsset = url.pathname.startsWith('/assets/');
  const isPublicImage = /\.(?:png|jpe?g|webp|avif|svg|ico)$/i.test(url.pathname);
  const isManifest = url.pathname === '/manifest.webmanifest';
  if (!isHashedBuildAsset && !isPublicImage && !isManifest) return;

  if (isManifest) {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(async () => await caches.match(request) || Response.error()));
    return;
  }

  event.respondWith(caches.match(request).then(async (cached) => {
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && !request.headers.has('authorization')) {
      const cache = await caches.open(isHashedBuildAsset ? STATIC_CACHE : SHELL_CACHE);
      await cache.put(request, response.clone());
      await trimCache(isHashedBuildAsset ? STATIC_CACHE : SHELL_CACHE, 80);
    }
    return response;
  }));
});
