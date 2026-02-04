/**
 * Intake Token Service
 *
 * Generates and validates secure tokens for client intake links.
 * Replaces SuiteDash portal with a simpler, more integrated approach.
 *
 * FLOW:
 * 1. Admin generates intake link for a new case
 * 2. Client accesses link, fills out form, uploads docs
 * 3. Submission creates/updates case with client info
 *
 * ============================================================================
 * ENTERPRISE SECURITY ARCHITECTURE
 * ============================================================================
 *
 * TOKEN SECURITY:
 * - Cryptographically strong tokens (32 chars, high entropy)
 * - Short-lived: 72 hours default (configurable down to 24h)
 * - Single-use by default (one submission per token)
 * - Revocation support for immediate invalidation
 * - Rate limiting on validation attempts
 * - Tokens treated like passwords - NEVER logged
 *
 * STORAGE SECURITY:
 * - Store token HASH only, not raw token (enterprise mode)
 * - Token shell persisted, submission data session-only
 * - No PII in token storage
 *
 * PROTOTYPE MODE WARNING:
 * This implementation stores raw tokens in localStorage for demo purposes.
 * For production deployment:
 * - Store SHA-256 hash of token, not raw token
 * - Use server-side token validation
 * - Implement presigned upload URLs for files
 * - Add CAPTCHA or bot protection
 * - Integrate with your identity provider
 *
 * COMPLIANCE READY:
 * - Audit trail for token creation/access/submission
 * - IP tracking capability (if needed)
 * - Time-bounded access
 * - Clear data lifecycle
 */

import { caseManager, ClaimType } from './caseManager';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeToken {
  // In enterprise mode, this would be a HASH of the token, not the raw token
  // The raw token is only returned once at creation time
  token: string;
  tokenHash?: string;           // SHA-256 hash for enterprise validation

  caseId?: string;              // If pre-linked to existing case
  expectedEmail?: string;       // Bind token to specific recipient

  // Pre-fill hints (optional)
  expectedClaimType?: ClaimType;
  referenceNote?: string;       // Internal note like "Referred by John"

  // Security
  createdAt: string;
  expiresAt: string;
  maxUses: number;              // 0 = unlimited
  useCount: number;
  isRevoked: boolean;

  // Rate limiting
  validationAttempts: number;
  lastValidationAttempt?: string;
  isLocked: boolean;            // Locked after too many failed attempts

  // Tracking (no PII)
  createdBy?: string;           // Admin who created it
  lastAccessedAt?: string;
  submittedAt?: string;
  submissionCaseId?: string;    // Case created from submission
}

export interface IntakeSubmission {
  token: string;

  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone?: string;

  // Claim details
  claimType: ClaimType;
  conditions: string[];
  servicePeriod?: {
    start: string;
    end: string;
  };
  deployments?: string[];
  notes?: string;

  // Files (metadata only - actual files handled separately)
  files: IntakeFile[];

  // Metadata
  submittedAt: string;
  userAgent?: string;
  ipAddress?: string;           // For audit (if available)
}

export interface IntakeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'dd214' | 'medical' | 'buddy-statement' | 'nexus' | 'other';
  uploadedAt: string;
  // PROTOTYPE MODE: base64 in session storage
  // ENTERPRISE MODE: presigned upload URL reference to encrypted cloud storage
  dataRef?: string;
}

export type IntakeTokenStatus =
  | 'valid'
  | 'expired'
  | 'used'
  | 'revoked'
  | 'not-found'
  | 'locked'           // Too many validation attempts
  | 'email-mismatch';  // Token bound to different email

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'ace_intake_tokens';

// SECURITY: Short-lived tokens (72 hours default, not 7 days)
const DEFAULT_EXPIRY_HOURS = 72;  // 3 days max
const MIN_EXPIRY_HOURS = 1;       // Minimum 1 hour
const MAX_EXPIRY_HOURS = 168;     // Maximum 7 days (discouraged)

