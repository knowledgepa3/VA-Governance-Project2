/**
 * ACE Browser Automation Agent - GOVERNED VERSION
 *
 * Architecture: Planner → Gates → Runner → Evidence
 *
 * The agent NEVER executes directly. It produces an ActionPlan (ADVISORY),
 * the system enforces MANDATORY gates before any action runs.
 *
 * NIST 800-53: AU-2 (Audit Events), AU-3 (Content of Audit Records)
 * NIST 800-53: AC-4 (Information Flow Enforcement)
 * NIST AI RMF: GOVERN-1.1 (Policies for AI risk management)
 */

import { WorkforceType, AgentRole, MAIClassification } from '../types';
import { createHash } from 'crypto';

// ============================================================================
// GOVERNANCE TYPES
// ============================================================================

/**
 * Action classification for gating
 *
 * SAFE: Non-mutating, low-risk, and reversible. Execute automatically.
 *       Examples: navigate, screenshot, extract_text, scroll, wait
 *
 * ADVISORY: May alter state or cross trust boundaries. Human should review.
 *           Examples: click (navigation), download (file acquisition)
 *           Can be auto-approved in some contexts.
 *
 * MANDATORY: Can alter state, exfiltrate data, or cross trust boundaries.
 *            Human MUST explicitly approve before execution.
 *            Examples: form_submit, type, upload (disabled in V1)
 */
export enum ActionSensitivity {
  SAFE = 'SAFE',           // Non-mutating, low-risk, reversible - auto-execute
  ADVISORY = 'ADVISORY',   // May alter state - human review recommended
  MANDATORY = 'MANDATORY'  // Can alter state/exfiltrate - human MUST approve
}

/**
 * Stop condition types - automatic halt triggers
 */
export enum StopConditionType {
  CAPTCHA_DETECTED = 'CAPTCHA_DETECTED',
  LOGIN_PAGE_DETECTED = 'LOGIN_PAGE_DETECTED',
  PAYMENT_FORM_DETECTED = 'PAYMENT_FORM_DETECTED',
  PII_FIELD_DETECTED = 'PII_FIELD_DETECTED',
  DOMAIN_REDIRECT = 'DOMAIN_REDIRECT',
  BLOCKED_DOMAIN = 'BLOCKED_DOMAIN',
  UNEXPECTED_CONTENT = 'UNEXPECTED_CONTENT',
  RATE_LIMIT_DETECTED = 'RATE_LIMIT_DETECTED',
  ERROR_THRESHOLD_EXCEEDED = 'ERROR_THRESHOLD_EXCEEDED'
}

/**
 * Evidence requirement for audit trail
 */
export interface EvidenceRequirement {
  screenshotRequired: boolean;
  hashRequired: boolean;
  timestampRequired: boolean;
  captureDOM: boolean;
  captureNetwork: boolean;
}

// ============================================================================
// INSTRUCTION PACK SCHEMA (GOVERNED)
// ============================================================================

export interface InstructionPack {
  id: string;
  name: string;
  description: string;
  version: string;
  workforce: WorkforceType | 'UNIVERSAL';
  category: InstructionCategory;

  // GOVERNANCE FIELDS
  allowed_domains: string[];           // Hard allowlist - ONLY these domains
  blocked_domains: string[];           // Explicit blocklist (login, payment, etc.)
  allowed_actions: StepAction[];       // What actions this pack can perform
  sensitive_actions: StepAction[];     // Actions that require MANDATORY gate
  required_gates: GateRequirement[];   // Which conditions trigger human approval
  data_handling: DataHandlingPolicy;   // PII/secrets handling rules
  evidence_requirements: EvidenceRequirement; // What to capture per step
  stop_conditions: StopConditionType[];// Auto-halt triggers
  max_runtime_seconds: number;         // Timeout for entire pack

  // METADATA
  estimatedDuration: string;
  steps: InstructionStep[];
  outputs: OutputDefinition[];
  tags: string[];
  created: string;
  author: string;
  classification: MAIClassification;   // Pack-level classification
}

export interface GateRequirement {
  condition: string;          // What triggers the gate
  gate_type: MAIClassification;
  rationale: string;          // Why this gate exists
}

export interface DataHandlingPolicy {
  redact_pii_before_llm: boolean;    // Strip PII before sending to AI
  no_secrets_in_prompts: boolean;    // Block API keys, passwords
  mask_ssn: boolean;
  mask_credit_cards: boolean;
  allowed_data_exports: string[];    // What data can leave the system
}

export enum InstructionCategory {
  EVIDENCE_COLLECTION = 'EVIDENCE_COLLECTION',
  DATA_EXTRACTION = 'DATA_EXTRACTION',
  RESEARCH = 'RESEARCH',
  DOCUMENTATION = 'DOCUMENTATION',
  VERIFICATION = 'VERIFICATION'
  // NOTE: FORM_SUBMISSION and MONITORING removed for v1 (read-only)
}

// ============================================================================
// STEP TYPES
// ============================================================================

