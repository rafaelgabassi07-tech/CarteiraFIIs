import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Permite acesso externo (necessário para containers)
      port: 5173,
      cors: true, // Habilita CORS permissivo padrão
      hmr: {
        overlay: false // Desabilita overlay de erro em tela cheia para não bloquear a UI em erros menores
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN)
    }
  };
});