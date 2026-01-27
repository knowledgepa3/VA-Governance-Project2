/**
 * Structured Logger with Correlation ID Support
 *
 * Ensures every log entry can be traced through the entire request lifecycle.
 * Correlation IDs propagate from request -> agent run -> audit -> response.
 *
 * CRITICAL: Correlation ID must be attached to EVERY log entry and audit event.
 */

import { Request, Response, NextFunction } from 'express';
import { generateUUID } from '../utils/crypto';
import { AsyncLocalStorage } from 'async_hooks';

// Async context for correlation tracking
const correlationContext = new AsyncLocalStorage<CorrelationContext>();

export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  agentRunId?: string;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'  // Special level - always logged, never filtered
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  agentRunId?: string;
  route?: string;
  msg: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Minimum log level (configurable via env)
const MIN_LEVEL = (process.env.LOG_LEVEL || 'INFO') as keyof typeof LOG_LEVEL_PRIORITY;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.AUDIT]: 99  // Always logged
};

/**
 * Get correlation ID from request header or generate new one
 */
export function getCorrelationId(req: Request): string {
  const headerValue = req.headers['x-correlation-id'];
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }
  return generateUUID();
}

/**
 * Get current correlation context from async storage
 */
export function getCurrentContext(): CorrelationContext | undefined {
  return correlationContext.getStore();
}

/**
 * Get current correlation ID (from context or generate new)
 */
export function getCurrentCorrelationId(): string {
  const ctx = getCurrentContext();
  return ctx?.correlationId || generateUUID();
}

/**
 * Run a function with correlation context
 * All logs within the function will automatically include correlation info
 */
export function withCorrelation<T>(
  ctx: Partial<CorrelationContext>,
  fn: () => T
): T {
  const fullCtx: CorrelationContext = {
    correlationId: ctx.correlationId || generateUUID(),
    requestId: ctx.requestId || generateUUID(),
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    tenantId: ctx.tenantId,
    agentRunId: ctx.agentRunId
  };

  return correlationContext.run(fullCtx, fn);
}

/**
 * Run an async function with correlation context
 */
export function withCorrelationAsync<T>(
  ctx: Partial<CorrelationContext>,
  fn: () => Promise<T>
): Promise<T> {
  const fullCtx: CorrelationContext = {
    correlationId: ctx.correlationId || generateUUID(),
    requestId: ctx.requestId || generateUUID(),
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    tenantId: ctx.tenantId,
    agentRunId: ctx.agentRunId
  };

  return correlationContext.run(fullCtx, fn);
}

/**
 * Update current context (e.g., add agentRunId after it's created)
 */
export function updateContext(updates: Partial<CorrelationContext>): void {
  const current = getCurrentContext();
  if (current) {
    Object.assign(current, updates);
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  msg: string,
  data?: Record<string, unknown>,
  error?: Error
): void {
  // Check log level (AUDIT always passes)
  if (level !== LogLevel.AUDIT) {
    const minPriority = LOG_LEVEL_PRIORITY[MIN_LEVEL] || 1;
    const currentPriority = LOG_LEVEL_PRIORITY[level];
    if (currentPriority < minPriority) {
      return;
    }
  }

  const ctx = getCurrentContext();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: ctx?.correlationId || 'NO_CORRELATION',
    requestId: ctx?.requestId,
    userId: ctx?.userId,
    sessionId: ctx?.sessionId,
    tenantId: ctx?.tenantId,
    agentRunId: ctx?.agentRunId,
    msg,
    data: data ? sanitizeLogData(data) : undefined,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : undefined
  };

  // Output as JSON for structured logging
  const output = JSON.stringify(entry);

  switch (level) {
    case LogLevel.ERROR:
    case LogLevel.AUDIT:
      console.error(output);
      break;
    case LogLevel.WARN:
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Sanitize log data to prevent PII/PHI leakage
 * CRITICAL: Never log raw sensitive data
 */
function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'key', 'authorization',
    'ssn', 'social', 'credit', 'card', 'account',
    'email', 'phone', 'address', 'dob', 'birthdate',
    'diagnosis', 'medication', 'medical', 'health',
    'prompt', 'message', 'content'  // AI prompts may contain PII
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();

    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_KEYS.some(sk => keyLower.includes(sk));

    if (isSensitive) {
      if (typeof value === 'string') {
        sanitized[key] = `[REDACTED:${value.length}chars]`;
      } else if (value !== null && value !== undefined) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger object with level-specific methods
 */
export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log(LogLevel.DEBUG, msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log(LogLevel.INFO, msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log(LogLevel.WARN, msg, data),
  error: (msg: string, data?: Record<string, unknown>, error?: Error) => log(LogLevel.ERROR, msg, data, error),
  audit: (msg: string, data?: Record<string, unknown>) => log(LogLevel.AUDIT, msg, data),

  /**
   * Create a child logger with preset context
   */
  child: (context: Record<string, unknown>) => ({
    debug: (msg: string, data?: Record<string, unknown>) =>
      log(LogLevel.DEBUG, msg, { ...context, ...data }),
    info: (msg: string, data?: Record<string, unknown>) =>
      log(LogLevel.INFO, msg, { ...context, ...data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      log(LogLevel.WARN, msg, { ...context, ...data }),
    error: (msg: string, data?: Record<string, unknown>, error?: Error) =>
      log(LogLevel.ERROR, msg, { ...context, ...data }, error),
    audit: (msg: string, data?: Record<string, unknown>) =>
      log(LogLevel.AUDIT, msg, { ...context, ...data })
  })
};

/**
 * Express middleware to set up correlation context
 */
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = getCorrelationId(req);
  const requestId = generateUUID();

  // Set response header for client tracing
  res.setHeader('x-correlation-id', correlationId);
  res.setHeader('x-request-id', requestId);

  // Extract user info if available (set by auth middleware)
  const userId = (req as any).userId;
  const sessionId = (req as any).sessionId;
  const tenantId = (req as any).tenantId;

  // Run rest of request in correlation context
  withCorrelationAsync(
    {
      correlationId,
      requestId,
      userId,
      sessionId,
      tenantId
    },
    async () => {
      logger.info('Request started', {
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent']
      });

      // Track response
      res.on('finish', () => {
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          contentLength: res.get('content-length')
        });
      });

      next();
    }
  ).catch(next);
}

export default logger;
