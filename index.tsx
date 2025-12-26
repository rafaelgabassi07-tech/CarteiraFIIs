
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Registro do Service Worker com detecção robusta de atualização e tratamento de erros de origem.
 */
const initServiceWorker = async () => {
  // Verificação de ambiente: Service Workers exigem contexto seguro e mesma origem.
  // Em ambientes de frame/sandbox como AI Studio, o registro pode falhar por mismatch de origem.
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
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
      // Falha silenciosa ou log de aviso apenas, para não quebrar a inicialização do App
      console.warn('SW: O registro do Service Worker foi bloqueado ou falhou. Isso é comum em ambientes de desenvolvimento/frames.', error);
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
