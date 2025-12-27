
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Mecanismo de Auto-Recuperação de Cache
// Se o navegador estiver tentando carregar scripts antigos (404), isso forçará uma limpeza.
window.addEventListener('error', (e) => {
  // Detecta erros de carregamento de scripts (ChunkLoadError ou 404 em JS)
  if (e.message && (e.message.includes('Loading chunk') || e.message.includes('token') || e.target instanceof HTMLScriptElement)) {
    console.warn('Erro crítico de carregamento detectado. Tentando recuperar...', e);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for(let registration of registrations) {
                registration.unregister();
            }
            // Recarrega a página forçando bypass de cache
            window.location.reload(); 
        });
    }
  }
});

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        // Verifica se há uma atualização aguardando
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        console.log('SW registrado:', registration.scope);
      })
      .catch(err => {
        console.error('Falha no registro do SW:', err);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
