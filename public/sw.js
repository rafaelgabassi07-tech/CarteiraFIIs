

const CACHE_NAME = 'investfiis-ultra-v5.5.4';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // CRÍTICO: O SW entra em estado de 'waiting' após instalar.
  // NÃO chamamos skipWaiting() aqui para não furar a fila.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
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
    // REMOVIDO: .then(() => self.clients.claim())
    // Motivo: clients.claim() forçava o novo SW a assumir o controle de abas abertas 
    // imediatamente após ativar. Ao remover, garantimos que ele só assuma
    // quando a página for recarregada pelo usuário (via botão de atualização).
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não cachear o arquivo de versão para sempre buscar o mais recente na rede
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-First para arquivos estáticos
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

// Listener para ativar a nova versão SOMENTE quando o usuário clicar em "Atualizar" no App.tsx
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
