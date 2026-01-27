/**
 * Compliance Mode Configuration
 *
 * Controls security behavior based on environment:
 * - DEVELOPMENT: Relaxed for debugging
 * - STAGING: Mostly strict, some debugging allowed
 * - PRODUCTION: Maximum security, no exceptions
 * - FedRAMP: Federal compliance mode
 *
 * CRITICAL: Production mode MUST be enforced in production deployments
 */

import { logger } from '../logger';

const log = logger.child({ component: 'ComplianceMode' });

/**
 * Compliance mode levels
 */
export enum ComplianceLevel {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  FEDRAMP = 'fedramp'
}

/**
 * Feature flags controlled by compliance mode
 */
export interface ComplianceConfig {
  // Error handling
  exposeStackTraces: boolean;
  exposeInternalErrors: boolean;
  verboseLogging: boolean;

  // Security
  enforceHTTPS: boolean;
  requireMFA: boolean;
  strictCORS: boolean;
  enforceCSP: boolean;

  // Audit
  auditAllRequests: boolean;
  auditReadOperations: boolean;
  requireSignedAudit: boolean;
  auditRetentionDays: number;

  // Rate limiting
  rateLimitMultiplier: number;
  allowRateLimitBypass: boolean;

  // PII/PHI
  strictPIIDetection: boolean;
  blockUnredactedExport: boolean;
  requireConsentForPII: boolean;

  // Gateway
  allowPermissiveMode: boolean;
  requireApprovalForAll: boolean;
  approvalTimeoutMinutes: number;

  // Break-glass
  allowBreakGlass: boolean;
  breakGlassRequiresMFA: boolean;
  breakGlassAuditLevel: 'standard' | 'enhanced' | 'forensic';

  // Tenant isolation
  enforceTenanIsolation: boolean;
  allowCrossTenantAccess: boolean;

  // Session
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  requireSessionReauth: boolean;
}

/**
 * Mode-specific configurations
 */
const COMPLIANCE_CONFIGS: Record<ComplianceLevel, ComplianceConfig> = {
  [ComplianceLevel.DEVELOPMENT]: {
    exposeStackTraces: true,
    exposeInternalErrors: true,
    verboseLogging: true,
    enforceHTTPS: false,
    requireMFA: false,
    strictCORS: false,
    enforceCSP: false,
    auditAllRequests: false,
    auditReadOperations: false,
    requireSignedAudit: false,
    auditRetentionDays: 7,
    rateLimitMultiplier: 10, // 10x higher limits for dev
    allowRateLimitBypass: true,
    strictPIIDetection: false,
    blockUnredactedExport: false,
    requireConsentForPII: false,
    allowPermissiveMode: true,
    requireApprovalForAll: false,
    approvalTimeoutMinutes: 60,
    allowBreakGlass: true,
    breakGlassRequiresMFA: false,
    breakGlassAuditLevel: 'standard',
    enforceTenanIsolation: false,
    allowCrossTenantAccess: true,
    sessionTimeoutMinutes: 480, // 8 hours
    maxConcurrentSessions: 10,
    requireSessionReauth: false
  },

  [ComplianceLevel.STAGING]: {
    exposeStackTraces: false,
    exposeInternalErrors: true,
    verboseLogging: true,
    enforceHTTPS: true,
    requireMFA: false,
    strictCORS: true,
    enforceCSP: true,
    auditAllRequests: true,
    auditReadOperations: false,
    requireSignedAudit: false,
    auditRetentionDays: 30,
    rateLimitMultiplier: 2,
    allowRateLimitBypass: false,
    strictPIIDetection: true,
    blockUnredactedExport: true,
    requireConsentForPII: false,
    allowPermissiveMode: false,
    requireApprovalForAll: false,
    approvalTimeoutMinutes: 30,
    allowBreakGlass: true,
    breakGlassRequiresMFA: true,
    breakGlassAuditLevel: 'enhanced',
    enforceTenanIsolation: true,
    allowCrossTenantAccess: false,
    sessionTimeoutMinutes: 120,
    maxConcurrentSessions: 3,
    requireSessionReauth: false
  },

  [ComplianceLevel.PRODUCTION]: {
    exposeStackTraces: false,
    exposeInternalErrors: false,
    verboseLogging: false,
    enforceHTTPS: true,
    requireMFA: true,
    strictCORS: true,
    enforceCSP: true,
    auditAllRequests: true,
    auditReadOperations: true,
    requireSignedAudit: true,
    auditRetentionDays: 365,
    rateLimitMultiplier: 1,
    allowRateLimitBypass: false,
    strictPIIDetection: true,
    blockUnredactedExport: true,
    requireConsentForPII: true,
    allowPermissiveMode: false,
    requireApprovalForAll: false,
    approvalTimeoutMinutes: 15,
    allowBreakGlass: true,
    breakGlassRequiresMFA: true,
    breakGlassAuditLevel: 'forensic',
    enforceTenanIsolation: true,
    allowCrossTenantAccess: false,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 2,
    requireSessionReauth: true
  },

  [ComplianceLevel.FEDRAMP]: {
    exposeStackTraces: false,
    exposeInternalErrors: false,
    verboseLogging: false,
    enforceHTTPS: true,
    requireMFA: true,
    strictCORS: true,
    enforceCSP: true,
    auditAllRequests: true,
    auditReadOperations: true,
    requireSignedAudit: true,
    auditRetentionDays: 2555, // 7 years
    rateLimitMultiplier: 1,
    allowRateLimitBypass: false,
    strictPIIDetection: true,
    blockUnredactedExport: true,
    requireConsentForPII: true,
    allowPermissiveMode: false,
    requireApprovalForAll: true, // All actions need approval
    approvalTimeoutMinutes: 10,
    allowBreakGlass: true,
    breakGlassRequiresMFA: true,
    breakGlassAuditLevel: 'forensic',
    enforceTenanIsolation: true,
    allowCrossTenantAccess: false,
    sessionTimeoutMinutes: 15,
    maxConcurrentSessions: 1,
    requireSessionReauth: true
  }
};

