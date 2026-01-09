
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
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
            // Isso melhora o cache do navegador, já que essas bibliotecas mudam com menos frequência que o código da aplicação.
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-recharts'; // Chunk específico para a biblioteca de gráficos
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase'; // Chunk para o Supabase client
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide'; // Chunk para a biblioteca de ícones
              }
              // Agrupa o restante das dependências em um chunk genérico
              return 'vendor-core';
            }
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      'process.env.BRAPI_TOKEN': JSON.stringify(env.BRAPI_TOKEN || env.VITE_BRAPI_TOKEN),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || env.VITE_SUPABASE_KEY)
    }
  };
});
