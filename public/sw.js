
const CACHE_NAME = 'investfiis-ultra-v5.4.6';

// Arquivos vitais. Apenas estes serão baixados na instalação.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.js',
];

// 1. INSTALAÇÃO: Momento único de download.
self.addEventListener('install', (event) => {
  // O SW entra em estado 'waiting' automaticamente após isso.
  // NÃO usamos skipWaiting() aqui para impedir a troca automática.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ATIVAÇÃO: Troca de chaves. Só ocorre após o usuário autorizar.
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
    }).then(() => self.clients.claim()) // Assume o controle imediatamente após a ativação manual
  );
});

// 3. FETCH: Modo Leitura Estrita (Immutable)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exceção: Version Check sempre vai na rede para saber se o banner deve aparecer
  if (url.pathname.includes('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Ignora requisições externas (API, Analytics, etc)
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ESTRATÉGIA IMUTÁVEL:
      // Se está no cache, usa o cache. PONTO FINAL.
      // Não vai na rede conferir se mudou. Não baixa nada em background.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não está no cache (ex: um ícone novo que não existia na instalação),
      // busca na rede apenas para exibir, MAS NÃO SALVA no cache atual.
      // Isso impede que o cache atual seja "contaminado" com arquivos de uma nova versão.
      return fetch(event.request);
    })
  );
});

// 4. MENSAGENS: O único gatilho permitido para atualizar
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
