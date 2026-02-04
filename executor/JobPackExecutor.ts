/**
 * JOB PACK EXECUTOR v1.0.0
 *
 * Minimal MCP-based executor that:
 * 1. Loads a Job Pack
 * 2. Enforces MAI boundaries + Risk Profile
 * 3. Executes via MCP browser tools
 * 4. Produces Evidence Bundle
 *
 * This is the missing "execution engine" that connects governance to action.
 */

import * as crypto from 'crypto';
import { RiskProfile, RiskAppetite, RiskTolerance } from '../governance/RiskProfileSchema';
import { CertificationLevel } from '../governance/PackCertificationSchema';

// =============================================================================
// TYPES
// =============================================================================

export type MAILevel = 'INFORMATIONAL' | 'ADVISORY' | 'MANDATORY';

export interface JobPack {
  pack_id: string;
  pack_version: string;
  role: {
    name: string;
    mission: string;
    success_criteria: string[];
  };
  authority: {
    informational_actions: string[];
    advisory_actions: string[];
    mandatory_actions: string[];
  };
  permissions: {
    allowed_domains: string[];
    forbidden_actions: Array<{ action: string; reason: string }>;
  };
  escalation: {
    triggers: Array<{
      trigger_id: string;
      condition: string;
      action: 'STOP' | 'ASK' | 'LOG';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
  };
  procedure_index?: Array<{
    step_id: string;
    action: string;
    mai_level: MAILevel;
    description: string;
  }>;
  certification_level?: CertificationLevel;
}

export interface ExecutionContext {
  execution_id: string;
  pack: JobPack;
  profile: RiskProfile;
  started_at: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'BLOCKED';
  current_step: number;
  action_log: ActionLogEntry[];
  evidence: EvidenceBundle;
  escalation_reason?: string;
  error?: string;
}

export interface ActionLogEntry {
  timestamp: string;
  action_id: string;
  action_type: string;
  mai_level: MAILevel;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'EXECUTED' | 'BLOCKED' | 'ESCALATED';
  blocked_reason?: string;
  requires_approval: boolean;
  approval_granted?: boolean;
  result?: any;
  duration_ms?: number;
  screenshot_id?: string;
}

export interface EvidenceBundle {
  bundle_id: string;
  pack_id: string;
  execution_id: string;
  started_at: string;
  completed_at?: string;
  status: 'COLLECTING' | 'COMPLETE' | 'SEALED';
  artifacts: EvidenceArtifact[];
  manifest_hash?: string;
  seal_hash?: string;
}

export interface EvidenceArtifact {
  artifact_id: string;
  artifact_type: 'SCREENSHOT' | 'LOG' | 'DATA' | 'METADATA';
  filename: string;
  content_hash: string;
  captured_at: string;
  description: string;
  data?: any;
}

export interface ExecutionResult {
  success: boolean;
  execution_id: string;
  pack_id: string;
  status: ExecutionContext['status'];
  started_at: string;
  completed_at: string;
  duration_ms: number;
  actions_executed: number;
  actions_blocked: number;
  actions_escalated: number;
  evidence_bundle: EvidenceBundle;
  output?: any;
  error?: string;
}

// =============================================================================
// GATE CHECKS
// =============================================================================

export interface GateCheckResult {
  passed: boolean;
  gate: string;
  reason: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
}

/**
 * Check if pack meets minimum certification level
 */
export function checkCertificationGate(
  pack: JobPack,
  profile: RiskProfile
): GateCheckResult {
  const minLevel = profile.appetite.job_pack_policy.min_pack_certification_level;
  const packLevel = pack.certification_level ?? CertificationLevel.DRAFT;

  if (packLevel < minLevel) {
    return {
      passed: false,
      gate: 'CERTIFICATION_LEVEL',
      reason: `Pack certification (${CertificationLevel[packLevel]}) below profile minimum (${CertificationLevel[minLevel]})`,
      severity: 'BLOCKING'
    };
  }

  return {
    passed: true,
    gate: 'CERTIFICATION_LEVEL',
    reason: `Pack certification (${CertificationLevel[packLevel]}) meets requirement`,
    severity: 'INFO'
  };
}

/**
 * Check if pack is in enabled list (if list is non-empty)
 */
export function checkPackEnabledGate(
  pack: JobPack,
  profile: RiskProfile
): GateCheckResult {
  const enabledPacks = profile.appetite.job_pack_policy.enabled_packs;

  // Empty list means all packs allowed
  if (enabledPacks.length === 0) {
    return {
      passed: true,
      gate: 'PACK_ENABLED',
      reason: 'All packs allowed (no restrictions)',
      severity: 'INFO'
    };
  }

  if (!enabledPacks.includes(pack.pack_id)) {
    return {
      passed: false,
      gate: 'PACK_ENABLED',
      reason: `Pack "${pack.pack_id}" not in enabled list`,
      severity: 'BLOCKING'
    };
  }

  return {
    passed: true,
    gate: 'PACK_ENABLED',
    reason: `Pack "${pack.pack_id}" is enabled`,
    severity: 'INFO'
  };
}

/**
 * Check if target domain is allowed
 */
export function checkDomainGate(
  domain: string,
  profile: RiskProfile
): GateCheckResult {
  const allowed = profile.appetite.job_pack_policy.allowed_domains;
  const blocked = profile.appetite.job_pack_policy.blocked_domains;

  // Check blocked first
  for (const pattern of blocked) {
    if (matchDomainPattern(domain, pattern)) {
      return {
        passed: false,
        gate: 'DOMAIN_BLOCKED',
        reason: `Domain "${domain}" matches blocked pattern "${pattern}"`,
        severity: 'BLOCKING'
      };
    }
  }

  // If allowed list exists and is non-empty, domain must be in it
  if (allowed.length > 0) {
    const isAllowed = allowed.some(pattern => matchDomainPattern(domain, pattern));
    if (!isAllowed) {
      return {
        passed: false,
        gate: 'DOMAIN_NOT_ALLOWED',
        reason: `Domain "${domain}" not in allowed list`,
        severity: 'BLOCKING'
      };
    }
  }

  return {
    passed: true,
    gate: 'DOMAIN_ALLOWED',
    reason: `Domain "${domain}" is permitted`,
    severity: 'INFO'
  };
}

function matchDomainPattern(domain: string, pattern: string): boolean {
  // Simple wildcard matching: *.example.com matches sub.example.com
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // Remove *
    return domain.endsWith(suffix) || domain === pattern.slice(2);
  }
  return domain === pattern || domain.endsWith('.' + pattern);
}

