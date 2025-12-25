import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente (API Keys)
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Substitui process.env pelas variáveis reais durante o build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN),
      // Garante que o objeto process.env exista para evitar quebras em verificações legadas
      'process.env': {}
    }
  };
});