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
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('lucide-react')) return 'lucide';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('@google/genai')) return 'genai';
              return 'vendor';
            }
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN)
    }
  };
});