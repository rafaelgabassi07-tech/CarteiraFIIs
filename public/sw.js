
const CACHE_NAME = 'investfiis-pwa-v8.2.4'; // Increment version to force update

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // ESTRATÉGIA 1: NETWORK FIRST (Prioriza Rede, Fallback Cache)
  // Ideal para APIs de dados dinâmicos como Cotações (Brapi)
  if (url.href.includes('brapi.dev')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Se a rede responder, atualiza o cache e retorna
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se estiver offline ou falhar, tenta o cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // ESTRATÉGIA 2: CACHE FIRST (Prioriza Cache, Fallback Rede)
  // Ideal para imagens estáticas (Logos, CDN)
  if (url.href.includes('cloudfront.net') || url.href.includes('static.statusinvest')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navegação (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets Locais (JS, CSS, etc) - Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
