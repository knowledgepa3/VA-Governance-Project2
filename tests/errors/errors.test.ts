/**
 * Error Module Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AceError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  GovernanceError,
  ApprovalRequiredError,
  BlockedActionError,
  LLMProviderError,
  RateLimitError,
  normalizeError,
  withRetry,
  collectErrors,
  AggregateError,
  errorCollector
} from '../../errors';

describe('AceError', () => {
  describe('constructor', () => {
    it('should create error with defaults', () => {
      const error = new AceError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should create error with custom code', () => {
      const error = new AceError('Test error', ErrorCode.VALIDATION_FAILED);
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should infer category from code', () => {
      const authError = new AceError('Auth', ErrorCode.AUTH_REQUIRED);
      expect(authError.category).toBe(ErrorCategory.AUTH);

      const govError = new AceError('Gov', ErrorCode.GOVERNANCE_POLICY_VIOLATION);
      expect(govError.category).toBe(ErrorCategory.GOVERNANCE);
    });

    it('should set timestamp', () => {
      const error = new AceError('Test');
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('httpStatus', () => {
    it('should return 401 for auth required', () => {
      const error = new AceError('Unauthorized', ErrorCode.AUTH_REQUIRED);
      expect(error.httpStatus).toBe(401);
    });

    it('should return 403 for insufficient permissions', () => {
      const error = new AceError('Forbidden', ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS);
      expect(error.httpStatus).toBe(403);
    });

    it('should return 404 for not found', () => {
      const error = new AceError('Not found', ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.httpStatus).toBe(404);
    });

    it('should return 400 for validation', () => {
      const error = new AceError('Invalid', ErrorCode.VALIDATION_FAILED);
      expect(error.httpStatus).toBe(400);
    });

    it('should return 429 for rate limit', () => {
      const error = new AceError('Rate limited', ErrorCode.EXTERNAL_RATE_LIMITED);
      expect(error.httpStatus).toBe(429);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const error = new AceError('Test', ErrorCode.VALIDATION_FAILED, {
        details: { field: 'email' }
      });
      const json = error.toJSON();

      expect(json.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(json.message).toBe('Test');
      expect(json.category).toBe(ErrorCategory.VALIDATION);
      expect(json.details).toEqual({ field: 'email' });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('toLog', () => {
    it('should return log-friendly object', () => {
      const error = new AceError('Test', ErrorCode.SYSTEM_ERROR, {
        context: { requestId: 'req-123' }
      });
      const log = error.toLog();

      expect(log.code).toBe(ErrorCode.SYSTEM_ERROR);
      expect(log.context.requestId).toBe('req-123');
      expect(log.stack).toBeDefined();
    });
  });

  describe('isRetryable', () => {
    it('should return false by default', () => {
      const error = new AceError('Test');
      expect(error.isRetryable).toBe(false);
    });

    it('should return true when configured', () => {
      const error = new AceError('Test', ErrorCode.EXTERNAL_SERVICE_ERROR, {
        retry: { retryable: true }
      });
      expect(error.isRetryable).toBe(true);
    });
  });
});

describe('Specialized Errors', () => {
  describe('ValidationError', () => {
    it('should include field and value', () => {
      const error = new ValidationError('Invalid email', {
        field: 'email',
        value: 'not-an-email'
      });
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    });
  });

  describe('NotFoundError', () => {
    it('should include resource info', () => {
      const error = new NotFoundError('Opportunity', 'opp-123');
      expect(error.resourceType).toBe('Opportunity');
      expect(error.resourceId).toBe('opp-123');
      expect(error.httpStatus).toBe(404);
    });
  });

  describe('AuthenticationError', () => {
    it('should have auth category', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error.category).toBe(ErrorCategory.AUTH);
    });
  });

  describe('AuthorizationError', () => {
    it('should include required permissions', () => {
      const error = new AuthorizationError('Access denied', ['admin:write']);
      expect(error.details?.requiredPermissions).toContain('admin:write');
      expect(error.httpStatus).toBe(403);
    });
  });

  describe('GovernanceError', () => {
    it('should include policy and action', () => {
      const error = new GovernanceError('Policy violation', 'no-auth', 'LOGIN');
      expect(error.policyId).toBe('no-auth');
      expect(error.action).toBe('LOGIN');
    });
  });

  describe('ApprovalRequiredError', () => {
    it('should indicate approval required', () => {
      const error = new ApprovalRequiredError('SUBMIT', 'approve-submissions');
      expect(error.code).toBe(ErrorCode.GOVERNANCE_APPROVAL_REQUIRED);
      expect(error.action).toBe('SUBMIT');
    });
  });

  describe('BlockedActionError', () => {
    it('should indicate blocked action', () => {
      const error = new BlockedActionError('AUTH', 'no-auth', 'Authentication is blocked');
      expect(error.code).toBe(ErrorCode.GOVERNANCE_BLOCKED_ACTION);
    });
  });

  describe('LLMProviderError', () => {
    it('should include provider info', () => {
      const error = new LLMProviderError('API error', 'anthropic', {
        retryable: true,
        retryAfterMs: 5000
      });
      expect(error.service).toBe('llm:anthropic');
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after', () => {
      const error = new RateLimitError('Too many requests', 60000);
      expect(error.retryAfter).toBe(60000);
      expect(error.isRetryable).toBe(true);
    });
  });
});

describe('Error Handler', () => {
  describe('normalizeError', () => {
    it('should pass through AceError', () => {
      const original = new AceError('Test');
      const normalized = normalizeError(original);
      expect(normalized).toBe(original);
    });

    it('should wrap Error', () => {
      const original = new Error('Standard error');
      const normalized = normalizeError(original);
      expect(normalized).toBeInstanceOf(AceError);
      expect(normalized.message).toBe('Standard error');
      expect(normalized.cause).toBe(original);
    });

    it('should wrap string', () => {
      const normalized = normalizeError('String error');
      expect(normalized).toBeInstanceOf(AceError);
      expect(normalized.message).toBe('String error');
    });

    it('should handle unknown types', () => {
      const normalized = normalizeError({ custom: 'object' });
      expect(normalized).toBeInstanceOf(AceError);
      expect(normalized.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it('should add context', () => {
      const normalized = normalizeError('Test', { requestId: 'req-123' });
      expect(normalized.context.requestId).toBe('req-123');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        return 'success';
      });
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new AceError('Retry me', ErrorCode.EXTERNAL_SERVICE_ERROR, {
            retry: { retryable: true }
          });
        }
        return 'success';
      }, { baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      let attempts = 0;
      await expect(withRetry(async () => {
        attempts++;
        throw new AceError('Always fail', ErrorCode.EXTERNAL_SERVICE_ERROR, {
          retry: { retryable: true }
        });
      }, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow();

      expect(attempts).toBe(3); // 1 initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      await expect(withRetry(async () => {
        attempts++;
        throw new AceError('Not retryable', ErrorCode.VALIDATION_FAILED);
      })).rejects.toThrow();

      expect(attempts).toBe(1);
    });
  });

  describe('collectErrors', () => {
    it('should collect results and errors', async () => {
      const operations = [
        async () => 'result1',
        async () => { throw new Error('fail1'); },
        async () => 'result2',
        async () => { throw new Error('fail2'); }
      ];

      const { results, errors } = await collectErrors(operations);

      expect(results).toEqual(['result1', 'result2']);
      expect(errors.length).toBe(2);
    });
  });

  describe('AggregateError', () => {
    it('should aggregate multiple errors', () => {
      const errors = [
        new ValidationError('Error 1', { field: 'a' }),
        new ValidationError('Error 2', { field: 'b' })
      ];
      const aggregate = new AggregateError(errors);

      expect(aggregate.errors.length).toBe(2);
      expect(aggregate.message).toContain('Multiple errors');
    });
  });

  describe('ErrorCollector', () => {
    beforeEach(() => {
      errorCollector.clear();
    });

    it('should collect errors', () => {
      const error = new AceError('Test');
      errorCollector.add(error);

      const report = errorCollector.getReport();
      expect(report.errorCount).toBe(1);
    });

    it('should generate report by category', () => {
      errorCollector.add(new ValidationError('Val 1', {}));
      errorCollector.add(new ValidationError('Val 2', {}));
      errorCollector.add(new AuthenticationError('Auth 1'));

      const report = errorCollector.getReport();
      expect(report.byCategory[ErrorCategory.VALIDATION]).toBe(2);
      expect(report.byCategory[ErrorCategory.AUTH]).toBe(1);
    });
  });
});
