
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // FIX: Replace process.cwd() with '.' to avoid typing issues with the `process` object.
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react()],
    // FIX: Expose VITE_API_KEY as process.env.API_KEY to comply with Gemini SDK guidelines.
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
    server: {
      host: '0.0.0.0',
      cors: true,
      allowedHosts: true
    }
  };
});