/**
 * Check if action is allowed by MAI level
 */
export function checkMAIGate(
  actionType: string,
  maiLevel: MAILevel,
  profile: RiskProfile
): GateCheckResult {
  const maxLevel = profile.appetite.job_pack_policy.max_autonomous_mai_level;

  const levelHierarchy: Record<MAILevel, number> = {
    'INFORMATIONAL': 1,
    'ADVISORY': 2,
    'MANDATORY': 3
  };

  const actionLevelNum = levelHierarchy[maiLevel];
  const maxLevelNum = levelHierarchy[maxLevel];

  if (actionLevelNum > maxLevelNum) {
    return {
      passed: false,
      gate: 'MAI_LEVEL',
      reason: `Action "${actionType}" is ${maiLevel} but profile only allows up to ${maxLevel}`,
      severity: maiLevel === 'MANDATORY' ? 'BLOCKING' : 'WARNING'
    };
  }

  return {
    passed: true,
    gate: 'MAI_LEVEL',
    reason: `Action "${actionType}" (${maiLevel}) within allowed level`,
    severity: 'INFO'
  };
}

/**
 * Check if action is globally forbidden
 */
export function checkForbiddenActionGate(
  actionType: string,
  profile: RiskProfile
): GateCheckResult {
  const forbidden = profile.appetite.action_policy.globally_forbidden_actions;

  if (forbidden.includes(actionType)) {
    return {
      passed: false,
      gate: 'FORBIDDEN_ACTION',
      reason: `Action "${actionType}" is globally forbidden by risk profile`,
      severity: 'BLOCKING'
    };
  }

  return {
    passed: true,
    gate: 'FORBIDDEN_ACTION',
    reason: `Action "${actionType}" is not forbidden`,
    severity: 'INFO'
  };
}

