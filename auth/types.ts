/**
 * Auth Provider Abstraction Layer - Type Definitions
 *
 * This module defines the contract for authentication providers, enabling:
 * - Vendor-agnostic authentication
 * - Future deployment with Login.gov, Auth0, Azure AD, Okta
 * - PIV/CAC support for federal environments
 * - Role-based access control (RBAC)
 *
 * Compliance Mapping:
 * - IA-2: Identification and Authentication
 * - IA-5: Authenticator Management
 * - AC-2: Account Management
 * - AC-3: Access Enforcement
 */

/**
 * Supported authentication providers
 */
export enum AuthProviderType {
  /** Mock provider for demos/development */
  MOCK = 'mock',

  /** Auth0 - Commercial identity provider */
  AUTH0 = 'auth0',

  /** Login.gov - Federal identity provider (FedRAMP) */
  LOGIN_GOV = 'login_gov',

  /** Azure AD / Entra ID - Microsoft identity */
  AZURE_AD = 'azure_ad',

  /** Okta - Enterprise identity */
  OKTA = 'okta',

  /** PIV/CAC - Federal smart card authentication */
  PIV_CAC = 'piv_cac'
}

/**
 * User roles in the system
 * Maps to NIST AC-2 account types
 */
export enum UserRole {
  /** Information System Security Officer */
  ISSO = 'ISSO',

  /** System Administrator */
  ADMIN = 'ADMIN',

  /** Security Analyst */
  ANALYST = 'ANALYST',

  /** Auditor (read-only) */
  AUDITOR = 'AUDITOR',

  /** Business Development Manager */
  BD_MANAGER = 'BD_MANAGER',

  /** Capture Manager */
  CAPTURE_MANAGER = 'CAPTURE_MANAGER',

  /** Forensic Subject Matter Expert */
  FORENSIC_SME = 'FORENSIC_SME',

  /** Read-only viewer */
  VIEWER = 'VIEWER'
}

/**
 * Permission actions
 */
export enum Permission {
  // Workflow permissions
  WORKFLOW_VIEW = 'workflow:view',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_APPROVE = 'workflow:approve',
  WORKFLOW_CREATE = 'workflow:create',

  // Audit permissions
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',
  AUDIT_VERIFY = 'audit:verify',

  // BD permissions
  OPPORTUNITY_VIEW = 'opportunity:view',
  OPPORTUNITY_QUALIFY = 'opportunity:qualify',
  OPPORTUNITY_DECIDE = 'opportunity:decide',

  // Admin permissions
  USER_MANAGE = 'user:manage',
  SETTINGS_MANAGE = 'settings:manage',
  SYSTEM_CONFIGURE = 'system:configure',

  // Red Team permissions
  REDTEAM_VIEW = 'redteam:view',
  REDTEAM_EXECUTE = 'redteam:execute'
}

/**
 * Default role-permission mappings
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ISSO]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_APPROVE,
    Permission.WORKFLOW_CREATE,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.AUDIT_VERIFY,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_QUALIFY,
    Permission.OPPORTUNITY_DECIDE,
    Permission.USER_MANAGE,
    Permission.SETTINGS_MANAGE,
    Permission.SYSTEM_CONFIGURE,
    Permission.REDTEAM_VIEW,
    Permission.REDTEAM_EXECUTE
  ],
  [UserRole.ADMIN]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_CREATE,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.USER_MANAGE,
    Permission.SETTINGS_MANAGE,
    Permission.SYSTEM_CONFIGURE
  ],
  [UserRole.ANALYST]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.AUDIT_VIEW,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_QUALIFY,
    Permission.REDTEAM_VIEW
  ],
  [UserRole.AUDITOR]: [
    Permission.WORKFLOW_VIEW,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.AUDIT_VERIFY,
    Permission.OPPORTUNITY_VIEW
  ],
  [UserRole.BD_MANAGER]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_QUALIFY,
    Permission.OPPORTUNITY_DECIDE
  ],
  [UserRole.CAPTURE_MANAGER]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_QUALIFY
  ],
  [UserRole.FORENSIC_SME]: [
    Permission.WORKFLOW_VIEW,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_APPROVE,
    Permission.AUDIT_VIEW,
    Permission.REDTEAM_VIEW
  ],
  [UserRole.VIEWER]: [
    Permission.WORKFLOW_VIEW,
    Permission.AUDIT_VIEW,
    Permission.OPPORTUNITY_VIEW
  ]
};

/**
 * Authenticated user
 */
export interface AuthUser {
  /** Unique user ID (from auth provider) */
  id: string;

  /** Tenant ID for multi-tenant deployments */
  tenantId: string;

  /** Email address */
  email: string;

  /** Display name */
  displayName: string;

  /** Primary role */
  role: UserRole;

  /** Explicit permissions (override role defaults) */
  permissions: Permission[];

  /** Auth provider that authenticated this user */
  provider: AuthProviderType;

  /** Provider-specific metadata */
  providerMetadata?: Record<string, any>;

  /** Profile picture URL */
  avatarUrl?: string;

  /** Last login timestamp */
  lastLoginAt?: Date;

  /** Account active status */
  isActive: boolean;
}

/**
 * Session information
 */
export interface AuthSession {
  /** Session ID */
  id: string;

  /** Authenticated user */
  user: AuthUser;

  /** Session start time */
  startedAt: Date;

  /** Session expiration time */
  expiresAt: Date;

  /** Access token (for API calls) */
  accessToken: string;

  /** Refresh token (if supported) */
  refreshToken?: string;

  /** IP address */
  ipAddress?: string;

  /** User agent */
  userAgent?: string;
}

/**
 * Login credentials (for password-based auth)
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * OAuth/OIDC callback data
 */
export interface OAuthCallback {
  code: string;
  state: string;
  redirectUri: string;
}

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  type: AuthProviderType;

  /** Auth0 configuration */
  auth0?: {
    domain: string;
    clientId: string;
    clientSecret: string;
    audience: string;
  };

  /** Login.gov configuration */
  loginGov?: {
    issuer: string;
    clientId: string;
    privateKey: string;
    acrValues: string;  // IAL/AAL levels
  };

  /** Azure AD configuration */
  azureAd?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };

  /** Okta configuration */
  okta?: {
    domain: string;
    clientId: string;
    clientSecret: string;
  };

  /** Session configuration */
  session?: {
    expiresInSeconds: number;
    refreshEnabled: boolean;
  };
}

/**
 * Auth provider interface
 * All providers must implement this contract
 */
export interface AuthProvider {
  /** Provider type identifier */
  readonly providerType: AuthProviderType;

  /** Human-readable provider name */
  readonly displayName: string;

  /**
   * Get the authorization URL for OAuth/OIDC flow
   */
  getAuthorizationUrl(state: string, redirectUri: string): Promise<string>;

  /**
   * Handle OAuth/OIDC callback and create session
   */
  handleCallback(callback: OAuthCallback): Promise<AuthSession>;

  /**
   * Login with credentials (if supported)
   */
  login?(credentials: LoginCredentials): Promise<AuthSession>;

  /**
   * Validate and decode an access token
   */
  validateToken(token: string): Promise<AuthUser | null>;

  /**
   * Refresh an expired session
   */
  refreshSession?(session: AuthSession): Promise<AuthSession>;

  /**
   * Logout and invalidate session
   */
  logout(session: AuthSession): Promise<void>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<AuthUser | null>;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;
}

/**
 * Authorization check result
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: Permission[];
}

/**
 * Auth error
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly provider?: AuthProviderType
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  MFA_REQUIRED = 'MFA_REQUIRED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN'
}
