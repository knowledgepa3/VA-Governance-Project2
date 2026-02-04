/**
 * ACE Governance Layer - THE SINGLE SOURCE OF TRUTH
 *
 * ALL execution paths MUST go through this layer:
 * - Platform agents (ACE Chat with Haiku)
 * - Claude Code (with Chrome MCP)
 * - Any future integrations
 *
 * This ensures governance is NEVER bypassed.
 */

// ============================================================================
// DOMAIN ALLOWLIST - THE ONLY SITES ANY AGENT CAN ACCESS
// ============================================================================

export const ALLOWED_DOMAINS = [
  // VA Official Sites
  'va.gov',
  'www.va.gov',
  'benefits.va.gov',
  'ebenefits.va.gov',
  'myhealth.va.gov',

  // VA Decision Search
  'bva.va.gov',
  'www.bva.va.gov',

  // Federal Regulations
  'ecfr.gov',
  'www.ecfr.gov',
  'ecfr.federalregister.gov',

  // Government Publishing Office
  'govinfo.gov',
  'www.govinfo.gov',

  // Cornell Law (CFR reference)
  'law.cornell.edu',
  'www.law.cornell.edu',

  // ==========================================================================
  // HOUSEHOLD OPERATIONS DOMAINS
  // ==========================================================================

  // Shopping
  'walmart.com',
  'www.walmart.com',
  'amazon.com',
  'www.amazon.com',
  'instacart.com',
  'www.instacart.com',
  'target.com',
  'www.target.com',
  'costco.com',
  'www.costco.com',

  // Utilities
  'georgiapower.com',
  'www.georgiapower.com',
  'gapower.com',
  'www.gapower.com',
  'wowway.com',
  'www.wowway.com',
  'login.wowway.com',
  'xfinity.com',
  'www.xfinity.com',
  'att.com',
  'www.att.com',
  'spectrum.net',
  'www.spectrum.net',

  // Housing/Rent Portals
  'securecafenet.com',
  'rentcafe.com',
  'appfolio.com',

  // Financial (read-only)
  'chase.com',
  'www.chase.com',
  'bankofamerica.com',
  'www.bankofamerica.com',
  'wellsfargo.com',
  'www.wellsfargo.com',
  'capitalone.com',
  'www.capitalone.com',
  'privacy.com',
  'www.privacy.com',

  // Calendar & SSO
  'calendar.google.com',
  'accounts.google.com',
  'outlook.live.com',
  'login.microsoftonline.com'
] as const;

export type AllowedDomain = typeof ALLOWED_DOMAINS[number];

// ============================================================================
// STOP CONDITIONS - WHAT IMMEDIATELY HALTS EXECUTION
// ============================================================================

export const STOP_CONDITIONS = {
  // Page content triggers
  LOGIN_DETECTED: {
    id: 'login_detected',
    description: 'Login or authentication page detected',
    patterns: [
      /sign.?in/i, /log.?in/i, /password/i, /authenticate/i,
      /create.?account/i, /register/i, /forgot.?password/i
    ],
    action: 'halt',
    severity: 'critical'
  },
  PAYMENT_DETECTED: {
    id: 'payment_detected',
    description: 'Payment or financial form detected',
    patterns: [
      /credit.?card/i, /payment/i, /billing/i, /checkout/i,
      /card.?number/i, /cvv/i, /expir/i
    ],
    action: 'halt',
    severity: 'critical'
  },
  PII_FORM_DETECTED: {
    id: 'pii_form',
    description: 'Form requesting sensitive PII detected',
    patterns: [
      /social.?security/i, /ssn/i, /date.?of.?birth/i, /dob/i,
      /bank.?account/i, /routing.?number/i
    ],
    action: 'halt',
    severity: 'critical'
  },
  ERROR_PAGE: {
    id: 'error_page',
    description: 'Error page detected',
    patterns: [
      /404/i, /not.?found/i, /error/i, /forbidden/i,
      /access.?denied/i, /503/i, /500/i
    ],
    action: 'pause',
    severity: 'warning'
  },
  CAPTCHA_DETECTED: {
    id: 'captcha',
    description: 'CAPTCHA or bot detection',
    patterns: [
      /captcha/i, /recaptcha/i, /verify.?human/i,
      /robot/i, /bot.?detection/i
    ],
    action: 'halt',
    severity: 'critical'
  },
  OUTSIDE_DOMAIN: {
    id: 'outside_domain',
    description: 'Navigation attempted to non-allowed domain',
    patterns: [], // Checked via URL, not content
    action: 'block',
    severity: 'critical'
  }
} as const;

export type StopConditionId = keyof typeof STOP_CONDITIONS;

// ============================================================================
// GATE TYPES - ACTIONS REQUIRING HUMAN APPROVAL
// ============================================================================

