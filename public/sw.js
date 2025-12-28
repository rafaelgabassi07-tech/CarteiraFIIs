
const CACHE_NAME = 'investfiis-ultra-v6.6.1'; // Bump version

const ASSETS_TO_CACHE = [
  './manifest.json'
];

// Broadcast Channel para comunicação moderna com o cliente
const channel = new BroadcastChannel('investfiis_sw_updates');

self.addEventListener('install', (event) => {
  // Manual skipWaiting only
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              // Limpa caches antigos
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim()
    ]).then(() => {
        channel.postMessage({ type: 'SW_ACTIVATED' });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. VERSION CHECK: NETWORK ONLY (CRÍTICO)
  // O arquivo version.json NUNCA deve ser cacheado.
  if (url.pathname.includes('version.json')) {
      event.respondWith(
          fetch(event.request, { cache: 'no-store' }).catch(() => new Response(JSON.stringify({ error: 'offline' })))
      );
      return;
  }

  // 2. NAVEGAÇÃO: NETWORK ONLY COM FALLBACK CACHE
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. ATIVOS EXTERNOS
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4. Stale-While-Revalidate para outros arquivos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza cache em background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
