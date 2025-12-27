
const CACHE_NAME = 'investfiis-ultra-v4.8.0';
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

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar requisições de API (Brapi, Gemini, etc) do cache estático
  // Deixa o navegador/app lidar com o cache de dados ou Network Only
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Estratégia Network First para version.json (Sempre buscar versão nova)
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Estratégia Stale-While-Revalidate para ativos estáticos (JS, CSS, Imagens)
  // Retorna o cache rápido, mas atualiza no fundo para a próxima visita
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para forçar atualização via mensagem do App
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