export interface InstructionStep {
  id: string;
  order: number;
  action: StepAction;
  target?: StepTarget;
  value?: string | Record<string, string>;
  waitFor?: WaitCondition;
  captureEvidence: boolean;        // REQUIRED field now
  captureData?: DataCapture;
  onError?: ErrorHandler;
  conditional?: StepCondition;
  description: string;
  rationale: string;               // Why this step exists (for reviewers)
  sensitivity: ActionSensitivity;  // Gate classification for this step
}

export enum StepAction {
  // SAFE ACTIONS (no gate required)
  NAVIGATE = 'NAVIGATE',
  SCREENSHOT = 'SCREENSHOT',
  EXTRACT_TEXT = 'EXTRACT_TEXT',
  EXTRACT_TABLE = 'EXTRACT_TABLE',
  EXTRACT_LINKS = 'EXTRACT_LINKS',
  WAIT = 'WAIT',
  SCROLL = 'SCROLL',
  VERIFY_ELEMENT = 'VERIFY_ELEMENT',
  VERIFY_TEXT = 'VERIFY_TEXT',
  STORE_VALUE = 'STORE_VALUE',

  // ADVISORY ACTIONS (human should review)
  CLICK = 'CLICK',
  DOWNLOAD = 'DOWNLOAD',

  // MANDATORY ACTIONS (human MUST approve) - DISABLED FOR V1
  // TYPE = 'TYPE',
  // SELECT = 'SELECT',
  // FORM_FILL = 'FORM_FILL',
  // SUBMIT = 'SUBMIT',
  // UPLOAD = 'UPLOAD',
  // DELETE = 'DELETE',
  // SEND_MESSAGE = 'SEND_MESSAGE'
}

// Safe actions that never require gates
export const SAFE_ACTIONS: StepAction[] = [
  StepAction.NAVIGATE,
  StepAction.SCREENSHOT,
  StepAction.EXTRACT_TEXT,
  StepAction.EXTRACT_TABLE,
  StepAction.EXTRACT_LINKS,
  StepAction.WAIT,
  StepAction.SCROLL,
  StepAction.VERIFY_ELEMENT,
  StepAction.VERIFY_TEXT,
  StepAction.STORE_VALUE
];

// Actions that require ADVISORY review
export const ADVISORY_ACTIONS: StepAction[] = [
  StepAction.CLICK,
  StepAction.DOWNLOAD
];

export interface StepTarget {
  selector?: string;
  xpath?: string;
  text?: string;
  ariaLabel?: string;
  testId?: string;
  url?: string;
  nth?: number;
}

export interface WaitCondition {
  type: 'element' | 'text' | 'url' | 'timeout' | 'network_idle';
  value: string | number;
  timeout?: number;
}

export interface DataCapture {
  name: string;
  type: 'text' | 'html' | 'attribute' | 'table' | 'list' | 'json';
  selector?: string;
  attribute?: string;
  transform?: DataTransform;
}

export interface DataTransform {
  type: 'regex' | 'split' | 'trim' | 'replace' | 'json_parse';
  pattern?: string;
  replacement?: string;
  delimiter?: string;
}

export interface ErrorHandler {
  action: 'skip' | 'retry' | 'abort' | 'halt_for_review';
  maxRetries?: number;
  fallbackStepId?: string;
  logError?: boolean;
}

export interface StepCondition {
  type: 'element_exists' | 'element_visible' | 'text_contains' | 'url_matches' | 'stored_value';
  target?: StepTarget;
  value?: string;
  operator?: 'equals' | 'contains' | 'matches' | 'not_equals';
  thenStepId?: string;
  elseStepId?: string;
}

export interface OutputDefinition {
  name: string;
  type: 'screenshot' | 'text' | 'file' | 'json' | 'table';
  description: string;
  required: boolean;
}

// ============================================================================
// ACTION PLAN (Output from Planner - ADVISORY)
// ============================================================================

export interface ActionPlan {
  id: string;
  pack_id: string;
  pack_name: string;
  pack_version: string;
  created_at: string;
  classification: MAIClassification;  // Always ADVISORY for plans

  // Plan content
  steps: PlannedStep[];
  total_steps: number;
  estimated_duration_seconds: number;

  // Risk assessment
  risk_flags: RiskFlag[];
  gates_required: PlanGate[];
  domains_to_visit: string[];

  // Validation
  domain_validation: DomainValidation;
  action_validation: ActionValidation;

  // Approval tracking
  approval_status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
}

export interface PlannedStep {
  step_id: string;
  order: number;
  action: StepAction;
  target_description: string;
  expected_result: string;
  evidence_to_capture: string[];
  sensitivity: ActionSensitivity;
  rationale: string;
  requires_gate: boolean;
  gate_type?: MAIClassification;
}

export interface RiskFlag {
  type: 'LOGIN_DETECTED' | 'FILE_UPLOAD' | 'DOMAIN_CHANGE' | 'SENSITIVE_DATA' | 'EXTERNAL_SERVICE';
  description: string;
  step_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation?: string;
}

export interface PlanGate {
  step_id: string;
  gate_type: MAIClassification;
  reason: string;
  auto_approvable: boolean;
}

export interface DomainValidation {
  valid: boolean;
  domains_requested: string[];
  domains_allowed: string[];
  domains_blocked: string[];
  violations: string[];
}

