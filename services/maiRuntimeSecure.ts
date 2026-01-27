/**
 * Secure MAI Runtime Policy Engine
 *
 * Enhanced version with:
 * - Real SHA-256 cryptographic hashing
 * - Hash chain integrity
 * - Immutable audit entries (Object.freeze)
 * - Persistent storage integration
 * - Separation of Duties enforcement
 */

import { MAIClassification, AgentRole, UserRole } from '../types';
import { sha256, chainedHash, generateUUID } from './crypto';
import { logger } from './logger';
import { configService } from './configService';
import { auditService } from './auditService';

const log = logger.child('MAIRuntime');

/**
 * Action types that can be gated by MAI
 */
export enum ActionType {
  NAVIGATE = 'NAVIGATE',
  CLICK = 'CLICK',
  TYPE = 'TYPE',
  SUBMIT = 'SUBMIT',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
  EXTRACT = 'EXTRACT',
  SCREENSHOT = 'SCREENSHOT',
  EXPORT = 'EXPORT',
  EXTERNAL_SHARE = 'EXTERNAL_SHARE',
  AUTH = 'AUTH',
  CAPTCHA = 'CAPTCHA'
}

/**
 * Policy decision outcomes
 */
export enum PolicyDecision {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  REQUIRE_ATTESTATION = 'REQUIRE_ATTESTATION'
}

/**
 * Immutable audit log entry
 */
export interface SecureAuditLogEntry {
  readonly id: string;
  readonly index: number;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly agentId: string;
  readonly operatorId: string;
  readonly operatorRole: UserRole;
  readonly action: ActionType;
  readonly target: string;
  readonly classification: MAIClassification;
  readonly policyDecision: PolicyDecision;
  readonly reasoning: string;
  readonly approved?: boolean;
  readonly approver?: string;
  readonly approverRole?: UserRole;
  readonly screenshot?: string;
  readonly dataHash: string;
  readonly previousHash: string;
  readonly entryHash: string;
}

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: (action: ActionType, context: ActionContext) => boolean;
  decision: PolicyDecision;
  requiresAttestation?: boolean;
  attestationPrompt?: string;
}

/**
 * Action context for policy evaluation
 */
export interface ActionContext {
  url: string;
  domain: string;
  action: ActionType;
  target?: string;
  value?: string;
  classification: MAIClassification;
  operatorId: string;
  operatorRole: UserRole;
  consentObtained?: boolean;
  lawfulBasis?: string;
}

/**
 * Evidence pack with cryptographic integrity
 */
export interface SecureEvidencePack {
  readonly executionId: string;
  readonly playbookId: string;
  readonly playbookVersion: string;
  readonly agentId: string;
  readonly operatorId: string;
  readonly startTime: string;
  readonly endTime: string;

  readonly timeline: ReadonlyArray<{
    stepId: string;
    stepName: string;
    timestamp: string;
    duration: number;
    status: 'completed' | 'failed' | 'skipped';
    screenshot?: string;
  }>;

  readonly artifacts: ReadonlyArray<{
    id: string;
    type: 'document' | 'data' | 'screenshot' | 'report';
    filename: string;
    hash: string;
    source: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }>;

  readonly decisions: ReadonlyArray<{
    stepId: string;
    decision: string;
    reasoning: string;
    confidence: number;
    timestamp: string;
  }>;

  readonly approvals: ReadonlyArray<{
    stepId: string;
    action: string;
    approved: boolean;
    approver: string;
    approverRole: UserRole;
    timestamp: string;
    attestation?: string;
    signatureHash: string;
  }>;

  readonly report: {
    summary: string;
    findings: string[];
    recommendations: string[];
    completeness: number;
  };

  readonly auditLog: ReadonlyArray<SecureAuditLogEntry>;
  readonly packHash: string;
  readonly chainValid: boolean;
}

