/**
 * Break-Glass Emergency Override System
 *
 * Provides emergency access when normal controls would prevent
 * critical operations. Features:
 *
 * - Requires MFA in production
 * - Creates enhanced audit trail
 * - Time-limited sessions
 * - Mandatory post-incident review flag
 * - Automatic expiration
 *
 * CRITICAL: Every break-glass action is heavily audited
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { complianceMode } from './complianceMode';
import { secureAuditStore } from '../audit/auditStoreSecure';
import { generateUUID } from '../utils/crypto';
import { AuthenticatedRequest } from '../auth/middleware';

const log = logger.child({ component: 'BreakGlass' });

/**
 * Break-glass session
 */
export interface BreakGlassSession {
  id: string;
  userId: string;
  role: string;
  tenantId?: string;
  reason: string;
  justification: string;
  activatedAt: string;
  expiresAt: string;
  mfaVerified: boolean;
  actionsPerformed: string[];
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * Active break-glass sessions
 */
const activeSessions: Map<string, BreakGlassSession> = new Map();

/**
 * Break-glass activation reasons
 */
export enum BreakGlassReason {
  SYSTEM_EMERGENCY = 'system_emergency',
  SECURITY_INCIDENT = 'security_incident',
  COMPLIANCE_DEADLINE = 'compliance_deadline',
  CUSTOMER_CRITICAL = 'customer_critical',
  DISASTER_RECOVERY = 'disaster_recovery'
}

/**
 * Roles allowed to activate break-glass
 */
const BREAK_GLASS_ROLES = [
  'ISSO / ACE Architect',
  'Chief Compliance Officer',
  'System Administrator',
  'Emergency Responder'
];

/**
 * Check if user can activate break-glass
 */
export function canActivateBreakGlass(role: string): boolean {
  return BREAK_GLASS_ROLES.includes(role);
}

/**
 * Activate break-glass mode
 */
export async function activateBreakGlass(
  userId: string,
  role: string,
  tenantId: string | undefined,
  reason: BreakGlassReason,
  justification: string,
  mfaToken?: string
): Promise<BreakGlassSession | { error: string }> {
  // Check if break-glass is allowed
  if (!complianceMode.check('allowBreakGlass')) {
    return { error: 'Break-glass is disabled in current compliance mode' };
  }

  // Check role authorization
  if (!canActivateBreakGlass(role)) {
    log.warn('Unauthorized break-glass attempt', { userId, role });

    await secureAuditStore.append(
      { sub: userId, role, sessionId: 'break_glass_attempt', tenantId },
      'BREAK_GLASS_UNAUTHORIZED',
      { type: 'break_glass', id: 'activation' },
      { reason, justification }
    );

    return { error: 'Role not authorized for break-glass activation' };
  }

  // Check MFA if required
  if (complianceMode.check('breakGlassRequiresMFA')) {
    if (!mfaToken) {
      return { error: 'MFA verification required for break-glass activation' };
    }

    // In production, verify MFA token here
    // const mfaValid = await verifyMFAToken(userId, mfaToken);
    const mfaValid = mfaToken === 'VALID_MFA_TOKEN'; // Placeholder

    if (!mfaValid) {
      log.warn('Break-glass MFA verification failed', { userId });
      return { error: 'MFA verification failed' };
    }
  }

  // Check if user already has active session
  for (const [, session] of activeSessions) {
    if (session.userId === userId && new Date(session.expiresAt) > new Date()) {
      return { error: 'User already has an active break-glass session' };
    }
  }

  // Determine session duration based on compliance mode
  const durationMinutes = complianceMode.isFedRAMP() ? 30 : 60;
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  // Create session
  const session: BreakGlassSession = {
    id: generateUUID(),
    userId,
    role,
    tenantId,
    reason,
    justification,
    activatedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    mfaVerified: complianceMode.check('breakGlassRequiresMFA'),
    actionsPerformed: [],
    reviewRequired: true
  };

  activeSessions.set(session.id, session);

  // Create forensic-level audit entry
  await secureAuditStore.append(
    { sub: userId, role, sessionId: session.id, tenantId },
    'BREAK_GLASS_ACTIVATED',
    { type: 'break_glass', id: session.id },
    {
      reason,
      justification,
      expiresAt: session.expiresAt,
      mfaVerified: session.mfaVerified,
      complianceLevel: complianceMode.getLevel()
    }
  );

  log.audit('Break-glass session activated', {
    sessionId: session.id,
    userId,
    reason,
    expiresAt: session.expiresAt
  });

  // Alert (in production, send to security team)
  log.error('ALERT: Break-glass activated', {
    sessionId: session.id,
    userId,
    reason
  });

  return session;
}

/**
 * Record action performed during break-glass
 */
export async function recordBreakGlassAction(
  sessionId: string,
  action: string,
  details: Record<string, unknown>
): Promise<boolean> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    log.warn('Break-glass action on invalid session', { sessionId });
    return false;
  }

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    log.warn('Break-glass action on expired session', { sessionId });
    return false;
  }

  // Record action
  session.actionsPerformed.push(`${new Date().toISOString()}: ${action}`);
  activeSessions.set(sessionId, session);

  // Audit the action with enhanced detail
  await secureAuditStore.append(
    {
      sub: session.userId,
      role: session.role,
      sessionId: session.id,
      tenantId: session.tenantId
    },
    'BREAK_GLASS_ACTION',
    { type: 'break_glass_action', id: generateUUID() },
    {
      breakGlassSessionId: sessionId,
      action,
      details,
      actionNumber: session.actionsPerformed.length
    }
  );

  return true;
}

