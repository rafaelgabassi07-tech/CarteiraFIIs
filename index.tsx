
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
      console.log('SW: Registrado com sucesso.');

      // 1. Verifica se já existe um SW esperando
      if (registration.waiting) {
        console.log('SW: Atualização aguardando ativação.');
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
      }

      // 2. Monitora mudanças de estado no worker instalado
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('SW: Nova versão pronta.');
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        }
      });
    } catch (error) {
      console.warn('SW: Falha no registro:', error);
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
