/**
 * LLM Provider Abstraction Layer - Type Definitions
 *
 * This module defines the contract for LLM providers, enabling:
 * - Vendor-agnostic agent orchestration
 * - Future deployment to FedRAMP-authorized environments (AWS Bedrock, Azure OpenAI)
 * - Governance controls applied BEFORE model invocation
 *
 * Architecture Note:
 * The abstraction sits between MAI governance and model execution.
 * Policy enforcement happens in maiRuntime.ts; this layer handles model calls only.
 */

/**
 * Supported LLM providers
 */
export enum LLMProviderType {
  /** Direct Anthropic API - Commercial/Demo use */
  ANTHROPIC_DIRECT = 'anthropic_direct',

  /** AWS Bedrock (Claude) - FedRAMP High via GovCloud */
  AWS_BEDROCK = 'aws_bedrock',

  /** Azure OpenAI (GPT-4) - FedRAMP High via Azure Gov */
  AZURE_OPENAI = 'azure_openai',

  /** Mock provider for testing/demo without API calls */
  MOCK = 'mock'
}

/**
 * Model capability tiers - used for routing complex vs simple tasks
 */
export enum ModelTier {
  /** High-capability model for complex reasoning (Claude Sonnet, GPT-4) */
  ADVANCED = 'advanced',

  /** Fast model for simple tasks (Claude Haiku, GPT-3.5) */
  FAST = 'fast'
}

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Content block for multimodal messages (text + images + tool use)
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

/**
 * Single message in a conversation.
 * content can be a plain string or an array of content blocks (for vision/multimodal/tool-use).
 */
export interface LLMMessage {
  role: MessageRole;
  content: string | ContentBlock[];
}

/**
 * Tool definition for function calling / tool use
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Options for completion requests
 */
export interface CompletionOptions {
  /** System prompt / persona */
  systemPrompt?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Model tier to use */
  tier?: ModelTier;

  /** Temperature (0-1, lower = more deterministic) */
  temperature?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Tool definitions for function calling */
  tools?: ToolDefinition[];

  /** Metadata for audit logging */
  metadata?: {
    agentRole?: string;
    workforceType?: string;
    sessionId?: string;
    operatorId?: string;
  };
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Completion response from any provider
 */
export interface CompletionResponse {
  /** The generated text (extracted from first text block) */
  content: string;

  /** Raw content blocks from the response (includes tool_use, text, etc.) */
  contentBlocks?: ContentBlock[];

  /** Stop reason — 'tool_use' indicates tool call pending */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';

  /** Model identifier used */
  model: string;

  /** Provider that handled the request */
  provider: LLMProviderType;

  /** Token usage for cost tracking */
  usage?: TokenUsage;

  /** Request latency in milliseconds */
  latencyMs?: number;
}

/**
 * Provider health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  provider: LLMProviderType;
  latencyMs?: number;
  error?: string;
}

/**
 * LLM Provider Interface
 *
 * All providers must implement this interface.
 * This is the contract that enables vendor-agnostic orchestration.
 */
export interface LLMProvider {
  /** Provider type identifier */
  readonly providerType: LLMProviderType;

  /** Human-readable provider name */
  readonly displayName: string;

  /**
   * Generate a completion from a single prompt
   */
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Generate a completion from a message history
   */
  chat(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Check if the provider is healthy and reachable
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get the model identifier for a given tier
   */
  getModelForTier(tier: ModelTier): string;
}

/**
 * Provider configuration
 */
export interface LLMProviderConfig {
  /** Provider type to use */
  type: LLMProviderType;

  /** API key (for direct API providers) */
  apiKey?: string;

  /** AWS region (for Bedrock) */
  awsRegion?: string;

  /** Azure endpoint (for Azure OpenAI) */
  azureEndpoint?: string;

  /** Default model tier */
  defaultTier?: ModelTier;

  /** Default max tokens */
  defaultMaxTokens?: number;

  /** Enable request/response logging */
  enableLogging?: boolean;

  /** Allow browser usage (for client-side calls) */
  dangerouslyAllowBrowser?: boolean;
}

/**
 * Error thrown by LLM providers
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderType,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}
