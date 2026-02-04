/**
 * ACE Configuration - Browser Safe Version
 * Uses Vite's import.meta.env for environment variables
 *
 * SECURITY: Demo mode must be explicitly enabled.
 * Production deployments should never have VITE_DEMO_MODE=true.
 */

/**
 * Check if running in production mode
 */
function isProductionBuild(): boolean {
  const mode = (import.meta as any).env?.MODE || '';
  return mode === 'production';
}

/**
 * Configuration object with typed properties
 * Browser-safe: uses import.meta.env instead of process.env
 */
export const config = {
  // Anthropic API
  get anthropicApiKey(): string {
    // Vite exposes VITE_ prefixed env vars to the browser
    return (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '';
  },

  // Demo mode - runs without API calls
  // SECURITY: Must be explicitly enabled with VITE_DEMO_MODE=true
  // In production builds, demo mode requires VITE_ALLOW_DEMO_IN_PROD=true as well
  get demoMode(): boolean {
    const envValue = (import.meta as any).env?.VITE_DEMO_MODE;
    const demoRequested = envValue === 'true';

    // In production, require additional safeguard
    if (demoRequested && isProductionBuild()) {
      const allowDemoInProd = (import.meta as any).env?.VITE_ALLOW_DEMO_IN_PROD === 'true';
      if (!allowDemoInProd) {
        console.warn('[Config] WARNING: Demo mode requested in production build but VITE_ALLOW_DEMO_IN_PROD is not set.');
        console.warn('[Config] Demo mode will be DISABLED for security. Set VITE_ALLOW_DEMO_IN_PROD=true to override.');
        return false;
      }
      console.warn('[Config] WARNING: Demo mode is ENABLED in production build. This should only be used for demonstrations.');
    }

    return demoRequested;
  },

  // BD Workforce settings
  get bdMaxParallelAgents(): number {
    return parseInt((import.meta as any).env?.VITE_BD_MAX_PARALLEL_AGENTS || '5', 10);
  },

  get bdHeadlessMode(): boolean {
    return (import.meta as any).env?.VITE_BD_HEADLESS_MODE !== 'false';
  },

  // SAM.gov API
  get samGovApiKey(): string {
    return (import.meta as any).env?.VITE_SAM_GOV_API_KEY || '';
  },

  // Logging
  get logLevel(): string {
    return (import.meta as any).env?.VITE_LOG_LEVEL || 'info';
  },

  // Derived properties
  get hasAnthropicKey(): boolean {
    return this.anthropicApiKey.length > 0 && this.anthropicApiKey !== 'sk-ant-your-api-key-here';
  },

  get hasSamGovKey(): boolean {
    return this.samGovApiKey.length > 0;
  }
};

export default config;
