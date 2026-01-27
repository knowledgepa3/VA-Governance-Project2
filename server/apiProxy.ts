/**
 * Backend API Proxy for ACE Governance Platform
 *
 * This is an example backend server that:
 * - Keeps API keys secure (never sent to browser)
 * - Validates session tokens
 * - Enforces rate limiting
 * - Logs all requests for audit
 *
 * Deploy this to your backend (Express, Fastify, etc.)
 * The frontend calls this instead of Claude directly.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash, randomUUID } from 'crypto';

// Types
interface SessionPayload {
  sessionId: string;
  userId: string;
  userRole: string;
  exp: number;
}

interface ChatRequest {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  userMessage: string;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

// Configuration
const CONFIG = {
  // API key from environment - NEVER expose to frontend
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,

  // JWT secret for session validation
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',

  // Rate limiting
  rateLimit: {
    tokensPerMinute: 20,
    burstLimit: 5
  },

  // Allowed models
  allowedModels: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
  ],

  // Max token limits per model
  maxTokenLimits: {
    'claude-3-5-sonnet-20241022': 8192,
    'claude-3-5-haiku-20241022': 4096,
    'claude-3-opus-20240229': 4096
  } as Record<string, number>
};

// Validate configuration
if (!CONFIG.anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

// Initialize Claude client (server-side only)
const anthropic = new Anthropic({
  apiKey: CONFIG.anthropicApiKey
});

// Rate limiting
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(userId);

  if (!bucket) {
    bucket = {
      tokens: CONFIG.rateLimit.tokensPerMinute,
      lastRefill: now
    };
    rateLimitBuckets.set(userId, bucket);
  }

  // Refill tokens
  const elapsed = now - bucket.lastRefill;
  const refillRate = CONFIG.rateLimit.tokensPerMinute / 60000;
  const tokensToAdd = Math.floor(elapsed * refillRate);

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      CONFIG.rateLimit.tokensPerMinute + CONFIG.rateLimit.burstLimit,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }

  // Check if request allowed
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate);
  return { allowed: false, retryAfterMs };
}

// Session validation (simplified - use proper JWT in production)
function validateSession(token: string): SessionPayload | null {
  try {
    // In production, use proper JWT verification
    // This is a simplified example
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    // Check expiration
    if (decoded.exp < Date.now()) {
      return null;
    }

    return decoded as SessionPayload;
  } catch {
    return null;
  }
}

// Audit logging
interface AuditLog {
  timestamp: string;
  requestId: string;
  userId: string;
  userRole: string;
  action: string;
  model: string;
  tokensUsed?: number;
  success: boolean;
  error?: string;
  correlationId?: string;
}

const auditLogs: AuditLog[] = [];

function logAudit(log: AuditLog) {
  auditLogs.push(log);
  console.log('[AUDIT]', JSON.stringify(log));

  // In production, send to SIEM, database, etc.
}

// Input sanitization
function sanitizePrompt(text: string): string {
  // Remove potential injection patterns
  return text
    .slice(0, 100000) // Limit length
    .replace(/\x00/g, ''); // Remove null bytes
}

/**
 * Main API handler
 *
 * Example usage with Express:
 *
 * app.post('/api/claude/chat', async (req, res) => {
 *   const result = await handleChatRequest(
 *     req.headers.authorization,
 *     req.headers['x-correlation-id'],
 *     req.body
 *   );
 *   res.status(result.status).json(result.body);
 * });
 */
