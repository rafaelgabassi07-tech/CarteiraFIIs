
const CACHE_NAME = 'investfiis-ultra-v5.4.8';

// Arquivos vitais.
// REMOVIDO: './index.js' (Causava erro de 404 e travava a instalação)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// 1. INSTALAÇÃO
self.addEventListener('install', (event) => {
  // Força o SW novo a assumir controle imediatamente após instalar, sem esperar
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll é atômico: se um falhar, tudo falha. 
      // Por isso removemos arquivos instáveis da lista.
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ATIVAÇÃO
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

// 3. FETCH
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exceção: Version Check sempre vai na rede
  if (url.pathname.includes('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Ignora requisições externas
  if (url.origin !== self.location.origin) {
    return;
  }

  // Estratégia: Stale-While-Revalidate para Assets não críticos
  // Tenta cache, mas atualiza em background para a próxima vez
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Se a resposta for válida, atualiza o cache dinamicamente
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });

      // Retorna cache se existir, senão espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. MENSAGENS
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
