/**
 * Auth Module
 *
 * Provides vendor-agnostic authentication and authorization for ACE.
 *
 * Key Features:
 * - Pluggable auth providers (Mock, Auth0, Login.gov, Azure AD, Okta)
 * - Role-based access control (RBAC)
 * - Permission-based authorization
 * - Federal identity support (Login.gov, PIV/CAC)
 *
 * Usage:
 *   import { getAuthProvider, hasPermission, Permission, UserRole } from './auth';
 *
 *   // Get auth provider (auto-detected from environment)
 *   const auth = getAuthProvider();
 *
 *   // Login
 *   const session = await auth.login({ email: 'user@example.com', password: '...' });
 *
 *   // Check permission
 *   if (hasPermission(session.user, Permission.WORKFLOW_EXECUTE)) {
 *     // User can execute workflows
 *   }
 *
 * Environment Variables:
 *   AUTH_PROVIDER - Override provider (mock, auth0, login_gov, azure_ad, okta)
 *
 *   # Auth0
 *   AUTH0_DOMAIN - Auth0 tenant domain
 *   AUTH0_CLIENT_ID - Application client ID
 *   AUTH0_CLIENT_SECRET - Application client secret
 *   AUTH0_AUDIENCE - API audience
 *
 *   # Login.gov
 *   LOGIN_GOV_ISSUER - Login.gov issuer URL
 *   LOGIN_GOV_CLIENT_ID - Application client ID
 *   LOGIN_GOV_PRIVATE_KEY - RSA private key for JWT signing
 *   LOGIN_GOV_ACR_VALUES - IAL/AAL levels
 *
 * Compliance:
 *   - IA-2: Identification and Authentication
 *   - IA-5: Authenticator Management
 *   - AC-2: Account Management
 *   - AC-3: Access Enforcement
 *
 * @module auth
 */

// Types
export {
  AuthProviderType,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  AuthUser,
  AuthSession,
  LoginCredentials,
  OAuthCallback,
  AuthProvider,
  AuthProviderConfig,
  AuthorizationResult,
  AuthError,
  AuthErrorCode
} from './types';

// Factory
export {
  getAuthProvider,
  getProviderByType,
  getAvailableProviders,
  resetAuthProvider
} from './factory';

// Authorization
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  checkAuthorization,
  requireAuthorization,
  authorize,
  requirePermissions,
  canAccessResource,
  getAllPermissions,
  hasRoleOrHigher,
  ResourceContext
} from './authorization';

// Providers (for direct instantiation if needed)
export { MockAuthProvider } from './providers/mock';
export { Auth0Provider } from './providers/auth0';
export { LoginGovProvider, IdentityAssuranceLevel, AuthenticationAssuranceLevel } from './providers/loginGov';