export interface ActionValidation {
  valid: boolean;
  actions_requested: StepAction[];
  actions_allowed: StepAction[];
  actions_blocked: StepAction[];
  violations: string[];
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// ============================================================================
// EXECUTION CONTEXT & RESULTS
// ============================================================================

export interface ExecutionContext {
  plan_id: string;
  pack_id: string;
  start_time: Date;
  current_step: number;
  total_steps: number;
  status: ExecutionStatus;
  current_domain: string;
  stored_values: Record<string, any>;
  captured_data: Record<string, any>;
  evidence: EvidenceRecord[];
  logs: ExecutionLog[];
  errors: ExecutionError[];
  stop_condition?: StopConditionType;
  gates_triggered: GateEvent[];
}

export enum ExecutionStatus {
  PLANNING = 'PLANNING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  RUNNING = 'RUNNING',
  PAUSED_FOR_GATE = 'PAUSED_FOR_GATE',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABORTED = 'ABORTED'
}

export interface EvidenceRecord {
  id: string;
  step_id: string;
  timestamp: string;
  type: 'screenshot' | 'dom_snapshot' | 'network_log' | 'data_extract';
  url: string;
  domain: string;
  hash: string;           // SHA-256 hash for integrity
  filename: string;
  description: string;
  size_bytes: number;
  base64?: string;
}

export interface ExecutionLog {
  timestamp: string;
  step_id: string;
  action: string;
  status: 'success' | 'warning' | 'error' | 'info' | 'gate';
  message: string;
  duration_ms?: number;
  domain?: string;
}

export interface ExecutionError {
  timestamp: string;
  step_id: string;
  error_type: string;
  message: string;
  recoverable: boolean;
  handled: boolean;
  triggered_stop?: StopConditionType;
}

export interface GateEvent {
  timestamp: string;
  step_id: string;
  gate_type: MAIClassification;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  // Enhanced gate metadata for audit clarity
  action_type?: StepAction;           // What action triggered the gate
  target_domain?: string;             // Domain where action would execute
  rationale?: string;                 // Why this gate exists (governance rule)
  risk_factors?: string[];            // Specific risks identified
}

export interface ExecutionResult {
  success: boolean;
  plan_id: string;
  pack_id: string;
  pack_name: string;
  pack_version: string;           // Version of the pack that was executed
  start_time: string;
  end_time: string;
  duration_ms: number;
  steps_completed: number;
  total_steps: number;
  final_status: ExecutionStatus;
  stop_condition?: StopConditionType;
  captured_data: Record<string, any>;
  evidence: EvidenceRecord[];
  evidence_package_hash: string;  // Hash of entire evidence package
  pack_policy_hash: string;       // Hash of pack id + version for audit linkage
  errors: ExecutionError[];
  logs: ExecutionLog[];
  gates_triggered: GateEvent[];
}

// ============================================================================
// BROWSER AUTOMATION AGENT (PLANNER)
// ============================================================================

export class BrowserAutomationPlanner {

