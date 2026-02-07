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
    // Read .env file, then overlay .env.local (local overrides take priority)
    const envPath = path.resolve(process.cwd(), '.env');
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    const env = { ...readEnvFile(envPath), ...readEnvFile(envLocalPath) };

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
      // Polyfill process.env for browser context — modules like auth/factory.ts
      // and ErrorBoundary reference process.env directly. We expose only safe
      // non-secret vars here; API keys come through import.meta.env.VITE_* natively.
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.VITE_MODE': JSON.stringify(mode),
        'process.env.AUTH_PROVIDER': JSON.stringify(env.AUTH_PROVIDER || ''),
        'process.env.VITE_AUTH_PROVIDER': JSON.stringify(env.VITE_AUTH_PROVIDER || ''),
        'process.env.ALLOW_MOCK_AUTH': JSON.stringify(env.ALLOW_MOCK_AUTH || ''),
        'process.env.AUTH0_DOMAIN': JSON.stringify(env.AUTH0_DOMAIN || ''),
        'process.env.AUTH0_CLIENT_ID': JSON.stringify(env.AUTH0_CLIENT_ID || ''),
        'process.env.AUTH0_CLIENT_SECRET': JSON.stringify(''),
        'process.env.AUTH0_AUDIENCE': JSON.stringify(env.AUTH0_AUDIENCE || ''),
        'process.env.LOGIN_GOV_CLIENT_ID': JSON.stringify(env.LOGIN_GOV_CLIENT_ID || ''),
        'process.env.LOGIN_GOV_ISSUER': JSON.stringify(env.LOGIN_GOV_ISSUER || ''),
        'process.env.LOGIN_GOV_PRIVATE_KEY': JSON.stringify(''),
        'process.env.LOGIN_GOV_ACR_VALUES': JSON.stringify(env.LOGIN_GOV_ACR_VALUES || ''),
        'process.env.AZURE_AD_TENANT_ID': JSON.stringify(env.AZURE_AD_TENANT_ID || ''),
        'process.env.AZURE_AD_CLIENT_ID': JSON.stringify(env.AZURE_AD_CLIENT_ID || ''),
        'process.env.AZURE_AD_CLIENT_SECRET': JSON.stringify(''),
        'process.env.OKTA_DOMAIN': JSON.stringify(env.OKTA_DOMAIN || ''),
        'process.env.OKTA_CLIENT_ID': JSON.stringify(env.OKTA_CLIENT_ID || ''),
        'process.env.OKTA_CLIENT_SECRET': JSON.stringify(''),
        'process.env.SESSION_EXPIRES_IN': JSON.stringify(env.SESSION_EXPIRES_IN || '86400'),
        'process.env.SESSION_REFRESH_ENABLED': JSON.stringify(env.SESSION_REFRESH_ENABLED || 'true'),
        'process.env.ALLOW_DEMO_IN_PRODUCTION': JSON.stringify(env.ALLOW_DEMO_IN_PRODUCTION || ''),
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
            portal: path.resolve(__dirname, 'portal.html'),
            main: path.resolve(__dirname, 'index-landing.html'),
            demo: path.resolve(__dirname, 'demo-landing.html'),
            onboarding: path.resolve(__dirname, 'onboarding.html'),
            console: path.resolve(__dirname, 'console.html'),
            bd: path.resolve(__dirname, 'bd.html'),
            va: path.resolve(__dirname, 'index.html'),
            login: path.resolve(__dirname, 'login.html')
          }
        }
      }
    };
});