/**
 * Compliance Mode Manager
 */
class ComplianceModeManager {
  private level: ComplianceLevel;
  private config: ComplianceConfig;
  private overrides: Partial<ComplianceConfig> = {};

  constructor() {
    // Determine level from environment
    const envLevel = (process.env.COMPLIANCE_LEVEL || process.env.NODE_ENV || 'development').toLowerCase();

    switch (envLevel) {
      case 'production':
      case 'prod':
        this.level = ComplianceLevel.PRODUCTION;
        break;
      case 'staging':
      case 'stage':
        this.level = ComplianceLevel.STAGING;
        break;
      case 'fedramp':
      case 'federal':
      case 'gov':
        this.level = ComplianceLevel.FEDRAMP;
        break;
      default:
        this.level = ComplianceLevel.DEVELOPMENT;
    }

    this.config = { ...COMPLIANCE_CONFIGS[this.level] };

    log.info('Compliance mode initialized', {
      level: this.level,
      enforceHTTPS: this.config.enforceHTTPS,
      requireMFA: this.config.requireMFA,
      auditRetentionDays: this.config.auditRetentionDays
    });

    // Validate critical production settings
    if (this.level === ComplianceLevel.PRODUCTION || this.level === ComplianceLevel.FEDRAMP) {
      this.validateProductionConfig();
    }
  }

  private validateProductionConfig() {
    const criticalFlags = [
      'enforceHTTPS',
      'strictCORS',
      'enforceCSP',
      'auditAllRequests',
      'strictPIIDetection',
      'blockUnredactedExport',
      'enforceTenanIsolation'
    ] as const;

    for (const flag of criticalFlags) {
      if (!this.config[flag]) {
        log.error(`CRITICAL: ${flag} is disabled in production mode!`, { flag });
        // In true production, this should throw
        if (process.env.STRICT_COMPLIANCE === 'true') {
          throw new Error(`Compliance violation: ${flag} must be enabled in production`);
        }
      }
    }
  }

  /**
   * Get current compliance level
   */
  getLevel(): ComplianceLevel {
    return this.level;
  }

  /**
   * Get full config
   */
  getConfig(): Readonly<ComplianceConfig> {
    return { ...this.config, ...this.overrides };
  }

  /**
   * Check specific flag
   */
  check<K extends keyof ComplianceConfig>(flag: K): ComplianceConfig[K] {
    const overrideVal = this.overrides[flag];
    if (overrideVal !== undefined) {
      return overrideVal as ComplianceConfig[K];
    }
    return this.config[flag];
  }

  /**
   * Check if in production-level security
   */
  isProduction(): boolean {
    return this.level === ComplianceLevel.PRODUCTION || this.level === ComplianceLevel.FEDRAMP;
  }

  /**
   * Check if FedRAMP mode
   */
  isFedRAMP(): boolean {
    return this.level === ComplianceLevel.FEDRAMP;
  }

  /**
   * Apply temporary override (for testing only)
   * CRITICAL: This is audited and only works in non-production
   */
  applyOverride<K extends keyof ComplianceConfig>(
    flag: K,
    value: ComplianceConfig[K],
    reason: string,
    userId: string
  ): boolean {
    if (this.isProduction()) {
      log.error('Compliance override attempted in production', {
        flag,
        userId,
        reason
      });
      return false;
    }

    log.audit('Compliance override applied', {
      flag,
      oldValue: this.config[flag],
      newValue: value,
      reason,
      userId
    });

    this.overrides[flag] = value;
    return true;
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides = {};
    log.info('Compliance overrides cleared');
  }

  /**
   * Get compliance report for audit
   */
  getComplianceReport(): {
    level: ComplianceLevel;
    config: ComplianceConfig;
    overrides: Partial<ComplianceConfig>;
    timestamp: string;
  } {
    return {
      level: this.level,
      config: this.config,
      overrides: this.overrides,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton
export const complianceMode = new ComplianceModeManager();

// Convenience exports
export const isProduction = () => complianceMode.isProduction();
export const isFedRAMP = () => complianceMode.isFedRAMP();
export const checkCompliance = <K extends keyof ComplianceConfig>(flag: K) => complianceMode.check(flag);

export default complianceMode;
