/**
 * Anthropic Server Proxy Provider
 *
 * Routes all LLM calls through the ACE backend server instead of calling
 * the Anthropic API directly from the browser. This keeps the API key
 * server-side where it belongs.
 *
 * Drop-in replacement for AnthropicProvider — implements the same LLMProvider
 * interface, same input/output contracts, same retry logic pattern.
 *
 * Activated when VITE_API_SERVER_URL is set in environment.
 *
 * Usage:
 *   const provider = new AnthropicProxyProvider({ serverUrl: 'http://localhost:3001' });
 *   const response = await provider.complete('Hello', { tier: ModelTier.ADVANCED });
 */

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
 * Model mapping — must match server whitelist in server/src/ai/claudeProxy.ts
 */
const PROXY_MODELS: Record<ModelTier, string> = {
  [ModelTier.ADVANCED]: 'claude-sonnet-4-20250514',
  [ModelTier.FAST]: 'claude-3-5-haiku-20241022'
};

/**
 * Helper to read env vars in both Node and browser contexts
 */
function env(key: string): string | undefined {
  // Browser (Vite)
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return val;
  } catch { /* not in Vite context */ }

  // Node
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
}

export class AnthropicProxyProvider implements LLMProvider {
  readonly providerType = LLMProviderType.ANTHROPIC_PROXY;
  readonly displayName = 'Anthropic Claude (Server Proxy)';

  private serverUrl: string;
  private authToken: string | null = null;
  private authTokenExpiry: number = 0;

  constructor(config: LLMProviderConfig & { serverUrl?: string }) {
    // Server URL: explicit config > env var > same origin > localhost fallback
    const configUrl = config.serverUrl || env('VITE_API_SERVER_URL') || env('API_SERVER_URL');
    if (configUrl) {
      this.serverUrl = configUrl.replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      // Same origin — nginx proxies /api/* to the backend
      this.serverUrl = window.location.origin;
    } else {
      this.serverUrl = 'http://localhost:3001';
    }
  }

  /**
   * Get the model identifier for a given tier
   */
  getModelForTier(tier: ModelTier): string {
    return PROXY_MODELS[tier] || PROXY_MODELS[ModelTier.ADVANCED];
  }