/**
 * Run all pre-execution gates
 */
export function runPreExecutionGates(
  pack: JobPack,
  profile: RiskProfile,
  targetDomain: string
): { canExecute: boolean; gates: GateCheckResult[] } {
  const gates: GateCheckResult[] = [
    checkCertificationGate(pack, profile),
    checkPackEnabledGate(pack, profile),
    checkDomainGate(targetDomain, profile)
  ];

  const canExecute = gates.every(g => g.passed || g.severity !== 'BLOCKING');

  return { canExecute, gates };
}

// =============================================================================
// MAI ENFORCEMENT
// =============================================================================

export interface MAIDecision {
  allowed: boolean;
  requires_approval: boolean;
  auto_execute: boolean;
  reason: string;
  blocked_by?: string;
}

/**
 * Determine what to do with an action based on MAI level and profile
 */
export function enforceMAI(
  actionType: string,
  maiLevel: MAILevel,
  profile: RiskProfile
): MAIDecision {
  // Check if forbidden
  const forbiddenCheck = checkForbiddenActionGate(actionType, profile);
  if (!forbiddenCheck.passed) {
    return {
      allowed: false,
      requires_approval: false,
      auto_execute: false,
      reason: forbiddenCheck.reason,
      blocked_by: 'FORBIDDEN_ACTION'
    };
  }

  // Check MAI level
  const maiCheck = checkMAIGate(actionType, maiLevel, profile);
  if (!maiCheck.passed && maiCheck.severity === 'BLOCKING') {
    return {
      allowed: false,
      requires_approval: false,
      auto_execute: false,
      reason: maiCheck.reason,
      blocked_by: 'MAI_LEVEL'
    };
  }

  // Check if always requires approval
  const alwaysApprove = profile.appetite.action_policy.always_require_approval;
  if (alwaysApprove.includes(actionType)) {
    return {
      allowed: true,
      requires_approval: true,
      auto_execute: false,
      reason: `Action "${actionType}" always requires human approval`
    };
  }

  // Check if auto-approved
  const autoApproved = profile.appetite.action_policy.auto_approved_actions;
  if (autoApproved.includes(actionType)) {
    return {
      allowed: true,
      requires_approval: false,
      auto_execute: true,
      reason: `Action "${actionType}" is auto-approved`
    };
  }

  // Default behavior based on MAI level
  switch (maiLevel) {
    case 'INFORMATIONAL':
      return {
        allowed: true,
        requires_approval: false,
        auto_execute: true,
        reason: 'INFORMATIONAL actions execute automatically'
      };

    case 'ADVISORY':
      return {
        allowed: true,
        requires_approval: true,
        auto_execute: false,
        reason: 'ADVISORY actions require human decision'
      };

    case 'MANDATORY':
      // Check if mandatory auto-execution is allowed
      if (profile.appetite.job_pack_policy.allow_mandatory_auto_execution) {
        return {
          allowed: true,
          requires_approval: false,
          auto_execute: true,
          reason: 'MANDATORY auto-execution enabled by profile'
        };
      }
      return {
        allowed: true,
        requires_approval: true,
        auto_execute: false,
        reason: 'MANDATORY actions require human approval'
      };
  }
}

// =============================================================================
// EVIDENCE COLLECTION
// =============================================================================

/**
 * Create a new evidence bundle
 */
export function createEvidenceBundle(packId: string, executionId: string): EvidenceBundle {
  return {
    bundle_id: `BUNDLE-${Date.now()}`,
    pack_id: packId,
    execution_id: executionId,
    started_at: new Date().toISOString(),
    status: 'COLLECTING',
    artifacts: []
  };
}

/**
 * Add artifact to evidence bundle
 */
