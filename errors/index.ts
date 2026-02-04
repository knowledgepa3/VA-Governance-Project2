/**
 * Error Module
 *
 * Standardized error handling for the ACE platform.
 *
 * Features:
 * - Unified error types with codes, categories, and severity
 * - HTTP status code mapping
 * - Retry configuration for recoverable errors
 * - Express middleware for API error responses
 * - Error normalization (any error → AceError)
 * - Retry logic with exponential backoff
 * - Error aggregation and reporting
 *
 * Usage:
 *   import {
 *     AceError,
 *     ValidationError,
 *     NotFoundError,
 *     normalizeError,
 *     withRetry,
 *     errorMiddleware
 *   } from './errors';
 *
 *   // Throw specific errors
 *   throw new ValidationError('Invalid email format', { field: 'email' });
 *   throw new NotFoundError('Opportunity', 'opp-123');
 *
 *   // With retry
 *   const result = await withRetry(() => callExternalAPI(), {
 *     maxRetries: 3,
 *     exponentialBackoff: true
 *   });
 *
 *   // Express middleware
 *   app.use(errorMiddleware);
 *
 * @module errors
 */

// Types and base class
export {
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  ERROR_HTTP_STATUS,
  ErrorContext,
  RetryConfig,
  SerializedError,
  AceError
} from './types';

// Specialized error classes
export {
  // Auth
  AuthenticationError,
  AuthorizationError,

  // Validation
  ValidationError,
  SchemaValidationError,

  // External services
  ExternalServiceError,
  LLMProviderError,
  DatabaseError,

  // Business logic
  NotFoundError,
  ConflictError,
  BusinessRuleError,

  // Workflow
  WorkflowError,

  // Governance
  GovernanceError,
  ApprovalRequiredError,
  BlockedActionError,

  // System
  ConfigurationError,
  SystemError,

  // Rate limiting
  RateLimitError,

  // Data sources (for audit tracking)
  DataSource,
  DataSourceResult,
  DataSourceError
} from './errors';

// Handler utilities
export {
  // Normalization
  normalizeError,

  // Logging
  ErrorLogger,
  setErrorLogger,
  logError,

  // Express
  errorMiddleware,
  asyncHandler,

  // Retry
  RetryOptions,
  withRetry,

  // Aggregation
  AggregateError,
  collectErrors,

  // Reporting
  ErrorReport,
  ErrorCollector,
  errorCollector
} from './handler';
