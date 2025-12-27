
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Registro Básico e Robusto
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        // O hook useUpdateManager irá monitorar 'updatefound' e 'waiting'
        // através deste registration object acessível via navigator.serviceWorker.getRegistration()
        console.log('SW Registrado com escopo:', registration.scope);
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
