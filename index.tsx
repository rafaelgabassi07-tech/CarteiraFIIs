import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// EMERGENCIA: Desregistrar qualquer Service Worker ativo para limpar o cache corrompido
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering SW to fix preview:', registration);
      registration.unregister();
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
    <App />
  </React.StrictMode>
);