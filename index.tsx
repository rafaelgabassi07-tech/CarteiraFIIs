
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Usar './sw.js' é a forma mais segura de garantir que o navegador
      // resolva o script relativo à origem atual da página (o sandbox .goog)
      // e não à origem do frame pai (ai.studio).
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
      
      console.log('SW: Registrado (v3.1.0)');

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

      // Verificação periódica de atualização
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60000);

    } catch (error: any) {
      // Silencia erros de origem em ambiente de desenvolvimento/preview
      // mas mantém logs de outros problemas reais.
      if (error?.message?.includes('origin of the provided scriptURL')) {
        console.warn('SW: Registro ignorado devido a restrição de domínio do ambiente de preview.');
      } else {
        console.error('SW: Erro no registro:', error);
      }
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
