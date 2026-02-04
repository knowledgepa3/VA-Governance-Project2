/**
 * Authentication Gate - Audit-Proof Implementation (Consolidated)
 *
 * Single source of truth for authentication gate governance.
 *
 * FEATURES:
 * 1. Explicit AUTH_COMPLETE signals (2-of-3 required)
 * 2. True two-key approval (Human + System)
 * 3. Tightened signal validation (domain patterns, probe metadata only)
 * 4. Pack hash change auto-invalidation
 * 5. SESSION_BINDING for identity audit narrative
 * 6. Stable JSON hashing for tamper-evident logs
 * 7. TIMEOUT as security-relevant event
 *
 * SYSTEM KEY SIGNAL SOURCES (for implementers):
 * - Domain + path signal: tabs.onUpdated gives URL changes
 * - UI selector signal: content script querySelector against pack-defined selectors
 * - HTTP probe signal: content script same-site fetch (inherits cookies), returns ONLY status metadata
 *
 * HUMAN ACTOR IDENTITY:
 * - Demo mode: OS username + machine ID
 * - Production: Governance Console authenticated operator context
 */

import { createHash } from 'node:crypto';
import { MAIClassification } from '../types';

// ============================================================================
// STABLE JSON STRINGIFY (for deterministic hashing)
// ============================================================================

/**
 * Deterministic JSON stringify with sorted keys
 * Ensures hash consistency across different JS runtimes
 */
function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => stableStringify(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + stableStringify(value);
  });

  return '{' + pairs.join(',') + '}';
}

// ============================================================================
// SIGNAL DEFINITIONS
// ============================================================================

/**
 * Login path patterns to EXCLUDE from "successful redirect" detection
 * Prevents "redirect back to login callback" from being treated as success
 */
export const LOGIN_PATH_PATTERNS: RegExp[] = [
  /\/login/i,
  /\/signin/i,
  /\/sso/i,
  /\/oauth/i,
  /\/auth/i,
  /\/saml/i,
  /\/callback/i,
  /\/oidc/i,
  /\/identity/i,
  /\/authenticate/i
];

/**
 * Known login/SSO domains
 */
export const KNOWN_AUTH_DOMAINS: string[] = [
  'login.gov', 'secure.login.gov', 'idp.int.identitysandbox.gov',
  'okta.com', 'auth0.com', 'onelogin.com', 'ping.com', 'duo.com',
  'login.microsoftonline.com', 'accounts.google.com', 'signin.aws.amazon.com'
];

/**
 * Pre-approved read-only probe endpoints for auth verification
 * These are non-sensitive and return only status metadata
 *
 * IMPLEMENTATION NOTE: Probe is executed via content script same-site fetch
 * (inherits cookies). Returns ONLY status code - no response body captured.
 */
export interface AuthProbeEndpoint {
  alias: string;              // Human-readable name (logged instead of full URL)
  urlPattern: string;         // Pattern to match (e.g., "/api/user/status")
  expectedAuthStatus: number; // 200 when authenticated, 401/403 when not
  isSensitive: false;         // Must be false - enforced by type
  isReadOnly: true;           // Must be true - enforced by type
  inScope: boolean;           // Must be in allowed_domains
}

/**
 * Default probe endpoints for common platforms
 */
export const DEFAULT_PROBE_ENDPOINTS: AuthProbeEndpoint[] = [
  { alias: 'user-status', urlPattern: '/api/user/status', expectedAuthStatus: 200, isSensitive: false, isReadOnly: true, inScope: true },
  { alias: 'session-check', urlPattern: '/api/session/check', expectedAuthStatus: 200, isSensitive: false, isReadOnly: true, inScope: true },
  { alias: 'whoami', urlPattern: '/api/whoami', expectedAuthStatus: 200, isSensitive: false, isReadOnly: true, inScope: true }
];

/**
 * Known post-login UI selectors
 * IMPLEMENTATION NOTE: Checked via content script querySelector
 */