export const GATE_TRIGGERS = {
  // Form interactions
  FORM_SUBMISSION: {
    id: 'form_submission',
    description: 'Submitting any form',
    requiresApproval: true,
    approvalMessage: 'Agent wants to submit a form. Review and approve?'
  },
  BUTTON_CLICK: {
    id: 'button_click',
    description: 'Clicking action buttons',
    requiresApproval: true,
    approvalMessage: 'Agent wants to click a button. Review and approve?'
  },

  // Data extraction
  BULK_DATA_EXTRACTION: {
    id: 'bulk_extraction',
    description: 'Extracting large amounts of data',
    requiresApproval: true,
    approvalMessage: 'Agent wants to extract data. Review and approve?'
  },

  // Navigation
  EXTERNAL_LINK: {
    id: 'external_link',
    description: 'Following link to different domain (even if allowed)',
    requiresApproval: true,
    approvalMessage: 'Agent wants to navigate to a different site. Review and approve?'
  },

  // Evidence packaging
  EVIDENCE_PACKAGE: {
    id: 'evidence_package',
    description: 'Creating evidence package for client delivery',
    requiresApproval: true,
    approvalMessage: 'Agent wants to create an evidence package. Review contents and approve?'
  },

  // Communications
  CLIENT_EMAIL: {
    id: 'client_email',
    description: 'Sending email to client',
    requiresApproval: true,
    approvalMessage: 'Agent wants to send an email. Review and approve?'
  }
} as const;

export type GateTriggerId = keyof typeof GATE_TRIGGERS;

// ============================================================================
// GOVERNANCE CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a URL is allowed
 */
export function isUrlAllowed(url: string): { allowed: boolean; domain: string; reason?: string } {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();

    // Check against allowlist (exact match or subdomain match)
    const isAllowed = ALLOWED_DOMAINS.some(allowed => {
      // Exact match
      if (domain === allowed) return true;
      // Subdomain match (e.g., greystoneatcolumbuspark.securecafenet.com matches securecafenet.com)
      if (domain.endsWith('.' + allowed)) return true;
      return false;
    });

    if (!isAllowed) {
      return {
        allowed: false,
        domain,
        reason: `Domain "${domain}" is not in the ACE allowlist.`
      };
    }

    return { allowed: true, domain };
  } catch (e) {
    return {
      allowed: false,
      domain: 'invalid',
      reason: `Invalid URL: ${url}`
    };
  }
}

/**
 * Check page content for stop conditions
 */
export function checkStopConditions(pageContent: string, pageUrl: string): {
  triggered: boolean;
  conditions: Array<{
    id: StopConditionId;
    description: string;
    action: string;
    severity: string;
  }>;
} {
  const triggered: Array<{
    id: StopConditionId;
    description: string;
    action: string;
    severity: string;
  }> = [];

  // Check URL domain first
  const urlCheck = isUrlAllowed(pageUrl);
  if (!urlCheck.allowed) {
    triggered.push({
      id: 'OUTSIDE_DOMAIN',
      description: STOP_CONDITIONS.OUTSIDE_DOMAIN.description,
      action: 'block',
      severity: 'critical'
    });
  }

  // Check content patterns
  for (const [key, condition] of Object.entries(STOP_CONDITIONS)) {
    if (key === 'OUTSIDE_DOMAIN') continue; // Already checked

    for (const pattern of condition.patterns) {
      if (pattern.test(pageContent)) {
        triggered.push({
          id: key as StopConditionId,
          description: condition.description,
          action: condition.action,
          severity: condition.severity
        });
        break; // Only trigger once per condition
      }
    }
  }

  return {
    triggered: triggered.length > 0,
    conditions: triggered
  };
}

/**
 * Check if an action requires gate approval
 */
export function requiresGateApproval(actionType: string): {
  requires: boolean;
  gate?: typeof GATE_TRIGGERS[GateTriggerId];
} {
  const gateKey = Object.keys(GATE_TRIGGERS).find(key =>
    key.toLowerCase().includes(actionType.toLowerCase()) ||
    actionType.toLowerCase().includes(key.toLowerCase())
  ) as GateTriggerId | undefined;

  if (gateKey) {
    return {
      requires: true,
      gate: GATE_TRIGGERS[gateKey]
    };
  }

  return { requires: false };
}

// ============================================================================
// EVIDENCE INTEGRITY
// ============================================================================

/**
 * Generate SHA-256 hash for evidence integrity
 */
