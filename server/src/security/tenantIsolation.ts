/**
 * Tenant Isolation Enforcement
 *
 * Ensures strict boundaries between tenants:
 * - All data access scoped to tenant
 * - Cross-tenant access blocked by default
 * - Tenant ID in every audit entry
 * - JWT tenant claims verified
 *
 * CRITICAL: Tenant isolation is fundamental to multi-tenant security
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { complianceMode } from './complianceMode';
import { secureAuditStore } from '../audit/auditStoreSecure';
import { AuthenticatedRequest } from '../auth/middleware';

const log = logger.child({ component: 'TenantIsolation' });

/**
 * Tenant context attached to requests
 */
export interface TenantContext {
  tenantId: string;
  tenantName?: string;
  tier: 'free' | 'pro' | 'enterprise' | 'government';
  dataRegion: string;
  isolationLevel: 'shared' | 'dedicated';
  features: Set<string>;
}

/**
 * Tenant registry (in production, from database)
 */
const tenantRegistry: Map<string, TenantContext> = new Map([
  ['default', {
    tenantId: 'default',
    tenantName: 'Default Tenant',
    tier: 'free',
    dataRegion: 'us-east-1',
    isolationLevel: 'shared',
    features: new Set(['basic'])
  }],
  ['gov-va', {
    tenantId: 'gov-va',
    tenantName: 'VA Government',
    tier: 'government',
    dataRegion: 'us-gov-west-1',
    isolationLevel: 'dedicated',
    features: new Set(['basic', 'pii', 'fedramp', 'audit_export'])
  }]
]);

/**
 * Get tenant context
 */
export function getTenantContext(tenantId: string): TenantContext | null {
  return tenantRegistry.get(tenantId) || null;
}

/**
 * Validate tenant ID format
 */
function isValidTenantId(tenantId: string): boolean {
  // Alphanumeric with hyphens, 3-50 chars
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(tenantId);
}

/**
 * Tenant isolation middleware
 * Enforces tenant context on all requests
 */
export function tenantIsolationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;

  // Skip if tenant isolation not enforced (dev mode)
  if (!complianceMode.check('enforceTenantIsolation')) {
    // Still set default tenant for consistency
    (req as any).tenantId = (req as any).tenantId || 'default';
    (req as any).tenantContext = getTenantContext('default');
    next();
    return;
  }

  // Get tenant ID from JWT claims (set by auth middleware)
  const tenantId = authReq.tenantId;

  if (!tenantId) {
    log.warn('Request missing tenant ID', {
      path: req.path,
      userId: authReq.userId
    });

    res.status(403).json({
      error: 'Tenant context required',
      code: 'MISSING_TENANT'
    });
    return;
  }

  // Validate tenant ID format
  if (!isValidTenantId(tenantId)) {
    log.warn('Invalid tenant ID format', {
      tenantId: tenantId.slice(0, 20),
      userId: authReq.userId
    });

    res.status(403).json({
      error: 'Invalid tenant ID',
      code: 'INVALID_TENANT'
    });
    return;
  }

  // Get tenant context
  const context = getTenantContext(tenantId);

  if (!context) {
    log.warn('Unknown tenant', {
      tenantId,
      userId: authReq.userId
    });

    res.status(403).json({
      error: 'Tenant not found',
      code: 'UNKNOWN_TENANT'
    });
    return;
  }

  // Attach tenant context to request
  (req as any).tenantContext = context;

  // Set tenant ID in response header for debugging
  res.setHeader('X-Tenant-ID', tenantId);

  log.debug('Tenant context attached', {
    tenantId,
    tier: context.tier,
    isolationLevel: context.isolationLevel
  });

  next();
}

/**
 * Require specific tenant feature
 */
export function requireTenantFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = (req as any).tenantContext as TenantContext | undefined;

    if (!context) {
      res.status(403).json({
        error: 'Tenant context required',
        code: 'MISSING_TENANT_CONTEXT'
      });
      return;
    }

    if (!context.features.has(feature)) {
      log.warn('Tenant feature not available', {
        tenantId: context.tenantId,
        feature,
        tier: context.tier
      });

      res.status(403).json({
        error: `Feature '${feature}' not available for tenant`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredTier: getRequiredTierForFeature(feature)
      });
      return;
    }

    next();
  };
}

/**
 * Get required tier for feature
 */