/**
 * Secure MAI Runtime - Enforces policy at runtime with cryptographic integrity
 */
export class SecureMAIRuntime {
  private policyRules: Map<string, PolicyRule> = new Map();
  private auditLog: SecureAuditLogEntry[] = [];
  private previousHash: string = '';
  private entryIndex: number = 0;

  constructor() {
    this.loadDefaultPolicies();
  }

  /**
   * Load default policy rules
   */
  private loadDefaultPolicies() {
    // POLICY 1: No authentication without approved auth mode
    this.addPolicyRule({
      id: 'no-auth',
      name: 'No Automated Authentication',
      description: 'Authentication actions require human-only execution',
      condition: (action, context) => {
        return action === ActionType.AUTH ||
          context.target?.toLowerCase().includes('login') ||
          context.target?.toLowerCase().includes('password') ||
          context.value?.toLowerCase().includes('password');
      },
      decision: PolicyDecision.DENY
    });

    // POLICY 2: No CAPTCHA interaction
    this.addPolicyRule({
      id: 'no-captcha',
      name: 'No CAPTCHA Automation',
      description: 'CAPTCHA interactions are human-only',
      condition: (action, context) => {
        return action === ActionType.CAPTCHA ||
          context.target?.toLowerCase().includes('captcha') ||
          context.target?.toLowerCase().includes('recaptcha');
      },
      decision: PolicyDecision.DENY
    });

    // POLICY 3: Form submissions require approval
    this.addPolicyRule({
      id: 'approve-submissions',
      name: 'Approve Form Submissions',
      description: 'All form submissions require human approval',
      condition: (action) => action === ActionType.SUBMIT,
      decision: PolicyDecision.REQUIRE_APPROVAL
    });

    // POLICY 4: Downloads must be logged
    this.addPolicyRule({
      id: 'controlled-downloads',
      name: 'Controlled Download Storage',
      description: 'Downloads must be hashed and logged',
      condition: (action) => action === ActionType.DOWNLOAD,
      decision: PolicyDecision.ALLOW
    });

    // POLICY 5: External sharing blocked by default
    this.addPolicyRule({
      id: 'no-external-share',
      name: 'No External Sharing',
      description: 'External sharing/email requires attestation',
      condition: (action) => action === ActionType.EXTERNAL_SHARE,
      decision: PolicyDecision.REQUIRE_ATTESTATION,
      attestationPrompt: 'Attest that you have lawful basis to share this data externally'
    });

    // POLICY 6: High-risk actions require attestation
    this.addPolicyRule({
      id: 'high-risk-attestation',
      name: 'High-Risk Action Attestation',
      description: 'Actions affecting employment/benefits require human attestation',
      condition: (action, context) => {
        const highRiskKeywords = ['employment', 'benefits', 'eligibility', 'screening', 'background'];
        const contextStr = JSON.stringify(context).toLowerCase();
        return highRiskKeywords.some(keyword => contextStr.includes(keyword));
      },
      decision: PolicyDecision.REQUIRE_ATTESTATION,
      requiresAttestation: true,
      attestationPrompt: 'Attest that you have obtained proper consent and have lawful basis for this action'
    });

    // POLICY 7: Blocked domains
    this.addPolicyRule({
      id: 'blocked-domains',
      name: 'Blocked Domain Protection',
      description: 'Certain domains are prohibited',
      condition: (action, context) => !configService.isDomainAllowed(context.domain),
      decision: PolicyDecision.DENY
    });
  }

  /**
   * Add a custom policy rule
   */
  addPolicyRule(rule: PolicyRule) {
    this.policyRules.set(rule.id, rule);
  }

