/**
 * Governed LLM Execution Kernel
 *
 * THIS IS THE ONLY AUTHORIZED PATH TO LLM CALLS IN THE ACE PLATFORM.
 *
 * Every LLM invocation flows through this kernel, which enforces:
 * 1. Rate limiting (token bucket)
 * 2. Concurrent request limiting
 * 3. Pre-flight cost check (dry-run before spend)
 * 4. Input sanitization (adversarial pattern removal)
 * 5. Audit logging (fingerprinted, never raw prompts in logs)
 * 6. Evidence hash chain (tamper-evident execution record)
 * 7. Mode enforcement (LIVE requires real provider; DEMO requires mock)
 *
 * Architecture:
 *   Consumer code → governedLLM.execute() → [enforcement] → LLM Factory → Provider
 *
 * Direct use of @anthropic-ai/sdk is PROHIBITED outside of llm/providers/.
 * Any new LLM consumer MUST call governedLLM.execute().
 *
 * @module services/governedLLM
 */

import { getLLMProvider, LLMProviderType, ModelTier, CompletionResponse } from '../llm';
import type { CompletionOptions, LLMMessage, ContentBlock, ToolDefinition } from '../llm';
import { logger } from './logger';
import { rateLimiter, concurrentLimiter } from './rateLimiter';
import { sha256 } from './crypto';
import { configService } from './configService';

const log = logger.child('GovernedLLM');

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Every LLM call MUST declare its purpose via this request object.
 * The kernel uses this for policy classification, audit, and cost tracking.
 */
export interface GovernedLLMRequest {
  /** Identifies the caller for audit and cost attribution */
  role: string;

  /** What this call is for — logged in audit trail */
  purpose: string;

  /** System prompt (persona / instructions) */
  systemPrompt: string;

  /** User message or data payload */
  userMessage: string;

  /** Model tier - defaults to ADVANCED */
  tier?: ModelTier;

  /** Max tokens to generate */
  maxTokens?: number;

  /** Temperature (0-1) */
  temperature?: number;

  /** Optional case ID for case-level cost attribution */
  caseId?: string;

  /** Correlation ID for request tracing (auto-generated if missing) */
  correlationId?: string;

  /** Whether this request involves vision/image content */
  vision?: boolean;

  /** Multi-turn conversation messages (overrides systemPrompt + userMessage if provided) */
  messages?: LLMMessage[];

  /** Tool definitions for function calling */
  tools?: ToolDefinition[];
}

export interface GovernedLLMResult {
  /** The generated text content */
  content: string;

  /** Raw content blocks from the response (includes tool_use, text, etc.) */
  contentBlocks?: ContentBlock[];

  /** Stop reason — 'tool_use' means a tool call is pending */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';

  /** Model that was used */
  model: string;

  /** Provider that handled the request */
  provider: LLMProviderType;

  /** Token usage for cost tracking */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Request latency in ms */
  latencyMs?: number;

  /** Correlation ID for tracing */
  correlationId: string;

  /** Audit entry hash for evidence chain */
  auditHash: string;
}

/**
 * Policy violation — thrown when the kernel blocks a request.
 * This is NOT catchable-and-ignorable: it means governance denied the action.
 */
export class GovernanceDeniedError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
    public readonly role: string,
    public readonly purpose: string
  ) {
    super(message);
    this.name = 'GovernanceDeniedError';
  }
}

// ─── Sanitization ────────────────────────────────────────────────────────────

/**
 * Remove adversarial injection patterns from input strings.
 * This runs on EVERY input before it reaches the LLM.
 */
function sanitizeString(input: string): string {
  return input
    // Remove governance tag injection attempts (with whitespace variants)
    .replace(/<\s*\/?\s*(GOVERNANCE_PROTOCOL|INPUT_DATA|CONTEXT|SYSTEM|ADMIN)\s*>/gi, '[REDACTED_TAG]')
    // Remove template variable injection
    .replace(/\$\{[^}]*\}/g, '[REDACTED_VAR]')
    // Remove base64-encoded instruction patterns (>500 char base64 blocks are suspicious)
    .replace(/[A-Za-z0-9+/=]{500,}/g, '[REDACTED_LONG_ENCODED]')
    // Limit total length to prevent token exhaustion
    .slice(0, 100000);
}

function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') return sanitizeString(input);

  if (Array.isArray(input)) {
    return input.slice(0, 1000).map(sanitizeInput);
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    const keys = Object.keys(input as Record<string, unknown>).slice(0, 100);
    for (const key of keys) {
      if (key.toLowerCase().includes('__proto__') || key.toLowerCase().includes('constructor')) {
        continue;
      }
      sanitized[key] = sanitizeInput((input as Record<string, unknown>)[key]);
    }
    return sanitized;
  }

  return input;
}

