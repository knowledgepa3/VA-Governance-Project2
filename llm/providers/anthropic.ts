/**
 * Anthropic Direct API Provider
 *
 * This provider wraps the direct Anthropic API for commercial/demo use.
 * For FedRAMP environments, use BedrockProvider instead.
 *
 * Usage:
 *   const provider = new AnthropicProvider({ apiKey: 'sk-ant-...' });
 *   const response = await provider.complete('Hello', { tier: ModelTier.ADVANCED });
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMProviderError,
  LLMMessage,
  CompletionOptions,
  CompletionResponse,
  HealthCheckResult,
  ModelTier
} from '../types';

/**
 * Model mapping for Anthropic
 */
const ANTHROPIC_MODELS: Record<ModelTier, string> = {
  [ModelTier.ADVANCED]: 'claude-sonnet-4-20250514',
  [ModelTier.FAST]: 'claude-sonnet-4-20250514' // Can switch to Haiku when cost optimization needed
};

export class AnthropicProvider implements LLMProvider {
  readonly providerType = LLMProviderType.ANTHROPIC_DIRECT;
  readonly displayName = 'Anthropic Claude (Direct API)';

  private client: Anthropic | null = null;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;

    if (config.apiKey) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: config.dangerouslyAllowBrowser ?? false
      });
    }
  }

  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Get the model identifier for a given tier
   */
  getModelForTier(tier: ModelTier): string {
    return ANTHROPIC_MODELS[tier] || ANTHROPIC_MODELS[ModelTier.ADVANCED];
  }

  /**
   * Generate a completion from a single prompt
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    return this.chat(
      [{ role: 'user', content: prompt }],
      options
    );
  }

  /**
   * Generate a completion from a message history
   */
  async chat(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    if (!this.client) {
      throw new LLMProviderError(
        'Anthropic client not configured. Provide an API key or enable demo mode.',
        this.providerType,
        'NOT_CONFIGURED',
        false
      );
    }

    const startTime = Date.now();
    const tier = options?.tier ?? this.config.defaultTier ?? ModelTier.ADVANCED;
    const model = this.getModelForTier(tier);
    const maxTokens = options?.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    try {
      // Separate system message from conversation
      const systemPrompt = options?.systemPrompt ||
        messages.find(m => m.role === 'system')?.content;

      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: conversationMessages,
        temperature: options?.temperature,
        stop_sequences: options?.stopSequences
      });

      const latencyMs = Date.now() - startTime;

      // Extract text content
      const textContent = response.content.find(c => c.type === 'text');
      const content = textContent?.type === 'text' ? textContent.text : '';

      return {
        content,
        model: response.model,
        provider: this.providerType,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        stopReason: this.mapStopReason(response.stop_reason),
        latencyMs
      };

    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Anthropic.APIError) {
        throw new LLMProviderError(
          error.message,
          this.providerType,
          error.status?.toString() ?? 'UNKNOWN',
          error.status === 429 || error.status === 503, // Retryable errors
          error
        );
      }

      throw new LLMProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerType,
        'UNKNOWN',
        false,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if the provider is healthy and reachable
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.client) {
      return {
        healthy: false,
        provider: this.providerType,
        error: 'Client not configured'
      };
    }

    const startTime = Date.now();

    try {
      // Minimal API call to verify connectivity
      await this.client.messages.create({
        model: ANTHROPIC_MODELS[ModelTier.FAST],
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      });

      return {
        healthy: true,
        provider: this.providerType,
        latencyMs: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        provider: this.providerType,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map Anthropic stop reasons to standard format
   */
  private mapStopReason(reason: string | null): CompletionResponse['stopReason'] {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'max_tokens':
        return 'max_tokens';
      case 'stop_sequence':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }
}
