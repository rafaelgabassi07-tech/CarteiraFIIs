
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    // Escuta por mudanças de controle (quando o novo SW assume)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('SW: Controlador alterado. Recarregando página...');
      window.location.reload();
    });

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      
      // Se já houver um worker esperando, avisa o app
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
