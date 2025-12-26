
// Versão do cache estático. Incrementar para forçar atualização.
const STATIC_CACHE = 'investfiis-static-v36';
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
            console.warn('SW: Aviso - Falha ao pré-cachear alguns arquivos. Eles serão cacheados sob demanda.', err);
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
  
  // CORREÇÃO CRÍTICA: O Cache API só suporta requisições GET.
  // Requisições POST (como as do Gemini API) causam o erro "Request method 'POST' is unsupported".
  // Se não for GET, deixamos o navegador lidar nativamente (Network Only) e não cacheamos.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. APIs (Brapi e Google Fonts/Maps) - Network First com Fallback para Cache
  // Nota: Gemini é POST, então já foi filtrado acima e não entrará aqui.
  if (url.hostname.includes('brapi.dev') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Copia a resposta para o cache apenas se for válida
          if(response && response.status === 200) {
              const clonedResponse = response.clone();
              caches.open(DATA_CACHE).then((cache) => {
                cache.put(request, clonedResponse);
              });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2. Navegação (HTML) - Network First (Prioridade Rede)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 3. Assets Estáticos (JS, CSS, Imagens) - Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Cacheia qualquer arquivo JS/CSS/Imagem que for carregado com sucesso e seja da mesma origem
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
