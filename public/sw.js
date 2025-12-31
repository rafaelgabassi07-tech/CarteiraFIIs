
const CACHE_NAME = 'investfiis-fix-clean-v8.0.0'; // Versão alterada para forçar reset total do cache

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW novo a assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Toma controle de todas as abas abertas
      caches.keys().then((keys) => {
        // Deleta QUALQUER cache antigo para garantir que não sobrem arquivos quebrados
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('Limpando cache antigo:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Estratégia Network First para HTML para evitar ficar preso em versões velhas
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Stale-while-revalidate para outros assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
             // Não cachear nada que não seja http/https
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
