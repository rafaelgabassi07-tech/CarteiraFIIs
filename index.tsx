
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Registro do Service Worker com Ciclo Estritamente Manual
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        // Monitora o status da instalação
        registration.addEventListener('updatefound', () => {
           const newWorker = registration.installing;
           if (newWorker) {
               newWorker.addEventListener('statechange', () => {
                   if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                       // O conteúdo novo foi instalado, mas está esperando (waiting).
                       // O App.tsx irá detectar isso via registration.waiting e mostrar o banner.
                       console.log('Nova versão instalada e aguardando ativação.');
                   }
               });
           }
        });
      })
      .catch(err => {
        console.error('Falha no registro do SW:', err);
      });
  });

  // Listener para recarregar a página APENAS quando o SW assumir o controle
  // Isso só acontece depois que o usuário clica em "Atualizar" no banner
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