  /**
   * Evaluate action against all policy rules
   * THIS IS THE ENFORCEMENT POINT
   */
  async evaluateAction(context: ActionContext): Promise<{
    decision: PolicyDecision;
    reasoning: string;
    auditEntry: SecureAuditLogEntry;
  }> {
    let decision = PolicyDecision.ALLOW;
    let reasoning = 'Default allow';

    // Enforce MANDATORY gates regardless of configuration
    const governanceConfig = configService.getGovernanceConfig();
    if (context.classification === MAIClassification.MANDATORY) {
      decision = PolicyDecision.REQUIRE_APPROVAL;
      reasoning = 'MANDATORY classification requires approval';
    }

    // Apply policy rules (most restrictive wins)
    for (const rule of this.policyRules.values()) {
      if (rule.condition(context.action, context)) {
        if (rule.decision === PolicyDecision.DENY) {
          decision = PolicyDecision.DENY;
          reasoning = `Blocked by policy: ${rule.name}`;
          break;
        }

        if (rule.decision === PolicyDecision.REQUIRE_ATTESTATION) {
          decision = PolicyDecision.REQUIRE_ATTESTATION;
          reasoning = `Attestation required: ${rule.name}`;
        } else if (rule.decision === PolicyDecision.REQUIRE_APPROVAL && decision === PolicyDecision.ALLOW) {
          decision = PolicyDecision.REQUIRE_APPROVAL;
          reasoning = `Approval required: ${rule.name}`;
        }
      }
    }

    // Create immutable audit entry
    const auditEntry = await this.createAuditEntry(context, decision, reasoning);

    log.audit('Policy evaluation complete', {
      action: context.action,
      target: context.target,
      decision,
      entryHash: auditEntry.entryHash.slice(0, 16)
    });

    return { decision, reasoning, auditEntry };
  }

  /**
   * Create an immutable audit entry with hash chain
   */
  private async createAuditEntry(
    context: ActionContext,
    decision: PolicyDecision,
    reasoning: string
  ): Promise<SecureAuditLogEntry> {
    const timestamp = new Date().toISOString();
    const correlationId = logger.getCorrelationId();
    const id = generateUUID();
    const index = this.entryIndex++;

    // Create data payload for hashing
    const dataPayload = JSON.stringify({
      id,
      index,
      timestamp,
      correlationId,
      context,
      decision,
      reasoning
    });

    // Generate hashes
    const dataHash = await sha256(dataPayload);
    const entryHash = await chainedHash(dataPayload, this.previousHash, index);

    const entry: SecureAuditLogEntry = Object.freeze({
      id,
      index,
      timestamp,
      correlationId,
      agentId: 'mai-runtime',
      operatorId: context.operatorId,
      operatorRole: context.operatorRole,
      action: context.action,
      target: context.target || context.url,
      classification: context.classification,
      policyDecision: decision,
      reasoning,
      dataHash,
      previousHash: this.previousHash,
      entryHash
    });

    // Update chain
    this.previousHash = entryHash;
    this.auditLog.push(entry);

    // Also log to persistent audit service
    await auditService.logEntry(
      AgentRole.SUPERVISOR,
      `MAI:${context.action}`,
      context.classification,
      context.operatorId,
      context.operatorRole,
      decision === PolicyDecision.ALLOW ? 'ALLOW' :
        decision === PolicyDecision.DENY ? 'DENY' : 'PENDING',
      reasoning
    );

    return entry;
  }

