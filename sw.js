// Offline-Unterstützung: erst Netz versuchen (damit Updates ankommen), sonst Cache.
const CACHE = 'taxicoach-v17';
const FILES = ['./', './index.html', './styles.css', './app.js', './halteplaetze.js', './radar.json', './vendor/anthropic-sdk.js', './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
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
  // Fremde Dienste (Wetter, Adresssuche, Route, KI) gehen direkt ans Netz und werden nicht gespeichert.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // 'no-cache' = beim Server nachfragen, ob es eine neuere Fassung gibt. So passen nach einem
  // Update alle Dateien zusammen und es bleibt keine alte Seite im Browser-Zwischenspeicher hängen.
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
