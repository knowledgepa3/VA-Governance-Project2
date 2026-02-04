/**
 * Error Handler
 *
 * Centralized error handling for the ACE platform.
 * Provides consistent error processing, logging, and response formatting.
 */

import {
  AceError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  SerializedError,
  ERROR_HTTP_STATUS
} from './types';

// =============================================================================
// ERROR NORMALIZATION
// =============================================================================

/**
 * Convert any error to AceError
 */
export function normalizeError(error: unknown, context?: ErrorContext): AceError {
  // Already an AceError
  if (error instanceof AceError) {
    if (context) {
      return new AceError(error.message, error.code, {
        category: error.category,
        severity: error.severity,
        context: { ...error.context, ...context },
        retry: error.retry,
        details: error.details,
        cause: error.cause instanceof Error ? error.cause : undefined
      });
    }
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new AceError(error.message, ErrorCode.UNKNOWN_ERROR, {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.ERROR,
      context,
      cause: error
    });
  }

  // String error
  if (typeof error === 'string') {
    return new AceError(error, ErrorCode.UNKNOWN_ERROR, {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.ERROR,
      context
    });
  }

  // Unknown error type
  return new AceError('An unknown error occurred', ErrorCode.UNKNOWN_ERROR, {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    context,
    details: { originalError: String(error) }
  });
}

// =============================================================================
// ERROR LOGGING
// =============================================================================

export interface ErrorLogger {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, data?: Record<string, any>): void;
}

const defaultLogger: ErrorLogger = {
  debug: (msg, data) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg, data) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

let logger: ErrorLogger = defaultLogger;

/**
 * Set custom logger
 */
export function setErrorLogger(customLogger: ErrorLogger): void {
  logger = customLogger;
}

/**
 * Log an error with appropriate level
 */
export function logError(error: AceError): void {
  const logData = error.toLog();

  switch (error.severity) {
    case ErrorSeverity.INFO:
      logger.info(error.message, logData);
      break;
    case ErrorSeverity.WARNING:
      logger.warn(error.message, logData);
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.FATAL:
      logger.error(error.message, logData);
      break;
    default:
      logger.error(error.message, logData);
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

/**
 * Express error handling middleware
 */
export function errorMiddleware(
  err: Error,
  req: any,
  res: any,
  next: any
): void {
  // Extract request context
  const context: ErrorContext = {
    requestId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    operation: `${req.method} ${req.path}`
  };

  // Normalize to AceError
  const aceError = normalizeError(err, context);

  // Log the error
  logError(aceError);

  // Send response
  const status = aceError.httpStatus;
  const body: SerializedError = aceError.toJSON();

  // Don't expose internal details in production
  if (process.env.NODE_ENV === 'production') {
    delete body.details;
  }

  res.status(status).json({ error: body });
}

/**
 * Async route wrapper for Express
 * Catches async errors and passes to error middleware
 */
export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// ERROR RECOVERY
// =============================================================================

/**
 * Retry configuration
 */
export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryOn?: (error: AceError) => boolean;
  onRetry?: (error: AceError, attempt: number) => void;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBackoff: true
};

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: AceError | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = normalizeError(error);

      // Check if we should retry
      const shouldRetry =
        attempt <= opts.maxRetries &&
        lastError.isRetryable &&
        (!opts.retryOn || opts.retryOn(lastError));

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay
      let delay = opts.baseDelayMs;
      if (opts.exponentialBackoff) {
        delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs
        );
      }

      // Use retry-after if provided
      if (lastError.retry.retryAfterMs) {
        delay = lastError.retry.retryAfterMs;
      }

      // Callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// =============================================================================
// ERROR AGGREGATION
// =============================================================================

/**
 * Aggregate multiple errors into one
 */
export class AggregateError extends AceError {
  public readonly errors: AceError[];

  constructor(errors: AceError[], context?: ErrorContext) {
    const message = `Multiple errors occurred: ${errors.map(e => e.message).join('; ')}`;
    const mostSevere = errors.reduce((max, e) =>
      (e.severity > max.severity ? e : max), errors[0]);

    super(message, mostSevere.code, {
      category: mostSevere.category,
      severity: mostSevere.severity,
      context,
      details: { errorCount: errors.length }
    });

    this.name = 'AggregateError';
    this.errors = errors;
  }
}

/**
 * Collect errors from multiple operations
 */
export async function collectErrors<T>(
  operations: Array<() => Promise<T>>
): Promise<{ results: T[]; errors: AceError[] }> {
  const results: T[] = [];
  const errors: AceError[] = [];

  for (const op of operations) {
    try {
      results.push(await op());
    } catch (error) {
      errors.push(normalizeError(error));
    }
  }

  return { results, errors };
}

// =============================================================================
// ERROR REPORTING
// =============================================================================

export interface ErrorReport {
  timestamp: string;
  errorCount: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byCode: Record<string, number>;
  recentErrors: SerializedError[];
}

/**
 * Error collector for reporting
 */
export class ErrorCollector {
  private errors: AceError[] = [];
  private maxStoredErrors = 100;

  add(error: AceError): void {
    this.errors.push(error);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }
  }

  getReport(since?: Date): ErrorReport {
    const filtered = since
      ? this.errors.filter(e => e.timestamp >= since)
      : this.errors;

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byCode: Record<string, number> = {};

    for (const error of filtered) {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }

    return {
      timestamp: new Date().toISOString(),
      errorCount: filtered.length,
      byCategory: byCategory as Record<ErrorCategory, number>,
      bySeverity: bySeverity as Record<ErrorSeverity, number>,
      byCode,
      recentErrors: filtered.slice(-10).map(e => e.toJSON())
    };
  }

  clear(): void {
    this.errors = [];
  }
}

// Global error collector instance
export const errorCollector = new ErrorCollector();
