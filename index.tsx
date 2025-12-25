
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Registro do Service Worker com detecção robusta de atualização.
 */
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');

      // 1. Verifica se já existe um SW esperando (atualização baixada em sessão anterior)
      if (registration.waiting) {
        console.log('SW: Atualização já estava aguardando.');
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
      }

      // 2. Monitora novas atualizações encontradas durante o uso
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            // Se o estado mudou para 'installed' E já existe um controlador (não é a primeira visita)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('SW: Nova versão baixada e pronta para instalar.');
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        }
      });
    } catch (error) {
      console.debug('Service Worker não suportado ou bloqueado pelo ambiente:', error);
    }
  }
};

// Inicializa o SW após o carregamento total da página
window.addEventListener('load', initServiceWorker);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
