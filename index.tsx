
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// O registro do Service Worker agora é gerenciado pelo hook useUpdateManager dentro do App.tsx
// Isso garante que a UI reaja corretamente aos estados do ciclo de vida do SW.

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
