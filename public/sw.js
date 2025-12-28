
const CACHE_NAME = 'investfiis-ultra-v6.5.0'; // Bump version

// Apenas ativos estáticos essenciais (CSS, Icones, Manifest)
// HTML NÃO deve ser cacheado na instalação para garantir que sempre busquemos a versão mais nova da rede
const ASSETS_TO_CACHE = [
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo SW a assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpa TODOS os caches antigos para evitar conflitos de versão
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Clearing old cache:', key);
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim() // Assume controle das páginas imediatamente
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NAVEGAÇÃO / HTML: NETWORK ONLY (Com fallback offline)
  // Isso é crucial para evitar o Erro 404 em arquivos JS.
  // Sempre tentamos pegar o index.html fresco do servidor.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.includes('version.json')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Se falhar (offline), tenta encontrar no cache (se existir de sessões anteriores)
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. ATIVOS EXTERNOS (Brapi, Google AI, Fontes): Cache First ou Network Only
  if (url.origin !== self.location.origin) {
    return; // Deixa o browser lidar (padrão)
  }

  // 3. ARQUIVOS JS/CSS/IMG LOCAIS: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se achou no cache, retorna ele E atualiza em background
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Se não achou, busca na rede e cacheia
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// Força recarregamento se solicitado
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