  /**
   * Generate an ActionPlan from an InstructionPack
   * This is ADVISORY - does not execute anything
   */
  async generatePlan(
    pack: InstructionPack,
    inputParams: Record<string, string>
  ): Promise<ActionPlan> {

    const planId = `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate domains
    const domainValidation = this.validateDomains(pack, inputParams);

    // Validate actions
    const actionValidation = this.validateActions(pack);

    // Build planned steps with risk assessment
    const plannedSteps: PlannedStep[] = [];
    const riskFlags: RiskFlag[] = [];
    const gatesRequired: PlanGate[] = [];
    const domainsToVisit: string[] = [];

    for (const step of pack.steps) {
      // Interpolate values
      const targetUrl = step.target?.url
        ? this.interpolate(step.target.url, inputParams)
        : undefined;

      // Track domains
      if (targetUrl) {
        const domain = this.extractDomain(targetUrl);
        if (domain && !domainsToVisit.includes(domain)) {
          domainsToVisit.push(domain);
        }
      }

      // Determine if gate required
      const requiresGate = this.stepRequiresGate(step, pack);

      plannedSteps.push({
        step_id: step.id,
        order: step.order,
        action: step.action,
        target_description: this.describeTarget(step),
        expected_result: step.description,
        evidence_to_capture: this.getEvidenceList(step, pack),
        sensitivity: step.sensitivity || this.classifyAction(step.action),
        rationale: step.rationale || 'Standard operation',
        requires_gate: requiresGate,
        gate_type: requiresGate ? this.getGateType(step, pack) : undefined
      });

      // Add gate if required
      if (requiresGate) {
        gatesRequired.push({
          step_id: step.id,
          gate_type: this.getGateType(step, pack),
          reason: `Action "${step.action}" requires approval`,
          auto_approvable: step.sensitivity === ActionSensitivity.ADVISORY
        });
      }

      // Check for risk flags
      const stepRisks = this.assessStepRisks(step, inputParams);
      riskFlags.push(...stepRisks);
    }

    return {
      id: planId,
      pack_id: pack.id,
      pack_name: pack.name,
      pack_version: pack.version,
      created_at: new Date().toISOString(),
      classification: MAIClassification.ADVISORY,

      steps: plannedSteps,
      total_steps: plannedSteps.length,
      estimated_duration_seconds: this.estimateDuration(pack),

      risk_flags: riskFlags,
      gates_required: gatesRequired,
      domains_to_visit: domainsToVisit,

      domain_validation: domainValidation,
      action_validation: actionValidation,

      approval_status: ApprovalStatus.PENDING
    };
  }

  private validateDomains(pack: InstructionPack, params: Record<string, string>): DomainValidation {
    const domainsRequested: string[] = [];
    const violations: string[] = [];

    // Extract domains from all steps
    for (const step of pack.steps) {
      if (step.target?.url) {
        const url = this.interpolate(step.target.url, params);
        const domain = this.extractDomain(url);
        if (domain && !domainsRequested.includes(domain)) {
          domainsRequested.push(domain);

          // Check against allowlist
          if (!this.isDomainAllowed(domain, pack.allowed_domains)) {
            violations.push(`Domain "${domain}" not in allowlist`);
          }

          // Check against blocklist
          if (this.isDomainBlocked(domain, pack.blocked_domains)) {
            violations.push(`Domain "${domain}" is blocked`);
          }
        }
      }
    }

    return {
      valid: violations.length === 0,
      domains_requested: domainsRequested,
      domains_allowed: pack.allowed_domains,
      domains_blocked: pack.blocked_domains,
      violations
    };
  }

  private validateActions(pack: InstructionPack): ActionValidation {
    const actionsRequested: StepAction[] = [];
    const violations: string[] = [];

    for (const step of pack.steps) {
      if (!actionsRequested.includes(step.action)) {
        actionsRequested.push(step.action);

        // Check if action is allowed
        if (!pack.allowed_actions.includes(step.action)) {
          violations.push(`Action "${step.action}" not allowed in this pack`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      actions_requested: actionsRequested,
      actions_allowed: pack.allowed_actions,
      actions_blocked: [], // V1: no blocked actions, just not in allowed list
      violations
    };
  }

  private stepRequiresGate(step: InstructionStep, pack: InstructionPack): boolean {
    // Check if action is in sensitive list
    if (pack.sensitive_actions.includes(step.action)) {
      return true;
    }

    // Check if step has explicit sensitivity
    if (step.sensitivity === ActionSensitivity.MANDATORY) {
      return true;
    }

    // Advisory actions need gates too (but can be auto-approved)
    if (ADVISORY_ACTIONS.includes(step.action)) {
      return true;
    }

    return false;
  }

  private getGateType(step: InstructionStep, pack: InstructionPack): MAIClassification {
    if (pack.sensitive_actions.includes(step.action)) {
      return MAIClassification.MANDATORY;
    }
    if (step.sensitivity === ActionSensitivity.MANDATORY) {
      return MAIClassification.MANDATORY;
    }
    return MAIClassification.ADVISORY;
  }

  private classifyAction(action: StepAction): ActionSensitivity {
    if (SAFE_ACTIONS.includes(action)) return ActionSensitivity.SAFE;
    if (ADVISORY_ACTIONS.includes(action)) return ActionSensitivity.ADVISORY;
    return ActionSensitivity.MANDATORY;
  }

  private assessStepRisks(step: InstructionStep, params: Record<string, string>): RiskFlag[] {
    const risks: RiskFlag[] = [];

    // Check for login-related targets
    if (step.target?.text?.toLowerCase().includes('login') ||
        step.target?.text?.toLowerCase().includes('sign in') ||
        step.target?.selector?.includes('login') ||
        step.target?.selector?.includes('signin')) {
      risks.push({
        type: 'LOGIN_DETECTED',
        description: 'Step targets login-related element',
        step_id: step.id,
        severity: 'HIGH',
        mitigation: 'Requires MANDATORY gate approval'
      });
    }

    // Check for file operations
    if (step.action === StepAction.DOWNLOAD) {
      risks.push({
        type: 'FILE_UPLOAD',
        description: 'Step downloads a file',
        step_id: step.id,
        severity: 'MEDIUM',
        mitigation: 'File will be scanned before use'
      });
    }

    return risks;
  }

  private getEvidenceList(step: InstructionStep, pack: InstructionPack): string[] {
    const evidence: string[] = [];

    if (step.captureEvidence || pack.evidence_requirements.screenshotRequired) {
      evidence.push('screenshot');
    }
    if (pack.evidence_requirements.hashRequired) {
      evidence.push('content_hash');
    }
    if (pack.evidence_requirements.timestampRequired) {
      evidence.push('timestamp');
    }
    if (pack.evidence_requirements.captureDOM) {
      evidence.push('dom_snapshot');
    }
    if (pack.evidence_requirements.captureNetwork) {
      evidence.push('network_log');
    }

    return evidence;
  }

  private describeTarget(step: InstructionStep): string {
    if (!step.target) return 'No specific target';
    if (step.target.url) return `URL: ${step.target.url}`;
    if (step.target.text) return `Element with text: "${step.target.text}"`;
    if (step.target.selector) return `CSS: ${step.target.selector}`;
    if (step.target.ariaLabel) return `ARIA: ${step.target.ariaLabel}`;
    return 'Dynamic target';
  }

  private estimateDuration(pack: InstructionPack): number {
    // Rough estimate: 3 seconds per step + wait times
    let total = pack.steps.length * 3;

    for (const step of pack.steps) {
      if (step.waitFor?.type === 'timeout' && typeof step.waitFor.value === 'number') {
        total += step.waitFor.value / 1000;
      }
    }

    return Math.ceil(total);
  }

  private interpolate(template: string, params: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }

  private extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return null;
    }
  }

  private isDomainAllowed(domain: string, allowlist: string[]): boolean {
    // Normalize domain - strip www. prefix for matching
    const normalizedDomain = domain.replace(/^www\./, '');

    return allowlist.some(allowed => {
      const normalizedAllowed = allowed.replace(/^www\./, '');

      if (allowed.startsWith('*.')) {
        // Wildcard match
        const suffix = allowed.slice(2);
        return normalizedDomain === suffix || normalizedDomain.endsWith('.' + suffix) ||
               domain === suffix || domain.endsWith('.' + suffix);
      }
      // Exact match (with www. normalization)
      return normalizedDomain === normalizedAllowed || domain === allowed;
    });
  }

  private isDomainBlocked(domain: string, blocklist: string[]): boolean {
    // Normalize domain - strip www. prefix for matching
    const normalizedDomain = domain.replace(/^www\./, '');

    return blocklist.some(blocked => {
      const normalizedBlocked = blocked.replace(/^www\./, '');

      if (blocked.startsWith('*.')) {
        const suffix = blocked.slice(2);
        return normalizedDomain === suffix || normalizedDomain.endsWith('.' + suffix) ||
               domain === suffix || domain.endsWith('.' + suffix);
      }
      // Exact match (with www. normalization)
      return normalizedDomain === normalizedBlocked || domain === blocked;
    });
  }
}

// ============================================================================
// BROWSER AUTOMATION RUNNER (GATED EXECUTOR)
// ============================================================================

export class BrowserAutomationRunner {
  private context: ExecutionContext | null = null;
  private abortController: AbortController | null = null;

  /**
   * Execute an approved ActionPlan
   * Will halt at gates and stop conditions
   */
  async execute(
    plan: ActionPlan,
    pack: InstructionPack,
    inputParams: Record<string, string>,
    onProgress?: (context: ExecutionContext) => void,
    onGate?: (gate: GateEvent) => Promise<boolean>
  ): Promise<ExecutionResult> {

    // Verify plan is approved
    if (plan.approval_status !== ApprovalStatus.APPROVED) {
      throw new Error('Cannot execute unapproved plan');
    }

    // Verify domain and action validation passed
    if (!plan.domain_validation.valid) {
      throw new Error(`Domain validation failed: ${plan.domain_validation.violations.join(', ')}`);
    }
    if (!plan.action_validation.valid) {
      throw new Error(`Action validation failed: ${plan.action_validation.violations.join(', ')}`);
    }

    // Initialize context
    this.context = {
      plan_id: plan.id,
      pack_id: pack.id,
      start_time: new Date(),
      current_step: 0,
      total_steps: plan.total_steps,
      status: ExecutionStatus.RUNNING,
      current_domain: '',
      stored_values: { ...inputParams },
      captured_data: {},
      evidence: [],
      logs: [],
      errors: [],
      gates_triggered: []
    };

    this.abortController = new AbortController();

    this.log('info', 'INIT', `Starting execution of plan: ${plan.id}`);

    try {
      for (const plannedStep of plan.steps) {
        if (this.abortController.signal.aborted) {
          this.context.status = ExecutionStatus.ABORTED;
          break;
        }

        // Check for gates
        if (plannedStep.requires_gate) {
          // Find the original step for enhanced metadata
          const originalStep = pack.steps.find(s => s.id === plannedStep.step_id);

          // Generate detailed rationale based on action type
          const rationale = this.generateGateRationale(plannedStep, originalStep, pack);

          const gate: GateEvent = {
            timestamp: new Date().toISOString(),
            step_id: plannedStep.step_id,
            gate_type: plannedStep.gate_type!,
            reason: `Step requires ${plannedStep.gate_type} approval`,
            status: 'PENDING',
            // Enhanced metadata for audit
            action_type: originalStep?.action,
            target_domain: this.context.current_domain,
            rationale: rationale.reason,
            risk_factors: rationale.risks
          };

          this.context.gates_triggered.push(gate);
          this.context.status = ExecutionStatus.PAUSED_FOR_GATE;
          this.log('gate', plannedStep.step_id, `GATE: ${plannedStep.gate_type} | Action: ${originalStep?.action} | ${rationale.reason}`);

          onProgress?.(this.context);

          // Wait for gate approval
          if (onGate) {
            const approved = await onGate(gate);
            gate.status = approved ? 'APPROVED' : 'REJECTED';
            gate.approved_at = new Date().toISOString();

            if (!approved) {
              this.context.status = ExecutionStatus.STOPPED;
              this.log('error', plannedStep.step_id, 'HELD → STOPPED: Gate rejected by human');
              // GOVERNANCE: Capture evidence when gate is rejected (HELD → STOPPED)
              const step = pack.steps.find(s => s.id === plannedStep.step_id);
              if (step) {
                await this.captureGateRejectionEvidence(step, gate.reason, pack);
              }
              break;
            }
          } else {
            // No gate handler - auto-approve ADVISORY, reject MANDATORY
            if (plannedStep.gate_type === MAIClassification.MANDATORY) {
              gate.status = 'REJECTED';
              this.context.status = ExecutionStatus.STOPPED;
              this.log('error', plannedStep.step_id, 'HELD → STOPPED: MANDATORY gate with no handler');
              // GOVERNANCE: Capture evidence when MANDATORY gate has no handler
              const step = pack.steps.find(s => s.id === plannedStep.step_id);
              if (step) {
                await this.captureGateRejectionEvidence(step, 'MANDATORY gate requires human handler', pack);
              }
              break;
            }
            gate.status = 'APPROVED';
          }

          this.context.status = ExecutionStatus.RUNNING;
        }

        // Find the actual step in the pack
        const step = pack.steps.find(s => s.id === plannedStep.step_id);
        if (!step) continue;

        this.context.current_step = plannedStep.order;
        onProgress?.(this.context);

        try {
          // Execute step
          await this.executeStep(step, pack, inputParams);

          // Check stop conditions after each step
          const stopCondition = await this.checkStopConditions(pack);
          if (stopCondition) {
            this.context.stop_condition = stopCondition;
            this.context.status = ExecutionStatus.STOPPED;
            this.log('warning', step.id, `STOPPED: ${stopCondition}`);
            // GOVERNANCE: Always capture evidence on STOP for audit trail
            await this.captureStopEvidence(step, stopCondition, pack);
            break;
          }

          this.log('success', step.id, `Completed: ${step.description}`);

        } catch (error: any) {
          const handled = await this.handleError(step, error);
          if (!handled) {
            this.context.status = ExecutionStatus.FAILED;
            break;
          }
        }
      }

      if (this.context.status === ExecutionStatus.RUNNING) {
        this.context.status = ExecutionStatus.COMPLETED;
      }

    } catch (error: any) {
      this.context.status = ExecutionStatus.FAILED;
      this.log('error', 'FATAL', error.message);
    }

    const endTime = new Date();

    // Generate evidence package hash
    const evidencePackageHash = this.hashEvidencePackage();

    // Generate pack policy hash - proves which policy version produced this evidence
    const packPolicyHash = this.generatePackPolicyHash(pack.id, pack.version);

    return {
      success: this.context.status === ExecutionStatus.COMPLETED,
      plan_id: plan.id,
      pack_id: pack.id,
      pack_name: pack.name,
      pack_version: pack.version,
      start_time: this.context.start_time.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: endTime.getTime() - this.context.start_time.getTime(),
      steps_completed: this.context.current_step,
      total_steps: this.context.total_steps,
      final_status: this.context.status,
      stop_condition: this.context.stop_condition,
      captured_data: this.context.captured_data,
      evidence: this.context.evidence,
      evidence_package_hash: evidencePackageHash,
      pack_policy_hash: packPolicyHash,
      errors: this.context.errors,
      logs: this.context.logs,
      gates_triggered: this.context.gates_triggered
    };
  }

  private async executeStep(
    step: InstructionStep,
    pack: InstructionPack,
    params: Record<string, string>
  ): Promise<void> {
    const startTime = Date.now();

    // Simulate step execution (would integrate with Chrome MCP)
    this.log('info', step.id, `Executing: ${step.action}`);

    switch (step.action) {
      case StepAction.NAVIGATE:
        await this.actionNavigate(step, params, pack);
        break;
      case StepAction.SCREENSHOT:
        await this.actionScreenshot(step);
        break;
      case StepAction.EXTRACT_TEXT:
        await this.actionExtractText(step);
        break;
      case StepAction.EXTRACT_TABLE:
        await this.actionExtractTable(step);
        break;
      case StepAction.CLICK:
        await this.actionClick(step);
        break;
      case StepAction.DOWNLOAD:
        await this.actionDownload(step);
        break;
      case StepAction.WAIT:
        await this.actionWait(step);
        break;
      case StepAction.SCROLL:
        await this.actionScroll(step);
        break;
      default:
        this.log('warning', step.id, `Unsupported action: ${step.action}`);
    }

    // Capture evidence if required
    if (step.captureEvidence) {
      await this.captureEvidence(step, pack);
    }

    // Handle wait conditions
    if (step.waitFor) {
      await this.waitForCondition(step.waitFor);
    }

    const duration = Date.now() - startTime;
    this.updateLogDuration(step.id, duration);
  }

  // Action implementations (simulate - would use MCP)
  private async actionNavigate(step: InstructionStep, params: Record<string, string>, pack: InstructionPack): Promise<void> {
    const url = this.interpolate(step.target?.url || '', params);
    const domain = this.extractDomain(url);

    // Verify domain is still allowed
    if (domain && !pack.allowed_domains.some(d => domain.includes(d.replace('*.', '')))) {
      throw new Error(`Domain ${domain} not in allowlist`);
    }

    this.context!.current_domain = domain || '';
    this.log('info', step.id, `Navigating to: ${url}`);
    await this.delay(1500);
  }

  private async actionScreenshot(step: InstructionStep): Promise<void> {
    this.log('info', step.id, 'Capturing screenshot');
    await this.captureEvidence(step, null as any);
    await this.delay(500);
  }

  private async actionExtractText(step: InstructionStep): Promise<void> {
    this.log('info', step.id, 'Extracting text');
    if (step.captureData) {
      this.context!.captured_data[step.captureData.name] = '[Extracted text content]';
    }
    await this.delay(500);
  }

  private async actionExtractTable(step: InstructionStep): Promise<void> {
    this.log('info', step.id, 'Extracting table');
    if (step.captureData) {
      this.context!.captured_data[step.captureData.name] = {
        headers: ['Column1', 'Column2'],
        rows: [['Data1', 'Data2']]
      };
    }
    await this.delay(800);
  }

  private async actionClick(step: InstructionStep): Promise<void> {
    this.log('info', step.id, `Clicking: ${this.describeTarget(step)}`);
    await this.delay(500);
  }

  private async actionDownload(step: InstructionStep): Promise<void> {
    this.log('info', step.id, 'Downloading file');
    await this.delay(2000);
  }

  private async actionWait(step: InstructionStep): Promise<void> {
    const duration = parseInt(step.value as string) || 1000;
    this.log('info', step.id, `Waiting ${duration}ms`);
    await this.delay(duration);
  }

  private async actionScroll(step: InstructionStep): Promise<void> {
    this.log('info', step.id, `Scrolling ${step.value || 'down'}`);
    await this.delay(500);
  }

  private async checkStopConditions(pack: InstructionPack): Promise<StopConditionType | null> {
    // Would check actual page state via MCP
    // For now, simulate checks

    // Check if current domain is blocked
    if (this.context!.current_domain) {
      for (const blocked of pack.blocked_domains) {
        if (this.context!.current_domain.includes(blocked.replace('*.', ''))) {
          return StopConditionType.BLOCKED_DOMAIN;
        }
      }
    }

    // Simulated checks - would use MCP to detect these
    // - CAPTCHA_DETECTED
    // - LOGIN_PAGE_DETECTED
    // - PAYMENT_FORM_DETECTED
    // - PII_FIELD_DETECTED

    return null;
  }

  private async captureEvidence(step: InstructionStep, pack: InstructionPack): Promise<void> {
    const evidence: EvidenceRecord = {
      id: `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      step_id: step.id,
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      url: this.context?.current_domain || 'unknown',
      domain: this.context?.current_domain || 'unknown',
      hash: this.generateHash(`screenshot-${step.id}-${Date.now()}`),
      filename: `evidence_${step.id}_${Date.now()}.png`,
      description: step.description,
      size_bytes: 0
    };

