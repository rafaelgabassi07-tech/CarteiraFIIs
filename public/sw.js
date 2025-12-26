
// Versão do cache estático. Incrementar para forçar atualização.
const STATIC_CACHE = 'investfiis-static-v46';
const DATA_CACHE = 'investfiis-data-v1';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './index.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch(err => {
            console.warn('SW: Aviso - Falha ao pré-cachear alguns arquivos.', err);
        });
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
  
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. APIs e Dados (Network First)
  if (url.hostname.includes('brapi.dev') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if(response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(DATA_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2. Navegação e Arquivos de Código (Network First)
  // Mudamos para Network First para garantir que mudanças no código (App.tsx, etc) sejam baixadas imediatamente.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se a rede falhar, tenta o cache
        return caches.match(request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
