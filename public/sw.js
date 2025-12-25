const CACHE_NAME = 'investfiis-v2'; // Incrementado para v2 para forçar atualização
const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  // O skipWaiting aqui faz com que o SW assuma o controle imediatamente na instalação
  // Mas para o fluxo de "pedir para atualizar", controlamos isso via mensagem
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRÍTICO: Ignorar requisições que não sejam HTTP ou HTTPS (ex: chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Estratégia para API Brapi: Network First (tenta rede, falha para cache)
  if (url.hostname.includes('brapi.dev')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Apenas cacheia se a resposta for válida (status 200)
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estratégia para Assets (JS, CSS, Imagens): Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache apenas respostas válidas e do esquema http/https
        if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
      }).catch(() => {
        // Se falhar a rede e não tiver cache, retorna null ou uma página offline se necessário
        return null;
      });
      return cachedResponse || fetchPromise;
    })
  );
});