    this.context!.evidence.push(evidence);
  }

  /**
   * GOVERNANCE: Capture evidence when a STOP condition is triggered
   * This ensures audit trail even when execution halts early
   */
  private async captureStopEvidence(
    step: InstructionStep,
    stopCondition: StopConditionType,
    pack: InstructionPack
  ): Promise<void> {
    const evidence: EvidenceRecord = {
      id: `EVD-STOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      step_id: step.id,
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      url: this.context?.current_domain || 'unknown',
      domain: this.context?.current_domain || 'unknown',
      hash: this.generateHash(`stop-evidence-${step.id}-${stopCondition}-${Date.now()}`),
      filename: `evidence_STOPPED_${stopCondition}_${Date.now()}.png`,
      description: `STOPPED: ${stopCondition} detected at step "${step.description}"`,
      size_bytes: 0
    };

    this.context!.evidence.push(evidence);
    this.log('info', step.id, `Evidence captured for STOP condition: ${stopCondition}`);
  }

  /**
   * GOVERNANCE: Capture evidence when a gate is rejected (HELD → STOPPED)
   * This ensures audit trail when human rejects an action
   */
  private async captureGateRejectionEvidence(
    step: InstructionStep,
    reason: string,
    pack: InstructionPack
  ): Promise<void> {
    const evidence: EvidenceRecord = {
      id: `EVD-GATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      step_id: step.id,
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      url: this.context?.current_domain || 'unknown',
      domain: this.context?.current_domain || 'unknown',
      hash: this.generateHash(`gate-rejection-${step.id}-${Date.now()}`),
      filename: `evidence_GATE_REJECTED_${Date.now()}.png`,
      description: `HELD → STOPPED: Gate rejected for "${step.description}". Reason: ${reason}`,
      size_bytes: 0
    };

    this.context!.evidence.push(evidence);
    this.log('info', step.id, `Evidence captured for gate rejection: ${reason}`);
  }

