/**
 * Action Gateway
 *
 * Central control point for ALL agent actions:
 * - Browser automation
 * - HTTP requests
 * - File operations
 * - Email/CRM actions
 *
 * CRITICAL: Agents can ONLY execute actions through this gateway.
 * Direct execution bypasses governance and is not allowed.
 */

import { Request, Response, Router } from 'express';
import { logger, getCurrentContext, updateContext } from '../logger';
import { auditService } from '../audit/auditService';
import { generateUUID, fingerprint } from '../utils/crypto';
import { requireAuth, requireSOD, AuthenticatedRequest } from '../auth/middleware';

const log = logger.child({ component: 'ActionGateway' });

/**
 * Action types supported by the gateway
 */
export enum ActionType {
  // Browser actions
  NAVIGATE = 'NAVIGATE',
  CLICK = 'CLICK',
  TYPE = 'TYPE',
  SCREENSHOT = 'SCREENSHOT',

  // Form actions
  SUBMIT = 'SUBMIT',
  UPLOAD = 'UPLOAD',

  // Data actions
  DOWNLOAD = 'DOWNLOAD',
  EXTRACT = 'EXTRACT',
  EXPORT = 'EXPORT',

  // Communication actions
  SEND_EMAIL = 'SEND_EMAIL',
  API_CALL = 'API_CALL',

  // Prohibited actions (always blocked)
  AUTH = 'AUTH',
  CAPTCHA = 'CAPTCHA'
}

/**
 * Action classification for governance
 */
export enum ActionClassification {
  INFORMATIONAL = 'INFORMATIONAL',  // Auto-allowed, logged
  ADVISORY = 'ADVISORY',            // Allowed with warning, logged
  MANDATORY = 'MANDATORY',          // Requires approval, logged
  PROHIBITED = 'PROHIBITED'         // Always blocked, logged
}

/**
 * Action request
 */
interface ActionRequest {
  type: ActionType;
  target: string;
  value?: string;
  context?: Record<string, unknown>;
  agentRunId: string;
  stepId?: string;
}

/**
 * Action result
 */
interface ActionResult {
  success: boolean;
  actionId: string;
  type: ActionType;
  classification: ActionClassification;
  data?: unknown;
  error?: string;
  requiresApproval?: boolean;
  approvalId?: string;
}

/**
 * Pending approvals (in production, use Redis/DB)
 */
const pendingApprovals = new Map<string, {
  request: ActionRequest;
  userId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}>();

const APPROVAL_TIMEOUT_MS = 3600000; // 1 hour

/**
 * Classify an action
 */
function classifyAction(type: ActionType, target: string): ActionClassification {
  // Prohibited actions
  if (type === ActionType.AUTH || type === ActionType.CAPTCHA) {
    return ActionClassification.PROHIBITED;
  }

  // Check for government domains (always MANDATORY)
  const governmentDomains = ['va.gov', 'sam.gov', 'login.gov', 'usajobs.gov'];
  if (governmentDomains.some(d => target.includes(d))) {
    return ActionClassification.MANDATORY;
  }

  // MANDATORY actions
  if ([ActionType.SUBMIT, ActionType.SEND_EMAIL, ActionType.EXPORT].includes(type)) {
    return ActionClassification.MANDATORY;
  }

  // ADVISORY actions
  if ([ActionType.DOWNLOAD, ActionType.UPLOAD, ActionType.API_CALL].includes(type)) {
    return ActionClassification.ADVISORY;
  }

  // INFORMATIONAL actions
  return ActionClassification.INFORMATIONAL;
}

/**
 * Validate action target (URL, path, etc.)
 */
function validateTarget(type: ActionType, target: string): { valid: boolean; error?: string } {
  // Check for dangerous protocols
  if (target.startsWith('javascript:') || target.startsWith('data:') || target.startsWith('file:')) {
    return { valid: false, error: 'Dangerous protocol' };
  }

  // For URLs, validate format
  if ([ActionType.NAVIGATE, ActionType.API_CALL].includes(type)) {
    try {
      const url = new URL(target);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Only HTTP/HTTPS allowed' };
      }
    } catch {
      return { valid: false, error: 'Invalid URL' };
    }
  }

  // Block sensitive keywords
  const blockedKeywords = ['password', 'credential', 'secret', 'token', 'api_key'];
  const targetLower = target.toLowerCase();
  for (const keyword of blockedKeywords) {
    if (targetLower.includes(keyword)) {
      return { valid: false, error: `Contains blocked keyword: ${keyword}` };
    }
  }

  return { valid: true };
}

/**
 * Execute an action (this is where actual execution would happen)
 * In a real implementation, this would call browser automation, HTTP clients, etc.
 */
async function executeAction(
  type: ActionType,
  target: string,
  value?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Placeholder implementation
  // In production, this would route to actual executors
  log.info('Executing action', { type, target: fingerprint(target) });

  switch (type) {
    case ActionType.NAVIGATE:
    case ActionType.CLICK:
    case ActionType.TYPE:
    case ActionType.SCREENSHOT:
      // Browser automation would go here
      return { success: true, data: { executed: type } };

    case ActionType.DOWNLOAD:
    case ActionType.UPLOAD:
    case ActionType.EXTRACT:
      // File operations would go here
      return { success: true, data: { executed: type } };

    case ActionType.API_CALL:
      // HTTP client would go here
      return { success: true, data: { executed: type } };

    default:
      return { success: false, error: `Unsupported action type: ${type}` };
  }
}

/**
 * Handle action request
 */
