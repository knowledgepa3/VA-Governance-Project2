/**
 * Authorization Service
 *
 * Provides permission checking and access control enforcement.
 * Implements NIST 800-53 AC-3 (Access Enforcement).
 */

import {
  AuthUser,
  AuthSession,
  Permission,
  UserRole,
  ROLE_PERMISSIONS,
  AuthorizationResult,
  AuthError,
  AuthErrorCode
} from './types';

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  // Check explicit permissions first
  if (user.permissions.includes(permission)) {
    return true;
  }

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Check authorization and return detailed result
 */
export function checkAuthorization(
  user: AuthUser,
  requiredPermissions: Permission[],
  requireAll: boolean = true
): AuthorizationResult {
  if (!user.isActive) {
    return {
      allowed: false,
      reason: 'User account is disabled'
    };
  }

  const check = requireAll ? hasAllPermissions : hasAnyPermission;

  if (check(user, requiredPermissions)) {
    return { allowed: true };
  }

  const missingPermissions = requiredPermissions.filter(p => !hasPermission(user, p));

  return {
    allowed: false,
    reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
    missingPermissions
  };
}

/**
 * Require authorization - throws if not authorized
 */
export function requireAuthorization(
  user: AuthUser,
  requiredPermissions: Permission[],
  requireAll: boolean = true
): void {
  const result = checkAuthorization(user, requiredPermissions, requireAll);

  if (!result.allowed) {
    throw new AuthError(
      result.reason || 'Unauthorized',
      AuthErrorCode.FORBIDDEN
    );
  }
}

/**
 * Authorization decorator for class methods
 * Usage: @authorize(Permission.WORKFLOW_EXECUTE)
 */
export function authorize(...permissions: Permission[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Expect first argument to be session or user
      const sessionOrUser = args[0];
      const user = 'user' in sessionOrUser ? sessionOrUser.user : sessionOrUser;

      requireAuthorization(user, permissions);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Express middleware for route authorization
 */
export function requirePermissions(...permissions: Permission[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: AuthErrorCode.UNAUTHORIZED
      });
    }

    const result = checkAuthorization(user, permissions);

    if (!result.allowed) {
      return res.status(403).json({
        error: result.reason,
        code: AuthErrorCode.FORBIDDEN,
        missingPermissions: result.missingPermissions
      });
    }

    next();
  };
}

/**
 * Check if user can perform action on resource (future ABAC support)
 */
export interface ResourceContext {
  resourceType: string;
  resourceId: string;
  ownerId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export function canAccessResource(
  user: AuthUser,
  action: Permission,
  resource: ResourceContext
): AuthorizationResult {
  // Basic permission check
  if (!hasPermission(user, action)) {
    return {
      allowed: false,
      reason: `Missing permission: ${action}`,
      missingPermissions: [action]
    };
  }

  // Tenant isolation check
  if (resource.tenantId && resource.tenantId !== user.tenantId) {
    return {
      allowed: false,
      reason: 'Resource belongs to different tenant'
    };
  }

  // Future: Add attribute-based checks here
  // - Resource ownership
  // - Time-based access
  // - Environment conditions

  return { allowed: true };
}

/**
 * Get all permissions for a user (role + explicit)
 */
export function getAllPermissions(user: AuthUser): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  const allPermissions = new Set([...rolePermissions, ...user.permissions]);
  return Array.from(allPermissions);
}

/**
 * Check if user has higher or equal role
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ISSO]: 100,
  [UserRole.ADMIN]: 90,
  [UserRole.FORENSIC_SME]: 70,
  [UserRole.BD_MANAGER]: 60,
  [UserRole.ANALYST]: 50,
  [UserRole.CAPTURE_MANAGER]: 50,
  [UserRole.AUDITOR]: 40,
  [UserRole.VIEWER]: 10
};

export function hasRoleOrHigher(user: AuthUser, role: UserRole): boolean {
  return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[role] || 0);
}