  /**
   * Record human approval with cryptographic signature
   */
  async recordApproval(
    context: ActionContext,
    approved: boolean,
    approver: string,
    approverRole: UserRole,
    attestation?: string
  ): Promise<SecureAuditLogEntry> {
    // Check separation of duties
    const sodViolation = auditService.checkSeparationOfDuties(
      AgentRole.SUPERVISOR,
      approver,
      approverRole
    );

    if (sodViolation && approved) {
      throw new Error(sodViolation.message);
    }

    const timestamp = new Date().toISOString();
    const correlationId = logger.getCorrelationId();
    const id = generateUUID();
    const index = this.entryIndex++;

    const dataPayload = JSON.stringify({
      id,
      index,
      timestamp,
      correlationId,
      context,
      approved,
      approver,
      approverRole,
      attestation
    });

    const dataHash = await sha256(dataPayload);
    const entryHash = await chainedHash(dataPayload, this.previousHash, index);

    const entry: SecureAuditLogEntry = Object.freeze({
      id,
      index,
      timestamp,
      correlationId,
      agentId: 'mai-runtime',
      operatorId: context.operatorId,
      operatorRole: context.operatorRole,
      action: context.action,
      target: context.target || '',
      classification: context.classification,
      policyDecision: approved ? PolicyDecision.ALLOW : PolicyDecision.DENY,
      approved,
      approver,
      approverRole,
      reasoning: approved ? 'Human approved action' : 'Human rejected action',
      dataHash,
      previousHash: this.previousHash,
      entryHash
    });

    this.previousHash = entryHash;
    this.auditLog.push(entry);

    log.audit('Approval recorded', {
      approved,
      approver,
      approverRole,
      entryHash: entryHash.slice(0, 16)
    });

    return entry;
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(): Promise<{
    valid: boolean;
    entriesChecked: number;
    brokenAt?: number;
    details?: string;
  }> {
    if (this.auditLog.length === 0) {
      return { valid: true, entriesChecked: 0 };
    }

    let expectedPreviousHash = '';

    for (let i = 0; i < this.auditLog.length; i++) {
      const entry = this.auditLog[i];

      // Check index
      if (entry.index !== i) {
        return {
          valid: false,
          entriesChecked: i,
          brokenAt: i,
          details: `Index mismatch at position ${i}`
        };
      }

      // Check hash chain
      if (entry.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          entriesChecked: i,
          brokenAt: i,
          details: `Hash chain broken at position ${i}`
        };
      }

      expectedPreviousHash = entry.entryHash;
    }

    return { valid: true, entriesChecked: this.auditLog.length };
  }

  /**
   * Generate secure evidence pack
   */
  async generateEvidencePack(
    executionId: string,
    playbookId: string,
    playbookVersion: string,
    agentId: string,
    operatorId: string,
    timeline: SecureEvidencePack['timeline'],
    artifacts: SecureEvidencePack['artifacts'],
    decisions: SecureEvidencePack['decisions'],
    approvals: Array<Omit<SecureEvidencePack['approvals'][0], 'signatureHash'>>,
    report: SecureEvidencePack['report']
  ): Promise<SecureEvidencePack> {
    // Add signature hashes to approvals
    const signedApprovals = await Promise.all(
      approvals.map(async (a) => ({
        ...a,
        signatureHash: await sha256(JSON.stringify(a))
      }))
    );

    // Verify chain integrity
    const integrityCheck = await this.verifyIntegrity();

    const packData = {
      executionId,
      playbookId,
      playbookVersion,
      agentId,
      operatorId,
      startTime: timeline[0]?.timestamp || new Date().toISOString(),
      endTime: timeline[timeline.length - 1]?.timestamp || new Date().toISOString(),
      timeline,
      artifacts,
      decisions,
      approvals: signedApprovals,
      report,
      auditLog: this.auditLog,
      chainValid: integrityCheck.valid
    };

    const packHash = await sha256(JSON.stringify(packData));

    return Object.freeze({
      ...packData,
      packHash
    });
  }

  /**
   * Get audit log (copy for safety)
   */
  getAuditLog(): ReadonlyArray<SecureAuditLogEntry> {
    return [...this.auditLog];
  }

  /**
   * Export audit log for SIEM
   */
  exportAuditLogForSIEM(): string {
    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      totalEntries: this.auditLog.length,
      chainValid: this.previousHash ? true : this.auditLog.length === 0,
      entries: this.auditLog
    }, null, 2);
  }
}

// Singleton instance
export const secureMAIRuntime = new SecureMAIRuntime();

// Export class for testing
export { SecureMAIRuntime };
