
// Service Worker de Autodestruição (v3.1.7)
// Removemos o evento 'fetch' para garantir que o SW NÃO intercepte requisições de rede.
// Isso resolve definitivamente os erros de CORS/Network Error em ambientes de preview.

self.addEventListener('install', (event) => {
  // Força a ativação imediata desta versão
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Assim que ativar, desregistra a si mesmo e avisa os clientes
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach(client => client.postMessage({ type: 'SW_REMOVED' }));
      })
  );
});

// NENHUM listener de 'fetch' aqui. 
// Isso força o navegador a ir direto para a rede, ignorando o SW.
