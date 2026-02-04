/**
 * Specialized Error Classes
 *
 * Concrete error types for different domains.
 * Each provides sensible defaults for its use case.
 */

import {
  AceError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext
} from './types';

// =============================================================================
// AUTH ERRORS
// =============================================================================

export class AuthenticationError extends AceError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AUTH_REQUIRED,
    context?: ErrorContext
  ) {
    super(message, code, {
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.WARNING,
      context
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AceError {
  constructor(
    message: string,
    requiredPermissions?: string[],
    context?: ErrorContext
  ) {
    super(message, ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, {
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.WARNING,
      context,
      details: { requiredPermissions }
    });
    this.name = 'AuthorizationError';
  }
}

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export class ValidationError extends AceError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    options?: {
      field?: string;
      value?: any;
      code?: ErrorCode;
      context?: ErrorContext;
    }
  ) {
    super(message, options?.code || ErrorCode.VALIDATION_FAILED, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.WARNING,
      context: options?.context,
      details: {
        field: options?.field,
        value: options?.value
      }
    });
    this.name = 'ValidationError';
    this.field = options?.field;
    this.value = options?.value;
  }
}

export class SchemaValidationError extends AceError {
  public readonly errors: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ path: string; message: string }>,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.VALIDATION_SCHEMA_MISMATCH, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.WARNING,
      context,
      details: { errors }
    });
    this.name = 'SchemaValidationError';
    this.errors = errors;
  }
}

// =============================================================================
// EXTERNAL SERVICE ERRORS
// =============================================================================

export class ExternalServiceError extends AceError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    service: string,
    options?: {
      code?: ErrorCode;
      originalError?: Error;
      retryable?: boolean;
      retryAfterMs?: number;
      context?: ErrorContext;
    }
  ) {
    super(message, options?.code || ErrorCode.EXTERNAL_SERVICE_ERROR, {
      category: ErrorCategory.EXTERNAL,
      severity: ErrorSeverity.ERROR,
      context: options?.context,
      retry: {
        retryable: options?.retryable ?? true,
        retryAfterMs: options?.retryAfterMs
      },
      cause: options?.originalError,
      details: { service }
    });
    this.name = 'ExternalServiceError';
    this.service = service;
    this.originalError = options?.originalError;
  }
}

export class LLMProviderError extends ExternalServiceError {
  constructor(
    message: string,
    provider: string,
    options?: {
      code?: ErrorCode;
      originalError?: Error;
      retryable?: boolean;
      retryAfterMs?: number;
      context?: ErrorContext;
    }
  ) {
    super(message, `llm:${provider}`, {
      code: options?.code || ErrorCode.LLM_PROVIDER_ERROR,
      ...options
    });
    this.name = 'LLMProviderError';
  }
}

export class DatabaseError extends ExternalServiceError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      originalError?: Error;
      retryable?: boolean;
      context?: ErrorContext;
    }
  ) {
    super(message, 'database', {
      code: options?.code || ErrorCode.DB_QUERY_ERROR,
      retryable: options?.retryable ?? false,
      ...options
    });
    this.name = 'DatabaseError';
  }
}

// =============================================================================
// BUSINESS LOGIC ERRORS
// =============================================================================