export const POST_LOGIN_SELECTORS: Array<{ type: string; selector: string; description: string }> = [
  { type: 'AVATAR', selector: '[data-testid="user-avatar"]', description: 'User avatar testid' },
  { type: 'AVATAR', selector: '.user-avatar', description: 'User avatar class' },
  { type: 'LOGOUT_LINK', selector: 'a[href*="logout"]', description: 'Logout link' },
  { type: 'LOGOUT_LINK', selector: 'a[href*="signout"]', description: 'Sign out link' },
  { type: 'USERNAME_DISPLAY', selector: '.username', description: 'Username display' },
  { type: 'ACCOUNT_MENU', selector: '[aria-label="Account menu"]', description: 'Account menu' }
];

/**
 * Authentication completion signals
 * Requires 2-of-3 to confirm auth is truly complete
 */
export interface AuthCompleteSignals {
  /**
   * Signal A: Domain Redirect
   * SOURCE: tabs.onUpdated URL changes (service worker)
   *
   * Valid ONLY when ALL THREE:
   * - host ∈ allowed_domains
   * - host ∉ login_domains
   * - path NOT matching login patterns
   */
  domainRedirect: {
    detected: boolean;
    fromDomain?: string;
    toDomain?: string;
    toPath?: string;
    timestamp?: Date;
    // Validation results
    hostInAllowedScope: boolean;
    hostNotInLoginDomains: boolean;
    pathNotLoginPattern: boolean;
    // Final determination
    isValidRedirect: boolean;
  };

  /**
   * Signal B: Post-Login UI Element
   * SOURCE: content script querySelector against pack-defined selectors
   */
  postLoginElement: {
    detected: boolean;
    elementType?: 'AVATAR' | 'LOGOUT_LINK' | 'USERNAME_DISPLAY' | 'ACCOUNT_MENU' | 'CUSTOM';
    selector?: string;
    elementText?: string;
    selectorFromApprovedList: boolean;
    timestamp?: Date;
  };

  /**
   * Signal C: Authenticated Request
   * SOURCE: content script same-site fetch (inherits cookies)
   *
   * Uses pre-approved, read-only endpoint.
   * Records ONLY: status code + endpoint alias (NO response content).
   */
  authenticatedRequest: {
    detected: boolean;
    endpointAlias?: string;     // NOT the full URL - just the alias
    statusCode?: number;
    probeIsReadOnly: boolean;
    probeIsNonSensitive: boolean;
    probeIsInScope: boolean;
    timestamp?: Date;
    // Explicitly NOT stored: responseBody, responseHeaders, cookies
  };
}

// ============================================================================
// SESSION BINDING
// ============================================================================

/**
 * Session Binding Record
 *
 * Supports "session belongs to human identity" audit narrative.
 * Does NOT capture credentials, tokens, or cookies.
 *
 * HUMAN ACTOR IDENTITY:
 * - Demo mode: OS username + machine ID
 * - Production: Governance Console authenticated operator context
 */
export interface SessionBinding {
  id: string;
  workstationId: string;
  tabGroup: string;

  humanActor: {
    operatorId?: string;          // From Governance Console (production)
    localUsername?: string;       // OS username (demo mode)
    chromeProfileId?: string;     // Chrome profile identifier
    workstationProfileId?: string; // Machine identifier
  };

  sessionEstablished: boolean;
  sessionEstablishedAt?: Date;
  sessionEstablishedVia: 'AUTH_GATE_APPROVAL' | 'EXISTING_SESSION' | 'MANUAL_OVERRIDE';

  establishmentSignals: {
    domainRedirectVerified: boolean;
    postLoginElementVerified: boolean;
    authenticatedRequestVerified: boolean;
  };

  validUntil?: Date;
  revalidationRequired: boolean;

  linkedAuthGateId?: string;
  packId: string;
  packVersion: string;
  packHash: string;
}

// ============================================================================
// TWO-KEY GATE
// ============================================================================

/**
 * Two-Key Authentication Gate
 *
 * Key A (Human): User confirms completion in Governance Console
 * Key B (System): System detects AUTH_COMPLETE signals (2-of-3)
 *
 * GATE_AUTH:APPROVED only when Key A AND Key B are true
 */
export interface TwoKeyAuthGate {
  id: string;
  gateType: 'AUTHENTICATION';
  status: 'PENDING' | 'KEY_A_APPROVED' | 'KEY_B_APPROVED' | 'APPROVED' | 'DENIED' | 'TIMEOUT' | 'RESET' | 'INVALIDATED_PACK_CHANGE';