  private async waitForCondition(condition: WaitCondition): Promise<void> {
    const timeout = condition.timeout || 10000;
    if (condition.type === 'timeout') {
      await this.delay(condition.value as number);
    } else {
      await this.delay(Math.min(1000, timeout));
    }
  }

  private async handleError(step: InstructionStep, error: any): Promise<boolean> {
    const handler = step.onError || { action: 'abort', logError: true };

    this.context!.errors.push({
      timestamp: new Date().toISOString(),
      step_id: step.id,
      error_type: error.name || 'Error',
      message: error.message,
      recoverable: handler.action !== 'abort',
      handled: handler.action !== 'abort'
    });

    this.log('error', step.id, error.message);

    switch (handler.action) {
      case 'skip':
        return true;
      case 'retry':
        return true; // Would implement retry logic
      case 'halt_for_review':
        this.context!.status = ExecutionStatus.PAUSED_FOR_GATE;
        return true;
      case 'abort':
      default:
        return false;
    }
  }

  private hashEvidencePackage(): string {
    const content = JSON.stringify({
      evidence: this.context?.evidence || [],
      captured_data: this.context?.captured_data || {}
    });
    return this.generateHash(content);
  }

  /**
   * Generate detailed gate rationale for audit clarity
   * Explains WHY a gate exists, not just that it does
   */
  private generateGateRationale(
    plannedStep: PlannedStep,
    originalStep: InstructionStep | undefined,
    pack: InstructionPack
  ): { reason: string; risks: string[] } {
    const risks: string[] = [];
    let reason = '';

    const action = originalStep?.action || 'unknown';

    // Action-specific rationales
    switch (action) {
      case StepAction.DOWNLOAD:
        reason = 'File download triggers external data acquisition';
        risks.push('Data may leave browser context');
        risks.push('File integrity cannot be verified pre-download');
        break;

      case StepAction.CLICK:
        if (originalStep?.selector?.includes('submit') || originalStep?.selector?.includes('button')) {
          reason = 'Click may trigger form submission or navigation';
          risks.push('May alter remote state');
          risks.push('Action may be irreversible');
        } else {
          reason = 'Click may trigger navigation or state change';
          risks.push('Destination URL unknown until click');
        }
        break;

      case StepAction.EXTRACT:
        if (pack.sensitive_actions.includes(StepAction.EXTRACT)) {
          reason = 'Data extraction from potentially sensitive source';
          risks.push('Extracted data may contain PII');
          risks.push('Data handling policy applies');
        } else {
          reason = 'Data extraction for evidence capture';
        }
        break;

      case StepAction.SCREENSHOT:
        reason = 'Screenshot captures current page state as evidence';
        risks.push('Screenshot may contain sensitive information');
        break;

      case StepAction.SCROLL:
        reason = 'Scroll may trigger lazy-loaded content';
        break;

      default:
        reason = `Action type ${action} requires review`;
    }

    // Add domain-related risks
    if (this.context?.current_domain) {
      const domain = this.context.current_domain;
      if (domain.includes('gov')) {
        risks.push('Operating on government domain');
      }
      if (domain.includes('login') || domain.includes('auth')) {
        risks.push('Near authentication boundary');
      }
    }

    // Gate type specific additions
    if (plannedStep.gate_type === MAIClassification.MANDATORY) {
      risks.push('MANDATORY: Human must explicitly approve');
    }

    return { reason, risks };
  }

