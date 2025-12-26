
const STATIC_CACHE = 'investfiis-static-v2.6.2';
const DATA_CACHE = 'investfiis-data-v2.6.2';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './version.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Remove QUALQUER cache que não seja o atual v2.6.2
          if (key !== STATIC_CACHE && key !== DATA_CACHE) {
            console.log('SW: Removendo cache obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (!url.protocol.startsWith('http')) return;

  // Estratégia Network-First para arquivos críticos
  if (request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('version.json') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate para o restante
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => null);
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