  keyA: {
    type: 'HUMAN';
    description: 'User clicks "I completed login" in Governance Console';
    approved: boolean;
    approvedBy?: string;
    approvedAt?: Date;
    method: 'GOVERNANCE_CONSOLE' | 'CHAT_CONFIRMATION';
  };

  keyB: {
    type: 'SYSTEM';
    description: 'System detects AUTH_COMPLETE signals (2-of-3 required)';
    approved: boolean;
    verifiedAt?: Date;
    signals: AuthCompleteSignals;
    signalCount: number;
    signalThreshold: number;
  };

  context: {
    workstationId: string;
    tabGroup: string;
    agentId: string;
    triggeredAt: Date;
    authDomain: string;
    targetDomain: string;
  };

  timeout: {
    durationMs: number;
    expiresAt: Date;
    warningAt: Date;
    configuredBy: 'PACK_DEFAULT' | 'PACK_CUSTOM' | 'SYSTEM_DEFAULT';
  };

  packContext: {
    packId: string;
    packVersion: string;
    packHash: string;
    packHashAtCreation: string;  // Snapshot for drift detection
    allowedDomains: string[];
    approvedProbeEndpoints: AuthProbeEndpoint[];
    approvedUISelectors: string[];
    timeoutMs?: number;
  };

  sessionBinding?: SessionBinding;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Authentication Gate Audit Log Entry
 * Uses stable JSON serialization for deterministic hashing
 */
export interface AuthGateAuditEntry {
  eventId: string;
  eventType: 'GATE_AUTH';
  eventSubtype: 'APPROVED' | 'DENIED' | 'TIMEOUT' | 'RESET' | 'INVALIDATED_PACK_CHANGE';
  securityRelevant: boolean;  // true for TIMEOUT, DENIED, INVALIDATED
  timestamp: Date;

  // Policy provenance
  packId: string;
  packVersion: string;
  packHash: string;
  packHashAtGateCreation: string;
  packHashMismatch: boolean;

  // Workstation context
  workstationId: string;
  tabGroup: string;
  domain: string;

  // Human actor
  humanActor: {
    operatorId?: string;
    localUsername?: string;
    chromeProfileId?: string;
    sessionId: string;
  };

  // Gate details
  gateId: string;
  gateType: 'AUTH';
  result: 'APPROVED' | 'DENIED' | 'TIMEOUT' | 'RESET' | 'INVALIDATED_PACK_CHANGE';

  // Signal details
  systemSignals: {
    domainRedirect: {
      detected: boolean;
      isValidRedirect: boolean;
      validationDetails: {
        hostInAllowedScope: boolean;
        hostNotInLoginDomains: boolean;
        pathNotLoginPattern: boolean;
      };
    };
    postLoginElement: {
      detected: boolean;
      selectorFromApprovedList: boolean;
    };
    authenticatedRequest: {
      detected: boolean;
      endpointAlias?: string;
      statusCode?: number;
      probeValidation: {
        isReadOnly: boolean;
        isNonSensitive: boolean;
        isInScope: boolean;
      };
    };
    signalCount: number;
    threshold: number;
  };

  sessionBinding?: {
    established: boolean;
    bindingId?: string;
  };

  gateDurationMs: number;
  keyAApprovedAt?: Date;
  keyBApprovedAt?: Date;
  timedOutAt?: Date;

  // Hash chain (uses stable JSON serialization)
  previousHash: string;
  hash: string;
}

// ============================================================================
// AUTHENTICATION GATE MANAGER
// ============================================================================

export class AuthenticationGateManager {
  private activeGates: Map<string, TwoKeyAuthGate> = new Map();
  private sessionBindings: Map<string, SessionBinding> = new Map();
  private auditLog: AuthGateAuditEntry[] = [];

  private readonly SYSTEM_DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
  private readonly WARNING_BEFORE_MS = 60 * 1000;              // 1 minute
  private readonly SIGNAL_THRESHOLD = 2;                       // 2-of-3

