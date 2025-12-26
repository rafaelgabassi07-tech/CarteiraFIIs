
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Workers removidos completamente nesta versão para garantir estabilidade
// em ambientes de desenvolvimento e preview.
// A limpeza residual é feita pelo script no <head> do index.html.

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
