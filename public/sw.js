
// Versão do cache estático. Incrementar para forçar atualização.
const STATIC_CACHE = 'investfiis-static-v43';
const DATA_CACHE = 'investfiis-data-v1';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json'
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
  
  // 1. Ignorar métodos não-GET (POST do Gemini, etc)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. Estratégia para APIs (Network First)
  if (url.hostname.includes('brapi.dev') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if(response && response.status === 200) {
              // CLONE IMEDIATO: Fundamental para evitar "Response body is already used"
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

  // 3. Estratégia para Navegação HTML (Network First)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // CLONE IMEDIATO
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 4. Estratégia para Assets Estáticos (Cache First)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Se achou no cache, retorna. Senão, vai para a rede.
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Verifica se a resposta é válida antes de cachear
        if (networkResponse && networkResponse.status === 200 && (url.origin === self.location.origin || url.hostname.includes('cdn.tailwindcss.com'))) {
          // CLONE IMEDIATO: A correção principal do erro relatado.
          // Não podemos esperar o caches.open resolver para clonar.
          const responseToCache = networkResponse.clone();
          
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