  /**
   * Auto-login to the backend server and cache the JWT token.
   * For prototype: uses operator ID from env vars.
   * For production: would use real auth flow (Login.gov, etc.)
   */
  private async getAuthToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 60s buffer)
    if (this.authToken && this.authTokenExpiry > now + 60000) {
      return this.authToken;
    }

    // Auth: email/password (validated against PostgreSQL users table)
    const operatorEmail = env('VITE_OPERATOR_EMAIL') || 'isso@example.com';
    const operatorPassword = env('VITE_OPERATOR_PASSWORD') || 'demo';

    try {
      const res = await fetch(`${this.serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: operatorEmail,
          password: operatorPassword
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `Auth failed: ${res.status}` }));
        throw new LLMProviderError(
          errBody.error || `Auth failed: ${res.status}`,
          this.providerType,
          'AUTH_FAILED',
          res.status >= 500 // Only retry on server errors
        );
      }

      const data = await res.json();
      this.authToken = data.token;
      // Default 1 hour expiry, or use server-provided value
      this.authTokenExpiry = now + ((data.expiresIn || 3600) * 1000);
      return this.authToken!;

    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      throw new LLMProviderError(
        `Cannot connect to ACE server at ${this.serverUrl}: ${error instanceof Error ? error.message : 'Network error'}`,
        this.providerType,
        'NETWORK_ERROR',
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate a completion from a single prompt
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * Generate a completion from a message history — routes through backend server
   */
  async chat(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    const startTime = Date.now();
    const tier = options?.tier ?? ModelTier.ADVANCED;
    const model = options?.modelOverride || this.getModelForTier(tier);
    const maxTokens = options?.maxTokens ?? 4096;

    // Separate system message from conversation (same logic as AnthropicProvider)
    const systemMsg = messages.find(m => m.role === 'system');
    const systemPrompt = options?.systemPrompt ||
      (systemMsg ? (typeof systemMsg.content === 'string' ? systemMsg.content : undefined) : undefined) || '';

    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    // Build request body matching server's ChatRequest interface
    const body: Record<string, any> = {
      model,
      maxTokens,
      systemPrompt,
      messages: conversationMessages,
    };

    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.stopSequences) body.stopSequences = options.stopSequences;
    if (options?.tools && options.tools.length > 0) body.tools = options.tools;

    // Governance metadata for server-side audit
    if (options?.metadata?.sessionId) body.correlationId = options.metadata.sessionId;
    if (options?.metadata?.agentRole) body.role = options.metadata.agentRole;

    // Retry with exponential backoff
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.getAuthToken();

        if (attempt > 0) {
          console.log(`[ProxyProvider] Retry attempt ${attempt}/${MAX_RETRIES} for model ${model}`);
        }

        const res = await fetch(`${this.serverUrl}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        // Handle 401 — token expired, re-auth and retry
        if (res.status === 401) {
          console.warn('[ProxyProvider] Auth token expired, re-authenticating...');
          this.authToken = null;
          this.authTokenExpiry = 0;
          if (attempt < MAX_RETRIES) continue;
        }

        // Handle 429 — rate limited
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          const delay = errData.retryAfterMs || BASE_DELAY_MS * Math.pow(2, attempt);

          if (attempt < MAX_RETRIES) {
            console.warn(
              `[ProxyProvider] Rate limited. Waiting ${Math.round(delay / 1000)}s ` +
              `before retry ${attempt + 1}/${MAX_RETRIES}...`
            );
            await new Promise(r => setTimeout(r, delay));
            continue;
          }

          throw new LLMProviderError(
            errData.error || 'Rate limit exceeded',
            this.providerType,
            '429',
            true
          );
        }

        // Handle other errors
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));

          // Retry on 5xx server errors
          if (res.status >= 500 && attempt < MAX_RETRIES) {
            console.warn(`[ProxyProvider] Server error ${res.status}, retrying...`);
            await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
            continue;
          }

          throw new LLMProviderError(
            errData.error || `Server returned ${res.status}`,
            this.providerType,
            errData.code || String(res.status),
            res.status >= 500
          );
        }

        // Parse successful response
        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        return {
          content: data.content || '',
          contentBlocks: data.contentBlocks,
          stopReason: this.mapStopReason(data.stopReason),
          model: data.model || model,
          provider: this.providerType,
          usage: data.usage ? {
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
          } : {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0
          },
          latencyMs
        };

      } catch (error) {
        // Don't wrap LLMProviderErrors
        if (error instanceof LLMProviderError) {
          if (attempt >= MAX_RETRIES || !error.retryable) throw error;
          await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }

        // Network errors — retry
        if (attempt < MAX_RETRIES) {
          console.warn(`[ProxyProvider] Network error, retrying: ${error instanceof Error ? error.message : 'unknown'}`);
          await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }

        throw new LLMProviderError(
          error instanceof Error ? error.message : 'Network error',
          this.providerType,
          'NETWORK_ERROR',
          true,
          error instanceof Error ? error : undefined
        );
      }
    }

    // TypeScript safety — should never reach here
    throw new LLMProviderError('Max retries exceeded', this.providerType, 'MAX_RETRIES', true);
  }

  /**
   * Check if the provider is healthy — pings server health endpoint
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const res = await fetch(`${this.serverUrl}/api/ai/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        return {
          healthy: false,
          provider: this.providerType,
          latencyMs: Date.now() - startTime,
          error: `Server returned ${res.status}`
        };
      }

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
        error: `Cannot reach server at ${this.serverUrl}: ${error instanceof Error ? error.message : 'unknown'}`
      };
    }
  }

  /**
   * Map stop reasons to standard format
   */
  private mapStopReason(reason: string | null | undefined): CompletionResponse['stopReason'] {
    switch (reason) {
      case 'end_turn': return 'end_turn';
      case 'max_tokens': return 'max_tokens';
      case 'stop_sequence': return 'stop_sequence';
      case 'tool_use': return 'tool_use';
      default: return 'end_turn';
    }
  }
}
