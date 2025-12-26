
// Service Worker Killer (v3.1.8)
// Este arquivo existe apenas para garantir que versões antigas sejam removidas.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        // Opcional: Avisar clientes, mas o foco é apenas limpar o registro
        clients.forEach(client => client.postMessage({ type: 'SW_REMOVED' }));
      })
  );
});
