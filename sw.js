// Offline-Unterstützung: erst Netz versuchen (damit Updates ankommen), sonst Cache.
const CACHE = 'taxicoach-v7';
const FILES = ['./', './index.html', './styles.css', './app.js', './halteplaetze.js', './vendor/anthropic-sdk.js',
  './icon.svg', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 'no-cache' = beim Server nachfragen, ob es eine neuere Fassung gibt. So passen nach einem
  // Update alle Dateien zusammen und es bleibt keine alte Seite im Browser-Zwischenspeicher hängen.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    (sameOrigin ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request))
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