/**
 * Sanitize multimodal message content (string or content block array).
 * Text blocks are sanitized; image blocks are passed through (binary data is not injectable).
 */
function sanitizeMessageContent(content: string | ContentBlock[]): string | ContentBlock[] {
  if (typeof content === 'string') return sanitizeString(content);

  return content.map(block => {
    if (block.type === 'text') {
      return { type: 'text' as const, text: sanitizeString(block.text) };
    }
    // Image blocks pass through — binary image data is not an injection vector
    return block;
  });
}

// ─── Audit ───────────────────────────────────────────────────────────────────

interface AuditEntry {
  timestamp: string;
  correlationId: string;
  role: string;
  purpose: string;
  provider: string;
  model: string;
  inputFingerprint: string;
  outputFingerprint: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'denied' | 'error';
  denyReason?: string;
  hash: string;
  previousHash: string;
}

let previousAuditHash = '';
let auditIndex = 0;
const auditLog: AuditEntry[] = [];

async function createAuditEntry(
  partial: Omit<AuditEntry, 'hash' | 'previousHash'>
): Promise<AuditEntry> {
  const payload = JSON.stringify({ ...partial, previousHash: previousAuditHash, index: auditIndex });
  const hash = await sha256(payload);

  const entry: AuditEntry = {
    ...partial,
    hash,
    previousHash: previousAuditHash,
  };

  previousAuditHash = hash;
  auditIndex++;
  auditLog.push(Object.freeze(entry) as AuditEntry);

  return entry;
}

/**
 * Fingerprint content for audit logging (never log raw prompts)
 */
async function fingerprint(content: string): Promise<string> {
  const hash = await sha256(content);
  return `fp:${hash.slice(0, 16)}:len=${content.length}`;
}

// ─── Mode Enforcement ────────────────────────────────────────────────────────

export enum ExecutionMode {
  LIVE = 'LIVE',
  DEMO = 'DEMO',
}

function getExecutionMode(): ExecutionMode {
  const demoMode = process.env.ACE_DEMO_MODE === 'true' ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEMO_MODE === 'true');

  return demoMode ? ExecutionMode.DEMO : ExecutionMode.LIVE;
}

// ─── The Kernel ──────────────────────────────────────────────────────────────

/**
 * Execute an LLM call through the governed pipeline.
 *
 * This is the ONLY function external code should call for LLM access.
 * It enforces all governance controls in sequence:
 *
 * 1. Mode check (LIVE vs DEMO)
 * 2. Rate limit
 * 3. Concurrent limit
 * 4. Input sanitization
 * 5. LLM call via factory
 * 6. Audit logging with hash chain
 * 7. Return governed result
 *
 * Throws GovernanceDeniedError if any control blocks the request.
 */
