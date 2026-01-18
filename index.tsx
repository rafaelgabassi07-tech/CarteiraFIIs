
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './services/logger';

// Inicializa o interceptador de logs
logger.init();

// Registro do Service Worker movido para o ponto de entrada principal.
// Isso garante que ele seja registrado o mais rápido possível,
// antes do React, resolvendo problemas de inicialização em mobile.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
        navigator.serviceWorker.register('./sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.warn('SW registration failed: ', registrationError);
          });
    } catch (e) {
        console.warn('SW registration error (likely environment restriction):', e);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
