/**
 * ACE Governance Platform - Services Index
 *
 * Central export point for all services.
 * Import from here rather than individual files.
 */

// Cryptographic utilities
export {
  sha256,
  chainedHash,
  verifyHashChain,
  generateUUID,
  generateSecureToken,
  hashSensitiveData
} from './crypto';

// Logging
export {
  logger,
  Logger,
  ComponentLogger,
  LogLevel,
  type LogEntry,
  type LoggerConfig
} from './logger';

// Audit service
export {
  auditService,
  AuditService,
  type AuditEntry,
  type WorkflowSession,
  type SeparationOfDutiesViolation
} from './auditService';

// Session management
export {
  sessionService,
  SessionService,
  type UserSession,
  type SessionValidation
} from './sessionService';

// Configuration
export {
  configService,
  ConfigService,
  type Environment,
  type RateLimitConfig,
  type GovernanceConfig,
  type SecurityConfig,
  type FeatureFlags,
  type AppConfig
} from './configService';

// Rate limiting
export {
  rateLimiter,
  concurrentLimiter,
  RateLimiter,
  ConcurrentLimiter,
  withRateLimit,
  withConcurrentLimit
} from './rateLimiter';

// Validation
export {
  validateURL,
  validateFile,
  validatePlaybookVariable,
  validateJSONInput,
  validateEmail,
  sanitizeForDisplay,
  type URLValidationResult,
  type FileValidationResult,
  type VariableValidationResult
} from './validation';

// Secure Claude service
export {
  behavioralIntegrityCheck,
  runAgentStep,
  supervisorCheck,
  detectPIIPHI,
  type IntegrityCheckResult,
  type AgentStepResult,
  type SupervisorCheckResult,
  type PIIDetectionResult
} from './claudeServiceSecure';

// Secure MAI Runtime
export {
  secureMAIRuntime,
  SecureMAIRuntime,
  ActionType,
  PolicyDecision,
  type SecureAuditLogEntry,
  type PolicyRule,
  type ActionContext,
  type SecureEvidencePack
} from './maiRuntimeSecure';

/**
 * Initialize all services
 * Call this at app startup
 */
export async function initializeServices(): Promise<void> {
  const { logger } = await import('./logger');
  const { configService } = await import('./configService');
  const { sessionService } = await import('./sessionService');
  const { auditService } = await import('./auditService');

  const log = logger.child('ServiceInit');

  try {
    // Validate configuration
    const configValidation = configService.validateConfig();
    if (!configValidation.valid) {
      log.critical('Configuration validation failed', { errors: configValidation.errors });
      throw new Error('Invalid configuration');
    }

    if (configValidation.errors.length > 0) {
      log.warn('Configuration warnings', { warnings: configValidation.errors });
    }

    // Set up session expiry handler
    sessionService.onExpired(() => {
      log.warn('Session expired');
      // Could trigger UI notification here
    });

    log.info('Services initialized successfully', {
      environment: configService.getConfig().environment,
      version: configService.getConfig().version
    });
  } catch (error) {
    log.critical('Service initialization failed', {}, error as Error);
    throw error;
  }
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices(): Promise<void> {
  const { logger } = await import('./logger');
  const { sessionService } = await import('./sessionService');

  const log = logger.child('ServiceShutdown');

  try {
    // Flush logs
    await logger.flush();

    // End any active session
    sessionService.destroySession();

    log.info('Services shut down gracefully');
  } catch (error) {
    console.error('Error during service shutdown:', error);
  }
}
