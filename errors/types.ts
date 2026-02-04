/**
 * ACE Error Types
 *
 * Standardized error handling for the ACE platform.
 * All errors extend AceError for consistent handling.
 *
 * Design Principles:
 * - All errors have a code for programmatic handling
 * - All errors are serializable for API responses
 * - All errors support cause chaining
 * - All errors include context for debugging
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational - operation succeeded with notes */
  INFO = 'INFO',

  /** Warning - operation succeeded but with concerns */
  WARNING = 'WARNING',

  /** Error - operation failed but recoverable */
  ERROR = 'ERROR',

  /** Critical - operation failed, requires attention */
  CRITICAL = 'CRITICAL',

  /** Fatal - system-level failure */
  FATAL = 'FATAL'
}

/**
 * Error categories for grouping and routing
 */
export enum ErrorCategory {
  /** Authentication/Authorization errors */
  AUTH = 'AUTH',

  /** Validation errors (input, schema, etc.) */
  VALIDATION = 'VALIDATION',

  /** External service errors (APIs, databases) */
  EXTERNAL = 'EXTERNAL',

  /** Business logic errors */
  BUSINESS = 'BUSINESS',

  /** System/infrastructure errors */
  SYSTEM = 'SYSTEM',

  /** Rate limiting / quota errors */
  RATE_LIMIT = 'RATE_LIMIT',

  /** Configuration errors */
  CONFIG = 'CONFIG',

  /** Governance/policy errors */
  GOVERNANCE = 'GOVERNANCE'
}

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Auth errors (1xxx)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',

  // Validation errors (2xxx)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_SCHEMA_MISMATCH = 'VALIDATION_SCHEMA_MISMATCH',

  // External service errors (3xxx)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_TIMEOUT = 'EXTERNAL_TIMEOUT',
  EXTERNAL_UNAVAILABLE = 'EXTERNAL_UNAVAILABLE',
  EXTERNAL_RATE_LIMITED = 'EXTERNAL_RATE_LIMITED',
  EXTERNAL_INVALID_RESPONSE = 'EXTERNAL_INVALID_RESPONSE',

  // LLM specific errors
  LLM_PROVIDER_ERROR = 'LLM_PROVIDER_ERROR',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',
  LLM_CONTEXT_TOO_LONG = 'LLM_CONTEXT_TOO_LONG',
  LLM_CONTENT_FILTERED = 'LLM_CONTENT_FILTERED',

  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_NOT_FOUND = 'DB_NOT_FOUND',

  // Business logic errors (4xxx)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // Workflow errors
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_INVALID_STATE = 'WORKFLOW_INVALID_STATE',
  WORKFLOW_STEP_FAILED = 'WORKFLOW_STEP_FAILED',
  WORKFLOW_TIMEOUT = 'WORKFLOW_TIMEOUT',

  // Governance errors (5xxx)
  GOVERNANCE_POLICY_VIOLATION = 'GOVERNANCE_POLICY_VIOLATION',
  GOVERNANCE_APPROVAL_REQUIRED = 'GOVERNANCE_APPROVAL_REQUIRED',
  GOVERNANCE_ATTESTATION_REQUIRED = 'GOVERNANCE_ATTESTATION_REQUIRED',
  GOVERNANCE_BLOCKED_ACTION = 'GOVERNANCE_BLOCKED_ACTION',
  GOVERNANCE_AUDIT_FAILURE = 'GOVERNANCE_AUDIT_FAILURE',

  // System errors (9xxx)
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_NOT_CONFIGURED = 'SYSTEM_NOT_CONFIGURED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * HTTP status code mapping
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  // Auth - 401/403
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.AUTH_ACCOUNT_DISABLED]: 403,
  [ErrorCode.AUTH_MFA_REQUIRED]: 401,

  // Validation - 400
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.VALIDATION_MISSING_FIELD]: 400,
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: 400,
  [ErrorCode.VALIDATION_SCHEMA_MISMATCH]: 400,

  // External - 502/503/504
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.EXTERNAL_TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_RATE_LIMITED]: 429,
  [ErrorCode.EXTERNAL_INVALID_RESPONSE]: 502,

  // LLM - 502/429
  [ErrorCode.LLM_PROVIDER_ERROR]: 502,
  [ErrorCode.LLM_RATE_LIMITED]: 429,
  [ErrorCode.LLM_CONTEXT_TOO_LONG]: 400,
  [ErrorCode.LLM_CONTENT_FILTERED]: 400,

  // Database - 500/503
  [ErrorCode.DB_CONNECTION_ERROR]: 503,
  [ErrorCode.DB_QUERY_ERROR]: 500,
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: 409,
  [ErrorCode.DB_NOT_FOUND]: 404,

  // Business - 400/404/409
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 423,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,

  // Workflow - 400/500
  [ErrorCode.WORKFLOW_NOT_FOUND]: 404,
  [ErrorCode.WORKFLOW_INVALID_STATE]: 400,
  [ErrorCode.WORKFLOW_STEP_FAILED]: 500,
  [ErrorCode.WORKFLOW_TIMEOUT]: 504,

  // Governance - 403
  [ErrorCode.GOVERNANCE_POLICY_VIOLATION]: 403,
  [ErrorCode.GOVERNANCE_APPROVAL_REQUIRED]: 403,
  [ErrorCode.GOVERNANCE_ATTESTATION_REQUIRED]: 403,
  [ErrorCode.GOVERNANCE_BLOCKED_ACTION]: 403,
  [ErrorCode.GOVERNANCE_AUDIT_FAILURE]: 500,

  // System - 500/503
  [ErrorCode.SYSTEM_ERROR]: 500,
  [ErrorCode.SYSTEM_NOT_CONFIGURED]: 503,
  [ErrorCode.SYSTEM_MAINTENANCE]: 503,

  [ErrorCode.UNKNOWN_ERROR]: 500
};

