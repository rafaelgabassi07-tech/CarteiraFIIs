
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  // 1. Detecção de Iframe: O ambiente de preview geralmente roda dentro de um iframe.
  // Service Workers falham frequentemente em iframes de terceiros devido a particionamento de armazenamento.
  const isIframe = window.self !== window.top;
  
  const hostname = window.location.hostname;
  
  // 2. Lista de domínios conhecidos de Sandbox/Preview que bloqueiam SW ou causam CORS
  const isPreviewEnvironment = 
    isIframe ||
    hostname.includes('googleusercontent') || 
    hostname.includes('usercontent.goog') || 
    hostname.includes('ai.studio') ||
    hostname.includes('webcontainer') ||
    hostname === 'localhost';

  if (isPreviewEnvironment) {
    // Não registramos nada e tentamos limpar qualquer resíduo silenciosamente
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      } catch (e) {
        // Ignora erros de limpeza em ambientes restritos
      }
    }
    return;
  }

  // Apenas tenta registrar em produção real (URL final do usuário)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
      
      console.log('SW: Registrado (v3.1.5)');

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          });
        }
      });
    } catch (error) {
       // Silencia erros de registro para não poluir o console do usuário
       // console.error('SW: Falha no registro', error); 
    }
  }
};

initServiceWorker();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
