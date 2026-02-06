/**
 * LLM Provider Factory
 *
 * Single entry point for obtaining an LLM provider instance.
 * Reads configuration from environment and returns the appropriate provider.
 *
 * Architecture:
 * - Governance decisions happen in maiRuntime.ts BEFORE this layer
 * - This layer handles model invocation only
 * - Provider selection is config-driven, not code-driven
 *
 * Usage:
 *   import { getLLMProvider } from './llm';
 *   const llm = getLLMProvider();
 *   const response = await llm.complete('Analyze this data...');
 */

import {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  ModelTier
} from './types';

import { AnthropicProvider } from './providers/anthropic';
import { AnthropicProxyProvider } from './providers/anthropicProxy';
import { BedrockProvider } from './providers/bedrock';
import { AzureOpenAIProvider } from './providers/azure';
import { MockProvider } from './providers/mock';

/**
 * Singleton provider instance
 */
let providerInstance: LLMProvider | null = null;

/**
 * Helper: read a Vite env var that works in BOTH Node.js and browser contexts.
 *
 * In Node.js (server / build scripts): process.env is available.
 * In Vite browser bundle: process.env does NOT exist — only import.meta.env
 * is populated (for VITE_* prefixed vars). We must check both.
 */
function env(key: string): string | undefined {
  // 1. Node.js / server-side
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  // 2. Vite browser bundle (import.meta.env.VITE_*)
  try {
    const val = (import.meta as any).env?.[key];
    if (val && val !== '' && val !== 'undefined') return val;
  } catch {
    // import.meta may not exist in some Node.js contexts
  }
  return undefined;
}

/**
 * Detect provider type from environment
 */
function detectProviderType(): LLMProviderType {
  // Check for demo mode first
  const demoMode = env('ACE_DEMO_MODE') === 'true' ||
    env('VITE_DEMO_MODE') === 'true';

  if (demoMode) {
    return LLMProviderType.MOCK;
  }

  // Check for specific provider override
  const providerOverride = env('LLM_PROVIDER') || env('VITE_LLM_PROVIDER');

  if (providerOverride) {
    switch (providerOverride.toLowerCase()) {
      case 'proxy':
      case 'anthropic_proxy':
        return LLMProviderType.ANTHROPIC_PROXY;
      case 'bedrock':
      case 'aws_bedrock':
        return LLMProviderType.AWS_BEDROCK;
      case 'azure':
      case 'azure_openai':
        return LLMProviderType.AZURE_OPENAI;
      case 'mock':
        return LLMProviderType.MOCK;
      case 'anthropic':
      case 'anthropic_direct':
      default:
        return LLMProviderType.ANTHROPIC_DIRECT;
    }
  }

  // Check for server proxy configuration — takes priority over direct API.
  // When VITE_API_SERVER_URL is set, route through backend server to keep
  // the API key server-side. This is the recommended production mode.
  if (env('VITE_API_SERVER_URL') || env('API_SERVER_URL')) {
    return LLMProviderType.ANTHROPIC_PROXY;
  }

  // Check for Bedrock configuration
  if (env('AWS_BEDROCK_REGION') || env('AWS_REGION')?.includes('gov')) {
    return LLMProviderType.AWS_BEDROCK;
  }

  // Check for Azure configuration
  if (env('AZURE_OPENAI_ENDPOINT')) {
    return LLMProviderType.AZURE_OPENAI;
  }

  // Default to direct Anthropic if API key present
  if (env('ANTHROPIC_API_KEY') || env('VITE_ANTHROPIC_API_KEY')) {
    return LLMProviderType.ANTHROPIC_DIRECT;
  }

  // Fallback to mock if nothing configured
  console.warn('[LLM Factory] No provider configured, falling back to mock mode');
  return LLMProviderType.MOCK;
}

/**
 * Build provider configuration from environment
 */
