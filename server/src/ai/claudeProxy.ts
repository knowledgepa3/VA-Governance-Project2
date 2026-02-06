/**
 * Claude API Proxy
 *
 * Server-side proxy for Claude API calls with:
 * - API key protection (never exposed to client)
 * - Multi-turn conversation support
 * - Tool use / function calling pass-through
 * - Request/response audit logging
 * - PII fingerprinting (not logging raw content)
 * - Rate limiting
 * - Correlation ID tracking
 *
 * CRITICAL: All AI calls MUST go through this proxy.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Request, Response, Router } from 'express';
import { logger, getCurrentContext, updateContext } from '../logger';
import { auditService } from '../audit/auditService';
import { fingerprint, generateUUID } from '../utils/crypto';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';

const log = logger.child({ component: 'ClaudeProxy' });

// Initialize Claude client with server-side API key
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const anthropic = new Anthropic({ apiKey });

/**
 * Allowed models (whitelist)
 * Updated 2025-06 to include current generation models
 */
const ALLOWED_MODELS = [
  // Current generation
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-haiku-20241022',
  // Legacy (backward compatibility)
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229'
];

/**
 * Max tokens per model
 */
const MAX_TOKENS: Record<string, number> = {
  'claude-sonnet-4-20250514': 16384,
  'claude-opus-4-20250514': 16384,
  'claude-3-5-haiku-20241022': 8192,
  'claude-3-5-sonnet-20241022': 8192,
  'claude-3-opus-20240229': 4096
};

/**
 * Rate limiting (simple in-memory)
 * In production, use Redis
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let limit = rateLimits.get(userId);

  if (!limit || limit.resetAt <= now) {
    limit = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimits.set(userId, limit);
  }

  if (limit.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, retryAfterMs: limit.resetAt - now };
  }

  limit.count++;
  return { allowed: true };
}

/**
 * Content block types (matches Anthropic SDK)
 */
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

/**
 * Request body schema — supports both single-turn and multi-turn conversations
 */
interface ChatRequest {
  // Required
  model: string;
  maxTokens: number;
  systemPrompt: string;

  // Single-turn (backward compatible)
  userMessage?: string;

  // Multi-turn conversation (takes priority over userMessage when provided)
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
  }>;

  // Tool use support
  tools?: Array<{
    name: string;
    description: string;
    input_schema: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  }>;

  // Generation parameters
  temperature?: number;
  stopSequences?: string[];

  // Governance metadata (for audit, not sent to Anthropic)
  purpose?: string;
  policyTags?: string[];
  correlationId?: string;
  role?: string;       // Agent role for audit attribution
  caseId?: string;     // Case ID for cost attribution
}

/**
 * Handle chat request
 */
