
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Registro Básico com estratégia de atualização rigorosa
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Constrói a URL absoluta para o service worker para evitar problemas de origem
    // em ambientes de desenvolvimento encapsulados, como o que causou o erro.
    const swUrl = new URL('sw.js', window.location.href).href;

    // updateViaCache: 'none' força o browser a checar o servidor pelo sw.js
    // em vez de usar o cache HTTP, garantindo que nossas regras de ciclo de vida
    // sejam aplicadas imediatamente.
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      .then(registration => {
        console.log('SW Registrado:', registration.scope);
      })
      .catch(err => {
        console.error('Falha no SW:', err);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);