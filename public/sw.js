
const STATIC_CACHE = 'investfiis-static-v2.5.4';
const DATA_CACHE = 'investfiis-data-v2';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './version.json'
];

// Instalação - Abre o cache e armazena os assets iniciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('SW: Pre-caching assets...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Não chamamos skipWaiting() aqui. O worker fica em "waiting".
});

// Ativação - Limpa caches antigos de forma rigorosa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DATA_CACHE) {
            console.log('SW: Expurgando cache obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('SW: Agora controlando os clientes.');
      return self.clients.claim();
    })
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Segurança: Ignorar requisições que não sejam HTTP/HTTPS (como esquemas de extensões)
  if (!url.protocol.startsWith('http')) return;

  // Estratégia Network-First para a navegação principal (index.html)
  if (request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para o restante dos assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// Receptor de Comandos do App
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Comando manual de ativação recebido.');
    self.skipWaiting();
  }
});