async function handleChatRequest(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const agentRunId = generateUUID();

  // Add agent run ID to context
  updateContext({ agentRunId });

  const ctx = getCurrentContext();
  const startTime = Date.now();

  const body = req.body as ChatRequest;
  const {
    model,
    maxTokens,
    systemPrompt,
    userMessage,
    messages,
    tools,
    temperature,
    stopSequences,
    purpose,
    policyTags,
    correlationId,
    role: agentRole,
    caseId
  } = body;

  // Validate required fields
  if (!model || !systemPrompt || (!userMessage && (!messages || messages.length === 0))) {
    res.status(400).json({
      error: 'Missing required fields: model, systemPrompt, and either userMessage or messages[]',
      code: 'VALIDATION_ERROR'
    });
    return;
  }

  // Validate model
  if (!ALLOWED_MODELS.includes(model)) {
    log.warn('Model not allowed', { model, userId: authReq.userId });
    res.status(400).json({ error: `Model not allowed: ${model}`, code: 'MODEL_NOT_ALLOWED' });
    return;
  }

  // Enforce max tokens
  const effectiveMaxTokens = Math.min(maxTokens || 4096, MAX_TOKENS[model] || 4096);

  // Check rate limit
  const rateCheck = checkRateLimit(authReq.userId);
  if (!rateCheck.allowed) {
    log.warn('Rate limit exceeded', { userId: authReq.userId });
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfterMs: rateCheck.retryAfterMs
    });
    return;
  }

  // Build conversation messages — support both single-turn and multi-turn
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }> =
    messages && messages.length > 0
      ? messages
      : [{ role: 'user' as const, content: userMessage || '' }];

  try {
    // Audit: Request created
    // CRITICAL: Never log raw prompts - use fingerprints
    const messageFingerprints = conversationMessages.map(m => ({
      role: m.role,
      fingerprint: fingerprint(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)),
      length: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length
    }));

    await auditService.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      'AI_REQUEST_CREATED',
      { type: 'agent_run', id: agentRunId },
      {
        model,
        maxTokens: effectiveMaxTokens,
        purpose,
        policyTags,
        agentRole,
        caseId,
        systemPromptFingerprint: fingerprint(systemPrompt),
        systemPromptLength: systemPrompt.length,
        messageCount: conversationMessages.length,
        messageFingerprints,
        hasTools: !!(tools && tools.length > 0),
        toolCount: tools?.length || 0,
        correlationId: correlationId || ctx?.correlationId
      }
    );

    log.info('Claude request started', {
      agentRunId,
      model,
      maxTokens: effectiveMaxTokens,
      messageCount: conversationMessages.length,
      purpose,
      agentRole,
      caseId
    });

    // Build Anthropic API call parameters
    const createParams: Record<string, any> = {
      model,
      max_tokens: effectiveMaxTokens,
      system: systemPrompt,
      messages: conversationMessages
    };

    if (temperature !== undefined) createParams.temperature = temperature;
    if (stopSequences && stopSequences.length > 0) createParams.stop_sequences = stopSequences;
    if (tools && tools.length > 0) createParams.tools = tools;

    // Make Claude API call
    const response = await anthropic.messages.create(createParams as any);

    const duration = Date.now() - startTime;

    // Map content blocks for the response
    const contentBlocks = response.content.map((block: any) => {
      if (block.type === 'text') return { type: 'text', text: block.text };
      if (block.type === 'tool_use') return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
      return block;
    });

    // Extract primary text content
    const textBlock = response.content.find((c: any) => c.type === 'text');
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Audit: Response received
    // CRITICAL: Never log raw response - use fingerprints
    await auditService.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      'AI_RESPONSE_RECEIVED',
      { type: 'agent_run', id: agentRunId },
      {
        model: response.model,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        responseFingerprint: fingerprint(content),
        responseLength: content.length,
        contentBlockCount: contentBlocks.length,
        durationMs: duration,
        stopReason: response.stop_reason,
        agentRole,
        caseId
      }
    );

    log.info('Claude request completed', {
      agentRunId,
      durationMs: duration,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      stopReason: response.stop_reason
    });

    res.json({
      content,
      contentBlocks,
      stopReason: response.stop_reason,
      model: response.model,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0
      },
      agentRunId,
      correlationId: correlationId || ctx?.correlationId
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    log.error('Claude request failed', {
      agentRunId,
      durationMs: duration,
      agentRole,
      caseId
    }, error as Error);

    // Audit: Request blocked/failed
    await auditService.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      'AI_REQUEST_BLOCKED',
      { type: 'agent_run', id: agentRunId },
      {
        reason: (error as Error).message,
        durationMs: duration,
        agentRole,
        caseId
      }
    ).catch(err => {
      log.error('Failed to audit AI request failure', {}, err);
    });

    // Check for rate limit errors from Anthropic
    if (error instanceof Anthropic.APIError && error.status === 429) {
      const retryAfter = (error as any).headers?.['retry-after'];
      res.status(429).json({
        error: 'Anthropic rate limit exceeded',
        code: 'RATE_LIMIT',
        retryAfterMs: retryAfter ? parseInt(retryAfter, 10) * 1000 : 15000,
        correlationId: correlationId || ctx?.correlationId
      });
      return;
    }

    res.status(500).json({
      error: 'AI request failed',
      code: 'AI_ERROR',
      correlationId: correlationId || ctx?.correlationId
    });
  }
}

/**
 * Create router
 */
export function createClaudeProxyRouter(): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // Chat endpoint
  router.post('/chat', handleChatRequest);

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy', models: ALLOWED_MODELS });
  });

  return router;
}

export default createClaudeProxyRouter;
