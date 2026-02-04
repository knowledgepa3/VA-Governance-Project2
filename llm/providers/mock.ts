/**
 * Mock LLM Provider
 *
 * Provides deterministic responses for testing and demo mode.
 * No external API calls are made.
 *
 * Usage:
 *   const provider = new MockProvider({});
 *   const response = await provider.complete('Hello');
 */

import {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMMessage,
  CompletionOptions,
  CompletionResponse,
  HealthCheckResult,
  ModelTier
} from '../types';

export class MockProvider implements LLMProvider {
  readonly providerType = LLMProviderType.MOCK;
  readonly displayName = 'Mock Provider (Demo/Testing)';

  private config: LLMProviderConfig;
  private latencyMs: number;

  constructor(config: LLMProviderConfig, options?: { latencyMs?: number }) {
    this.config = config;
    this.latencyMs = options?.latencyMs ?? 200; // Simulate realistic latency
  }

  getModelForTier(tier: ModelTier): string {
    return tier === ModelTier.ADVANCED ? 'mock-advanced' : 'mock-fast';
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, this.latencyMs + Math.random() * 100));

    const lastMessage = messages[messages.length - 1];
    const content = this.generateMockResponse(lastMessage?.content ?? '', options);

    return {
      content,
      model: this.getModelForTier(options?.tier ?? ModelTier.ADVANCED),
      provider: this.providerType,
      usage: {
        inputTokens: this.estimateTokens(messages.map(m => m.content).join(' ')),
        outputTokens: this.estimateTokens(content),
        totalTokens: 0 // Will be calculated
      },
      stopReason: 'end_turn',
      latencyMs: this.latencyMs
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      healthy: true,
      provider: this.providerType,
      latencyMs: 50
    };
  }

  /**
   * Generate a contextually appropriate mock response
   */
  private generateMockResponse(prompt: string, options?: CompletionOptions): string {
    const promptLower = prompt.toLowerCase();

    // Behavioral integrity check
    if (promptLower.includes('behavioral integrity') || promptLower.includes('integrity scan')) {
      return JSON.stringify({
        resilient: true,
        integrity_score: 98 + Math.floor(Math.random() * 3),
        anomaly_detected: null
      });
    }

    // Supervisor check
    if (promptLower.includes('behavioral validation') || promptLower.includes('supervisor')) {
      return JSON.stringify({
        healthy: true,
        issues: []
      });
    }

    // RFP Analysis
    if (promptLower.includes('rfp') || promptLower.includes('solicitation')) {
      return JSON.stringify({
        ace_compliance_status: 'PASSED',
        analysis_complete: true,
        requirements_extracted: 5,
        compliance_score: 92
      });
    }

    // Default structured response
    return JSON.stringify({
      ace_compliance_status: 'PASSED',
      timestamp: new Date().toISOString(),
      governance_verified: true,
      mock_response: true,
      analysis_complete: true
    });
  }

  /**
   * Rough token estimation (4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
