import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      allowedHosts: true
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN)
    }
  };
});