/**
 * Mock Auth Provider
 *
 * Provides authentication for demos and development.
 * No external dependencies - works out of the box.
 *
 * Usage:
 *   const auth = new MockAuthProvider();
 *   const session = await auth.login({ email: 'isso@example.com', password: 'demo' });
 */

import {
  AuthProvider,
  AuthProviderType,
  AuthUser,
  AuthSession,
  LoginCredentials,
  OAuthCallback,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  AuthError,
  AuthErrorCode
} from '../types';

/**
 * Mock user database
 */
const MOCK_USERS: AuthUser[] = [
  {
    id: 'user-isso-001',
    tenantId: 'default',
    email: 'isso@example.com',
    displayName: 'Jane Smith (ISSO)',
    role: UserRole.ISSO,
    permissions: ROLE_PERMISSIONS[UserRole.ISSO],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-analyst-001',
    tenantId: 'default',
    email: 'analyst@example.com',
    displayName: 'Bob Johnson (Analyst)',
    role: UserRole.ANALYST,
    permissions: ROLE_PERMISSIONS[UserRole.ANALYST],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-auditor-001',
    tenantId: 'default',
    email: 'auditor@example.com',
    displayName: 'Carol Williams (Auditor)',
    role: UserRole.AUDITOR,
    permissions: ROLE_PERMISSIONS[UserRole.AUDITOR],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-bd-001',
    tenantId: 'default',
    email: 'bd@example.com',
    displayName: 'David Lee (BD Manager)',
    role: UserRole.BD_MANAGER,
    permissions: ROLE_PERMISSIONS[UserRole.BD_MANAGER],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-capture-001',
    tenantId: 'default',
    email: 'capture@example.com',
    displayName: 'Emily Chen (Capture Manager)',
    role: UserRole.CAPTURE_MANAGER,
    permissions: ROLE_PERMISSIONS[UserRole.CAPTURE_MANAGER],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-forensic-001',
    tenantId: 'default',
    email: 'forensic@example.com',
    displayName: 'Frank Miller (Forensic SME)',
    role: UserRole.FORENSIC_SME,
    permissions: ROLE_PERMISSIONS[UserRole.FORENSIC_SME],
    provider: AuthProviderType.MOCK,
    isActive: true
  },
  {
    id: 'user-viewer-001',
    tenantId: 'default',
    email: 'viewer@example.com',
    displayName: 'Grace Taylor (Viewer)',
    role: UserRole.VIEWER,
    permissions: ROLE_PERMISSIONS[UserRole.VIEWER],
    provider: AuthProviderType.MOCK,
    isActive: true
  }
];

/**
 * In-memory session store
 */
const sessions = new Map<string, AuthSession>();

export class MockAuthProvider implements AuthProvider {
  readonly providerType = AuthProviderType.MOCK;
  readonly displayName = 'Mock Provider (Demo/Development)';

  private sessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  isConfigured(): boolean {
    return true; // Always configured
  }

  async getAuthorizationUrl(state: string, redirectUri: string): Promise<string> {
    // Mock OAuth URL - in real usage, this would redirect to IdP
    return `http://localhost:3000/auth/mock/callback?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async handleCallback(callback: OAuthCallback): Promise<AuthSession> {
    // Mock callback - auto-login as ISSO for demos
    const user = MOCK_USERS[0]; // ISSO user
    return this.createSession(user);
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // Find user by email
    const user = MOCK_USERS.find(u => u.email === credentials.email);

    if (!user) {
      throw new AuthError(
        'Invalid email or password',
        AuthErrorCode.INVALID_CREDENTIALS,
        this.providerType
      );
    }

    if (!user.isActive) {
      throw new AuthError(
        'Account is disabled',
        AuthErrorCode.ACCOUNT_DISABLED,
        this.providerType
      );
    }

    // Mock password check - any password works in demo mode
    // In production, this would validate against a real credential store
    if (credentials.password !== 'demo' && credentials.password !== 'password') {
      throw new AuthError(
        'Invalid email or password',
        AuthErrorCode.INVALID_CREDENTIALS,
        this.providerType
      );
    }

    return this.createSession(user);
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    const session = sessions.get(token);

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }

    return session.user;
  }

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    // Create new session with extended expiry
    const user = session.user;
    const newSession = this.createSession(user);

    // Invalidate old session
    sessions.delete(session.accessToken);

    return newSession;
  }

  async logout(session: AuthSession): Promise<void> {
    sessions.delete(session.accessToken);
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    return MOCK_USERS.find(u => u.id === userId) || null;
  }

  /**
   * Get all mock users (for demo UI)
   */
  getAllUsers(): AuthUser[] {
    return [...MOCK_USERS];
  }

  /**
   * Quick login by role (for demos)
   */
  async loginAsRole(role: UserRole): Promise<AuthSession> {
    const user = MOCK_USERS.find(u => u.role === role);

    if (!user) {
      throw new AuthError(
        `No mock user with role ${role}`,
        AuthErrorCode.INVALID_CREDENTIALS,
        this.providerType
      );
    }

    return this.createSession(user);
  }

  /**
   * Create a mock user (for testing)
   */
  createMockUser(user: Partial<AuthUser>): AuthUser {
    const newUser: AuthUser = {
      id: user.id || `user-${Date.now()}`,
      tenantId: user.tenantId || 'default',
      email: user.email || `user-${Date.now()}@example.com`,
      displayName: user.displayName || 'Test User',
      role: user.role || UserRole.VIEWER,
      permissions: user.permissions || ROLE_PERMISSIONS[user.role || UserRole.VIEWER],
      provider: AuthProviderType.MOCK,
      isActive: user.isActive ?? true
    };

    MOCK_USERS.push(newUser);
    return newUser;
  }

  private createSession(user: AuthUser): AuthSession {
    const now = new Date();
    const accessToken = this.generateToken();

    const session: AuthSession = {
      id: `session-${Date.now()}`,
      user: {
        ...user,
        lastLoginAt: now
      },
      startedAt: now,
      expiresAt: new Date(now.getTime() + this.sessionDurationMs),
      accessToken
    };

    sessions.set(accessToken, session);
    return session;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'mock_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
