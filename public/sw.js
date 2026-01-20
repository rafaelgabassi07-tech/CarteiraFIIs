
const CACHE_NAME = 'investfiis-pwa-v8.6.2-force-logo-b64'; 

// Mantemos apenas o essencial no precache para garantir instalação rápida e sem erros.
// Assets como logo.svg serão cacheados dinamicamente na primeira requisição (estratégia Cache First).
const PRECACHE_ASSETS = [
  './',
  './manifest.json'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
            console.warn('SW Precache warning (non-fatal):', err);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
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

  // 1. API Calls (Supabase/Brapi/Gemini): Network First
  if (url.href.includes('brapi.dev') || url.href.includes('/api/') || url.href.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Opcional: Retornar fallback offline para dados se necessário
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Static Assets (Images, Icons, Fonts): Cache First -> Network -> Cache
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|json|css|js|woff|woff2)$/) ||
    url.href.includes('cloudfront.net')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          // Apenas cacheia se sucesso (200)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
           // Fallback para placeholder se desejar
           return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // 3. Navigation (HTML): Network First -> Cache (Offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html')
            .then(r => r || caches.match('./')); 
        })
    );
    return;
  }
});