export async function handleChatRequest(
  authHeader: string | undefined,
  correlationId: string | undefined,
  body: ChatRequest
): Promise<{ status: number; body: any }> {
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  // Extract token
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    logAudit({
      timestamp,
      requestId,
      userId: 'unknown',
      userRole: 'unknown',
      action: 'CHAT_REQUEST',
      model: body.model || 'unknown',
      success: false,
      error: 'Missing authorization token',
      correlationId
    });

    return {
      status: 401,
      body: { error: 'Authorization required' }
    };
  }

  // Validate session
  const session = validateSession(token);
  if (!session) {
    logAudit({
      timestamp,
      requestId,
      userId: 'unknown',
      userRole: 'unknown',
      action: 'CHAT_REQUEST',
      model: body.model || 'unknown',
      success: false,
      error: 'Invalid or expired session',
      correlationId
    });

    return {
      status: 401,
      body: { error: 'Invalid or expired session' }
    };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(session.userId);
  if (!rateLimit.allowed) {
    logAudit({
      timestamp,
      requestId,
      userId: session.userId,
      userRole: session.userRole,
      action: 'CHAT_REQUEST',
      model: body.model || 'unknown',
      success: false,
      error: 'Rate limit exceeded',
      correlationId
    });

    return {
      status: 429,
      body: {
        error: 'Rate limit exceeded',
        retryAfterMs: rateLimit.retryAfterMs
      }
    };
  }

  // Validate model
  if (!CONFIG.allowedModels.includes(body.model)) {
    logAudit({
      timestamp,
      requestId,
      userId: session.userId,
      userRole: session.userRole,
      action: 'CHAT_REQUEST',
      model: body.model,
      success: false,
      error: 'Model not allowed',
      correlationId
    });

    return {
      status: 400,
      body: { error: `Model not allowed: ${body.model}` }
    };
  }

  // Validate max tokens
  const maxAllowed = CONFIG.maxTokenLimits[body.model] || 4096;
  const maxTokens = Math.min(body.maxTokens, maxAllowed);

  // Sanitize inputs
  const systemPrompt = sanitizePrompt(body.systemPrompt);
  const userMessage = sanitizePrompt(body.userMessage);

  try {
    // Make Claude API call
    const response = await anthropic.messages.create({
      model: body.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    // Extract text content
    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Log success
    logAudit({
      timestamp,
      requestId,
      userId: session.userId,
      userRole: session.userRole,
      action: 'CHAT_REQUEST',
      model: body.model,
      tokensUsed: response.usage?.output_tokens,
      success: true,
      correlationId
    });

    return {
      status: 200,
      body: {
        content: textContent.text,
        model: response.model,
        usage: response.usage
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logAudit({
      timestamp,
      requestId,
      userId: session.userId,
      userRole: session.userRole,
      action: 'CHAT_REQUEST',
      model: body.model,
      success: false,
      error: errorMessage,
      correlationId
    });

    return {
      status: 500,
      body: { error: 'API request failed' }
    };
  }
}

/**
 * Health check endpoint
 */
export function healthCheck(): { status: number; body: any } {
  return {
    status: 200,
    body: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Get audit logs (admin only)
 */
export function getAuditLogs(
  authHeader: string | undefined,
  limit: number = 100
): { status: number; body: any } {
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { status: 401, body: { error: 'Authorization required' } };
  }

  const session = validateSession(token);
  if (!session || session.userRole !== 'ISSO / ACE Architect') {
    return { status: 403, body: { error: 'Admin access required' } };
  }

  return {
    status: 200,
    body: {
      logs: auditLogs.slice(-limit),
      total: auditLogs.length
    }
  };
}

// Example Express server setup
/*
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  const result = healthCheck();
  res.status(result.status).json(result.body);
});

// Chat endpoint
app.post('/api/claude/chat', async (req, res) => {
  const result = await handleChatRequest(
    req.headers.authorization as string,
    req.headers['x-correlation-id'] as string,
    req.body
  );
  res.status(result.status).json(result.body);
});

// Audit logs (admin only)
app.get('/api/audit', (req, res) => {
  const result = getAuditLogs(
    req.headers.authorization as string,
    parseInt(req.query.limit as string) || 100
  );
  res.status(result.status).json(result.body);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ACE API Proxy running on port ${PORT}`);
});
*/

export default {
  handleChatRequest,
  healthCheck,
  getAuditLogs
};
