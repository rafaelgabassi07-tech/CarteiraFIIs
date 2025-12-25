
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Registro do Service Worker com detecção de atualização.
 * Otimizado para funcionar em ambientes de preview e produção sem erros de origem.
 */
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Determinamos o caminho base dinamicamente para suportar subpastas e proxies
      const currentPath = window.location.pathname;
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      
      // Construímos a URL absoluta para o sw.js garantindo que a origem seja identica
      // à da página atual, evitando o erro "The origin of the provided scriptURL does not match".
      const swUrl = new URL('sw.js', window.location.origin + basePath).href;

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: basePath
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Dispara evento customizado para o App.tsx mostrar o banner de atualização
              console.log('Nova versão do InvestFIIs disponível.');
              window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
            }
          });
        }
      });
    } catch (error) {
      // Falha silenciosa: útil em ambientes de dev local ou sandboxes que bloqueiam SWs
      console.warn('Aviso: Service Worker não registrado (esperado em alguns ambientes de preview):', error);
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
