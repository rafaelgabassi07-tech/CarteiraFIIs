
const CACHE_NAME = 'investfiis-core-v6.6.1'; // Ensure this matches package.json

// Arquivos vitais que devem estar disponíveis offline imediatamente
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // Instalação: Cacheia o essencial imediatamente
  // NÃO usamos skipWaiting() aqui automaticamente para evitar atualização forçada sem aviso
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 1. Limpa caches antigos
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      // 2. Toma controle dos clientes imediatamente APÓS ativação
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A) Version.json: CRÍTICO - NUNCA CACHEAR
  // Adiciona cabeçalhos anti-cache na requisição de rede
  if (url.pathname.includes('version.json')) {
      event.respondWith(
          fetch(event.request, { 
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          }).catch(() => {
              // Retorna erro 404 ou JSON vazio se offline, mas nunca cache antigo
              return new Response(JSON.stringify({ error: 'offline' }), { 
                  headers: { 'Content-Type': 'application/json' } 
              });
          })
      );
      return;
  }

  // B) Navegação (HTML): Network First
  if (event.request.mode === 'navigate') {
      event.respondWith(
          fetch(event.request)
            .catch(() => caches.match('./index.html'))
      );
      return;
  }

  // C) Assets Estáticos: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cacheia apenas sucessos válidos
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