/**
 * Error context for debugging
 */
export interface ErrorContext {
  /** Component/module where error occurred */
  component?: string;

  /** Operation being performed */
  operation?: string;

  /** User/operator ID */
  userId?: string;

  /** Tenant ID */
  tenantId?: string;

  /** Session ID */
  sessionId?: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Retry configuration for recoverable errors
 */
export interface RetryConfig {
  /** Whether error is retryable */
  retryable: boolean;

  /** Suggested delay before retry (ms) */
  retryAfterMs?: number;

  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Serialized error for API responses
 */
export interface SerializedError {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
  retryable?: boolean;
  retryAfterMs?: number;
}

/**
 * Base ACE Error class
 * All application errors should extend this
 */
export class AceError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly retry: RetryConfig;
  public readonly timestamp: Date;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    options?: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: ErrorContext;
      retry?: Partial<RetryConfig>;
      details?: Record<string, any>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AceError';
    this.code = code;
    this.category = options?.category || this.inferCategory(code);
    this.severity = options?.severity || ErrorSeverity.ERROR;
    this.context = options?.context || {};
    this.retry = {
      retryable: options?.retry?.retryable ?? false,
      retryAfterMs: options?.retry?.retryAfterMs,
      maxRetries: options?.retry?.maxRetries
    };
    this.timestamp = new Date();
    this.details = options?.details;

    // Preserve cause for debugging
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get HTTP status code for this error
   */
  get httpStatus(): number {
    return ERROR_HTTP_STATUS[this.code] || 500;
  }

  /**
   * Check if error is retryable
   */
  get isRetryable(): boolean {
    return this.retry.retryable;
  }

  /**
   * Serialize for API response
   */
  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      requestId: this.context.requestId,
      details: this.details,
      retryable: this.retry.retryable,
      retryAfterMs: this.retry.retryAfterMs
    };
  }

  /**
   * Create a log-friendly representation
   */
  toLog(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      details: this.details,
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : this.cause
    };
  }

  /**
   * Infer category from error code
   */
  private inferCategory(code: ErrorCode): ErrorCategory {
    if (code.startsWith('AUTH_')) return ErrorCategory.AUTH;
    if (code.startsWith('VALIDATION_')) return ErrorCategory.VALIDATION;
    if (code.startsWith('EXTERNAL_') || code.startsWith('LLM_') || code.startsWith('DB_'))
      return ErrorCategory.EXTERNAL;
    if (code.startsWith('GOVERNANCE_')) return ErrorCategory.GOVERNANCE;
    if (code.startsWith('SYSTEM_')) return ErrorCategory.SYSTEM;
    return ErrorCategory.BUSINESS;
  }
}