function getRequiredTierForFeature(feature: string): string {
  const featureTiers: Record<string, string> = {
    'basic': 'free',
    'pii': 'pro',
    'audit_export': 'enterprise',
    'fedramp': 'government',
    'sso': 'enterprise',
    'custom_policies': 'enterprise'
  };
  return featureTiers[feature] || 'enterprise';
}

/**
 * Cross-tenant access check
 * Use when one user needs to access another tenant's data
 */
export async function checkCrossTenantAccess(
  sourceTenantId: string,
  targetTenantId: string,
  userId: string,
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Same tenant is always allowed
  if (sourceTenantId === targetTenantId) {
    return { allowed: true };
  }

  // Check if cross-tenant is allowed at all
  if (!complianceMode.check('allowCrossTenantAccess')) {
    log.warn('Cross-tenant access blocked by compliance mode', {
      sourceTenantId,
      targetTenantId,
      userId
    });

    await secureAuditStore.append(
      { sub: userId, role: 'unknown', sessionId: 'cross_tenant', tenantId: sourceTenantId },
      'CROSS_TENANT_BLOCKED',
      { type: 'tenant', id: targetTenantId },
      { action, reason: 'compliance_mode' }
    );

    return {
      allowed: false,
      reason: 'Cross-tenant access disabled in current compliance mode'
    };
  }

  // Check tenant relationship (in production, check database)
  // For now, block all cross-tenant access
  log.warn('Cross-tenant access attempt', {
    sourceTenantId,
    targetTenantId,
    userId,
    action
  });

  await secureAuditStore.append(
    { sub: userId, role: 'unknown', sessionId: 'cross_tenant', tenantId: sourceTenantId },
    'CROSS_TENANT_ATTEMPT',
    { type: 'tenant', id: targetTenantId },
    { action }
  );

  return {
    allowed: false,
    reason: 'No cross-tenant relationship exists'
  };
}

/**
 * Scope query to tenant
 * Helper for database queries
 */
export function scopeToTenant<T extends { tenantId?: string }>(
  query: T,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...query,
    tenantId
  };
}

/**
 * Validate resource belongs to tenant
 */
export function validateResourceTenant(
  resourceTenantId: string | undefined,
  requestTenantId: string
): boolean {
  if (!resourceTenantId) {
    log.warn('Resource missing tenant ID');
    return false;
  }

  if (resourceTenantId !== requestTenantId) {
    log.warn('Resource tenant mismatch', {
      resourceTenantId,
      requestTenantId
    });
    return false;
  }

  return true;
}

/**
 * Tenant-aware audit wrapper
 * Ensures tenant ID is in every audit entry
 */
export async function tenantAudit(
  req: Request,
  action: string,
  resource: { type: string; id: string },
  payload: Record<string, unknown> = {}
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.tenantId || 'unknown';

  await secureAuditStore.append(
    {
      sub: authReq.userId || 'anonymous',
      role: authReq.role || 'anonymous',
      sessionId: authReq.sessionId || 'none',
      tenantId
    },
    action,
    resource,
    {
      ...payload,
      tenantId // Ensure tenant ID is in payload too
    }
  );
}

/**
 * Get all tenants (admin only)
 */
export function getAllTenants(): TenantContext[] {
  return Array.from(tenantRegistry.values());
}

/**
 * Register new tenant (admin only)
 */
export async function registerTenant(
  context: TenantContext,
  createdBy: string
): Promise<boolean> {
  if (tenantRegistry.has(context.tenantId)) {
    return false;
  }

  tenantRegistry.set(context.tenantId, context);

  await secureAuditStore.append(
    { sub: createdBy, role: 'admin', sessionId: 'tenant_creation', tenantId: 'system' },
    'TENANT_CREATED',
    { type: 'tenant', id: context.tenantId },
    {
      tenantName: context.tenantName,
      tier: context.tier,
      dataRegion: context.dataRegion
    }
  );

  log.audit('Tenant created', {
    tenantId: context.tenantId,
    tier: context.tier,
    createdBy
  });

  return true;
}

export default {
  tenantIsolationMiddleware,
  requireTenantFeature,
  checkCrossTenantAccess,
  scopeToTenant,
  validateResourceTenant,
  tenantAudit,
  getTenantContext,
  getAllTenants,
  registerTenant
};
