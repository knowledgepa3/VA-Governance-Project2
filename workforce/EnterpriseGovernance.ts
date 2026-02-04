/**
 * Enterprise Governance Layer for Chrome Agent Workforce
 *
 * Adds four enterprise-grade capabilities:
 * 1. Pack Attestation (hash + version + signer)
 * 2. Two-Key HITL Gates (Claude approval + Governance Console approval)
 * 3. Domain Drift Enforcement
 * 4. Evidence Pack Export (JSONL + bundle)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 1. PACK ATTESTATION
// ============================================================================

/**
 * Pack attestation - cryptographic proof of pack approval
 */
export interface PackAttestation {
  packId: string;
  version: string;
  sha256: string;                    // Hash of pack content
  approvedBy: string;                // Who approved this pack
  approverRole: string;              // Their role (ISSO, CO, PM)
  approvedAt: Date;
  expiresAt: Date;
  changeLog: PackChange[];
  signature?: string;                // Optional digital signature
  organizationId?: string;           // Org that owns this pack
}

export interface PackChange {
  version: string;
  date: Date;
  author: string;
  description: string;
  type: 'CREATED' | 'UPDATED' | 'POLICY_ADDED' | 'POLICY_REMOVED' | 'DOMAIN_CHANGE';
}

/**
 * Attested Instruction Pack - pack with cryptographic attestation
 */
export interface AttestedInstructionPack {
  id: string;
  name: string;
  version: string;
  description: string;

  // Domains
  allowedDomains: string[];
  blockedDomains: string[];

  // Policies
  policies: AttestedPolicy[];

  // HITL requirements
  hitlRequirements: HITLRequirement[];

  // Reference data (manual, ledger, etc.)
  referenceData?: ReferenceData[];

  // ATTESTATION - the enterprise piece
  attestation: PackAttestation;

  // Metadata
  metadata?: {
    manual?: string;
    task?: string;
    outputSchema?: Record<string, any>;
  };
}

export interface AttestedPolicy {
  id: string;
  name: string;
  classification: 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' | 'LOG_ONLY';
  appliesTo: string[];
  description: string;
}

export interface HITLRequirement {
  id: string;
  description: string;
  trigger: Record<string, boolean>;
  gateType: 'SINGLE_KEY' | 'TWO_KEY';  // Single = Claude only, Two = Claude + Console
}

export interface ReferenceData {
  name: string;
  type: 'ledger' | 'contact_list' | 'code_table' | 'manual' | 'custom';
  data: Record<string, any>[];
  description: string;
}

/**
 * Pack Attestation Manager
 */
export class PackAttestationManager {