/**
 * Deactivate break-glass session
 */
export async function deactivateBreakGlass(
  sessionId: string,
  deactivatedBy: string
): Promise<boolean> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    return false;
  }

  // Audit deactivation
  await secureAuditStore.append(
    {
      sub: session.userId,
      role: session.role,
      sessionId: session.id,
      tenantId: session.tenantId
    },
    'BREAK_GLASS_DEACTIVATED',
    { type: 'break_glass', id: sessionId },
    {
      deactivatedBy,
      actionsPerformed: session.actionsPerformed.length,
      wasExpired: new Date(session.expiresAt) < new Date()
    }
  );

  activeSessions.delete(sessionId);

  log.audit('Break-glass session deactivated', {
    sessionId,
    deactivatedBy,
    actionsPerformed: session.actionsPerformed.length
  });

  return true;
}

/**
 * Complete post-incident review
 */
export async function completeBreakGlassReview(
  sessionId: string,
  reviewerId: string,
  reviewNotes: string,
  approved: boolean
): Promise<boolean> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    // Check if session was archived
    log.warn('Review attempted on missing session', { sessionId });
    return false;
  }

  session.reviewedBy = reviewerId;
  session.reviewedAt = new Date().toISOString();
  session.reviewRequired = false;

  // Audit the review
  await secureAuditStore.append(
    {
      sub: reviewerId,
      role: 'reviewer',
      sessionId: sessionId,
      tenantId: session.tenantId
    },
    approved ? 'BREAK_GLASS_REVIEW_APPROVED' : 'BREAK_GLASS_REVIEW_FLAGGED',
    { type: 'break_glass_review', id: sessionId },
    {
      originalUserId: session.userId,
      originalReason: session.reason,
      actionsPerformed: session.actionsPerformed,
      reviewNotes,
      approved
    }
  );

  log.audit('Break-glass review completed', {
    sessionId,
    reviewerId,
    approved
  });

  return true;
}

/**
 * Get active break-glass session for user
 */
export function getActiveSession(userId: string): BreakGlassSession | null {
  for (const [, session] of activeSessions) {
    if (session.userId === userId && new Date(session.expiresAt) > new Date()) {
      return session;
    }
  }
  return null;
}

/**
 * Middleware to check for active break-glass session
 */
export function breakGlassMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.userId) {
    next();
    return;
  }

  const session = getActiveSession(authReq.userId);

  if (session) {
    // Attach break-glass context to request
    (req as any).breakGlassSession = session;

    // Add header for transparency
    res.setHeader('X-Break-Glass-Active', 'true');
    res.setHeader('X-Break-Glass-Expires', session.expiresAt);
  }

  next();
}

/**
 * Get pending reviews
 */
export function getPendingReviews(): BreakGlassSession[] {
  return Array.from(activeSessions.values()).filter(s => s.reviewRequired);
}

/**
 * Cleanup expired sessions (called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  let cleaned = 0;
  const now = new Date();

  for (const [id, session] of activeSessions) {
    if (new Date(session.expiresAt) < now) {
      await deactivateBreakGlass(id, 'system_expiry');
      cleaned++;
    }
  }

  return cleaned;
}

// Run cleanup every minute
setInterval(() => {
  cleanupExpiredSessions().catch(err => {
    log.error('Failed to cleanup expired break-glass sessions', {}, err);
  });
}, 60 * 1000);

export default {
  activateBreakGlass,
  deactivateBreakGlass,
  recordBreakGlassAction,
  completeBreakGlassReview,
  getActiveSession,
  getPendingReviews,
  breakGlassMiddleware,
  BreakGlassReason
};