export class NotFoundError extends AceError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(
    resourceType: string,
    resourceId: string,
    context?: ErrorContext
  ) {
    super(`${resourceType} not found: ${resourceId}`, ErrorCode.RESOURCE_NOT_FOUND, {
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.WARNING,
      context,
      details: { resourceType, resourceId }
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

export class ConflictError extends AceError {
  constructor(
    message: string,
    details?: Record<string, any>,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.RESOURCE_ALREADY_EXISTS, {
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.WARNING,
      context,
      details
    });
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends AceError {
  public readonly rule: string;

  constructor(
    message: string,
    rule: string,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, {
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.WARNING,
      context,
      details: { rule }
    });
    this.name = 'BusinessRuleError';
    this.rule = rule;
  }
}

// =============================================================================
// WORKFLOW ERRORS
// =============================================================================

export class WorkflowError extends AceError {
  public readonly workflowId: string;
  public readonly stepId?: string;

  constructor(
    message: string,
    workflowId: string,
    options?: {
      stepId?: string;
      code?: ErrorCode;
      context?: ErrorContext;
      cause?: Error;
    }
  ) {
    super(message, options?.code || ErrorCode.WORKFLOW_STEP_FAILED, {
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.ERROR,
      context: options?.context,
      cause: options?.cause,
      details: { workflowId, stepId: options?.stepId }
    });
    this.name = 'WorkflowError';
    this.workflowId = workflowId;
    this.stepId = options?.stepId;
  }
}

// =============================================================================
// GOVERNANCE ERRORS
// =============================================================================

export class GovernanceError extends AceError {
  public readonly policyId: string;
  public readonly action: string;

  constructor(
    message: string,
    policyId: string,
    action: string,
    options?: {
      code?: ErrorCode;
      context?: ErrorContext;
    }
  ) {
    super(message, options?.code || ErrorCode.GOVERNANCE_POLICY_VIOLATION, {
      category: ErrorCategory.GOVERNANCE,
      severity: ErrorSeverity.WARNING,
      context: options?.context,
      details: { policyId, action }
    });
    this.name = 'GovernanceError';
    this.policyId = policyId;
    this.action = action;
  }
}

export class ApprovalRequiredError extends GovernanceError {
  constructor(
    action: string,
    policyId: string,
    context?: ErrorContext
  ) {
    super(
      `Action "${action}" requires human approval`,
      policyId,
      action,
      { code: ErrorCode.GOVERNANCE_APPROVAL_REQUIRED, context }
    );
    this.name = 'ApprovalRequiredError';
  }
}

export class BlockedActionError extends GovernanceError {
  constructor(
    action: string,
    policyId: string,
    reason: string,
    context?: ErrorContext
  ) {
    super(
      `Action "${action}" is blocked: ${reason}`,
      policyId,
      action,
      { code: ErrorCode.GOVERNANCE_BLOCKED_ACTION, context }
    );
    this.name = 'BlockedActionError';
  }
}

// =============================================================================
// SYSTEM ERRORS
// =============================================================================

export class ConfigurationError extends AceError {
  public readonly configKey: string;

  constructor(
    message: string,
    configKey: string,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.SYSTEM_NOT_CONFIGURED, {
      category: ErrorCategory.CONFIG,
      severity: ErrorSeverity.CRITICAL,
      context,
      details: { configKey }
    });
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

export class SystemError extends AceError {
  constructor(
    message: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.SYSTEM_ERROR, {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      context,
      cause
    });
    this.name = 'SystemError';
  }
}

// =============================================================================
// DATA SOURCE ERRORS
// =============================================================================

/**
 * Data source types for audit tracking
 */
export enum DataSource {
  SAM_GOV_API = 'SAM_GOV_API',           // Real SAM.gov API
  SAM_GOV_SCRAPE = 'SAM_GOV_SCRAPE',     // Real SAM.gov web scraping
  USA_SPENDING_API = 'USA_SPENDING_API', // Real USASpending.gov API
  USA_SPENDING_SCRAPE = 'USA_SPENDING_SCRAPE', // Real USASpending.gov scraping
  MOCK = 'MOCK'                           // Mock/simulated data
}

/**
 * Result wrapper that tracks data source for audit
 */
export interface DataSourceResult<T> {
  data: T;
  source: DataSource;
  timestamp: Date;
  warnings?: string[];
}

/**
 * Error thrown when a data source fails and strict mode prevents mock fallback
 */
export class DataSourceError extends ExternalServiceError {
  public readonly dataSource: DataSource;
  public readonly strictModeEnabled: boolean;

  constructor(
    message: string,
    dataSource: DataSource,
    options?: {
      originalError?: Error;
      retryable?: boolean;
      retryAfterMs?: number;
      context?: ErrorContext;
    }
  ) {
    super(message, `datasource:${dataSource}`, {
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      retryable: options?.retryable ?? true,
      ...options
    });
    this.name = 'DataSourceError';
    this.dataSource = dataSource;
    this.strictModeEnabled = true;
  }
}

// =============================================================================
// RATE LIMIT ERRORS
// =============================================================================

export class RateLimitError extends AceError {
  public readonly retryAfter: number;

  constructor(
    message: string,
    retryAfterMs: number,
    context?: ErrorContext
  ) {
    super(message, ErrorCode.EXTERNAL_RATE_LIMITED, {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.WARNING,
      context,
      retry: {
        retryable: true,
        retryAfterMs
      }
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfterMs;
  }
}