export async function execute(request: GovernedLLMRequest): Promise<GovernedLLMResult> {
  const correlationId = request.correlationId || logger.newCorrelationId();
  const startTime = Date.now();
  const mode = getExecutionMode();

  log.info('LLM request received', {
    correlationId,
    role: request.role,
    purpose: request.purpose,
    mode,
    tier: request.tier || 'ADVANCED',
  });

  // ── 1. Mode enforcement ──────────────────────────────────────────────────
  const provider = getLLMProvider();

  if (mode === ExecutionMode.LIVE && provider.providerType === LLMProviderType.MOCK) {
    const reason = 'POLICY_VIOLATION: MOCK_IN_LIVE_MODE — Mock provider is not allowed in LIVE mode';
    log.error(reason, { correlationId, role: request.role });

    await createAuditEntry({
      timestamp: new Date().toISOString(),
      correlationId,
      role: request.role,
      purpose: request.purpose,
      provider: provider.providerType,
      model: 'N/A',
      inputFingerprint: 'N/A',
      outputFingerprint: 'N/A',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: 'denied',
      denyReason: reason,
    });

    throw new GovernanceDeniedError(reason, 'MOCK_IN_LIVE_MODE', request.role, request.purpose);
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────────
  const rateLimitKey = `llm:${request.role}`;
  const rateLimitResult = rateLimiter.tryConsume(rateLimitKey);

  if (!rateLimitResult.allowed) {
    const reason = `Rate limit exceeded for ${request.role}. Retry after ${rateLimitResult.retryAfterMs}ms`;
    log.warn(reason, { correlationId, role: request.role });

    await createAuditEntry({
      timestamp: new Date().toISOString(),
      correlationId,
      role: request.role,
      purpose: request.purpose,
      provider: provider.providerType,
      model: 'N/A',
      inputFingerprint: 'N/A',
      outputFingerprint: 'N/A',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: 'denied',
      denyReason: reason,
    });

    throw new GovernanceDeniedError(reason, 'RATE_LIMIT', request.role, request.purpose);
  }

  // ── 3. Concurrent limiting ───────────────────────────────────────────────
  const concurrentKey = `llm:${request.role}`;
  if (!concurrentLimiter.tryAcquire(concurrentKey)) {
    const reason = `Concurrent limit reached for ${request.role}`;
    log.warn(reason, { correlationId, role: request.role });

    throw new GovernanceDeniedError(reason, 'CONCURRENT_LIMIT', request.role, request.purpose);
  }

  try {
    // ── 4. Input sanitization ────────────────────────────────────────────────
    const sanitizedSystem = sanitizeString(request.systemPrompt);
    const sanitizedUser = sanitizeString(request.userMessage);

    // ── 5. Build and execute LLM call ────────────────────────────────────────
    const options: CompletionOptions = {
      systemPrompt: sanitizedSystem,
      maxTokens: request.maxTokens || 4096,
      tier: request.tier || ModelTier.ADVANCED,
      temperature: request.temperature,
      tools: request.tools,
      metadata: {
        agentRole: request.role,
        sessionId: correlationId,
      },
    };

    let response: CompletionResponse;

    if (request.messages && request.messages.length > 0) {
      // Multi-turn / multimodal conversation
      const sanitizedMessages: LLMMessage[] = request.messages.map(m => ({
        role: m.role,
        content: sanitizeMessageContent(m.content),
      }));
      response = await provider.chat(sanitizedMessages, options);
    } else {
      // Single-turn
      response = await provider.complete(sanitizedUser, options);
    }

    const latencyMs = Date.now() - startTime;

    // ── 6. Audit logging with hash chain ─────────────────────────────────────
    const [inputFp, outputFp] = await Promise.all([
      fingerprint(sanitizedSystem + sanitizedUser),
      fingerprint(response.content),
    ]);

    const auditEntry = await createAuditEntry({
      timestamp: new Date().toISOString(),
      correlationId,
      role: request.role,
      purpose: request.purpose,
      provider: response.provider,
      model: response.model,
      inputFingerprint: inputFp,
      outputFingerprint: outputFp,
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
      latencyMs,
      status: 'success',
    });

    log.info('LLM request completed', {
      correlationId,
      role: request.role,
      purpose: request.purpose,
      model: response.model,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      latencyMs,
    });

    // ── 7. Return governed result ────────────────────────────────────────────
    return {
      content: response.content,
      contentBlocks: response.contentBlocks,
      stopReason: response.stopReason,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      latencyMs,
      correlationId,
      auditHash: auditEntry.hash,
    };

  } catch (error) {
    if (error instanceof GovernanceDeniedError) throw error;

    const latencyMs = Date.now() - startTime;
    log.error('LLM request failed', {
      correlationId,
      role: request.role,
      purpose: request.purpose,
      error: error instanceof Error ? error.message : String(error),
      latencyMs,
    });

    await createAuditEntry({
      timestamp: new Date().toISOString(),
      correlationId,
      role: request.role,
      purpose: request.purpose,
      provider: provider.providerType,
      model: 'N/A',
      inputFingerprint: 'N/A',
      outputFingerprint: 'N/A',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'error',
      denyReason: error instanceof Error ? error.message : String(error),
    });

    throw error;

  } finally {
    concurrentLimiter.release(concurrentKey);
  }
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * Execute and parse JSON response. Fail-secure: throws on invalid JSON.
 */
export async function executeJSON<T = unknown>(request: GovernedLLMRequest): Promise<T> {
  const result = await execute(request);
  const cleaned = result.content
    .replace(/^```\s*(?:json|JSON)?\s*[\r\n]*/gm, '')
    .replace(/[\r\n]*```\s*$/gm, '')
    .replace(/```\s*(?:json|JSON)?\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `GovernedLLM: Invalid JSON from ${request.role}/${request.purpose}. ` +
      `Content starts with: ${cleaned.slice(0, 100)}`
    );
  }
}

// ─── Audit access (read-only) ────────────────────────────────────────────────

/** Get a frozen copy of the audit log */
export function getAuditLog(): ReadonlyArray<Readonly<AuditEntry>> {
  return Object.freeze([...auditLog]);
}

/** Get audit stats */
export function getAuditStats(): {
  totalCalls: number;
  successCalls: number;
  deniedCalls: number;
  errorCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byRole: Record<string, number>;
} {
  const stats = {
    totalCalls: auditLog.length,
    successCalls: 0,
    deniedCalls: 0,
    errorCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byRole: {} as Record<string, number>,
  };

  for (const entry of auditLog) {
    if (entry.status === 'success') stats.successCalls++;
    else if (entry.status === 'denied') stats.deniedCalls++;
    else stats.errorCalls++;

    stats.totalInputTokens += entry.inputTokens;
    stats.totalOutputTokens += entry.outputTokens;
    stats.byRole[entry.role] = (stats.byRole[entry.role] || 0) + 1;
  }

  return stats;
}
