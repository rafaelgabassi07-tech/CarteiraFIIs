

const CACHE_NAME = 'investfiis-ultra-v5.5.3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // CRÍTICO: NÃO usar self.skipWaiting() aqui.
  // O usuário deve decidir quando atualizar clicando no botão.
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
    }).then(() => self.clients.claim())
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

  // ESTRATÉGIA CACHE-FIRST RÍGIDA PARA APP SHELL
  // Se estiver no cache, retorna do cache e NÃO vai na rede atualizar em background.
  // Isso impede que o index.html mude "sozinho" no próximo reload sem o novo SW estar ativo.
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

// Listener para ativar a nova versão SOMENTE quando o usuário clicar em "Atualizar"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
