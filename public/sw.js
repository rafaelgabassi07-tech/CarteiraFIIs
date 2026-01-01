const CACHE_NAME = 'investfiis-pwa-stable-v1'; // Nome semântico para forçar reset e estabilidade

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Ouve a mensagem da UI para ativar o novo SW quando o usuário confirmar
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    console.log('SW: Received SKIP_WAITING message. Activating new worker.');
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  // Não força mais skipWaiting aqui; espera a UI ou o fechamento de abas.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Toma controle imediato das páginas
      caches.keys().then((keys) => {
        // Deleta TODO e qualquer cache antigo que não seja o atual
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('SW: Deletando cache obsoleto:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Estratégia Network First para HTML (garante que index.html sempre venha atualizado da rede se possível)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Stale-while-revalidate para assets estáticos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
             if (event.request.url.startsWith('http')) {
                cache.put(event.request, responseToCache);
             }
          });
        }
        return networkResponse;
      }).catch(() => {});
      return cachedResponse || fetchPromise;
    })
  );
});