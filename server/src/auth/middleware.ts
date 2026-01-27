/**
 * Authentication Middleware
 *
 * Express middleware for:
 * - JWT verification (fail-closed)
 * - Role-based access control
 * - Separation of Duties enforcement
 *
 * CRITICAL: All protected routes MUST use requireAuth middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJwt, JWTClaims, JWTError, hasPermission, checkSeparationOfDuties, SODContext } from './jwt';
import { logger, updateContext } from '../logger';
import { auditService } from '../audit/auditService';

const log = logger.child({ component: 'AuthMiddleware' });

/**
 * Extended Request with auth info
 */
export interface AuthenticatedRequest extends Request {
  auth: JWTClaims;
  userId: string;
  sessionId: string;
  tenantId?: string;
  role: string;
}

/**
 * Require authentication middleware
 *
 * FAIL-CLOSED: Request is rejected if auth fails
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      log.warn('Missing authorization header', {
        path: req.path,
        method: req.method
      });

      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      log.warn('Invalid authorization format', {
        path: req.path
      });

      res.status(401).json({
        error: 'Invalid authorization format',
        code: 'INVALID_AUTH_FORMAT'
      });
      return;
    }

    const token = authHeader.slice(7);

    // Verify token (this throws on failure)
    const claims = verifyJwt(token);

    // Attach to request
    const authReq = req as AuthenticatedRequest;
    authReq.auth = claims;
    authReq.userId = claims.sub;
    authReq.sessionId = claims.sessionId;
    authReq.tenantId = claims.tenantId;
    authReq.role = claims.role;

    // Update correlation context with user info
    updateContext({
      userId: claims.sub,
      sessionId: claims.sessionId,
      tenantId: claims.tenantId
    });

    log.debug('Authentication successful', {
      userId: claims.sub,
      role: claims.role
    });

    next();
  } catch (error) {
    if (error instanceof JWTError) {
      log.warn('JWT verification failed', {
        code: error.code,
        message: error.message,
        path: req.path
      });

      // Log failed auth attempt
      auditService.append(
        {
          sub: 'anonymous',
          role: 'anonymous',
          sessionId: 'none'
        },
        'AUTH_FAILED',
        { type: 'auth_attempt', id: 'jwt_verify' },
        {
          reason: error.code,
          path: req.path,
          ip: req.ip
        }
      ).catch(err => {
        log.error('Failed to audit auth failure', {}, err);
      });

      res.status(401).json({
        error: error.message,
        code: error.code
      });
      return;
    }

    log.error('Unexpected auth error', {}, error as Error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Require specific role(s)
 *
 * Must be used AFTER requireAuth
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.auth) {
      log.error('requireRole used without requireAuth');
      res.status(500).json({
        error: 'Server configuration error',
        code: 'MIDDLEWARE_ORDER'
      });
      return;
    }

    // ISSO always has access
    if (authReq.role === 'ISSO / ACE Architect') {
      next();
      return;
    }

    if (!allowedRoles.includes(authReq.role)) {
      log.warn('Role access denied', {
        userId: authReq.userId,
        role: authReq.role,
        requiredRoles: allowedRoles,
        path: req.path
      });

      res.status(403).json({
        error: 'Access denied: insufficient role',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles
      });
      return;
    }

    next();
  };
}

/**
 * Require specific permission
 *
 * Must be used AFTER requireAuth
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.auth) {
      log.error('requirePermission used without requireAuth');
      res.status(500).json({
        error: 'Server configuration error',
        code: 'MIDDLEWARE_ORDER'
      });
      return;
    }

    if (!hasPermission(authReq.auth, permission)) {
      log.warn('Permission denied', {
        userId: authReq.userId,
        role: authReq.role,
        requiredPermission: permission,
        path: req.path
      });

      res.status(403).json({
        error: 'Access denied: insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermission: permission
      });
      return;
    }

    next();
  };
}

/**
 * Require Separation of Duties check
 *
 * Must be used AFTER requireAuth
 * Validates that the user can perform the action based on SOD rules
 */
export function requireSOD(getContext: (req: Request) => SODContext) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.auth) {
      log.error('requireSOD used without requireAuth');
      res.status(500).json({
        error: 'Server configuration error',
        code: 'MIDDLEWARE_ORDER'
      });
      return;
    }

    try {
      const sodContext = getContext(req);
      const result = checkSeparationOfDuties(authReq.auth, sodContext);

      if (!result.allowed) {
        log.warn('SOD violation', {
          userId: authReq.userId,
          role: authReq.role,
          actionType: sodContext.actionType,
          reason: result.reason,
          path: req.path
        });

        // Audit the SOD violation
        await auditService.append(
          {
            sub: authReq.userId,
            role: authReq.role,
            sessionId: authReq.sessionId,
            tenantId: authReq.tenantId
          },
          'SOD_VIOLATION',
          { type: sodContext.actionType, id: sodContext.resourceId },
          {
            reason: result.reason,
            initiatorId: sodContext.initiatorId,
            previousApprovers: sodContext.previousApprovers
          }
        );

        res.status(403).json({
          error: 'Access denied: Separation of Duties violation',
          code: 'SOD_VIOLATION',
          reason: result.reason
        });
        return;
      }

      next();
    } catch (error) {
      log.error('SOD check error', {}, error as Error);
      res.status(500).json({
        error: 'SOD verification failed',
        code: 'SOD_ERROR'
      });
    }
  };
}

/**
 * Optional authentication
 *
 * Attaches auth info if token present, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.slice(7);
    const claims = verifyJwt(token);

    const authReq = req as AuthenticatedRequest;
    authReq.auth = claims;
    authReq.userId = claims.sub;
    authReq.sessionId = claims.sessionId;
    authReq.tenantId = claims.tenantId;
    authReq.role = claims.role;

    updateContext({
      userId: claims.sub,
      sessionId: claims.sessionId,
      tenantId: claims.tenantId
    });
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
}

export default {
  requireAuth,
  requireRole,
  requirePermission,
  requireSOD,
  optionalAuth
};