export function addArtifact(
  bundle: EvidenceBundle,
  type: EvidenceArtifact['artifact_type'],
  filename: string,
  description: string,
  data?: any
): EvidenceBundle {
  const content = data ? JSON.stringify(data) : '';
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  const artifact: EvidenceArtifact = {
    artifact_id: `ART-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    artifact_type: type,
    filename,
    content_hash: hash,
    captured_at: new Date().toISOString(),
    description,
    data
  };

  return {
    ...bundle,
    artifacts: [...bundle.artifacts, artifact]
  };
}

/**
 * Seal the evidence bundle (makes it immutable)
 */
export function sealEvidenceBundle(bundle: EvidenceBundle): EvidenceBundle {
  // Create manifest hash from all artifacts
  const manifest = bundle.artifacts.map(a => `${a.artifact_id}:${a.content_hash}`).join('|');
  const manifestHash = crypto.createHash('sha256').update(manifest).digest('hex');

  // Create seal hash including manifest
  const sealContent = `${bundle.bundle_id}|${bundle.execution_id}|${manifestHash}|${new Date().toISOString()}`;
  const sealHash = crypto.createHash('sha256').update(sealContent).digest('hex');

  return {
    ...bundle,
    completed_at: new Date().toISOString(),
    status: 'SEALED',
    manifest_hash: manifestHash,
    seal_hash: sealHash
  };
}

// =============================================================================
// EXECUTOR CLASS
// =============================================================================

export interface MCPBrowserTools {
  // These map to the MCP browser tools you have available
  navigate: (url: string, tabId: number) => Promise<any>;
  screenshot: (tabId: number) => Promise<{ imageData: string }>;
  readPage: (tabId: number, options?: any) => Promise<any>;
  find: (query: string, tabId: number) => Promise<any>;
  click: (ref: string, tabId: number) => Promise<any>;
  type: (ref: string, text: string, tabId: number) => Promise<any>;
  getPageText: (tabId: number) => Promise<string>;
}

export interface ApprovalCallback {
  (action: ActionLogEntry): Promise<boolean>;
}

export class JobPackExecutor {
  private context: ExecutionContext | null = null;
  private mcpTools: MCPBrowserTools;
  private approvalCallback: ApprovalCallback;
  private tabId: number;

  constructor(
    mcpTools: MCPBrowserTools,
    approvalCallback: ApprovalCallback,
    tabId: number
  ) {
    this.mcpTools = mcpTools;
    this.approvalCallback = approvalCallback;
    this.tabId = tabId;
  }

  /**
   * Execute a job pack with governance enforcement
   */
  async execute(
    pack: JobPack,
    profile: RiskProfile,
    targetUrl: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `EXEC-${Date.now()}`;

    // Extract domain from URL
    const domain = new URL(targetUrl).hostname;

    // Initialize context
    this.context = {
      execution_id: executionId,
      pack,
      profile,
      started_at: new Date().toISOString(),
      status: 'RUNNING',
      current_step: 0,
      action_log: [],
      evidence: createEvidenceBundle(pack.pack_id, executionId)
    };

    try {
      // ===========================================
      // PRE-EXECUTION GATES
      // ===========================================
      console.log('\n[EXECUTOR] Running pre-execution gates...');
      const gateResults = runPreExecutionGates(pack, profile, domain);

      // Log gate results to evidence
      this.context.evidence = addArtifact(
        this.context.evidence,
        'METADATA',
        'gate_checks.json',
        'Pre-execution gate check results',
        gateResults
      );

      // Display gate results
      for (const gate of gateResults.gates) {
        const icon = gate.passed ? '✓' : '✗';
        const color = gate.passed ? '' : ' [BLOCKED]';
        console.log(`  ${icon} ${gate.gate}: ${gate.reason}${color}`);
      }

      if (!gateResults.canExecute) {
        this.context.status = 'BLOCKED';
        const blockingGate = gateResults.gates.find(g => !g.passed && g.severity === 'BLOCKING');
        this.context.error = blockingGate?.reason || 'Pre-execution gate failed';

        return this.buildResult(startTime);
      }

      // ===========================================
      // NAVIGATE TO TARGET
      // ===========================================
      console.log(`\n[EXECUTOR] Navigating to ${targetUrl}...`);
      await this.executeAction('navigate', 'INFORMATIONAL', 'Navigate to target URL', async () => {
        await this.mcpTools.navigate(targetUrl, this.tabId);
        // Wait for page load
        await new Promise(resolve => setTimeout(resolve, 2000));
      });

      // Capture initial screenshot
      await this.captureScreenshot('initial_page', 'Initial page state after navigation');

      // ===========================================
      // EXECUTE PROCEDURE STEPS
      // ===========================================
      if (pack.procedure_index && pack.procedure_index.length > 0) {
        console.log(`\n[EXECUTOR] Executing ${pack.procedure_index.length} procedure steps...`);

        for (const step of pack.procedure_index) {
          this.context.current_step++;
          console.log(`\n[STEP ${this.context.current_step}] ${step.description}`);

          const executed = await this.executeAction(
            step.action,
            step.mai_level,
            step.description,
            async () => {
              // This is where actual browser actions would go
              // For now, we simulate based on action type
              await this.performBrowserAction(step.action);
            }
          );

          if (!executed && this.context.status !== 'RUNNING') {
            break; // Execution stopped (blocked or escalated)
          }

          // Check escalation triggers
          await this.checkEscalationTriggers();
        }
      } else {
        // No procedure - just read the page
        console.log('\n[EXECUTOR] No procedure defined, reading page...');
        await this.executeAction('read_page', 'INFORMATIONAL', 'Read page content', async () => {
          const pageText = await this.mcpTools.getPageText(this.tabId);
          this.context!.evidence = addArtifact(
            this.context!.evidence,
            'DATA',
            'page_content.txt',
            'Extracted page text',
            { text: pageText.substring(0, 10000) } // Limit size
          );
        });
      }

      // ===========================================
      // FINALIZE
      // ===========================================
      if (this.context.status === 'RUNNING') {
        this.context.status = 'COMPLETED';
      }

      // Final screenshot
      await this.captureScreenshot('final_page', 'Final page state');

      // Add action log to evidence
      this.context.evidence = addArtifact(
        this.context.evidence,
        'LOG',
        'action_log.json',
        'Complete action log',
        this.context.action_log
      );

      // Seal the evidence bundle
      this.context.evidence = sealEvidenceBundle(this.context.evidence);

      return this.buildResult(startTime);

    } catch (error) {
      this.context.status = 'FAILED';
      this.context.error = error instanceof Error ? error.message : String(error);

      // Still seal evidence even on failure
      this.context.evidence = addArtifact(
        this.context.evidence,
        'LOG',
        'error.json',
        'Execution error',
        { error: this.context.error }
      );
      this.context.evidence = sealEvidenceBundle(this.context.evidence);

      return this.buildResult(startTime);
    }
  }

  /**
   * Execute a single action with MAI enforcement
   */
  private async executeAction(
    actionType: string,
    maiLevel: MAILevel,
    description: string,
    action: () => Promise<void>
  ): Promise<boolean> {
    const actionId = `ACT-${Date.now()}`;
    const startTime = Date.now();

    // Create log entry
    const logEntry: ActionLogEntry = {
      timestamp: new Date().toISOString(),
      action_id: actionId,
      action_type: actionType,
      mai_level: maiLevel,
      description,
      status: 'PENDING',
      requires_approval: false
    };

    // Enforce MAI
    const decision = enforceMAI(actionType, maiLevel, this.context!.profile);
    console.log(`  [MAI] ${decision.reason}`);

    if (!decision.allowed) {
      logEntry.status = 'BLOCKED';
      logEntry.blocked_reason = decision.reason;
      this.context!.action_log.push(logEntry);

      if (decision.blocked_by === 'MAI_LEVEL') {
        this.context!.status = 'ESCALATED';
        this.context!.escalation_reason = decision.reason;
      }

      return false;
    }

    logEntry.requires_approval = decision.requires_approval;

    // Request approval if needed
    if (decision.requires_approval) {
      console.log(`  [APPROVAL REQUIRED] Waiting for human approval...`);
      const approved = await this.approvalCallback(logEntry);
      logEntry.approval_granted = approved;

      if (!approved) {
        logEntry.status = 'BLOCKED';
        logEntry.blocked_reason = 'Human rejected action';
        this.context!.action_log.push(logEntry);
        this.context!.status = 'ESCALATED';
        this.context!.escalation_reason = 'Human rejected action';
        return false;
      }
      console.log(`  [APPROVED] Proceeding with action`);
    }

    // Execute the action
    try {
      await action();
      logEntry.status = 'EXECUTED';
      logEntry.duration_ms = Date.now() - startTime;
      this.context!.action_log.push(logEntry);
      return true;
    } catch (error) {
      logEntry.status = 'BLOCKED';
      logEntry.blocked_reason = error instanceof Error ? error.message : String(error);
      this.context!.action_log.push(logEntry);
      throw error;
    }
  }

  /**
   * Perform actual browser action via MCP
   */
  private async performBrowserAction(actionType: string): Promise<void> {
    // Map action types to MCP tool calls
    switch (actionType) {
      case 'read_page':
      case 'read':
        await this.mcpTools.readPage(this.tabId);
        break;

      case 'screenshot':
      case 'capture':
        await this.captureScreenshot(`action_${Date.now()}`, 'Action screenshot');
        break;

      case 'scroll':
        // Scroll would be implemented via computer tool
        break;

      case 'search':
      case 'find':
        // These need specific queries - would come from procedure
        break;

      default:
        // For unknown actions, just wait a bit (simulation)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Capture and store screenshot
   */
  private async captureScreenshot(name: string, description: string): Promise<void> {
    try {
      const result = await this.mcpTools.screenshot(this.tabId);
      this.context!.evidence = addArtifact(
        this.context!.evidence,
        'SCREENSHOT',
        `${name}.png`,
        description,
        { captured: true, timestamp: new Date().toISOString() }
      );
    } catch (error) {
      console.log(`  [WARNING] Could not capture screenshot: ${error}`);
    }
  }

  /**
   * Check escalation triggers
   */
  private async checkEscalationTriggers(): Promise<void> {
    const triggers = this.context!.pack.escalation.triggers;

    for (const trigger of triggers) {
      // Simple trigger evaluation (would be more sophisticated in production)
      let triggered = false;

      if (trigger.condition.includes('error_rate')) {
        const errors = this.context!.action_log.filter(a => a.status === 'BLOCKED').length;
        const total = this.context!.action_log.length;
        const errorRate = total > 0 ? errors / total : 0;
        const threshold = parseFloat(trigger.condition.split('>')[1]) || 0.3;
        triggered = errorRate > threshold;
      }

      if (triggered) {
        console.log(`  [ESCALATION] Trigger ${trigger.trigger_id}: ${trigger.condition}`);

        if (trigger.action === 'STOP') {
          this.context!.status = 'ESCALATED';
          this.context!.escalation_reason = `Trigger ${trigger.trigger_id}: ${trigger.condition}`;
          break;
        }
      }
    }
  }

  /**
   * Build final execution result
   */
  private buildResult(startTime: number): ExecutionResult {
    const endTime = Date.now();

    return {
      success: this.context!.status === 'COMPLETED',
      execution_id: this.context!.execution_id,
      pack_id: this.context!.pack.pack_id,
      status: this.context!.status,
      started_at: this.context!.started_at,
      completed_at: new Date().toISOString(),
      duration_ms: endTime - startTime,
      actions_executed: this.context!.action_log.filter(a => a.status === 'EXECUTED').length,
      actions_blocked: this.context!.action_log.filter(a => a.status === 'BLOCKED').length,
      actions_escalated: this.context!.action_log.filter(a => a.status === 'ESCALATED').length,
      evidence_bundle: this.context!.evidence,
      error: this.context!.error
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  JobPackExecutor,
  runPreExecutionGates,
  enforceMAI,
  createEvidenceBundle,
  addArtifact,
  sealEvidenceBundle,
  checkCertificationGate,
  checkDomainGate,
  checkMAIGate,
  checkForbiddenActionGate
};
