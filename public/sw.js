
// Service Worker de Limpeza (v3.1.6)
// Este script substitui qualquer versão anterior e se desinstala imediatamente
// para resolver conflitos de CORS em ambientes de preview.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => {
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach(client => client.postMessage({ type: 'SW_REMOVED' }));
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Passa tudo direto para a rede, sem cache
  event.respondWith(fetch(event.request));
});
