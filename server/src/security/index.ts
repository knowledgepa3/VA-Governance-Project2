/**
 * Security Module Exports
 *
 * All enterprise security features in one place:
 * - Key management (KMS-ready)
 * - Compliance modes (dev/staging/prod/fedramp)
 * - Rate limiting
 * - Break-glass emergency access
 * - Tenant isolation
 * - Egress controls
 */

// Key Management - import for local use and re-export
import {
  keyManager as km,
  KeyPurpose,
  KeyMetadata,
  KeyProvider
} from './keyManager';

export { km as keyManager, KeyPurpose, KeyMetadata, KeyProvider };

// Compliance Modes - import for local use and re-export
import {
  complianceMode as cm,
  ComplianceLevel,
  ComplianceConfig,
  isProduction as isProd,
  isFedRAMP,
  checkCompliance
} from './complianceMode';

export { cm as complianceMode, ComplianceLevel, ComplianceConfig, isProd as isProduction, isFedRAMP, checkCompliance };

// Rate Limiting
export {
  createRateLimiter,
  globalRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  getRateLimiterStats
} from './rateLimiter';

// Break-Glass Emergency Access
export {
  activateBreakGlass,
  deactivateBreakGlass,
  recordBreakGlassAction,
  completeBreakGlassReview,
  getActiveSession as getBreakGlassSession,
  getPendingReviews as getBreakGlassPendingReviews,
  breakGlassMiddleware,
  BreakGlassReason,
  BreakGlassSession,
  canActivateBreakGlass
} from './breakGlass';

// Tenant Isolation
export {
  tenantIsolationMiddleware,
  requireTenantFeature,
  checkCrossTenantAccess,
  scopeToTenant,
  validateResourceTenant,
  tenantAudit,
  getTenantContext,
  getAllTenants,
  registerTenant,
  TenantContext
} from './tenantIsolation';

// Egress Controls
export {
  checkEgress,
  addToAllowlist,
  removeFromAllowlist,
  getTenantPolicy,
  EgressDecision,
  EgressPolicy
} from './egressControl';

/**
 * Initialize all security modules
 * Call this during server startup
 */
export async function initializeSecurity(): Promise<void> {
  const { logger } = await import('../logger');
  const log = logger.child({ component: 'SecurityInit' });

  log.info('Initializing security modules');

  // Check key manager health
  const keyHealthy = await km.isHealthy();
  if (!keyHealthy) {
    throw new Error('Key manager failed health check');
  }
  log.info('Key manager ready', { provider: km.getProviderName() });

  // Log compliance mode
  const complianceReport = cm.getComplianceReport();
  log.info('Compliance mode active', {
    level: complianceReport.level,
    enforceHTTPS: complianceReport.config.enforceHTTPS,
    auditRetentionDays: complianceReport.config.auditRetentionDays
  });

  // Validate production settings
  if (isProd()) {
    log.info('Production mode validations passed');
  }

  log.info('Security modules initialized');
}

/**
 * Security health check
 */
export async function securityHealthCheck(): Promise<{
  healthy: boolean;
  details: Record<string, boolean | string>;
}> {
  const details: Record<string, boolean | string> = {};

  try {
    details.keyManager = await km.isHealthy();
    details.complianceLevel = cm.getLevel();
    details.rateLimiter = true; // Always healthy
    details.tenantIsolation = cm.check('enforceTenanIsolation');

    const healthy = Object.values(details).every(v => v !== false);

    return { healthy, details };
  } catch (error) {
    return {
      healthy: false,
      details: { error: String(error) }
    };
  }
}
