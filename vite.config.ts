import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Manually read .env file since loadEnv can be finicky
function readEnvFile(envPath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (e) {
    console.warn('Could not read .env file:', e);
  }
  return result;
}

export default defineConfig(({ mode }) => {
    // Read .env file directly
    const envPath = path.resolve(process.cwd(), '.env');
    const env = readEnvFile(envPath);

    // SECURITY: API keys are read from .env via Vite's native VITE_ prefix mechanism.
    // They are NOT injected via 'define' to avoid hardcoding keys into the bundle.
    // In production, all LLM calls should route through the server proxy.
    console.log('Loading env from:', envPath);
    console.log('VITE_ANTHROPIC_API_KEY present:', !!env.VITE_ANTHROPIC_API_KEY);

    // Read VA API key for dev proxy only (not bundled into client)
    const vaApiKey = env.VITE_VA_API_KEY || '';

    return {
      server: {
        port: 5173, // Default Vite port
        host: '0.0.0.0',
        proxy: {
          // Proxy VA Lighthouse API calls to bypass CORS
          '/va-api': {
            target: 'https://sandbox-api.va.gov',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/va-api/, ''),
            headers: {
              'apikey': vaApiKey
            }
          }
        }
      },
      plugins: [react()],
      // SECURITY: Do NOT use 'define' to inject API keys — they end up as string
      // literals in the client bundle. Vite natively exposes VITE_* env vars
      // through import.meta.env, which is sufficient for development.
      // In production, the server proxy should handle all API calls.
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
            portal: path.resolve(__dirname, 'portal.html'),
            main: path.resolve(__dirname, 'index-landing.html'),
            demo: path.resolve(__dirname, 'demo-landing.html'),
            onboarding: path.resolve(__dirname, 'onboarding.html'),
            console: path.resolve(__dirname, 'console.html'),
            bd: path.resolve(__dirname, 'bd.html'),
            va: path.resolve(__dirname, 'index.html')
          }
        }
      }
    };
});