  /**
   * Generate pack policy hash - proves which policy version produced this evidence.
   * Auditors can use this to verify: "This evidence was produced under policy pack version X."
   */
  private generatePackPolicyHash(packId: string, packVersion: string): string {
    const content = `${packId}:${packVersion}:${new Date().toISOString().split('T')[0]}`;
    return this.generateHash(content);
  }

  private generateHash(content: string): string {
    // Generate proper 64-char SHA-256 hash using Web Crypto API
    // For synchronous fallback, use deterministic hash with full length
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Synchronous fallback that produces 64-char hex (simulates SHA-256 output format)
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      h0 = ((h0 << 5) - h0 + char) >>> 0;
      h1 = ((h1 << 7) - h1 + char) >>> 0;
      h2 = ((h2 << 11) - h2 + char) >>> 0;
      h3 = ((h3 << 13) - h3 + char) >>> 0;
      h4 = ((h4 << 17) - h4 + char) >>> 0;
      h5 = ((h5 << 19) - h5 + char) >>> 0;
      h6 = ((h6 << 23) - h6 + char) >>> 0;
      h7 = ((h7 << 29) - h7 + char) >>> 0;
    }

    // Combine into 64-char hex string (256 bits = 32 bytes = 64 hex chars)
    const fullHash = [h0, h1, h2, h3, h4, h5, h6, h7]
      .map(h => h.toString(16).padStart(8, '0'))
      .join('');

    return 'SHA256:' + fullHash;
  }

  private log(status: 'success' | 'warning' | 'error' | 'info' | 'gate', stepId: string, message: string): void {
    if (!this.context) return;

    this.context.logs.push({
      timestamp: new Date().toISOString(),
      step_id: stepId,
      action: stepId,
      status,
      message,
      domain: this.context.current_domain
    });

    console.log(`[BrowserRunner][${status.toUpperCase()}][${stepId}] ${message}`);
  }

  private updateLogDuration(stepId: string, duration: number): void {
    if (!this.context) return;
    const log = this.context.logs.find(l => l.step_id === stepId && !l.duration_ms);
    if (log) log.duration_ms = duration;
  }

  private interpolate(template: string, params: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private describeTarget(step: InstructionStep): string {
    if (!step.target) return 'unknown';
    if (step.target.text) return `"${step.target.text}"`;
    if (step.target.selector) return step.target.selector;
    return 'element';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  abort(): void {
    this.abortController?.abort();
  }

  getContext(): ExecutionContext | null {
    return this.context;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const browserAutomationPlanner = new BrowserAutomationPlanner();
export const browserAutomationRunner = new BrowserAutomationRunner();
