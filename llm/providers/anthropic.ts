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
    // Explicit model override takes priority over tier-based selection
    const model = options?.modelOverride || this.getModelForTier(tier);
    const maxTokens = options?.maxTokens ?? this.config.defaultMaxTokens ?? 4096;

    // Retry configuration for rate limit (429) and overloaded (529) errors
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 15000; // 15s base — Anthropic rate limits are per-minute

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Separate system message from conversation
        const systemMsg = messages.find(m => m.role === 'system');
        const systemPrompt = options?.systemPrompt ||
          (systemMsg ? (typeof systemMsg.content === 'string' ? systemMsg.content : undefined) : undefined);

        const conversationMessages = messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));

        const createParams: any = {
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: conversationMessages,
          temperature: options?.temperature,
          stop_sequences: options?.stopSequences
        };

        // Pass through tools if provided
        if (options?.tools && options.tools.length > 0) {
          createParams.tools = options.tools;
        }

        if (attempt > 0) {
          console.log(`[Anthropic] Retry attempt ${attempt}/${MAX_RETRIES} for model ${model}`);
        }

        const response = await this.client.messages.create(createParams);

        const latencyMs = Date.now() - startTime;

        // Extract text content
        const textContent = response.content.find(c => c.type === 'text');
        const content = textContent?.type === 'text' ? textContent.text : '';

        // Map raw content blocks to our ContentBlock type
        const contentBlocks = response.content.map((block: any) => {
          if (block.type === 'text') return { type: 'text' as const, text: block.text };
          if (block.type === 'tool_use') return { type: 'tool_use' as const, id: block.id, name: block.name, input: block.input };
          return block;
        });

        return {
          content,
          contentBlocks,
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
        if (error instanceof Anthropic.APIError) {
          const isRetryable = error.status === 429 || error.status === 503 || error.status === 529;

          // Retry with exponential backoff for rate limit / overloaded errors
          if (isRetryable && attempt < MAX_RETRIES) {
            // Extract retry-after header if available, otherwise use exponential backoff
            const retryAfterHeader = (error as any).headers?.['retry-after'];
            const retryAfterMs = retryAfterHeader
              ? parseInt(retryAfterHeader, 10) * 1000
              : BASE_DELAY_MS * Math.pow(2, attempt); // 15s, 30s, 60s

            console.warn(
              `[Anthropic] Rate limit hit (${error.status}) for ${model}. ` +
              `Waiting ${Math.round(retryAfterMs / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}...`
            );

            await new Promise(resolve => setTimeout(resolve, retryAfterMs));
            continue; // Retry the loop
          }

          // Out of retries or non-retryable error
          throw new LLMProviderError(
            error.message,
            this.providerType,
            error.status?.toString() ?? 'UNKNOWN',
            isRetryable,
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

    // Should never reach here, but TypeScript needs it
    throw new LLMProviderError('Max retries exceeded', this.providerType, '429', true);
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
      case 'tool_use':
        return 'tool_use';
      default:
        return 'end_turn';
    }
  }
}
