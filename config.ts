/**
 * ACE Configuration Loader
 * Loads environment variables and provides typed configuration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Capture CLI-provided env vars BEFORE dotenv runs
// These take priority over .env file values
const cliProvidedVars: Record<string, string> = {};
const trackVars = ['ACE_DEMO_MODE', 'ACE_STRICT_MODE', 'ANTHROPIC_API_KEY', 'BD_MAX_PARALLEL_AGENTS', 'BD_HEADLESS_MODE'];
for (const key of trackVars) {
  // Only consider it "CLI-provided" if it has a non-empty value
  if (process.env[key] && process.env[key]!.trim() !== '') {
    cliProvidedVars[key] = process.env[key]!;
  }
}

// Load .env file with override to handle empty system env vars
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  // Use override: true to replace empty system env vars
  dotenv.config({ path: envPath, override: true });
} else {
  // Try parent directory
  const parentEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(parentEnvPath)) {
    dotenv.config({ path: parentEnvPath, override: true });
  }
}

// Load .env.local AFTER .env — local overrides take highest priority
// This matches Vite's env loading behavior (https://vite.dev/guide/env-and-mode)
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

// Restore CLI-provided values (they take final priority)
for (const [key, value] of Object.entries(cliProvidedVars)) {
  process.env[key] = value;
}

/**
 * Configuration object with typed properties
 * Uses getters to read env vars at access time (after dotenv loads)
 */
export const config = {
  // Anthropic API - getter ensures it reads AFTER dotenv loads
  get anthropicApiKey(): string {
    return process.env.ANTHROPIC_API_KEY || '';
  },

  // Demo mode - runs without API calls
  get demoMode(): boolean {
    return process.env.ACE_DEMO_MODE === 'true';
  },

  // Strict mode - fails on data source errors instead of falling back to mock data
  // Enterprise customers should enable this to ensure they always get real data
  get strictMode(): boolean {
    return process.env.ACE_STRICT_MODE === 'true';
  },

  // BD Workforce settings
  get bdMaxParallelAgents(): number {
    return parseInt(process.env.BD_MAX_PARALLEL_AGENTS || '5', 10);
  },

  get bdHeadlessMode(): boolean {
    return process.env.BD_HEADLESS_MODE !== 'false'; // default true
  },

  // SAM.gov API
  get samGovApiKey(): string {
    return process.env.SAM_GOV_API_KEY || '';
  },

  // Logging
  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  },

  // Company Profile Settings (for BD win probability calculations)
  get companyYearsInBusiness(): number {
    return parseInt(process.env.COMPANY_YEARS_IN_BUSINESS || '10', 10);
  },

  get companyHasPastPerformanceWithAgency(): boolean {
    return process.env.COMPANY_PAST_PERFORMANCE_WITH_AGENCY === 'true';
  },

  // Derived properties
  get hasAnthropicKey(): boolean {
    return this.anthropicApiKey.length > 0 && this.anthropicApiKey !== 'sk-ant-your-api-key-here';
  },

  get hasSamGovKey(): boolean {
    return this.samGovApiKey.length > 0;
  }
};

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  const env = process.env.NODE_ENV || '';
  return env.toLowerCase() === 'production';
}

/**
 * Validate configuration and print status
 *
 * SECURITY: In production, demo mode requires explicit override.
 */
export function validateConfig(): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];
  const inProduction = isProduction();

  // Check demo mode in production
  if (config.demoMode && inProduction) {
    if (process.env.ALLOW_DEMO_IN_PRODUCTION !== 'true') {
      issues.push('CRITICAL: Demo mode is enabled in production. This is not allowed without ALLOW_DEMO_IN_PRODUCTION=true.');
    } else {
      warnings.push('WARNING: Demo mode is ENABLED in production. This should only be for demonstrations.');
    }
  }

  // Check strict mode in production
  if (!config.strictMode && inProduction) {
    warnings.push('WARNING: Strict mode is disabled in production. Mock data fallbacks are allowed.');
    warnings.push('  Consider setting ACE_STRICT_MODE=true to ensure real data sources only.');
  }

  // Check API key
  if (!config.demoMode && !config.hasAnthropicKey) {
    issues.push('ANTHROPIC_API_KEY not set. Set ACE_DEMO_MODE=true for demo mode, or provide API key.');
  }

  // Check for placeholder API key
  if (config.anthropicApiKey === 'sk-ant-your-api-key-here') {
    issues.push('ANTHROPIC_API_KEY contains placeholder value. Please set a real API key.');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Print configuration status (for startup)
 */
export function printConfigStatus() {
  const validation = validateConfig();
  const inProduction = isProduction();

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    ACE CONFIGURATION                        │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  Environment: ${(inProduction ? 'PRODUCTION' : 'DEVELOPMENT').padEnd(46)}│`);

  if (config.demoMode) {
    console.log('│  Mode: DEMO (No API calls - simulated data)                │');
    if (inProduction) {
      console.log('│  ⚠️  WARNING: Demo mode in production!                     │');
    }
  } else if (config.hasAnthropicKey) {
    console.log('│  Mode: LIVE (Real API calls)                               │');
  } else {
    console.log('│  Mode: ERROR (No API key and not in demo mode)             │');
  }

  console.log(`│  Strict Mode: ${(config.strictMode ? 'YES (no mock fallbacks)' : 'No (mock fallbacks allowed)').padEnd(46)}│`);
  console.log(`│  Parallel Agents: ${config.bdMaxParallelAgents.toString().padEnd(42)}│`);
  console.log(`│  Headless Browser: ${(config.bdHeadlessMode ? 'Yes' : 'No (visible)').padEnd(41)}│`);
  console.log(`│  SAM.gov API: ${(config.hasSamGovKey ? 'Configured' : 'Not set').padEnd(46)}│`);
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Print warnings
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    validation.warnings.forEach(w => console.log(`   ${w}`));
  }

  // Print issues
  if (validation.issues.length > 0) {
    console.log('\n❌ Configuration Issues:');
    validation.issues.forEach(i => console.log(`   ${i}`));
  }

  console.log('');
}

export default config;
