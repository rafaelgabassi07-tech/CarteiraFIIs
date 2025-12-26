
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  const hostname = window.location.hostname;
  
  // Verifica se estamos em ambiente de preview/sandbox do Google ou AI Studio
  const isPreviewEnvironment = 
    hostname.includes('googleusercontent.com') || 
    hostname.includes('usercontent.goog') || 
    hostname.includes('ai.studio') ||
    hostname === 'localhost'; // Opcional: Desativar em localhost se desejar

  if (isPreviewEnvironment) {
    console.log('SW: Ambiente de Preview detectado. Service Worker desativado.');
    // Garante que nenhum SW antigo permaneça
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister().catch(() => {}));
      });
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
      
      console.log('SW: Registrado (v3.1.4)');

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('SW: Nova versão instalada. Atualizando...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          });
        }
      });

      setInterval(() => {
        registration.update().catch(() => {});
      }, 60000);

    } catch (error: any) {
       // Tratamento específico para erros de Sandbox/Cross-Origin
       if (error.message && (
          error.message.includes('origin') || 
          error.message.includes('scriptURL') ||
          error.message.includes('security')
       )) {
         console.warn('SW: Registro bloqueado por política de segurança do navegador (Esperado em Preview).');
         return;
       }
       console.error('SW: Erro no registro:', error);
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
