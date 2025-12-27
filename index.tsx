
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Mecanismo de Auto-Recuperação de Cache
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Loading chunk') || e.message.includes('token') || e.target instanceof HTMLScriptElement)) {
    console.warn('Erro crítico de carregamento detectado. Tentando recuperar...', e);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for(let registration of registrations) {
                registration.unregister();
            }
            window.location.reload(); 
        });
    }
  }
});

// Registro do Service Worker com Ciclo de Atualização Robusto
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        // Se houver uma atualização esperando, notifica o usuário (pode ser tratado via UI se necessário)
        if (registration.waiting) {
            console.log('Nova versão disponível (waiting)...');
        }

        // Detecta quando uma nova atualização é encontrada
        registration.addEventListener('updatefound', () => {
           const newWorker = registration.installing;
           if (newWorker) {
               newWorker.addEventListener('statechange', () => {
                   if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                       console.log('Nova atualização instalada e pronta.');
                   }
               });
           }
        });
      })
      .catch(err => {
        console.error('Falha no registro do SW:', err);
      });
  });

  // Listener CRÍTICO para Atualização Suave:
  // Quando o usuário clicar em "Atualizar" no modal, o SW enviará skipWaiting.
  // Isso troca o controlador. Detectamos aqui e recarregamos a página.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
