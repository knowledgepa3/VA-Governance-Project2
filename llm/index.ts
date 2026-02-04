/**
 * LLM Provider Abstraction Layer
 *
 * This module provides vendor-agnostic LLM access for the ACE platform.
 *
 * Key Benefits:
 * - Single interface for all LLM providers
 * - Environment-driven provider selection
 * - FedRAMP-ready architecture (Bedrock, Azure Gov stubs ready)
 * - No code changes needed to switch providers
 *
 * Usage:
 *   import { getLLMProvider, ModelTier } from './llm';
 *
 *   const llm = getLLMProvider();
 *   const response = await llm.complete('Analyze this...', {
 *     tier: ModelTier.ADVANCED,
 *     maxTokens: 4096
 *   });
 *
 * Environment Variables:
 *   LLM_PROVIDER - Override provider (anthropic, bedrock, azure, mock)
 *   ACE_DEMO_MODE - If 'true', use mock provider
 *   ANTHROPIC_API_KEY - For direct Anthropic API
 *   AWS_BEDROCK_REGION - For AWS Bedrock (GovCloud)
 *   AZURE_OPENAI_ENDPOINT - For Azure OpenAI
 *
 * Architecture Note:
 *   Governance (MAI) happens BEFORE this layer.
 *   This layer is purely for model invocation.
 *
 * @module llm
 */

// Types
export {
  LLMProviderType,
  ModelTier,
  LLMProvider,
  LLMProviderConfig,
  LLMProviderError,
  LLMMessage,
  CompletionOptions,
  CompletionResponse,
  HealthCheckResult,
  TokenUsage
} from './types';

// Factory (primary entry point)
export {
  getLLMProvider,
  getProviderByType,
  getAvailableProviders,
  resetProvider
} from './factory';

// Individual providers (for direct instantiation if needed)
export { AnthropicProvider } from './providers/anthropic';
export { BedrockProvider } from './providers/bedrock';
export { AzureOpenAIProvider } from './providers/azure';
export { MockProvider } from './providers/mock';