  /**
   * Compute SHA-256 hash of pack content
   */
  computePackHash(pack: Omit<AttestedInstructionPack, 'attestation'>): string {
    const content = JSON.stringify({
      id: pack.id,
      name: pack.name,
      version: pack.version,
      allowedDomains: pack.allowedDomains,
      blockedDomains: pack.blockedDomains,
      policies: pack.policies,
      hitlRequirements: pack.hitlRequirements,
      referenceData: pack.referenceData,
      metadata: pack.metadata
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create attestation for a pack
   */
  attestPack(
    pack: Omit<AttestedInstructionPack, 'attestation'>,
    approver: { name: string; role: string; organizationId?: string },
    validityDays: number = 365
  ): PackAttestation {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    return {
      packId: pack.id,
      version: pack.version,
      sha256: this.computePackHash(pack),
      approvedBy: approver.name,
      approverRole: approver.role,
      approvedAt: now,
      expiresAt,
      changeLog: [{
        version: pack.version,
        date: now,
        author: approver.name,
        description: 'Initial attestation',
        type: 'CREATED'
      }],
      organizationId: approver.organizationId
    };
  }

  /**
   * Verify pack attestation is valid
   */
  verifyAttestation(pack: AttestedInstructionPack): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check hash matches
    const currentHash = this.computePackHash(pack);
    if (currentHash !== pack.attestation.sha256) {
      errors.push(`Pack content has been modified since attestation. Expected hash: ${pack.attestation.sha256}, Got: ${currentHash}`);
    }

    // Check expiration
    const now = new Date();
    if (now > new Date(pack.attestation.expiresAt)) {
      errors.push(`Pack attestation expired on ${pack.attestation.expiresAt}`);
    }

    // Check expiring soon (30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    if (new Date(pack.attestation.expiresAt) < thirtyDaysFromNow) {
      warnings.push(`Pack attestation expires in less than 30 days`);
    }

    // Check version matches
    if (pack.version !== pack.attestation.version) {
      errors.push(`Pack version (${pack.version}) doesn't match attestation version (${pack.attestation.version})`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate attestation statement for audit log
   */
  generateAttestationStatement(pack: AttestedInstructionPack): string {
    return `Work performed under Pack "${pack.name}" v${pack.version} ` +
           `(SHA256: ${pack.attestation.sha256.substring(0, 16)}...) ` +
           `approved by ${pack.attestation.approvedBy} (${pack.attestation.approverRole}) ` +
           `on ${new Date(pack.attestation.approvedAt).toISOString()}`;
  }
}

// ============================================================================
// 2. TWO-KEY HITL GATES
// ============================================================================

/**
 * Two-Key HITL Gate - requires both Claude approval AND Governance Console approval
 */
export interface TwoKeyHITLGate {
  id: string;
  gateType: 'LOGIN' | 'PAYMENT' | 'SUBMISSION' | 'DELETION' | 'HIGH_RISK';
  description: string;

  // Gate status
  status: 'PENDING' | 'KEY1_APPROVED' | 'KEY2_APPROVED' | 'FULLY_APPROVED' | 'DENIED' | 'EXPIRED';

  // Key 1: Claude sidepanel approval
  key1: {
    required: boolean;
    approved: boolean;
    approvedAt?: Date;
    approverType: 'CLAUDE_SIDEPANEL';
    context?: string;  // What user said to approve
  };

  // Key 2: Governance Console approval
  key2: {
    required: boolean;
    approved: boolean;
    approvedAt?: Date;
    approverType: 'GOVERNANCE_CONSOLE';
    approverId?: string;
    context?: string;
  };

  // Gate metadata
  workstationId: string;
  agentId: string;
  requestedAt: Date;
  expiresAt: Date;
  action: {
    tool: string;
    description: string;
    targetUrl: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

/**
 * HITL Gate Manager
 */
export class HITLGateManager {
  private pendingGates: Map<string, TwoKeyHITLGate> = new Map();
  private completedGates: TwoKeyHITLGate[] = [];

  /**
   * Create a new HITL gate
   */
  createGate(
    workstationId: string,
    agentId: string,
    gateType: TwoKeyHITLGate['gateType'],
    action: TwoKeyHITLGate['action'],
    requireTwoKey: boolean = true
  ): TwoKeyHITLGate {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);  // 15 min expiry

    const gate: TwoKeyHITLGate = {
      id: `gate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gateType,
      description: this.getGateDescription(gateType),
      status: 'PENDING',
      key1: {
        required: true,
        approved: false,
        approverType: 'CLAUDE_SIDEPANEL'
      },
      key2: {
        required: requireTwoKey,
        approved: !requireTwoKey,  // Auto-approve if not required
        approverType: 'GOVERNANCE_CONSOLE'
      },
      workstationId,
      agentId,
      requestedAt: now,
      expiresAt,
      action
    };

    this.pendingGates.set(gate.id, gate);
    return gate;
  }

  private getGateDescription(gateType: TwoKeyHITLGate['gateType']): string {
    const descriptions: Record<TwoKeyHITLGate['gateType'], string> = {
      'LOGIN': 'Authentication action requires human completion',
      'PAYMENT': 'Payment action requires dual approval',
      'SUBMISSION': 'Form submission requires approval',
      'DELETION': 'Destructive action requires approval',
      'HIGH_RISK': 'High-risk action requires dual approval'
    };
    return descriptions[gateType];
  }

  /**
   * Approve key 1 (Claude sidepanel)
   */
  approveKey1(gateId: string, context?: string): boolean {
    const gate = this.pendingGates.get(gateId);
    if (!gate) return false;

    if (new Date() > gate.expiresAt) {
      gate.status = 'EXPIRED';
      return false;
    }

    gate.key1.approved = true;
    gate.key1.approvedAt = new Date();
    gate.key1.context = context;
    gate.status = 'KEY1_APPROVED';

    this.checkFullApproval(gate);
    return true;
  }

  /**
   * Approve key 2 (Governance Console)
   */
  approveKey2(gateId: string, approverId: string, context?: string): boolean {
    const gate = this.pendingGates.get(gateId);
    if (!gate) return false;

    if (new Date() > gate.expiresAt) {
      gate.status = 'EXPIRED';
      return false;
    }

    gate.key2.approved = true;
    gate.key2.approvedAt = new Date();
    gate.key2.approverId = approverId;
    gate.key2.context = context;
    gate.status = 'KEY2_APPROVED';

    this.checkFullApproval(gate);
    return true;
  }

  /**
   * Check if gate is fully approved
   */
  private checkFullApproval(gate: TwoKeyHITLGate): void {
    if (gate.key1.approved && gate.key2.approved) {
      gate.status = 'FULLY_APPROVED';
      this.pendingGates.delete(gate.id);
      this.completedGates.push(gate);
    }
  }

  /**
   * Deny a gate
   */
  denyGate(gateId: string, reason: string): boolean {
    const gate = this.pendingGates.get(gateId);
    if (!gate) return false;

    gate.status = 'DENIED';
    this.pendingGates.delete(gate.id);
    this.completedGates.push(gate);
    return true;
  }

  /**
   * Check if gate is approved
   */
  isApproved(gateId: string): boolean {
    const gate = this.pendingGates.get(gateId) ||
                 this.completedGates.find(g => g.id === gateId);
    return gate?.status === 'FULLY_APPROVED';
  }

  /**
   * Get pending gates for a workstation
   */
  getPendingGates(workstationId?: string): TwoKeyHITLGate[] {
    const gates = Array.from(this.pendingGates.values());
    if (workstationId) {
      return gates.filter(g => g.workstationId === workstationId);
    }
    return gates;
  }

  /**
   * Get all gates for audit
   */
  getAllGates(): TwoKeyHITLGate[] {
    return [
      ...Array.from(this.pendingGates.values()),
      ...this.completedGates
    ];
  }
}

// ============================================================================
// 3. DOMAIN DRIFT ENFORCEMENT
// ============================================================================

export interface DomainDriftEvent {
  id: string;
  timestamp: Date;
  workstationId: string;
  agentId: string;

  // Drift details
  expectedDomains: string[];
  actualDomain: string;
  actualUrl: string;

  // Status
  status: 'DRIFT_DETECTED' | 'RETURNED_TO_SCOPE' | 'DRIFT_APPROVED' | 'SESSION_TERMINATED';

  // Resolution
  resolution?: {
    action: 'RETURN_TO_SCOPE' | 'APPROVE_DRIFT' | 'TERMINATE';
    resolvedBy?: string;
    resolvedAt?: Date;
    notes?: string;
  };
}

/**
 * Domain Drift Monitor
 */
export class DomainDriftMonitor {
  private driftEvents: DomainDriftEvent[] = [];
  private currentStatus: Map<string, 'IN_SCOPE' | 'DRIFT'> = new Map();

  /**
   * Check if domain is within scope
   */
  checkDomain(
    workstationId: string,
    agentId: string,
    currentUrl: string,
    allowedDomains: string[]
  ): { inScope: boolean; driftEvent?: DomainDriftEvent } {
    try {
      const urlObj = new URL(currentUrl);
      const domain = urlObj.hostname;

      // Check if domain is allowed
      const inScope = allowedDomains.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.')) {
          return domain.endsWith(allowed.slice(2));
        }
        return domain.includes(allowed) || allowed.includes(domain);
      });

      if (inScope) {
        // If was in drift, mark as returned
        if (this.currentStatus.get(workstationId) === 'DRIFT') {
          const lastDrift = this.getLastDriftEvent(workstationId);
          if (lastDrift && lastDrift.status === 'DRIFT_DETECTED') {
            lastDrift.status = 'RETURNED_TO_SCOPE';
            lastDrift.resolution = {
              action: 'RETURN_TO_SCOPE',
              resolvedAt: new Date()
            };
          }
        }
        this.currentStatus.set(workstationId, 'IN_SCOPE');
        return { inScope: true };
      }

      // Domain drift detected
      this.currentStatus.set(workstationId, 'DRIFT');

      const driftEvent: DomainDriftEvent = {
        id: `drift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        workstationId,
        agentId,
        expectedDomains: allowedDomains,
        actualDomain: domain,
        actualUrl: currentUrl,
        status: 'DRIFT_DETECTED'
      };

      this.driftEvents.push(driftEvent);

      return { inScope: false, driftEvent };
    } catch (e) {
      return { inScope: false };
    }
  }

  private getLastDriftEvent(workstationId: string): DomainDriftEvent | undefined {
    const events = this.driftEvents.filter(e => e.workstationId === workstationId);
    return events[events.length - 1];
  }

  /**
   * Approve drift (allow navigation outside scope)
   */
  approveDrift(driftEventId: string, approver: string, notes?: string): boolean {
    const event = this.driftEvents.find(e => e.id === driftEventId);
    if (!event) return false;

    event.status = 'DRIFT_APPROVED';
    event.resolution = {
      action: 'APPROVE_DRIFT',
      resolvedBy: approver,
      resolvedAt: new Date(),
      notes
    };

    return true;
  }

  /**
   * Get all drift events
   */
  getDriftEvents(workstationId?: string): DomainDriftEvent[] {
    if (workstationId) {
      return this.driftEvents.filter(e => e.workstationId === workstationId);
    }
    return this.driftEvents;
  }

  /**
   * Get current drift status
   */
  getStatus(workstationId: string): 'IN_SCOPE' | 'DRIFT' | 'UNKNOWN' {
    return this.currentStatus.get(workstationId) || 'UNKNOWN';
  }
}

// ============================================================================
// 4. EVIDENCE PACK EXPORTER
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'ACTION' | 'HITL_GATE' | 'DRIFT' | 'POLICY_CHECK' | 'SESSION_START' | 'SESSION_END';
  workstationId: string;
  agentId: string;

  // Event details
  details: {
    action?: string;
    tool?: string;
    url?: string;
    domain?: string;
    result?: 'SUCCESS' | 'BLOCKED' | 'APPROVED' | 'DENIED' | 'DRIFT';
    policyApplied?: string;
    hitlGateId?: string;
    driftEventId?: string;
  };

  // Pack context
  packContext: {
    packId: string;
    packName: string;
    packVersion: string;
    packHash: string;
  };

  // Hash chain
  previousHash: string;
  hash: string;
}

export interface EvidencePack {
  // Metadata
  metadata: {
    packId: string;
    exportedAt: Date;
    workforceName: string;
    operatorId: string;
    operatorName: string;
    sessionStart: Date;
    sessionEnd: Date;
    totalWorkstations: number;
    totalActions: number;
    totalHITLGates: number;
    totalDriftEvents: number;
  };

  // Pack attestations
  packAttestations: PackAttestation[];

  // Run configuration
  runConfig: {
    workstations: Array<{
      id: string;
      name: string;
      packId: string;
      packVersion: string;
      initialUrl: string;
    }>;
  };

  // Evidence files
  files: {
    'run.json': object;
    'audit.jsonl': string;
    'hitl_gates.json': TwoKeyHITLGate[];
    'drift_events.json': DomainDriftEvent[];
    'hashchain.txt': string;
  };
}

/**
 * Evidence Pack Exporter
 */
export class EvidencePackExporter {
  private auditEvents: AuditEvent[] = [];
  private sessionStart: Date = new Date();

  /**
   * Log an audit event
   */
  logEvent(event: Omit<AuditEvent, 'previousHash' | 'hash'>): AuditEvent {
    const previousEvent = this.auditEvents[this.auditEvents.length - 1];
    const previousHash = previousEvent?.hash || '0'.repeat(64);

    const fullEvent: AuditEvent = {
      ...event,
      previousHash,
      hash: '' // Will be computed
    };

    fullEvent.hash = this.computeEventHash(fullEvent);
    this.auditEvents.push(fullEvent);

    return fullEvent;
  }

  /**
   * Compute hash for event
   */
  private computeEventHash(event: Omit<AuditEvent, 'hash'>): string {
    const content = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      details: event.details,
      packContext: event.packContext,
      previousHash: event.previousHash
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate JSONL audit log
   */
  generateAuditJSONL(): string {
    return this.auditEvents
      .map(event => JSON.stringify(event))
      .join('\n');
  }

  /**
   * Generate hash chain file
   */
  generateHashChain(): string {
    return this.auditEvents
      .map(event => `${event.id}\t${event.hash}`)
      .join('\n');
  }

  /**
   * Export full evidence pack
   */
  exportEvidencePack(
    workforceName: string,
    operator: { id: string; name: string },
    workstations: Array<{ id: string; name: string; pack: AttestedInstructionPack; initialUrl: string }>,
    hitlGates: TwoKeyHITLGate[],
    driftEvents: DomainDriftEvent[]
  ): EvidencePack {
    const sessionEnd = new Date();

    const pack: EvidencePack = {
      metadata: {
        packId: `evidence-${Date.now()}`,
        exportedAt: sessionEnd,
        workforceName,
        operatorId: operator.id,
        operatorName: operator.name,
        sessionStart: this.sessionStart,
        sessionEnd,
        totalWorkstations: workstations.length,
        totalActions: this.auditEvents.filter(e => e.eventType === 'ACTION').length,
        totalHITLGates: hitlGates.length,
        totalDriftEvents: driftEvents.length
      },
      packAttestations: workstations.map(ws => ws.pack.attestation),
      runConfig: {
        workstations: workstations.map(ws => ({
          id: ws.id,
          name: ws.name,
          packId: ws.pack.id,
          packVersion: ws.pack.version,
          initialUrl: ws.initialUrl
        }))
      },
      files: {
        'run.json': {
          workforceName,
          operator,
          sessionStart: this.sessionStart,
          sessionEnd,
          workstations: workstations.map(ws => ({
            id: ws.id,
            name: ws.name,
            pack: {
              id: ws.pack.id,
              name: ws.pack.name,
              version: ws.pack.version,
              attestation: ws.pack.attestation
            }
          }))
        },
        'audit.jsonl': this.generateAuditJSONL(),
        'hitl_gates.json': hitlGates,
        'drift_events.json': driftEvents,
        'hashchain.txt': this.generateHashChain()
      }
    };

    return pack;
  }

  /**
   * Save evidence pack to disk
   */
  async saveEvidencePack(pack: EvidencePack, outputDir: string): Promise<string[]> {
    const packDir = path.join(outputDir, `evidence-${Date.now()}`);

    // Create directories
    fs.mkdirSync(packDir, { recursive: true });
    fs.mkdirSync(path.join(packDir, 'outputs'), { recursive: true });
    fs.mkdirSync(path.join(packDir, 'screenshots'), { recursive: true });

    const savedFiles: string[] = [];

    // Write metadata
    const metadataPath = path.join(packDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(pack.metadata, null, 2));
    savedFiles.push(metadataPath);

    // Write run.json
    const runPath = path.join(packDir, 'run.json');
    fs.writeFileSync(runPath, JSON.stringify(pack.files['run.json'], null, 2));
    savedFiles.push(runPath);

    // Write audit.jsonl
    const auditPath = path.join(packDir, 'audit.jsonl');
    fs.writeFileSync(auditPath, pack.files['audit.jsonl']);
    savedFiles.push(auditPath);

    // Write hitl_gates.json
    const hitlPath = path.join(packDir, 'hitl_gates.json');
    fs.writeFileSync(hitlPath, JSON.stringify(pack.files['hitl_gates.json'], null, 2));
    savedFiles.push(hitlPath);

    // Write drift_events.json
    const driftPath = path.join(packDir, 'drift_events.json');
    fs.writeFileSync(driftPath, JSON.stringify(pack.files['drift_events.json'], null, 2));
    savedFiles.push(driftPath);

    // Write hashchain.txt
    const hashchainPath = path.join(packDir, 'hashchain.txt');
    fs.writeFileSync(hashchainPath, pack.files['hashchain.txt']);
    savedFiles.push(hashchainPath);

    // Write attestations
    const attestationsPath = path.join(packDir, 'attestations.json');
    fs.writeFileSync(attestationsPath, JSON.stringify(pack.packAttestations, null, 2));
    savedFiles.push(attestationsPath);

    return savedFiles;
  }

  /**
   * Verify evidence pack integrity
   */
  verifyIntegrity(pack: EvidencePack): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Parse audit.jsonl and verify hash chain
    const events = pack.files['audit.jsonl']
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as AuditEvent);

    let previousHash = '0'.repeat(64);
    for (const event of events) {
      // Verify previous hash link
      if (event.previousHash !== previousHash) {
        errors.push(`Hash chain broken at event ${event.id}`);
      }

      // Verify event hash
      const computedHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          id: event.id,
          timestamp: event.timestamp,
          eventType: event.eventType,
          details: event.details,
          packContext: event.packContext,
          previousHash: event.previousHash
        }))
        .digest('hex');

      if (event.hash !== computedHash) {
        errors.push(`Hash mismatch at event ${event.id}`);
      }

      previousHash = event.hash;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// GOVERNANCE CONSOLE (Simplified for demo)
// ============================================================================

/**
 * Governance Console - Central control for the workforce
 */
export class GovernanceConsole {
  private packManager = new PackAttestationManager();
  private gateManager = new HITLGateManager();
  private driftMonitor = new DomainDriftMonitor();
  private evidenceExporter = new EvidencePackExporter();

  private activeWorkstations: Map<string, {
    id: string;
    name: string;
    pack: AttestedInstructionPack;
    status: 'ACTIVE' | 'PAUSED' | 'HITL_WAITING' | 'DRIFT' | 'COMPLETED';
  }> = new Map();

  /**
   * Register a workstation
   */
  registerWorkstation(
    id: string,
    name: string,
    pack: AttestedInstructionPack
  ): { success: boolean; errors: string[] } {
    // Verify pack attestation
    const verification = this.packManager.verifyAttestation(pack);

    if (!verification.valid) {
      return { success: false, errors: verification.errors };
    }

    this.activeWorkstations.set(id, {
      id,
      name,
      pack,
      status: 'ACTIVE'
    });

    // Log session start
    this.evidenceExporter.logEvent({
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      eventType: 'SESSION_START',
      workstationId: id,
      agentId: `agent-${id}`,
      details: {
        action: 'Workstation registered'
      },
      packContext: {
        packId: pack.id,
        packName: pack.name,
        packVersion: pack.version,
        packHash: pack.attestation.sha256
      }
    });

    return { success: true, errors: [] };
  }

  /**
   * Request HITL approval (creates two-key gate)
   */
  requestApproval(
    workstationId: string,
    agentId: string,
    gateType: TwoKeyHITLGate['gateType'],
    action: TwoKeyHITLGate['action']
  ): TwoKeyHITLGate {
    const gate = this.gateManager.createGate(workstationId, agentId, gateType, action, true);

    const ws = this.activeWorkstations.get(workstationId);
    if (ws) {
      ws.status = 'HITL_WAITING';
    }

    return gate;
  }

  /**
   * Approve from governance console (key 2)
   */
  approveGate(gateId: string, approverId: string): boolean {
    const result = this.gateManager.approveKey2(gateId, approverId);

    if (result && this.gateManager.isApproved(gateId)) {
      // Find and update workstation status
      const gates = this.gateManager.getAllGates();
      const gate = gates.find(g => g.id === gateId);
      if (gate) {
        const ws = this.activeWorkstations.get(gate.workstationId);
        if (ws) ws.status = 'ACTIVE';
      }
    }

    return result;
  }

  /**
   * Check domain and handle drift
   */
  checkDomain(
    workstationId: string,
    agentId: string,
    currentUrl: string
  ): { inScope: boolean; driftEvent?: DomainDriftEvent } {
    const ws = this.activeWorkstations.get(workstationId);
    if (!ws) return { inScope: false };

    const result = this.driftMonitor.checkDomain(
      workstationId,
      agentId,
      currentUrl,
      ws.pack.allowedDomains
    );

    if (!result.inScope) {
      ws.status = 'DRIFT';
    } else if (ws.status === 'DRIFT') {
      ws.status = 'ACTIVE';
    }

    return result;
  }

  /**
   * Get dashboard status
   */
  getDashboard(): {
    workstations: Array<{ id: string; name: string; status: string; packName: string }>;
    pendingGates: TwoKeyHITLGate[];
    recentDrifts: DomainDriftEvent[];
  } {
    return {
      workstations: Array.from(this.activeWorkstations.values()).map(ws => ({
        id: ws.id,
        name: ws.name,
        status: ws.status,
        packName: ws.pack.name
      })),
      pendingGates: this.gateManager.getPendingGates(),
      recentDrifts: this.driftMonitor.getDriftEvents().slice(-10)
    };
  }

  /**
   * Export evidence pack
   */
  exportEvidence(
    operator: { id: string; name: string },
    workforceName: string
  ): EvidencePack {
    const workstations = Array.from(this.activeWorkstations.values()).map(ws => ({
      id: ws.id,
      name: ws.name,
      pack: ws.pack,
      initialUrl: ws.pack.allowedDomains[0]
    }));

    return this.evidenceExporter.exportEvidencePack(
      workforceName,
      operator,
      workstations,
      this.gateManager.getAllGates(),
      this.driftMonitor.getDriftEvents()
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PackAttestationManager,
  HITLGateManager,
  DomainDriftMonitor,
  EvidencePackExporter,
  GovernanceConsole
};
