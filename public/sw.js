
const CACHE_NAME = 'investfiis-ultra-v5.0.2-fix';
const DYNAMIC_CACHE = 'investfiis-dynamic-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './version.json'
];

// Instalação: Cache dos arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW a ativar imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação: Limpeza de caches antigos IMEDIATA
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle da página imediatamente
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar requisições de API e externas
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Sempre buscar version.json na rede
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Estratégia Stale-While-Revalidate para o app
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Atualiza o cache dinâmico com a nova versão
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => {
          // Se falhar a rede e não tiver cache, tenta retornar algo (fallback)
          // Mas normalmente o cachedResponse já resolveu
        });
      
      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para mensagens do App
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