// Single-use by default
const DEFAULT_MAX_USES = 1;

// Rate limiting
const MAX_VALIDATION_ATTEMPTS = 5;   // Lock after 5 failed attempts
const VALIDATION_LOCKOUT_MINUTES = 30;

// Token entropy (32 chars = ~190 bits of entropy with this charset)
const TOKEN_LENGTH = 32;
const TOKEN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

// ============================================================================
// SERVICE
// ============================================================================

class IntakeTokenService {
  private tokens: Map<string, IntakeToken> = new Map();
  private listeners: Set<(tokens: IntakeToken[]) => void> = new Set();

  // Track validation attempts by IP/session (in-memory for prototype)
  private validationAttemptsBySession: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor() {
    this.loadFromStorage();
    console.warn('[IntakeTokenService] ⚠️ PROTOTYPE MODE: Tokens stored in localStorage. For production, implement server-side token hashing and validation.');
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE (Token shells only - no PII)
  // ---------------------------------------------------------------------------

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tokensArray: IntakeToken[] = JSON.parse(stored);
        // Migrate old tokens without new fields
        tokensArray.forEach(t => {
          if (t.validationAttempts === undefined) t.validationAttempts = 0;
          if (t.isLocked === undefined) t.isLocked = false;
          this.tokens.set(t.token, t);
        });
        // Don't log token count in production - could leak info
        if (process.env.NODE_ENV === 'development') {
          console.log(`[IntakeTokenService] Loaded ${tokensArray.length} tokens`);
        }
      }
    } catch (error) {
      console.error('[IntakeTokenService] Failed to load tokens:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const tokensArray = Array.from(this.tokens.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokensArray));
    } catch (error) {
      console.error('[IntakeTokenService] Failed to save tokens:', error);
    }
  }

  private notifyListeners(): void {
    const tokensArray = Array.from(this.tokens.values());
    this.listeners.forEach(listener => listener(tokensArray));
  }

  // ---------------------------------------------------------------------------
  // CRYPTOGRAPHIC UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Generate a cryptographically secure random token
   * Uses crypto.getRandomValues for true randomness
   */
  private generateTokenString(): string {
    const array = new Uint8Array(TOKEN_LENGTH);
    crypto.getRandomValues(array);

    let token = '';
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += TOKEN_CHARSET[array[i] % TOKEN_CHARSET.length];
    }

    // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX for readability
    return token.match(/.{1,4}/g)?.join('-') || token;
  }

  /**
   * Generate SHA-256 hash of token for storage
   * ENTERPRISE: Store this hash, not the raw token
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Mask token for safe logging (show only first/last 4 chars)
   */
  private maskToken(token: string): string {
    const clean = token.replace(/-/g, '');
    if (clean.length <= 8) return '****';
    return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }

  // ---------------------------------------------------------------------------
  // TOKEN GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Create a new intake token
   *
   * @param options Configuration for the token
   * @returns The created token (raw token only available at creation time)
   */
  createToken(options: {
    caseId?: string;
    expectedEmail?: string;       // Bind to specific recipient
    expectedClaimType?: ClaimType;
    referenceNote?: string;
    expiryHours?: number;         // Changed from days to hours for tighter control
    maxUses?: number;
    createdBy?: string;
  } = {}): IntakeToken {
    const token = this.generateTokenString();
    const now = new Date();

    // Enforce expiry limits
    let expiryHours = options.expiryHours ?? DEFAULT_EXPIRY_HOURS;
    expiryHours = Math.max(MIN_EXPIRY_HOURS, Math.min(MAX_EXPIRY_HOURS, expiryHours));

    if (expiryHours > 72) {
      console.warn('[IntakeTokenService] ⚠️ Expiry > 72 hours is discouraged for security');
    }

    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const intakeToken: IntakeToken = {
      token,
      // tokenHash: await this.hashToken(token), // ENTERPRISE: Store hash instead
      caseId: options.caseId,
      expectedEmail: options.expectedEmail,
      expectedClaimType: options.expectedClaimType,
      referenceNote: options.referenceNote,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: options.maxUses ?? DEFAULT_MAX_USES,
      useCount: 0,
      isRevoked: false,
      validationAttempts: 0,
      isLocked: false,
      createdBy: options.createdBy
    };

    this.tokens.set(token, intakeToken);
    this.saveToStorage();
    this.notifyListeners();

    // SECURITY: Never log the actual token value
    console.log(`[IntakeTokenService] Created token ${this.maskToken(token)} (expires: ${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString()})`);

    return intakeToken;
  }

  // ---------------------------------------------------------------------------
  // TOKEN VALIDATION (with rate limiting)
  // ---------------------------------------------------------------------------

  /**
   * Check if a token is valid for use
   * Includes rate limiting to prevent brute force attacks
   */
  validateToken(token: string, options?: {
    email?: string;           // Verify email matches expected recipient
    sessionId?: string;       // For rate limiting
  }): { status: IntakeTokenStatus; token?: IntakeToken; message: string } {
    const sessionId = options?.sessionId || 'default';

    // Rate limiting check
    if (this.isRateLimited(sessionId)) {
      return {
        status: 'locked',
        message: 'Too many validation attempts. Please wait before trying again.'
      };
    }

    const intakeToken = this.tokens.get(token);

    if (!intakeToken) {
      this.recordValidationAttempt(sessionId, false);
      return { status: 'not-found', message: 'This intake link is not valid.' };
    }

    // Check if token itself is locked
    if (intakeToken.isLocked) {
      return {
        status: 'locked',
        token: intakeToken,
        message: 'This intake link has been locked due to too many invalid attempts.'
      };
    }

    if (intakeToken.isRevoked) {
      return { status: 'revoked', token: intakeToken, message: 'This intake link has been revoked.' };
    }

    if (new Date() > new Date(intakeToken.expiresAt)) {
      return { status: 'expired', token: intakeToken, message: 'This intake link has expired. Please contact us for a new link.' };
    }

    if (intakeToken.maxUses > 0 && intakeToken.useCount >= intakeToken.maxUses) {
      return { status: 'used', token: intakeToken, message: 'This intake link has already been used.' };
    }

    // Email binding check (if token was created for specific recipient)
    if (intakeToken.expectedEmail && options?.email) {
      if (intakeToken.expectedEmail.toLowerCase() !== options.email.toLowerCase()) {
        this.recordValidationAttempt(sessionId, false);
        return {
          status: 'email-mismatch',
          token: intakeToken,
          message: 'This intake link was created for a different email address.'
        };
      }
    }

    // Valid! Reset attempt counter
    this.recordValidationAttempt(sessionId, true);

    return { status: 'valid', token: intakeToken, message: 'Token is valid.' };
  }

  /**
   * Rate limiting helper
   */
  private isRateLimited(sessionId: string): boolean {
    const attempts = this.validationAttemptsBySession.get(sessionId);
    if (!attempts) return false;

    const lockoutTime = VALIDATION_LOCKOUT_MINUTES * 60 * 1000;
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

    // Reset if lockout period has passed
    if (timeSinceLastAttempt > lockoutTime) {
      this.validationAttemptsBySession.delete(sessionId);
      return false;
    }

    return attempts.count >= MAX_VALIDATION_ATTEMPTS;
  }

  /**
   * Record a validation attempt for rate limiting
   */
  private recordValidationAttempt(sessionId: string, success: boolean): void {
    if (success) {
      // Reset on success
      this.validationAttemptsBySession.delete(sessionId);
      return;
    }

    const attempts = this.validationAttemptsBySession.get(sessionId) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.validationAttemptsBySession.set(sessionId, attempts);

    if (attempts.count >= MAX_VALIDATION_ATTEMPTS) {
      console.warn(`[IntakeTokenService] Rate limit triggered for session ${sessionId.slice(0, 8)}...`);
    }
  }

  /**
   * Get token details (for display)
   */
  getToken(token: string): IntakeToken | undefined {
    return this.tokens.get(token);
  }

  /**
   * Record that a token was accessed (viewed the form)
   */
  recordAccess(token: string): void {
    const intakeToken = this.tokens.get(token);
    if (intakeToken) {
      intakeToken.lastAccessedAt = new Date().toISOString();
      this.tokens.set(token, intakeToken);
      this.saveToStorage();
    }
  }

  // ---------------------------------------------------------------------------
  // SUBMISSION HANDLING
  // ---------------------------------------------------------------------------

  /**
   * Process an intake form submission
   * Creates a new case or updates existing one
   */
  processSubmission(submission: IntakeSubmission): {
    success: boolean;
    caseId?: string;
    error?: string;
  } {
    // Validate token first
    const validation = this.validateToken(submission.token, {
      email: submission.clientEmail
    });

    if (validation.status !== 'valid') {
      return { success: false, error: validation.message };
    }

    const intakeToken = validation.token!;

    try {
      // Create or update case
      let caseId: string;

      if (intakeToken.caseId) {
        // Update existing case
        const existingCase = caseManager.getCase(intakeToken.caseId);
        if (existingCase) {
          caseManager.updateCase(intakeToken.caseId, {
            clientName: submission.clientName,
            clientEmail: submission.clientEmail,
            clientPhone: submission.clientPhone,
            claimType: submission.claimType,
            conditions: submission.conditions,
            servicePeriod: submission.servicePeriod,
            deployments: submission.deployments,
            notes: submission.notes,
            status: 'new'
          });
          caseId = intakeToken.caseId;
          console.log(`[IntakeTokenService] Updated existing case: ${caseId}`);
        } else {
          // Case was deleted, create new one
          const newCase = caseManager.createCase({
            clientName: submission.clientName,
            clientEmail: submission.clientEmail,
            clientPhone: submission.clientPhone,
            claimType: submission.claimType,
            conditions: submission.conditions,
            servicePeriod: submission.servicePeriod,
            deployments: submission.deployments,
            notes: submission.notes
          });
          caseId = newCase.id;
        }
      } else {
        // Create new case
        const newCase = caseManager.createCase({
          clientName: submission.clientName,
          clientEmail: submission.clientEmail,
          clientPhone: submission.clientPhone,
          claimType: submission.claimType,
          conditions: submission.conditions,
          servicePeriod: submission.servicePeriod,
          deployments: submission.deployments,
          notes: submission.notes
        });
        caseId = newCase.id;
        console.log(`[IntakeTokenService] Created new case: ${caseId}`);
      }

      // Update token with submission info
      intakeToken.useCount++;
      intakeToken.submittedAt = submission.submittedAt;
      intakeToken.submissionCaseId = caseId;
      this.tokens.set(submission.token, intakeToken);
      this.saveToStorage();
      this.notifyListeners();

      // PROTOTYPE: File references stored in session
      // ENTERPRISE: Files would be uploaded via presigned URLs to encrypted storage
      // with virus scanning and the references stored in the case

      return { success: true, caseId };
    } catch (error) {
      console.error('[IntakeTokenService] Submission error:', error);
      return { success: false, error: 'Failed to process submission. Please try again.' };
    }
  }

  // ---------------------------------------------------------------------------
  // TOKEN MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Revoke a token (prevent further use)
   */
  revokeToken(token: string): boolean {
    const intakeToken = this.tokens.get(token);
    if (intakeToken) {
      intakeToken.isRevoked = true;
      this.tokens.set(token, intakeToken);
      this.saveToStorage();
      this.notifyListeners();
      // SECURITY: Don't log the actual token
      console.log(`[IntakeTokenService] Revoked token ${this.maskToken(token)}`);
      return true;
    }
    return false;
  }

  /**
   * Lock a token (after too many failed attempts)
   */
  lockToken(token: string): boolean {
    const intakeToken = this.tokens.get(token);
    if (intakeToken) {
      intakeToken.isLocked = true;
      this.tokens.set(token, intakeToken);
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[IntakeTokenService] Locked token ${this.maskToken(token)}`);
      return true;
    }
    return false;
  }

  /**
   * Unlock a token (admin action)
   */
  unlockToken(token: string): boolean {
    const intakeToken = this.tokens.get(token);
    if (intakeToken) {
      intakeToken.isLocked = false;
      intakeToken.validationAttempts = 0;
      this.tokens.set(token, intakeToken);
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[IntakeTokenService] Unlocked token ${this.maskToken(token)}`);
      return true;
    }
    return false;
  }

  /**
   * Delete a token entirely
   */
  deleteToken(token: string): boolean {
    const deleted = this.tokens.delete(token);
    if (deleted) {
      this.saveToStorage();
      this.notifyListeners();
      console.log(`[IntakeTokenService] Deleted token ${this.maskToken(token)}`);
    }
    return deleted;
  }

  /**
   * Get all tokens (for admin view)
   */
  getAllTokens(): IntakeToken[] {
    return Array.from(this.tokens.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get active (unused, not expired, not locked) tokens
   */
  getActiveTokens(): IntakeToken[] {
    const now = new Date();
    return this.getAllTokens().filter(t =>
      !t.isRevoked &&
      !t.isLocked &&
      new Date(t.expiresAt) > now &&
      (t.maxUses === 0 || t.useCount < t.maxUses)
    );
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  cleanupExpiredTokens(olderThanDays: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let cleaned = 0;
    for (const [token, data] of this.tokens.entries()) {
      if (new Date(data.expiresAt) < cutoff) {
        this.tokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
      console.log(`[IntakeTokenService] Cleaned up ${cleaned} expired tokens`);
    }

    return cleaned;
  }

  /**
   * Subscribe to token changes
   */
  subscribe(listener: (tokens: IntakeToken[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllTokens());
    return () => this.listeners.delete(listener);
  }

  // ---------------------------------------------------------------------------
  // URL HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Generate the full intake URL for a token
   */
  getIntakeUrl(token: string): string {
    // In production, this would be your actual domain
    const baseUrl = window.location.origin;
    return `${baseUrl}/intake/${token}`;
  }

  /**
   * Parse token from URL path
   */
  parseTokenFromPath(path: string): string | null {
    // Match the new longer token format with dashes
    const match = path.match(/\/intake\/([A-Za-z0-9-]+)/);
    return match ? match[1] : null;
  }

  // ---------------------------------------------------------------------------
  // ENTERPRISE HELPERS (stubs for production implementation)
  // ---------------------------------------------------------------------------

  /**
   * ENTERPRISE: Generate presigned upload URL for secure file uploads
   * Files go directly to encrypted cloud storage, not through the browser
   */
  async getPresignedUploadUrl(_fileType: string, _fileSize: number): Promise<{
    uploadUrl: string;
    fileRef: string;
    expiresAt: string;
  }> {
    // STUB: In production, this would call your backend to generate
    // a presigned URL for direct upload to S3/GCS/Azure Blob
    console.warn('[IntakeTokenService] getPresignedUploadUrl is a stub - implement server-side');
    return {
      uploadUrl: '',
      fileRef: `file_${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min
    };
  }

  /**
   * ENTERPRISE: Verify token server-side using hash
   * Never send raw token over the network after initial creation
   */
  async verifyTokenHash(_tokenHash: string): Promise<boolean> {
    // STUB: In production, this would verify against server-stored hash
    console.warn('[IntakeTokenService] verifyTokenHash is a stub - implement server-side');
    return false;
  }
}

// Export singleton
export const intakeTokenService = new IntakeTokenService();

// Export types
export type { IntakeTokenService };
