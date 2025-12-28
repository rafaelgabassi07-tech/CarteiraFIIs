
const CACHE_NAME = 'investfiis-ultra-v5.5.7';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // O SW instala, mas fica em 'waiting' até receber o comando ou todos os clientes fecharem.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Limpa caches antigos, mas NÃO toma controle (clients.claim removido).
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Version.json sempre network-first para detecção rápida
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Stale-While-Revalidate para ativos (mais seguro para UX) ou Cache-First?
  // Mantemos Cache-First para performance e consistência da versão.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// A única forma de pular o 'waiting' programaticamente é via este comando.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
