
const CACHE_NAME = 'investfiis-pwa-v8.3.16'; // Bumped version

const PRECACHE_ASSETS = [
  './',
  './manifest.json',
  './logo.svg'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força instalação imediata
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Tenta fazer cache dos assets.
        // O .catch garante que erros não fatais (ex: um asset falhando)
        // não impeçam a instalação do SW, embora o ideal seja todos funcionarem.
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
            console.warn('SW Precache warning:', err);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Assume controle imediato
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // API Calls: Network First
  if (url.href.includes('brapi.dev') || url.href.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static Assets (CDN): Cache First
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

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('./index.html')) // Fallback offline (se existir no cache)
        .catch(() => caches.match('./')) // Fallback alternativo para raiz
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
           // Network fail silently
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
