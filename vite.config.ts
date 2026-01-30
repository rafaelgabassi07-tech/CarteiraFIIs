
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de .env, .env.local, etc.
  const env = loadEnv(mode, '.', '');
  
  return {
    base: './', // Garante caminhos relativos corretos
    plugins: [react()],
    server: {
      host: true, // Escuta em todos os IPs
      port: 5173,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true,
      // Estratégia de code-splitting para otimizar o carregamento
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Separa as bibliotecas mais pesadas (vendors) em chunks dedicados.
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-recharts'; 
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase'; 
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide'; 
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
    define: {
      // Injeção segura de variáveis de ambiente
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN || env.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN || ''),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '')
    }
  };
});
