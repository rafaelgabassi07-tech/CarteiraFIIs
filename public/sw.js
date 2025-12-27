
const CACHE_NAME = 'investfiis-ultra-v5.4.2';
const DYNAMIC_CACHE = 'investfiis-dynamic-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './version.json'
];

// Instalação: Cache dos arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  // REMOVIDO: self.skipWaiting(); 
  // Motivo: Queremos que a atualização fique em estado 'waiting' até o usuário confirmar no banner.
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
            // Limpa versões antigas apenas quando a nova assume o controle
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle da página
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar requisições de API e externas (exceto assets locais)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Sempre buscar version.json na rede (Network First)
  // Isso garante que o app saiba imediatamente de novas versões
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Estratégia Stale-While-Revalidate para o app
  // Entrega o cache rápido, mas atualiza o cache em segundo plano
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Atualiza o cache dinâmico
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback se offline e sem cache (raro neste ponto)
        });
      
      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para mensagens do App (Acionado pelo botão "Atualizar")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // Agora sim, força a atualização
  }
});
