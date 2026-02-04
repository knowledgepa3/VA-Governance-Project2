/**
 * Auth Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuthProvider,
  getProviderByType,
  resetAuthProvider,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  checkAuthorization,
  getAllPermissions,
  hasRoleOrHigher,
  AuthProviderType,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  MockAuthProvider,
  AuthError,
  AuthErrorCode
} from '../../auth';

describe('Auth Provider Factory', () => {
  beforeEach(() => {
    resetAuthProvider();
    delete process.env.AUTH_PROVIDER;
  });

  describe('getAuthProvider', () => {
    it('should return mock provider by default', () => {
      const provider = getAuthProvider();
      expect(provider.providerType).toBe(AuthProviderType.MOCK);
    });

    it('should return same instance on subsequent calls', () => {
      const provider1 = getAuthProvider();
      const provider2 = getAuthProvider();
      expect(provider1).toBe(provider2);
    });
  });

  describe('getProviderByType', () => {
    it('should return mock provider', () => {
      const provider = getProviderByType(AuthProviderType.MOCK);
      expect(provider.providerType).toBe(AuthProviderType.MOCK);
    });
  });
});

describe('MockAuthProvider', () => {
  let provider: MockAuthProvider;

  beforeEach(() => {
    provider = new MockAuthProvider();
  });

  describe('isConfigured', () => {
    it('should always return true', () => {
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('login', () => {
    it('should authenticate valid user', async () => {
      const session = await provider.login({
        email: 'isso@example.com',
        password: 'demo'
      });
      expect(session.user.email).toBe('isso@example.com');
      expect(session.user.role).toBe(UserRole.ISSO);
      expect(session.accessToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      await expect(provider.login({
        email: 'invalid@example.com',
        password: 'demo'
      })).rejects.toThrow(AuthError);
    });

    it('should reject invalid password', async () => {
      await expect(provider.login({
        email: 'isso@example.com',
        password: 'wrong'
      })).rejects.toThrow(AuthError);
    });
  });

  describe('loginAsRole', () => {
    it('should login as specific role', async () => {
      const session = await provider.loginAsRole(UserRole.ANALYST);
      expect(session.user.role).toBe(UserRole.ANALYST);
    });

    it('should login as BD Manager', async () => {
      const session = await provider.loginAsRole(UserRole.BD_MANAGER);
      expect(session.user.role).toBe(UserRole.BD_MANAGER);
    });
  });

  describe('validateToken', () => {
    it('should validate valid token', async () => {
      const session = await provider.login({
        email: 'isso@example.com',
        password: 'demo'
      });
      const user = await provider.validateToken(session.accessToken);
      expect(user).not.toBeNull();
      expect(user?.email).toBe('isso@example.com');
    });

    it('should reject invalid token', async () => {
      const user = await provider.validateToken('invalid-token');
      expect(user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should invalidate session', async () => {
      const session = await provider.login({
        email: 'isso@example.com',
        password: 'demo'
      });
      await provider.logout(session);
      const user = await provider.validateToken(session.accessToken);
      expect(user).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all mock users', () => {
      const users = provider.getAllUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users.find(u => u.role === UserRole.ISSO)).toBeDefined();
    });
  });
});

describe('Authorization', () => {
  const issoUser = {
    id: 'user-1',
    tenantId: 'default',
    email: 'isso@example.com',
    displayName: 'ISSO User',
    role: UserRole.ISSO,
    permissions: ROLE_PERMISSIONS[UserRole.ISSO],
    provider: AuthProviderType.MOCK,
    isActive: true
  };

  const viewerUser = {
    id: 'user-2',
    tenantId: 'default',
    email: 'viewer@example.com',
    displayName: 'Viewer User',
    role: UserRole.VIEWER,
    permissions: ROLE_PERMISSIONS[UserRole.VIEWER],
    provider: AuthProviderType.MOCK,
    isActive: true
  };

  const disabledUser = {
    ...viewerUser,
    id: 'user-3',
    isActive: false
  };

  describe('hasPermission', () => {
    it('should return true for ISSO with any permission', () => {
      expect(hasPermission(issoUser, Permission.WORKFLOW_EXECUTE)).toBe(true);
      expect(hasPermission(issoUser, Permission.SYSTEM_CONFIGURE)).toBe(true);
    });

    it('should return false for viewer with admin permission', () => {
      expect(hasPermission(viewerUser, Permission.SYSTEM_CONFIGURE)).toBe(false);
    });

    it('should return true for viewer with view permission', () => {
      expect(hasPermission(viewerUser, Permission.WORKFLOW_VIEW)).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      expect(hasAllPermissions(issoUser, [
        Permission.WORKFLOW_VIEW,
        Permission.WORKFLOW_EXECUTE
      ])).toBe(true);
    });

    it('should return false when user missing one permission', () => {
      expect(hasAllPermissions(viewerUser, [
        Permission.WORKFLOW_VIEW,
        Permission.WORKFLOW_EXECUTE
      ])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      expect(hasAnyPermission(viewerUser, [
        Permission.WORKFLOW_VIEW,
        Permission.SYSTEM_CONFIGURE
      ])).toBe(true);
    });

    it('should return false when user has none', () => {
      expect(hasAnyPermission(viewerUser, [
        Permission.SYSTEM_CONFIGURE,
        Permission.USER_MANAGE
      ])).toBe(false);
    });
  });

  describe('checkAuthorization', () => {
    it('should allow authorized user', () => {
      const result = checkAuthorization(issoUser, [Permission.WORKFLOW_EXECUTE]);
      expect(result.allowed).toBe(true);
    });

    it('should deny unauthorized user', () => {
      const result = checkAuthorization(viewerUser, [Permission.SYSTEM_CONFIGURE]);
      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toContain(Permission.SYSTEM_CONFIGURE);
    });

    it('should deny disabled user', () => {
      const result = checkAuthorization(disabledUser, [Permission.WORKFLOW_VIEW]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions for ISSO', () => {
      const permissions = getAllPermissions(issoUser);
      expect(permissions.length).toBeGreaterThan(10);
    });
  });

  describe('hasRoleOrHigher', () => {
    it('should return true for same role', () => {
      expect(hasRoleOrHigher(issoUser, UserRole.ISSO)).toBe(true);
    });

    it('should return true for higher role', () => {
      expect(hasRoleOrHigher(issoUser, UserRole.ANALYST)).toBe(true);
    });

    it('should return false for lower role', () => {
      expect(hasRoleOrHigher(viewerUser, UserRole.ANALYST)).toBe(false);
    });
  });
});