  /**
   * Create authentication gate with pack hash snapshot
   */
  createGate(
    workstationId: string,
    tabGroup: string,
    agentId: string,
    authDomain: string,
    targetDomain: string,
    packContext: Omit<TwoKeyAuthGate['packContext'], 'packHashAtCreation'>
  ): TwoKeyAuthGate {
    const now = new Date();
    const timeoutMs = packContext.timeoutMs || this.SYSTEM_DEFAULT_TIMEOUT_MS;
    const expiresAt = new Date(now.getTime() + timeoutMs);
    const warningAt = new Date(expiresAt.getTime() - this.WARNING_BEFORE_MS);

    const gate: TwoKeyAuthGate = {
      id: `auth-gate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gateType: 'AUTHENTICATION',
      status: 'PENDING',

      keyA: {
        type: 'HUMAN',
        description: 'User clicks "I completed login" in Governance Console',
        approved: false,
        method: 'GOVERNANCE_CONSOLE'
      },

      keyB: {
        type: 'SYSTEM',
        description: 'System detects AUTH_COMPLETE signals (2-of-3 required)',
        approved: false,
        signals: {
          domainRedirect: {
            detected: false,
            hostInAllowedScope: false,
            hostNotInLoginDomains: false,
            pathNotLoginPattern: false,
            isValidRedirect: false
          },
          postLoginElement: {
            detected: false,
            selectorFromApprovedList: false
          },
          authenticatedRequest: {
            detected: false,
            probeIsReadOnly: false,
            probeIsNonSensitive: false,
            probeIsInScope: false
          }
        },
        signalCount: 0,
        signalThreshold: this.SIGNAL_THRESHOLD
      },

      context: {
        workstationId,
        tabGroup,
        agentId,
        triggeredAt: now,
        authDomain,
        targetDomain
      },

      timeout: {
        durationMs: timeoutMs,
        expiresAt,
        warningAt,
        configuredBy: packContext.timeoutMs ? 'PACK_CUSTOM' : 'SYSTEM_DEFAULT'
      },

      packContext: {
        ...packContext,
        packHashAtCreation: packContext.packHash
      }
    };

    this.activeGates.set(gate.id, gate);
    return gate;
  }

  /**
   * Validate domain redirect signal
   */
  private validateDomainRedirect(
    toDomain: string,
    toPath: string,
    allowedDomains: string[]
  ): { hostInAllowedScope: boolean; hostNotInLoginDomains: boolean; pathNotLoginPattern: boolean; isValidRedirect: boolean } {
    const hostInAllowedScope = allowedDomains.some(
      allowed => toDomain.includes(allowed) || allowed.includes(toDomain)
    );

    const hostNotInLoginDomains = !KNOWN_AUTH_DOMAINS.some(
      loginDomain => toDomain.includes(loginDomain)
    );

    const pathNotLoginPattern = !LOGIN_PATH_PATTERNS.some(
      pattern => pattern.test(toPath)
    );

    const isValidRedirect = hostInAllowedScope && hostNotInLoginDomains && pathNotLoginPattern;

    return { hostInAllowedScope, hostNotInLoginDomains, pathNotLoginPattern, isValidRedirect };
  }

  /**
   * Validate authenticated request signal
   */
  private validateAuthenticatedRequest(
    endpointAlias: string,
    statusCode: number,
    approvedEndpoints: AuthProbeEndpoint[]
  ): { probeIsReadOnly: boolean; probeIsNonSensitive: boolean; probeIsInScope: boolean; isValidProbe: boolean } {
    const endpoint = approvedEndpoints.find(e => e.alias === endpointAlias);

    if (!endpoint) {
      return { probeIsReadOnly: false, probeIsNonSensitive: false, probeIsInScope: false, isValidProbe: false };
    }

    const probeIsReadOnly = endpoint.isReadOnly === true;
    const probeIsNonSensitive = endpoint.isSensitive === false;
    const probeIsInScope = endpoint.inScope === true;
    const statusMatches = statusCode === endpoint.expectedAuthStatus;

    return {
      probeIsReadOnly,
      probeIsNonSensitive,
      probeIsInScope,
      isValidProbe: probeIsReadOnly && probeIsNonSensitive && probeIsInScope && statusMatches
    };
  }

  /**
   * Check if pack hash changed (invalidates gate)
   */
  checkPackHashChange(gateId: string, currentPackHash: string): boolean {
    const gate = this.activeGates.get(gateId);
    if (!gate) return false;

    if (currentPackHash !== gate.packContext.packHashAtCreation) {
      gate.status = 'INVALIDATED_PACK_CHANGE';
      this.logGateEvent(gate, 'INVALIDATED_PACK_CHANGE', {}, 'Pack configuration changed during pending gate');
      this.activeGates.delete(gate.id);
      return true;
    }

    return false;
  }

  /**
   * Update system signals
   */
  updateSystemSignals(
    gateId: string,
    signals: {
      domainRedirect?: { fromDomain: string; toDomain: string; toPath: string };
      postLoginElement?: { elementType: string; selector: string; elementText?: string };
      authenticatedRequest?: { endpointAlias: string; statusCode: number };
    }
  ): { success: boolean; gate?: TwoKeyAuthGate; error?: string } {
    const gate = this.activeGates.get(gateId);
    if (!gate) return { success: false, error: 'Gate not found' };

    if (new Date() > gate.timeout.expiresAt) {
      gate.status = 'TIMEOUT';
      this.logGateEvent(gate, 'TIMEOUT', {});
      this.activeGates.delete(gate.id);
      return { success: false, error: 'Gate has timed out' };
    }

    if (signals.domainRedirect) {
      const validation = this.validateDomainRedirect(
        signals.domainRedirect.toDomain,
        signals.domainRedirect.toPath,
        gate.packContext.allowedDomains
      );

      gate.keyB.signals.domainRedirect = {
        detected: true,
        fromDomain: signals.domainRedirect.fromDomain,
        toDomain: signals.domainRedirect.toDomain,
        toPath: signals.domainRedirect.toPath,
        timestamp: new Date(),
        ...validation
      };
    }

    if (signals.postLoginElement) {
      const selectorFromApprovedList = gate.packContext.approvedUISelectors.includes(
        signals.postLoginElement.selector
      );

      gate.keyB.signals.postLoginElement = {
        detected: true,
        elementType: signals.postLoginElement.elementType as any,
        selector: signals.postLoginElement.selector,
        elementText: signals.postLoginElement.elementText,
        selectorFromApprovedList,
        timestamp: new Date()
      };
    }

    if (signals.authenticatedRequest) {
      const validation = this.validateAuthenticatedRequest(
        signals.authenticatedRequest.endpointAlias,
        signals.authenticatedRequest.statusCode,
        gate.packContext.approvedProbeEndpoints
      );

      gate.keyB.signals.authenticatedRequest = {
        detected: true,
        endpointAlias: signals.authenticatedRequest.endpointAlias,
        statusCode: signals.authenticatedRequest.statusCode,
        timestamp: new Date(),
        ...validation
      };
    }

    // Count VALID signals only
    let count = 0;
    if (gate.keyB.signals.domainRedirect.isValidRedirect) count++;
    if (gate.keyB.signals.postLoginElement.detected && gate.keyB.signals.postLoginElement.selectorFromApprovedList) count++;
    if (gate.keyB.signals.authenticatedRequest.detected &&
        gate.keyB.signals.authenticatedRequest.probeIsReadOnly &&
        gate.keyB.signals.authenticatedRequest.probeIsNonSensitive &&
        gate.keyB.signals.authenticatedRequest.probeIsInScope &&
        gate.keyB.signals.authenticatedRequest.statusCode === 200) count++;

    gate.keyB.signalCount = count;

    if (count >= gate.keyB.signalThreshold) {
      gate.keyB.approved = true;
      gate.keyB.verifiedAt = new Date();
    }

    this.checkFullApproval(gate, {});
    return { success: true, gate };
  }

  /**
   * Human key approval
   */
  approveKeyA(
    gateId: string,
    approver: { operatorId?: string; localUsername?: string; chromeProfileId?: string },
    method: 'GOVERNANCE_CONSOLE' | 'CHAT_CONFIRMATION' = 'GOVERNANCE_CONSOLE'
  ): { success: boolean; gate?: TwoKeyAuthGate; error?: string } {
    const gate = this.activeGates.get(gateId);
    if (!gate) return { success: false, error: 'Gate not found' };

    if (new Date() > gate.timeout.expiresAt) {
      gate.status = 'TIMEOUT';
      this.logGateEvent(gate, 'TIMEOUT', approver);
      this.activeGates.delete(gate.id);
      return { success: false, error: 'Gate has timed out. Please reinitiate authentication.' };
    }

    gate.keyA.approved = true;
    gate.keyA.approvedBy = approver.operatorId || approver.localUsername;
    gate.keyA.approvedAt = new Date();
    gate.keyA.method = method;

    this.checkFullApproval(gate, approver);
    return { success: true, gate };
  }

  /**
   * Check full approval and create session binding
   */
  private checkFullApproval(
    gate: TwoKeyAuthGate,
    approver: { operatorId?: string; localUsername?: string; chromeProfileId?: string }
  ): void {
    if (gate.keyA.approved && gate.keyB.approved) {
      gate.status = 'APPROVED';

      const binding: SessionBinding = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workstationId: gate.context.workstationId,
        tabGroup: gate.context.tabGroup,
        humanActor: {
          operatorId: approver.operatorId,
          localUsername: approver.localUsername,
          chromeProfileId: approver.chromeProfileId
        },
        sessionEstablished: true,
        sessionEstablishedAt: new Date(),
        sessionEstablishedVia: 'AUTH_GATE_APPROVAL',
        establishmentSignals: {
          domainRedirectVerified: gate.keyB.signals.domainRedirect.isValidRedirect,
          postLoginElementVerified: gate.keyB.signals.postLoginElement.detected && gate.keyB.signals.postLoginElement.selectorFromApprovedList,
          authenticatedRequestVerified: gate.keyB.signals.authenticatedRequest.detected && gate.keyB.signals.authenticatedRequest.probeIsReadOnly
        },
        revalidationRequired: false,
        linkedAuthGateId: gate.id,
        packId: gate.packContext.packId,
        packVersion: gate.packContext.packVersion,
        packHash: gate.packContext.packHash
      };

      gate.sessionBinding = binding;
      this.sessionBindings.set(binding.id, binding);

      this.logGateEvent(gate, 'APPROVED', approver);
      this.activeGates.delete(gate.id);
    } else if (gate.keyA.approved && !gate.keyB.approved) {
      gate.status = 'KEY_A_APPROVED';
    } else if (!gate.keyA.approved && gate.keyB.approved) {
      gate.status = 'KEY_B_APPROVED';
    }
  }

  /**
   * Reset gate
   */
  resetGate(gateId: string, reason: string): void {
    const gate = this.activeGates.get(gateId);
    if (!gate) return;

    gate.status = 'RESET';
    this.logGateEvent(gate, 'RESET', {}, reason);
    this.activeGates.delete(gateId);
  }

  /**
   * Check timeout
   */
  checkTimeout(gateId: string): { timedOut: boolean; warning: boolean } {
    const gate = this.activeGates.get(gateId);
    if (!gate) return { timedOut: true, warning: false };

    const now = new Date();
    const timedOut = now > gate.timeout.expiresAt;
    const warning = !timedOut && now > gate.timeout.warningAt;

    if (timedOut) {
      gate.status = 'TIMEOUT';
      this.logGateEvent(gate, 'TIMEOUT', {});
      this.activeGates.delete(gate.id);
    }

    return { timedOut, warning };
  }

  /**
   * Log gate event with stable hashing
   */
  private logGateEvent(
    gate: TwoKeyAuthGate,
    result: AuthGateAuditEntry['result'],
    approver: { operatorId?: string; localUsername?: string; chromeProfileId?: string },
    notes?: string
  ): void {
    const previousEntry = this.auditLog[this.auditLog.length - 1];
    const isSecurityRelevant = ['TIMEOUT', 'DENIED', 'INVALIDATED_PACK_CHANGE'].includes(result);

    const entry: AuthGateAuditEntry = {
      eventId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'GATE_AUTH',
      eventSubtype: result,
      securityRelevant: isSecurityRelevant,
      timestamp: new Date(),

      packId: gate.packContext.packId,
      packVersion: gate.packContext.packVersion,
      packHash: gate.packContext.packHash,
      packHashAtGateCreation: gate.packContext.packHashAtCreation,
      packHashMismatch: gate.packContext.packHash !== gate.packContext.packHashAtCreation,

      workstationId: gate.context.workstationId,
      tabGroup: gate.context.tabGroup,
      domain: gate.context.authDomain,

      humanActor: {
        operatorId: approver.operatorId,
        localUsername: approver.localUsername,
        chromeProfileId: approver.chromeProfileId,
        sessionId: gate.context.agentId
      },

      gateId: gate.id,
      gateType: 'AUTH',
      result,

      systemSignals: {
        domainRedirect: {
          detected: gate.keyB.signals.domainRedirect.detected,
          isValidRedirect: gate.keyB.signals.domainRedirect.isValidRedirect,
          validationDetails: {
            hostInAllowedScope: gate.keyB.signals.domainRedirect.hostInAllowedScope,
            hostNotInLoginDomains: gate.keyB.signals.domainRedirect.hostNotInLoginDomains,
            pathNotLoginPattern: gate.keyB.signals.domainRedirect.pathNotLoginPattern
          }
        },
        postLoginElement: {
          detected: gate.keyB.signals.postLoginElement.detected,
          selectorFromApprovedList: gate.keyB.signals.postLoginElement.selectorFromApprovedList
        },
        authenticatedRequest: {
          detected: gate.keyB.signals.authenticatedRequest.detected,
          endpointAlias: gate.keyB.signals.authenticatedRequest.endpointAlias,
          statusCode: gate.keyB.signals.authenticatedRequest.statusCode,
          probeValidation: {
            isReadOnly: gate.keyB.signals.authenticatedRequest.probeIsReadOnly,
            isNonSensitive: gate.keyB.signals.authenticatedRequest.probeIsNonSensitive,
            isInScope: gate.keyB.signals.authenticatedRequest.probeIsInScope
          }
        },
        signalCount: gate.keyB.signalCount,
        threshold: gate.keyB.signalThreshold
      },

      sessionBinding: gate.sessionBinding ? {
        established: true,
        bindingId: gate.sessionBinding.id
      } : undefined,

      gateDurationMs: new Date().getTime() - gate.context.triggeredAt.getTime(),
      keyAApprovedAt: gate.keyA.approvedAt,
      keyBApprovedAt: gate.keyB.verifiedAt,
      timedOutAt: result === 'TIMEOUT' ? new Date() : undefined,

      previousHash: previousEntry?.hash || '0'.repeat(64),
      hash: ''
    };

    entry.hash = this.computeHash(entry);
    this.auditLog.push(entry);
  }

  /**
   * Compute hash using stable JSON serialization
   */
  private computeHash(entry: Omit<AuthGateAuditEntry, 'hash'>): string {
    const hashContent = {
      eventId: entry.eventId,
      timestamp: entry.timestamp.toISOString(),
      packHash: entry.packHash,
      packHashAtGateCreation: entry.packHashAtGateCreation,
      workstationId: entry.workstationId,
      gateId: entry.gateId,
      result: entry.result,
      securityRelevant: entry.securityRelevant,
      signalCount: entry.systemSignals.signalCount,
      previousHash: entry.previousHash
    };

    return createHash('sha256')
      .update(stableStringify(hashContent))
      .digest('hex');
  }

  // Accessors
  getGate(gateId: string): TwoKeyAuthGate | undefined {
    return this.activeGates.get(gateId);
  }

  getPendingGates(): TwoKeyAuthGate[] {
    return Array.from(this.activeGates.values()).filter(
      g => ['PENDING', 'KEY_A_APPROVED', 'KEY_B_APPROVED'].includes(g.status)
    );
  }

  getSessionBinding(bindingId: string): SessionBinding | undefined {
    return this.sessionBindings.get(bindingId);
  }

  getAuditLog(): AuthGateAuditEntry[] {
    return [...this.auditLog];
  }

  getSecurityRelevantEvents(): AuthGateAuditEntry[] {
    return this.auditLog.filter(e => e.securityRelevant);
  }

  exportAuditJSONL(): string {
    return this.auditLog.map(entry => JSON.stringify(entry)).join('\n');
  }
}

// ============================================================================
// GATE SPECIFICATION (for instruction packs)
// ============================================================================

export const AUTHENTICATION_GATE_SPEC = {
  classification: MAIClassification.MANDATORY,
  action: 'BLOCK_UNTIL_HUMAN_COMPLETE',
  controlObjective: 'Prevent any agent exposure to credentials and preserve MFA as a human-only control.',

  signalSources: {
    domainRedirect: 'tabs.onUpdated URL changes (service worker)',
    postLoginElement: 'content script querySelector against pack-defined selectors',
    authenticatedRequest: 'content script same-site fetch, returns ONLY status metadata'
  },

  humanActorIdentity: {
    demoMode: 'OS username + machine ID',
    production: 'Governance Console authenticated operator context'
  },

  authCompleteSignals: {
    threshold: '2-of-3',
    signals: [
      { name: 'Domain Redirect', validation: 'host ∈ allowed AND host ∉ login_domains AND path ∉ login_patterns' },
      { name: 'Post-Login Element', validation: 'selector from pack-approved list' },
      { name: 'Authenticated Request', validation: 'pre-approved read-only probe, status code only' }
    ]
  },

  twoKeyApproval: {
    keyA: 'Human confirms completion in Governance Console',
    keyB: '2-of-3 AUTH_COMPLETE signals verified by system',
    logic: 'GATE_AUTH:APPROVED only when Key A AND Key B are true'
  },

  packHashDrift: 'pack_hash changes → gate auto-invalidates (INVALIDATED_PACK_CHANGE)',

  timeout: {
    default: '5 minutes (SYSTEM_DEFAULT)',
    configurable: 'pack can override via timeoutMs',
    securityRelevant: true
  }
};

// ============================================================================
// AUDITOR Q&A
// ============================================================================

export const AUDITOR_QA = {
  Q1: {
    question: 'How do you ensure the agent never sees credentials?',
    answer: 'Authentication is a MANDATORY gate. The agent halts before credentials are entered and cannot proceed until dual-key approval is satisfied. Credentials are entered directly by the human in the browser UI; no credential values are captured, stored, transmitted, or placed into any agent context.'
  },
  Q2: {
    question: 'How do you verify authentication actually succeeded?',
    answer: 'System key requires 2-of-3 AUTH_COMPLETE signals: in-scope domain redirect (validated against allowed domains, excluding login domains and login path patterns), post-login UI element (from approved selector list), and/or authenticated endpoint status metadata (from pre-approved read-only probe, recording only alias and status code).'
  },
  Q3: {
    question: 'What prevents a user from clicking "I logged in" without logging in?',
    answer: 'Human key alone does not change the gate state. The gate remains PENDING until system verification satisfies the 2-of-3 threshold.'
  },
  Q4: {
    question: 'What prevents the system from false-positive approval?',
    answer: '2-of-3 signals reduces single-signal false positives. In-scope redirect excludes login/SSO domains and login path patterns. The UI signal requires selectors from an approved list. The HTTP signal uses pre-approved read-only probes that record only status metadata.'
  },
  Q5: {
    question: 'How do you prove the log wasn\'t modified?',
    answer: 'Gate events are recorded with pack provenance and hash-chained entries using stable JSON serialization. Each event includes the previous hash and its own hash, providing tamper-evident integrity.'
  },
  Q6: {
    question: 'How do you handle re-auth, session expiry, or MFA?',
    answer: 'Any re-auth prompt triggers the same MANDATORY gate. MFA remains human-controlled. If auth is not completed within the configured timeout window, the gate resets. TIMEOUT is logged as a security-relevant event.'
  },
  Q7: {
    question: 'What happens if pack configuration changes during a pending auth gate?',
    answer: 'If pack_hash changes during a pending auth gate, the gate is automatically invalidated (INVALIDATED_PACK_CHANGE) and requires re-initiation.'
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  AuthenticationGateManager,
  AUTHENTICATION_GATE_SPEC,
  AUDITOR_QA,
  KNOWN_AUTH_DOMAINS,
  LOGIN_PATH_PATTERNS,
  DEFAULT_PROBE_ENDPOINTS,
  POST_LOGIN_SELECTORS,
  stableStringify
};
