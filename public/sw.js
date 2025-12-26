
const STATIC_CACHE = 'investfiis-static-v2.6.9';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NUNCA cachear version.json ou scripts principais
  if (url.pathname.includes('version.json') || url.pathname.includes('index.tsx')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Estratégia Network First para o resto no Vercel
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
