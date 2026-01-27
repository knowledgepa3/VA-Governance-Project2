import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173, // Default Vite port
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
        'process.env.VITE_ANTHROPIC_API_KEY': JSON.stringify(env.VITE_ANTHROPIC_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Exclude Node.js-only packages from browser bundle
      optimizeDeps: {
        exclude: ['playwright', 'playwright-core', 'chromium-bidi']
      },
      // Multiple entry points
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index-landing.html'),
            bd: path.resolve(__dirname, 'bd.html'),
            va: path.resolve(__dirname, 'index.html')
          }
        }
      }
    };
});
