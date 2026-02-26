import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de .env local (apenas desenvolvimento)
  const env = loadEnv(mode, '.', '');
  
  return {
    base: './',
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts'; 
              if (id.includes('@supabase')) return 'vendor-supabase'; 
              if (id.includes('lucide-react')) return 'vendor-lucide'; 
              return 'vendor-core';
            }
          },
        },
      },
    },
    define: {
      // Prioridade: 
      // 1. process.env (Ambiente de Build/Vercel) 
      // 2. env.VARIAVEL (.env local carregado pelo loadEnv)
      // Isso garante que o token definido no dashboard da Vercel seja pego.
      'process.env.BRAPI_TOKEN': JSON.stringify(process.env.BRAPI_TOKEN || env.BRAPI_TOKEN || env.VITE_BRAPI_TOKEN || ''),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || env.SUPABASE_KEY || env.VITE_SUPABASE_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '')
    }
  };
});