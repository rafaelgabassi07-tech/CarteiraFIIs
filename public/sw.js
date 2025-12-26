
// Versão dos arquivos estáticos (app shell). Incrementar ao modificar código.
const STATIC_CACHE = 'investfiis-static-v22';

// Nome do cache de dados (APIs, Imagens). Mudar apenas se a estrutura de dados mudar drasticamente.
const DATA_CACHE = 'investfiis-data-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('SW: Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Lógica de Limpeza Inteligente:
          // 1. Se for um cache estático antigo (ex: investfiis-static-v20), deleta.
          // 2. Se for o cache antigo monolítico (ex: investfiis-v20), deleta para migrar.
          // 3. SE FOR O DATA_CACHE ('investfiis-data-v1'), MANTÉM INTACTO.
          if ((key.startsWith('investfiis-static-') && key !== STATIC_CACHE) || 
              (key.startsWith('investfiis-v'))) {
            console.log('SW: Limpando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- ESTRATÉGIA 1: DADOS DINÂMICOS (APIs) ---
  // Stale-While-Revalidate: Usa o cache para velocidade imediata, mas atualiza em background.
  // Armazena no DATA_CACHE (que persiste entre atualizações do app).
  if (url.hostname.includes('brapi.dev') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchedResponse = fetch(request).then((networkResponse) => {
            // Só atualiza o cache se a resposta for válida (Status 200)
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Se falhar a rede, não faz nada (o usuário já recebeu o cache se existia)
             return cachedResponse; 
          });

          // Retorna o cache se existir, senão espera a rede
          return cachedResponse || fetchedResponse;
        });
      })
    );
    return;
  }

  // --- ESTRATÉGIA 2: ARQUIVOS ESTÁTICOS (JS, CSS, HTML, IMAGENS) ---
  // Cache-First: Tenta o cache, se não tiver, vai na rede.
  // Imagens externas (logos) também vão para o DATA_CACHE para persistirem.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // Se for imagem externa (ex: logos da brapi/google), tenta cachear no DATA_CACHE
          if (networkResponse && networkResponse.status === 200 && request.destination === 'image') {
             const responseToCache = networkResponse.clone();
             caches.open(DATA_CACHE).then((cache) => {
               cache.put(request, responseToCache);
             });
          }
          return networkResponse;
        }

        // Se for asset interno do próprio domínio, cacheia no STATIC_CACHE
        if (url.origin === self.location.origin) {
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
