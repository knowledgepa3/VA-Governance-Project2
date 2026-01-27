/**
 * Session and Authentication Service for ACE Governance Platform
 *
 * Provides secure session management with:
 * - JWT-like token generation (browser-compatible)
 * - Role-based access control
 * - Session timeout
 * - Activity tracking
 *
 * NOTE: In production, this should be replaced with a proper backend
 * authentication system. This is a client-side simulation for demo purposes.
 */

import { generateUUID, sha256, generateSecureToken } from './crypto';
import { logger } from './logger';
import { UserRole } from '../types';

export interface UserSession {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  displayName: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  token: string;
  tokenHash: string;
}

export interface SessionValidation {
  valid: boolean;
  session?: UserSession;
  error?: string;
}

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class SessionService {
  private currentSession: UserSession | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private log = logger.child('SessionService');
  private onSessionExpired?: () => void;

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    userRole: UserRole,
    displayName: string
  ): Promise<UserSession> {
    // Generate secure token
    const token = await generateSecureToken(64);
    const tokenHash = await sha256(token);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const session: UserSession = {
      sessionId: generateUUID(),
      userId,
      userRole,
      displayName,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      token,
      tokenHash
    };

    this.currentSession = session;
    this.startInactivityTimer();

    // Store in sessionStorage (not localStorage for security)
    this.persistSession(session);

    this.log.audit('Session created', {
      sessionId: session.sessionId,
      userId,
      userRole,
      expiresAt: session.expiresAt
    });

    return session;
  }

  /**
   * Validate current session
   */
  async validateSession(token?: string): Promise<SessionValidation> {
    const session = this.currentSession || this.loadSession();

    if (!session) {
      return { valid: false, error: 'No active session' };
    }

    // Check expiration
    const now = new Date();
    if (new Date(session.expiresAt) < now) {
      this.destroySession();
      return { valid: false, error: 'Session expired' };
    }

    // Check inactivity
    const lastActivity = new Date(session.lastActivity);
    if (now.getTime() - lastActivity.getTime() > INACTIVITY_TIMEOUT_MS) {
      this.destroySession();
      return { valid: false, error: 'Session timed out due to inactivity' };
    }

    // Validate token if provided
    if (token) {
      const providedHash = await sha256(token);
      if (providedHash !== session.tokenHash) {
        return { valid: false, error: 'Invalid session token' };
      }
    }

    // Update activity
    this.updateActivity();

    return { valid: true, session };
  }

  /**
   * Check if user has permission for an action
   */
  hasPermission(requiredRoles: UserRole[]): boolean {
    if (!this.currentSession) {
      return false;
    }

    // ISSO has all permissions
    if (this.currentSession.userRole === UserRole.ISSO) {
      return true;
    }

    return requiredRoles.includes(this.currentSession.userRole);
  }

  /**
   * Get current session (if valid)
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Get current user role
   */
  getCurrentUserRole(): UserRole | null {
    return this.currentSession?.userRole || null;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentSession?.userId || null;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date().toISOString();
      this.persistSession(this.currentSession);
      this.resetInactivityTimer();
    }
  }

  /**
   * Set callback for session expiration
   */
  onExpired(callback: () => void): void {
    this.onSessionExpired = callback;
  }

  /**
   * Destroy current session
   */
  destroySession(): void {
    if (this.currentSession) {
      this.log.audit('Session destroyed', {
        sessionId: this.currentSession.sessionId,
        userId: this.currentSession.userId
      });
    }

    this.currentSession = null;
    this.clearInactivityTimer();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ace_session');
    }

    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  /**
   * Switch user role (for demo purposes - would require re-auth in production)
   */
  async switchRole(newRole: UserRole): Promise<UserSession | null> {
    if (!this.currentSession) {
      return null;
    }

    this.log.audit('Role switch requested', {
      sessionId: this.currentSession.sessionId,
      previousRole: this.currentSession.userRole,
      newRole
    });

    // In production, this would require re-authentication
    // For demo, we allow role switching with audit trail
    this.currentSession.userRole = newRole;
    this.currentSession.lastActivity = new Date().toISOString();
    this.persistSession(this.currentSession);

    return this.currentSession;
  }

  /**
   * Generate a signed approval token (for backend verification)
   */
  async generateApprovalToken(
    agentRole: string,
    decision: boolean
  ): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const payload = {
      sessionId: this.currentSession.sessionId,
      userId: this.currentSession.userId,
      userRole: this.currentSession.userRole,
      agentRole,
      decision,
      timestamp: new Date().toISOString()
    };

    // Create signed token (in production, use proper JWT with backend secret)
    const payloadStr = JSON.stringify(payload);
    const signature = await sha256(payloadStr + this.currentSession.token);

    return btoa(JSON.stringify({
      payload,
      signature: signature.slice(0, 32)
    }));
  }

  /**
   * Verify an approval token
   */
  async verifyApprovalToken(token: string): Promise<{
    valid: boolean;
    payload?: {
      sessionId: string;
      userId: string;
      userRole: UserRole;
      agentRole: string;
      decision: boolean;
      timestamp: string;
    };
    error?: string;
  }> {
    try {
      const decoded = JSON.parse(atob(token));
      const { payload, signature } = decoded;

      if (!this.currentSession) {
        return { valid: false, error: 'No active session' };
      }

      // Verify session matches
      if (payload.sessionId !== this.currentSession.sessionId) {
        return { valid: false, error: 'Session mismatch' };
      }

      // Verify signature
      const expectedSignature = await sha256(JSON.stringify(payload) + this.currentSession.token);
      if (signature !== expectedSignature.slice(0, 32)) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Check timestamp (tokens expire after 5 minutes)
      const tokenTime = new Date(payload.timestamp);
      const now = new Date();
      if (now.getTime() - tokenTime.getTime() > 5 * 60 * 1000) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Invalid token format' };
    }
  }

  // Private methods

  private persistSession(session: UserSession): void {
    if (typeof sessionStorage !== 'undefined') {
      // Don't store the actual token in sessionStorage
      const safeSession = { ...session, token: '[REDACTED]' };
      sessionStorage.setItem('ace_session', JSON.stringify(safeSession));
    }
  }

  private loadSession(): UserSession | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    try {
      const stored = sessionStorage.getItem('ace_session');
      if (!stored) return null;

      const session = JSON.parse(stored) as UserSession;

      // Session loaded from storage won't have valid token
      // User needs to re-authenticate
      if (session.token === '[REDACTED]') {
        this.log.info('Session restored but requires re-authentication');
        // For demo purposes, regenerate token
        // In production, require re-authentication
      }

      this.currentSession = session;
      return session;
    } catch {
      return null;
    }
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.log.warn('Session timed out due to inactivity');
      this.destroySession();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private resetInactivityTimer(): void {
    this.startInactivityTimer();
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}

// Singleton instance
export const sessionService = new SessionService();

// Export class for testing
export { SessionService };
