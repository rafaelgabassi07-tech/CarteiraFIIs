
const CACHE_NAME = 'investfiis-core-v6.6.1'; // Incrementado

// Arquivos vitais que devem estar disponíveis offline imediatamente
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // Instalação: Cacheia o essencial imediatamente
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
      // 2. Toma controle dos clientes imediatamente para garantir que a versão nova rode
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A) Version.json: SEMPRE Network (para saber se tem notas de release novas)
  if (url.pathname.includes('version.json')) {
      event.respondWith(
          fetch(event.request, { cache: 'no-store' }).catch(() => {
              // Se offline, tenta retornar um json vazio ou cacheado se existir, mas idealmente falha
              return new Response(JSON.stringify({ version: 'offline' }));
          })
      );
      return;
  }

  // B) Navegação (HTML): Network First (para garantir conteúdo fresco), Fallback Cache
  if (event.request.mode === 'navigate') {
      event.respondWith(
          fetch(event.request)
            .catch(() => caches.match('./index.html'))
      );
      return;
  }

  // C) Assets Estáticos (JS, CSS, Imagens): Stale-While-Revalidate
  // Serve do cache rápido, mas atualiza o cache em background para a próxima vez
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;
      }).catch(() => {}); // Erros de fetch em background são ignorados

      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para forçar a atualização quando o usuário clica no botão
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
