
// Versão do cache estático. Incrementar para forçar atualização.
const STATIC_CACHE = 'investfiis-static-v26';
const DATA_CACHE = 'investfiis-data-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('investfiis-static-') && key !== STATIC_CACHE) {
            console.log('SW: Limpando cache antigo', key);
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

  // APIs (Brapi e Gemini) - Network First com Fallback para Cache
  if (url.hostname.includes('brapi.dev') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets Estáticos - Cache First com atualização em background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Atualiza o cache se a rede retornar sucesso
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
