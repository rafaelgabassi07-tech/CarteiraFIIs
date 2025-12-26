
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  // Verificação de ambiente seguro e suporte
  if ('serviceWorker' in navigator && window.isSecureContext) {
    try {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('SW: Nova versão assumindo o controle...');
        window.location.reload();
      });

      // FIX: Resolve o caminho do SW contra a URL atual para evitar erro de origin mismatch em ambientes de sandbox/proxy
      const swUrl = new URL('./sw.js', window.location.href).href;
      
      const registration = await navigator.serviceWorker.register(swUrl, { 
        scope: './',
        updateViaCache: 'none' 
      });
      
      console.log('SW: Registrado com sucesso no escopo:', registration.scope);

      // Checagem periódica a cada 60s
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60000);

      // Checagem ao voltar para o app
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
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
      console.warn('SW: Falha no registro (provavelmente restrição de sandbox/origem). Tentando ignorar erro no preview.', error);
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
