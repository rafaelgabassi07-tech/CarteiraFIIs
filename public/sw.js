
const CACHE_NAME = 'investfiis-core-v7.0.4'; // Incrementado para garantir atualização

// Arquivos vitais que devem estar disponíveis offline imediatamente
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força atualização imediata do SW
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 1. Limpa caches antigos
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      }),
      // 2. Toma controle dos clientes imediatamente APÓS ativação
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorar esquemas não suportados (chrome-extension, data, file, etc)
  if (!url.protocol.startsWith('http')) {
      return; 
  }

  // A) Version.json: CRÍTICO - NUNCA CACHEAR
  if (url.pathname.includes('version.json')) {
      event.respondWith(
          fetch(event.request, { 
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          }).catch(() => {
              return new Response(JSON.stringify({ error: 'offline' }), { 
                  headers: { 'Content-Type': 'application/json' } 
              });
          })
      );
      return;
  }

  // B) Navegação (HTML): Network First
  if (event.request.mode === 'navigate') {
      event.respondWith(
          fetch(event.request)
            .catch(() => caches.match('./index.html'))
      );
      return;
  }

  // C) Assets Estáticos: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cacheia apenas sucessos válidos e garante que o esquema é http/https
        if (networkResponse && networkResponse.status === 200) {
           // Verifica se é um request básico ou CORS (para imagens/fontes externas)
           if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then((cache) => {
                   try {
                       if (event.request.url.startsWith('http')) {
                           cache.put(event.request, responseToCache);
                       }
                   } catch (err) {
                       // Silencia erros de escrita de cache
                   }
               });
           }
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

// --- PUSH NOTIFICATIONS (Background Support) ---

self.addEventListener('push', function(event) {
  // Tenta ler os dados enviados pelo servidor (payload JSON)
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'InvestFIIs', message: event.data.text() };
    }
  } else {
    data = { title: 'InvestFIIs', message: 'Nova atualização na sua carteira.' };
  }

  const options = {
    body: data.message,
    icon: '/pwa-192x192.png', // Certifique-se que este ícone existe
    badge: '/pwa-192x192.png', // Ícone pequeno para a barra de status (Android)
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/' // URL para abrir ao clicar
    },
    actions: [
      { action: 'open_app', title: 'Ver Carteira' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // URL para abrir
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se o app já estiver aberto, foca nele
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVESTFIIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});
