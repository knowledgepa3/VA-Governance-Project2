/**
 * Security Posture Aggregation
 *
 * Pure aggregation function — pulls from existing security singletons
 * into one SecurityPosture object for operator console display.
 *
 * No new business logic. No new data sources.
 * Just reshapes what's already exported from security/index.ts.
 */

import { complianceMode } from './complianceMode';
import { keyManager } from './keyManager';
import { getRateLimiterStats } from './rateLimiter';
import { getPendingReviews } from './breakGlass';
import { getTenantPolicy } from './egressControl';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SecurityPosture {
  complianceLevel: string;
  flags: {
    enforceHTTPS: boolean;
    requireMFA: boolean;
    strictCORS: boolean;
    auditAllRequests: boolean;
    strictPIIDetection: boolean;
    enforceTenantIsolation: boolean;
    breakGlassAuditLevel: string;
    sessionTimeoutMinutes: number;
    auditRetentionDays: number;
  };
  keyManager: {
    provider: string;
    healthy: boolean;
  };
  rateLimiter: {
    activeKeys: number;
  };
  breakGlass: {
    activeSessions: number;
    pendingReviews: number;
  };
  egressControl: {
    mode: string;
    allowedDomains: number;
    blockedDomains: number;
    allowHttp: boolean;
  };
  overallStatus: 'SECURE' | 'WARNINGS' | 'CRITICAL';
  checkedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════

export async function getSecurityPosture(tenantId?: string): Promise<SecurityPosture> {
  const config = complianceMode.getConfig();
  const keyHealthy = await keyManager.isHealthy();
  const rlStats = getRateLimiterStats();
  const bgSessions = getPendingReviews();
  const egressPolicy = getTenantPolicy(tenantId);

  // Count active (non-expired) break glass sessions
  const now = new Date();
  const activeBG = bgSessions.filter(s => new Date(s.expiresAt) > now);
  const pendingBG = bgSessions.filter(s => s.reviewRequired);

  // Compute overall status
  let overallStatus: SecurityPosture['overallStatus'] = 'SECURE';
  if (activeBG.length > 0 || !keyHealthy) overallStatus = 'WARNINGS';
  if (!keyHealthy && complianceMode.getLevel() === 'production') overallStatus = 'CRITICAL';

  return {
    complianceLevel: complianceMode.getLevel(),
    flags: {
      enforceHTTPS: config.enforceHTTPS,
      requireMFA: config.requireMFA,
      strictCORS: config.strictCORS,
      auditAllRequests: config.auditAllRequests,
      strictPIIDetection: config.strictPIIDetection,
      enforceTenantIsolation: config.enforceTenantIsolation,
      breakGlassAuditLevel: config.breakGlassAuditLevel,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
      auditRetentionDays: config.auditRetentionDays,
    },
    keyManager: {
      provider: keyManager.getProviderName(),
      healthy: keyHealthy,
    },
    rateLimiter: rlStats,
    breakGlass: {
      activeSessions: activeBG.length,
      pendingReviews: pendingBG.length,
    },
    egressControl: {
      mode: egressPolicy.mode,
      allowedDomains: egressPolicy.allowedDomains.length,
      blockedDomains: egressPolicy.blockedDomains.length,
      allowHttp: egressPolicy.allowHttp,
    },
    overallStatus,
    checkedAt: new Date().toISOString(),
  };
}
