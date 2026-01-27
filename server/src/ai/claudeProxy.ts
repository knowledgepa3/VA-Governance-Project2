/**
 * Claude API Proxy
 *
 * Server-side proxy for Claude API calls with:
 * - API key protection (never exposed to client)
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
 */
const ALLOWED_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229'
];

/**
 * Max tokens per model
 */
const MAX_TOKENS: Record<string, number> = {
  'claude-3-5-sonnet-20241022': 8192,
  'claude-3-5-haiku-20241022': 4096,
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
 * Request body schema
 */
interface ChatRequest {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  userMessage: string;
  purpose?: string;       // Why this request is being made
  policyTags?: string[];  // Policy tags for governance
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

  const { model, maxTokens, systemPrompt, userMessage, purpose, policyTags } = req.body as ChatRequest;

  // Validate model
  if (!ALLOWED_MODELS.includes(model)) {
    log.warn('Model not allowed', { model, userId: authReq.userId });
    res.status(400).json({ error: 'Model not allowed', code: 'MODEL_NOT_ALLOWED' });
    return;
  }

  // Enforce max tokens
  const effectiveMaxTokens = Math.min(maxTokens, MAX_TOKENS[model] || 4096);

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

  try {
    // Audit: Request created
    // CRITICAL: Never log raw prompts - use fingerprints
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
        systemPromptFingerprint: fingerprint(systemPrompt),
        systemPromptLength: systemPrompt.length,
        userMessageFingerprint: fingerprint(userMessage),
        userMessageLength: userMessage.length
      }
    );

    log.info('Claude request started', {
      agentRunId,
      model,
      maxTokens: effectiveMaxTokens,
      purpose
    });

    // Make Claude API call
    const response = await anthropic.messages.create({
      model,
      max_tokens: effectiveMaxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const duration = Date.now() - startTime;

    // Extract text content
    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

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
        responseFingerprint: fingerprint(textContent.text),
        responseLength: textContent.text.length,
        durationMs: duration,
        stopReason: response.stop_reason
      }
    );

    log.info('Claude request completed', {
      agentRunId,
      durationMs: duration,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    });

    res.json({
      content: textContent.text,
      model: response.model,
      usage: response.usage,
      agentRunId,
      correlationId: ctx?.correlationId
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    log.error('Claude request failed', {
      agentRunId,
      durationMs: duration
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
        durationMs: duration
      }
    ).catch(err => {
      log.error('Failed to audit AI request failure', {}, err);
    });

    res.status(500).json({
      error: 'AI request failed',
      code: 'AI_ERROR',
      correlationId: ctx?.correlationId
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