function buildConfig(providerType: LLMProviderType): LLMProviderConfig {
  const isBrowser = typeof window !== 'undefined';

  return {
    type: providerType,

    // API keys — env() handles both Node.js and browser (import.meta.env)
    apiKey: env('ANTHROPIC_API_KEY') || env('VITE_ANTHROPIC_API_KEY'),

    // AWS Bedrock
    awsRegion: env('AWS_BEDROCK_REGION') || env('AWS_REGION') || 'us-gov-west-1',

    // Azure OpenAI
    azureEndpoint: env('AZURE_OPENAI_ENDPOINT'),

    // Defaults
    defaultTier: ModelTier.ADVANCED,
    defaultMaxTokens: 4096,

    // Browser mode (needed for client-side Anthropic calls)
    dangerouslyAllowBrowser: isBrowser,

    // Server proxy URL (for ANTHROPIC_PROXY provider)
    serverUrl: env('VITE_API_SERVER_URL') || env('API_SERVER_URL'),

    // Logging
    enableLogging: env('LOG_LEVEL') === 'debug'
  };
}

/**
 * Create a provider instance based on type
 */
function createProvider(providerType: LLMProviderType, config: LLMProviderConfig): LLMProvider {
  switch (providerType) {
    case LLMProviderType.ANTHROPIC_DIRECT:
      return new AnthropicProvider(config);

    case LLMProviderType.ANTHROPIC_PROXY:
      return new AnthropicProxyProvider(config);

    case LLMProviderType.AWS_BEDROCK:
      return new BedrockProvider(config);

    case LLMProviderType.AZURE_OPENAI:
      return new AzureOpenAIProvider(config);

    case LLMProviderType.MOCK:
    default:
      return new MockProvider(config);
  }
}

/**
 * Get the LLM provider instance (singleton)
 *
 * This is the primary entry point for obtaining an LLM provider.
 * Provider type is determined by environment configuration.
 *
 * @param forceNew - If true, create a new instance instead of returning cached
 */
export function getLLMProvider(forceNew: boolean = false): LLMProvider {
  if (providerInstance && !forceNew) {
    return providerInstance;
  }

  const providerType = detectProviderType();
  const config = buildConfig(providerType);

  providerInstance = createProvider(providerType, config);

  // Log provider selection (helpful for debugging)
  console.log(`[LLM Factory] Provider initialized: ${providerInstance.displayName}`);

  return providerInstance;
}

/**
 * Get a specific provider by type (for testing or explicit selection)
 */
export function getProviderByType(
  providerType: LLMProviderType,
  configOverrides?: Partial<LLMProviderConfig>
): LLMProvider {
  const baseConfig = buildConfig(providerType);
  const config = { ...baseConfig, ...configOverrides, type: providerType };

  return createProvider(providerType, config);
}

/**
 * Check which providers are available/configured
 */
export function getAvailableProviders(): { type: LLMProviderType; configured: boolean; displayName: string }[] {
  const hasAnthropicKey = !!(env('ANTHROPIC_API_KEY') || env('VITE_ANTHROPIC_API_KEY'));
  const hasServerProxy = !!(env('VITE_API_SERVER_URL') || env('API_SERVER_URL'));
  const hasBedrockConfig = !!(env('AWS_BEDROCK_REGION') || env('AWS_REGION')?.includes('gov'));
  const hasAzureConfig = !!env('AZURE_OPENAI_ENDPOINT');

  return [
    {
      type: LLMProviderType.ANTHROPIC_PROXY,
      configured: hasServerProxy,
      displayName: 'Anthropic Claude (Server Proxy)'
    },
    {
      type: LLMProviderType.ANTHROPIC_DIRECT,
      configured: hasAnthropicKey,
      displayName: 'Anthropic Claude (Direct API)'
    },
    {
      type: LLMProviderType.AWS_BEDROCK,
      configured: hasBedrockConfig,
      displayName: 'AWS Bedrock (FedRAMP High)'
    },
    {
      type: LLMProviderType.AZURE_OPENAI,
      configured: hasAzureConfig,
      displayName: 'Azure OpenAI (FedRAMP High)'
    },
    {
      type: LLMProviderType.MOCK,
      configured: true,
      displayName: 'Mock Provider (Demo/Testing)'
    }
  ];
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetProvider(): void {
  providerInstance = null;
}
