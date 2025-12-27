
const CACHE_NAME = 'investfiis-ultra-v5.4.4';

// Arquivos que formam o "App Shell" e devem ser carregados offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.js', // Se houver build steps gerando chunks, o browser vai cachear na instalação via requests
];

// 1. INSTALAÇÃO: Baixa apenas o essencial uma única vez.
self.addEventListener('install', (event) => {
  // O skipWaiting foi removido propositalmente.
  // O SW novo entra em estado 'waiting' até o usuário clicar em "Atualizar" no banner.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear, mas não falha se algum arquivo opcional faltar
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Falha em cachear assets opcionais', err));
    })
  );
});

// 2. ATIVAÇÃO: Faxina. Roda quando o usuário clica em "Atualizar" e a nova versão assume.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Remove qualquer cache que não seja o da versão atual (5.4.4)
          // Removemos também o 'dynamic-cache' antigo para evitar lixo
          if (key !== CACHE_NAME) {
            console.log('[SW] Limpando versão antiga:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: O Guardião da Rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. EXCEÇÃO: version.json SEMPRE vai para a rede.
  // É a única forma de sabermos se há update sem baixar o app todo.
  if (url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        // Se offline, retorna 404 ou nada, para não mostrar banner falso
        return new Response(null, { status: 404 });
      })
    );
    return;
  }

  // B. IGNORAR EXTERNOS: APIs (Brapi, Google AI) não são cacheadas pelo SW.
  if (url.origin !== self.location.origin) {
    return;
  }

  // C. ESTRATÉGIA CACHE-FIRST (Cache Primeiro)
  // O App verifica o cache. Se achar, retorna IMEDIATAMENTE e NÃO vai para a rede.
  // Isso impede downloads em segundo plano.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não estiver no cache (ex: um ícone novo que o usuário nunca viu), baixa e salva.
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Salva para o futuro, para não baixar de novo
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Fallback offline (se necessário)
        // Se for navegação, pode retornar index.html
        if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. MENSAGENS: O Gatilho do Botão "Atualizar"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // AQUI acontece a mágica da troca de versão
  }
});