export async function hashEvidence(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create evidence record with full audit trail
 */
export interface EvidenceRecord {
  id: string;
  type: 'screenshot' | 'text' | 'data' | 'document';
  source_url: string;
  source_domain: string;
  captured_at: string;
  content_hash: string;
  content_preview?: string;
  metadata: {
    page_title?: string;
    extraction_method: string;
    governance_check: {
      domain_allowed: boolean;
      stop_conditions_clear: boolean;
      gate_approved?: boolean;
    };
  };
}

export async function createEvidenceRecord(
  type: EvidenceRecord['type'],
  sourceUrl: string,
  content: string | ArrayBuffer,
  metadata: Partial<EvidenceRecord['metadata']> = {}
): Promise<EvidenceRecord> {
  const urlCheck = isUrlAllowed(sourceUrl);
  const contentHash = await hashEvidence(content);

  const domain = urlCheck.domain;
  const preview = typeof content === 'string'
    ? content.substring(0, 200) + (content.length > 200 ? '...' : '')
    : '[Binary data]';

  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    source_url: sourceUrl,
    source_domain: domain,
    captured_at: new Date().toISOString(),
    content_hash: contentHash,
    content_preview: preview,
    metadata: {
      extraction_method: metadata.extraction_method || 'unknown',
      page_title: metadata.page_title,
      governance_check: {
        domain_allowed: urlCheck.allowed,
        stop_conditions_clear: true, // Caller should verify
        gate_approved: metadata.governance_check?.gate_approved
      }
    }
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'platform_agent' | 'claude_code' | 'human' | 'system';
  action: string;
  target?: string;
  governance: {
    domain_check?: { url: string; allowed: boolean; };
    stop_condition_check?: { triggered: boolean; conditions?: string[]; };
    gate_check?: { required: boolean; approved?: boolean; };
  };
  result: 'success' | 'blocked' | 'gated' | 'error';
  details?: string;
}

// In-memory audit log (in production, this would go to a database)
const auditLog: AuditLogEntry[] = [];

export function logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const fullEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  auditLog.push(fullEntry);

  // Also log to console for visibility
  console.log(`[ACE AUDIT] ${fullEntry.timestamp} | ${fullEntry.actor} | ${fullEntry.action} | ${fullEntry.result}`);

  // Keep log manageable (in production, persist to storage)
  if (auditLog.length > 1000) {
    auditLog.shift();
  }

  return fullEntry;
}

export function getAuditLog(limit: number = 100): AuditLogEntry[] {
  return auditLog.slice(-limit);
}

export function getAuditLogForCase(caseId: string): AuditLogEntry[] {
  return auditLog.filter(entry =>
    entry.target?.includes(caseId) || entry.details?.includes(caseId)
  );
}

// ============================================================================
// GOVERNANCE WRAPPER FOR ACTIONS
// ============================================================================

/**
 * Wrap any action with governance checks
 * This is the main entry point - ALL actions should go through this
 */
export async function executeWithGovernance<T>(
  actor: AuditLogEntry['actor'],
  action: string,
  targetUrl: string | null,
  executeAction: () => Promise<T>,
  options: {
    requiresGate?: boolean;
    gateApproved?: boolean;
    pageContent?: string;
  } = {}
): Promise<{ success: boolean; result?: T; blocked?: string; gated?: boolean }> {

  // 1. Domain check (if URL provided)
  if (targetUrl) {
    const urlCheck = isUrlAllowed(targetUrl);
    if (!urlCheck.allowed) {
      logAction({
        actor,
        action,
        target: targetUrl,
        governance: {
          domain_check: { url: targetUrl, allowed: false }
        },
        result: 'blocked',
        details: urlCheck.reason
      });
      return { success: false, blocked: urlCheck.reason };
    }
  }

  // 2. Stop condition check (if content provided)
  if (options.pageContent && targetUrl) {
    const stopCheck = checkStopConditions(options.pageContent, targetUrl);
    if (stopCheck.triggered) {
      const criticalConditions = stopCheck.conditions.filter(c => c.severity === 'critical');
      if (criticalConditions.length > 0) {
        logAction({
          actor,
          action,
          target: targetUrl,
          governance: {
            stop_condition_check: {
              triggered: true,
              conditions: criticalConditions.map(c => c.id)
            }
          },
          result: 'blocked',
          details: `Stop conditions triggered: ${criticalConditions.map(c => c.description).join(', ')}`
        });
        return {
          success: false,
          blocked: `Action blocked: ${criticalConditions.map(c => c.description).join(', ')}`
        };
      }
    }
  }

  // 3. Gate check
  if (options.requiresGate && !options.gateApproved) {
    logAction({
      actor,
      action,
      target: targetUrl || undefined,
      governance: {
        gate_check: { required: true, approved: false }
      },
      result: 'gated',
      details: 'Action requires human approval'
    });
    return { success: false, gated: true };
  }

  // 4. Execute the action
  try {
    const result = await executeAction();

    logAction({
      actor,
      action,
      target: targetUrl || undefined,
      governance: {
        domain_check: targetUrl ? { url: targetUrl, allowed: true } : undefined,
        gate_check: options.requiresGate ? { required: true, approved: true } : undefined
      },
      result: 'success'
    });

    return { success: true, result };
  } catch (error) {
    logAction({
      actor,
      action,
      target: targetUrl || undefined,
      governance: {},
      result: 'error',
      details: String(error)
    });
    return { success: false, blocked: String(error) };
  }
}

// ============================================================================
// EXPORT GOVERNANCE CONFIG FOR UI DISPLAY
// ============================================================================

export const GOVERNANCE_CONFIG = {
  allowedDomains: ALLOWED_DOMAINS,
  stopConditions: STOP_CONDITIONS,
  gateTriggers: GATE_TRIGGERS,
  version: '1.0.0'
} as const;
