
const CACHE_NAME = 'investfiis-ultra-v5.4.3';
const DYNAMIC_CACHE = 'investfiis-dynamic-v1';

// Apenas arquivos vitais da UI entram no cache imutável de instalação.
// O version.json foi removido daqui para evitar leituras de versão obsoleta.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalação: Cache dos arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  // NÃO usamos skipWaiting() aqui. O worker entra em estado "waiting"
  // e só ativa quando o usuário clica no botão do banner.
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
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle imediatamente após ativação autorizada
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar requisições externas (API, Analytics, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Estratégia Network Only para version.json
  // Garante que o app sempre verifique a versão real no servidor, sem cache.
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        // Se offline, tenta cache ou retorna erro controlado
        return caches.match(event.request);
      })
    );
    return;
  }

  // 3. Estratégia Stale-While-Revalidate para o restante do App
  // Entrega o conteúdo rápido do cache, mas atualiza em background se houver internet
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Atualiza o cache dinâmico com a nova versão do arquivo
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => {
          // Se falhar o fetch, não faz nada (já retornou o cache se existir)
        });
      
      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para mensagens do App (Acionado pelo botão "Atualizar")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // Autoriza a troca de versão
  }
});
