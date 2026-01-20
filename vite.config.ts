
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de .env, .env.local, etc.
  const env = loadEnv(mode, '.', '');
  
  // Função helper para recuperar variáveis de ambiente com fallback
  // Prioridade:
  // 1. Sistema (process.env) - ex: Vercel Dashboard, CI/CD
  // 2. Arquivo .env (loadEnv)
  // Verifica primeiro a chave exata, depois a versão com VITE_
  const getEnvVar = (key: string, viteKey: string) => {
    const val = process.env[key] || env[key] || process.env[viteKey] || env[viteKey] || '';
    return JSON.stringify(val);
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
      // Polyfill para process.env e mapeamento das variáveis
      // Isso permite usar process.env.VAR no código cliente, independente de como foi definida (com ou sem VITE_)
      'process.env': {}, 
      'process.env.API_KEY': getEnvVar('API_KEY', 'VITE_API_KEY'),
      'process.env.BRAPI_TOKEN': getEnvVar('BRAPI_TOKEN', 'VITE_BRAPI_TOKEN'),
      'process.env.SUPABASE_URL': getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL'),
      'process.env.SUPABASE_KEY': getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_KEY')
    }
  };
});
