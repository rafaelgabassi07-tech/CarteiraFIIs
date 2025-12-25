
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Registro do Service Worker com detecção de atualização.
 * Simplificado para usar caminhos relativos, garantindo compatibilidade com proxies e previews.
 */
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Usar './sw.js' resolve o arquivo em relação ao local do index.html atual
      // O navegador cuida automaticamente de validar a origem.
      const registration = await navigator.serviceWorker.register('./sw.js');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nova versão do InvestFIIs disponível.');
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        }
      });
    } catch (error) {
      // Falha silenciosa em ambientes que não suportam SW (como iframes de preview restritos)
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
