
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('SW: Nova versão assumindo o controle...');
      window.location.reload();
    });

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { 
        scope: './',
        updateViaCache: 'none' // Força a busca do sw.js sempre na rede
      });
      
      // Checagem periódica a cada 60s
      setInterval(() => {
        registration.update();
      }, 60000);

      // Checagem ao voltar para o app
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      if (registration.waiting) {
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        }
      });
    } catch (error) {
      console.warn('SW: Registro falhou.', error);
    }
  }
};

window.addEventListener('load', initServiceWorker);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