async function handleActionRequest(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const actionId = generateUUID();
  const ctx = getCurrentContext();

  const { type, target, value, context, agentRunId, stepId } = req.body as ActionRequest;

  try {
    // Validate target
    const validation = validateTarget(type, target);
    if (!validation.valid) {
      log.warn('Action target validation failed', {
        type,
        reason: validation.error
      });

      res.status(400).json({
        success: false,
        actionId,
        type,
        error: validation.error
      });
      return;
    }

    // Classify action
    const classification = classifyAction(type, target);

    // Log action request
    await auditService.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      'GATE_APPROVAL_REQUESTED',
      { type: 'action', id: actionId },
      {
        actionType: type,
        classification,
        targetFingerprint: fingerprint(target),
        agentRunId,
        stepId
      }
    );

    // Handle PROHIBITED actions
    if (classification === ActionClassification.PROHIBITED) {
      log.warn('Prohibited action blocked', {
        type,
        userId: authReq.userId
      });

      res.status(403).json({
        success: false,
        actionId,
        type,
        classification,
        error: 'Action is prohibited by policy'
      });
      return;
    }

    // Handle MANDATORY actions (require approval)
    if (classification === ActionClassification.MANDATORY) {
      const approvalId = generateUUID();

      pendingApprovals.set(approvalId, {
        request: { type, target, value, context, agentRunId, stepId },
        userId: authReq.userId,
        role: authReq.role,
        createdAt: Date.now(),
        expiresAt: Date.now() + APPROVAL_TIMEOUT_MS
      });

      log.info('Action requires approval', {
        actionId,
        approvalId,
        type
      });

      res.status(202).json({
        success: false,
        actionId,
        type,
        classification,
        requiresApproval: true,
        approvalId,
        expiresAt: new Date(Date.now() + APPROVAL_TIMEOUT_MS).toISOString()
      });
      return;
    }

    // Execute INFORMATIONAL and ADVISORY actions
    const result = await executeAction(type, target, value);

    // Log completion
    await auditService.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      result.success ? 'WORKFLOW_STEP_COMPLETED' : 'WORKFLOW_FAILED',
      { type: 'action', id: actionId },
      {
        actionType: type,
        classification,
        success: result.success,
        error: result.error
      }
    );

    const response: ActionResult = {
      success: result.success,
      actionId,
      type,
      classification,
      data: result.data,
      error: result.error
    };

    res.json(response);

  } catch (error) {
    log.error('Action gateway error', {}, error as Error);

    res.status(500).json({
      success: false,
      actionId,
      type,
      error: 'Internal error',
      correlationId: ctx?.correlationId
    });
  }
}

/**
 * Handle approval decision
 */
async function handleApproval(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { approvalId, approved, attestation } = req.body;

  const pending = pendingApprovals.get(approvalId);

  if (!pending) {
    res.status(404).json({ error: 'Approval not found or expired' });
    return;
  }

  // Check expiration
  if (Date.now() > pending.expiresAt) {
    pendingApprovals.delete(approvalId);

    await auditService.append(
      {
        sub: pending.userId,
        role: pending.role,
        sessionId: authReq.sessionId
      },
      'GATE_TIMEOUT',
      { type: 'approval', id: approvalId },
      { actionType: pending.request.type }
    );

    res.status(410).json({ error: 'Approval expired' });
    return;
  }

  // Remove from pending
  pendingApprovals.delete(approvalId);

  // Log decision
  await auditService.append(
    {
      sub: authReq.userId,
      role: authReq.role,
      sessionId: authReq.sessionId,
      tenantId: authReq.tenantId
    },
    approved ? 'GATE_APPROVED' : 'GATE_REJECTED',
    { type: 'approval', id: approvalId },
    {
      actionType: pending.request.type,
      approvedBy: authReq.userId,
      approverRole: authReq.role,
      originalRequestor: pending.userId,
      attestation
    }
  );

  if (!approved) {
    res.json({
      success: false,
      approved: false,
      message: 'Action rejected'
    });
    return;
  }

  // Execute the approved action
  const result = await executeAction(
    pending.request.type,
    pending.request.target,
    pending.request.value
  );

  res.json({
    success: result.success,
    approved: true,
    data: result.data,
    error: result.error
  });
}

/**
 * Get pending approvals for a user
 */
async function getPendingApprovals(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const now = Date.now();

  // Clean up expired approvals
  for (const [id, approval] of pendingApprovals.entries()) {
    if (now > approval.expiresAt) {
      pendingApprovals.delete(id);
    }
  }

  // Filter approvals this user can act on
  // (they shouldn't be the requestor - SOD)
  const approvals = Array.from(pendingApprovals.entries())
    .filter(([_, a]) => a.userId !== authReq.userId)
    .map(([id, a]) => ({
      approvalId: id,
      actionType: a.request.type,
      requestedBy: a.userId,
      requestedByRole: a.role,
      createdAt: new Date(a.createdAt).toISOString(),
      expiresAt: new Date(a.expiresAt).toISOString()
    }));

  res.json({ approvals });
}

/**
 * Create router
 */
export function createActionGatewayRouter(): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // Execute action
  router.post('/execute', handleActionRequest);

  // Approve/reject action (with SOD check)
  router.post('/approve', requireSOD((req) => ({
    actionType: `approve:${req.body.actionType}`,
    resourceId: req.body.approvalId,
    // Get initiator from pending approval
    initiatorId: pendingApprovals.get(req.body.approvalId)?.userId
  })), handleApproval);

  // Get pending approvals
  router.get('/pending', getPendingApprovals);

  return router;
}

export default createActionGatewayRouter;
