
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de .env, .env.local, etc.
  const env = loadEnv(mode, '.', '');
  
  // No Vercel/Node, as variáveis de sistema estão em process.env.
  // O loadEnv nem sempre pega variáveis de sistema que não estão em arquivos .env,
  // então fazemos um fallback explícito.
  const getEnvVar = (key: string, viteKey: string) => {
    return JSON.stringify(env[key] || process.env[key] || env[viteKey] || process.env[viteKey] || '');
  };

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
      'process.env.API_KEY': getEnvVar('API_KEY', 'VITE_API_KEY'),
      'process.env.BRAPI_TOKEN': getEnvVar('BRAPI_TOKEN', 'VITE_BRAPI_TOKEN'),
      'process.env.SUPABASE_URL': getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL'),
      'process.env.SUPABASE_KEY': getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_KEY')
    }
  };
});
