import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // Importante para previews que não rodam na raiz do domínio
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Permite acesso de IPs externos (essencial para ambientes Cloud/Docker)
      cors: true,      // Habilita CORS para o servidor de desenvolvimento
      allowedHosts: true // Permite qualquer host (evita bloqueio de domínio do preview)
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN),
      'process.env': {}
    }
  };
});