
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Em ambientes de desenvolvimento, preview ou iframes (como o Google IDX/AI Studio),
// Service Workers causam erros de CORS ao interceptar scripts de módulo (index.tsx).
// DESATIVADO por padrão para garantir estabilidade.
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Tenta remover qualquer SW existente para limpar o erro de CORS/Network Error
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log('SW: Limpando Service Workers antigos para corrigir erros de rede...');
        await Promise.all(registrations.map(r => r.unregister()));
        // Recarrega a página uma vez se removeu um SW, para garantir que o index.tsx carregue via rede
        if (!sessionStorage.getItem('sw_cleaned')) {
            sessionStorage.setItem('sw_cleaned', 'true');
            window.location.reload();
        }
      }
    } catch (e) {
      console.warn('SW: Erro ao limpar registros', e);
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
