/**
 * JOB PACK SCHEMA v1.0.0
 *
 * A Job Pack is: "SOP + checklist + constraints + UI map + evidence rules"
 * compressed into a runnable doctrine.
 *
 * Core Philosophy:
 * - Minimal but complete
 * - Token-efficient (no bloated training)
 * - Safe by default (MAI boundaries)
 * - Evidence-driven (audit-ready)
 * - UI-stable (semantic selectors, not screenshots)
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * MAI Classification - Authority Boundaries
 */
export type MAILevel = 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';

/**
 * Action Permission
 */
export interface ActionPermission {
  action: string;
  allowed: boolean;
  mai_level: MAILevel;
  requires_human_approval: boolean;
  description: string;
}

/**
 * UI Anchor - Stable navigation reference (not screenshot-dependent)
 */
export interface UIAnchor {
  type: 'page_title' | 'heading' | 'button_text' | 'aria_label' | 'field_label' | 'url_pattern' | 'element_id';
  value: string;
  fallback?: string;
  description?: string;
}

/**
 * Verification Rule - How we know a step worked
 */
export interface VerificationRule {
  type: 'element_visible' | 'text_contains' | 'url_matches' | 'field_value' | 'state_change' | 'screenshot_capture';
  target: string;
  expected?: string;
  timeout_ms?: number;
}

/**
 * Procedure Step - Single atomic action
 */
export interface ProcedureStep {
  step_id: string;
  intent: string;           // WHY we do this
  action: string;           // WHAT we do
  ui_anchor: UIAnchor;      // WHERE to do it
  verification: VerificationRule;  // HOW we know it worked
  mai_level: MAILevel;
  requires_approval?: boolean;
  on_failure: 'retry' | 'escalate' | 'skip' | 'abort';
  max_retries?: number;
}

/**
 * Escalation Trigger - Auto-stop rules
 */
export interface EscalationTrigger {
  trigger_id: string;
  condition: string;
  description: string;
  action: 'stop_and_ask' | 'capture_evidence' | 'abort_job' | 'flag_for_review';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Evidence Requirement
 */
export interface EvidenceRequirement {
  trigger: 'milestone' | 'state_change' | 'error' | 'completion' | 'high_risk_action';
  capture_type: 'screenshot' | 'page_text' | 'dom_snapshot' | 'network_log';
  description: string;
  required: boolean;
}

/**
 * Mini Index Entry - Fast routing for common tasks
 */
export interface MiniIndexEntry {
  task: string;
  route: string;          // Navigation path (human readable)
  stop_condition: string; // When we know we're done
  evidence: string;       // What to capture
  estimated_steps: number;
}

/**
 * Micro SOP - One-screen procedure
 */
export interface MicroSOP {
  sop_id: string;
  title: string;
  pre_checks: string[];
  steps: ProcedureStep[];
  validation: VerificationRule;
  failure_handling: string;
  evidence_on_success: EvidenceRequirement[];
}

// =============================================================================
// JOB PACK - THE COMPLETE RUNNABLE DOCTRINE
// =============================================================================

export interface JobPack {
  // Metadata
  pack_id: string;
  pack_version: string;
  pack_hash?: string;
  created_at: string;
  updated_at: string;
  author: string;

  // =========================================================================
  // 1. ROLE & MISSION
  // =========================================================================
  role: {
    name: string;
    description: string;
    mission: string;
    success_criteria: string[];
    outputs: string[];
    acceptance_criteria: string[];
  };

  // =========================================================================
  // 2. AUTHORITY BOUNDARIES (MAI)
  // =========================================================================
  authority: {
    informational_actions: ActionPermission[];  // Can execute automatically
    advisory_actions: ActionPermission[];       // Can draft/suggest, human decides
    mandatory_actions: ActionPermission[];      // Always requires human approval (dual-key)
  };

  // =========================================================================
  // 3. ALLOWED / FORBIDDEN ACTIONS
  // =========================================================================
  permissions: {
    allowed: {
      action: string;
      description: string;
      conditions?: string;
    }[];
    forbidden: {
      action: string;
      description: string;
      reason: string;
    }[];
  };

  // =========================================================================
  // 4. PROCEDURE INDEX (Training Compactor)
  // =========================================================================
  procedure_index: {
    mini_index: MiniIndexEntry[];    // Fast routing (10-20 entries max)
    micro_sops: MicroSOP[];          // One-screen procedures
  };

  // =========================================================================
  // 5. UI ANCHORS (Low-snapshot navigation)
  // =========================================================================
  ui_map: {
    domain: string;
    stable_anchors: {
      name: string;
      anchors: UIAnchor[];
      description: string;
    }[];
    url_patterns: {
      pattern: string;
      page_type: string;
      expected_elements: string[];
    }[];
  };

  // =========================================================================
  // 6. ESCALATION TRIGGERS (Auto-stop rules)
  // =========================================================================
  escalation: {
    triggers: EscalationTrigger[];
    default_action: 'stop_and_ask' | 'capture_evidence' | 'continue';
  };

  // =========================================================================
  // 7. EVIDENCE & AUDIT REQUIREMENTS
  // =========================================================================
  evidence: {
    lightweight_capture: EvidenceRequirement[];  // Every run
    heavy_capture_triggers: string[];            // Exceptions, high-risk, disputes
    milestone_screenshots: string[];             // Major state changes only
    retention_policy: string;
  };

  // =========================================================================
  // 8. EXECUTION CONSTRAINTS
  // =========================================================================
  constraints: {
    max_actions_per_session: number;
    max_retries_per_step: number;
    timeout_per_step_ms: number;
    timeout_per_job_ms: number;
    requires_sealed_evidence_bundle: boolean;
    environment_modes: ('DEMO' | 'PROD')[];
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate a Job Pack structure
 */
export function validateJobPack(pack: JobPack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!pack.pack_id) errors.push('pack_id is required');
  if (!pack.role?.name) errors.push('role.name is required');
  if (!pack.role?.mission) errors.push('role.mission is required');

  // Check MAI boundaries exist
  if (!pack.authority) errors.push('authority (MAI boundaries) is required');

  // Check procedure index
  if (!pack.procedure_index?.mini_index?.length) {
    errors.push('procedure_index.mini_index must have at least one entry');
  }

  // Check forbidden actions exist (safety)
  if (!pack.permissions?.forbidden?.length) {
    errors.push('permissions.forbidden must define at least one forbidden action');
  }

  // Check escalation triggers exist (safety)
  if (!pack.escalation?.triggers?.length) {
    errors.push('escalation.triggers must define at least one trigger');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if an action is allowed by the Job Pack
 */
export function isActionAllowed(pack: JobPack, action: string): {
  allowed: boolean;
  mai_level?: MAILevel;
  requires_approval: boolean;
  reason?: string;
} {
  // Check forbidden first (highest priority)
  const forbidden = pack.permissions.forbidden.find(f =>
    f.action.toLowerCase() === action.toLowerCase()
  );
  if (forbidden) {
    return {
      allowed: false,
      requires_approval: false,
      reason: forbidden.reason
    };
  }

  // Check allowed list
  const allowed = pack.permissions.allowed.find(a =>
    a.action.toLowerCase() === action.toLowerCase()
  );
  if (!allowed) {
    return {
      allowed: false,
      requires_approval: false,
      reason: 'Action not in allowed list'
    };
  }

  // Determine MAI level
  const infoAction = pack.authority.informational_actions.find(a =>
    a.action.toLowerCase() === action.toLowerCase()
  );
  if (infoAction) {
    return { allowed: true, mai_level: 'INFORMATIONAL', requires_approval: false };
  }

  const advisoryAction = pack.authority.advisory_actions.find(a =>
    a.action.toLowerCase() === action.toLowerCase()
  );
  if (advisoryAction) {
    return { allowed: true, mai_level: 'ADVISORY', requires_approval: false };
  }

  const mandatoryAction = pack.authority.mandatory_actions.find(a =>
    a.action.toLowerCase() === action.toLowerCase()
  );
  if (mandatoryAction) {
    return { allowed: true, mai_level: 'MANDATORY', requires_approval: true };
  }

  // Default: allowed but requires approval (safe default)
  return { allowed: true, requires_approval: true };
}

/**
 * Get the procedure for a task from the mini index
 */
export function getProcedure(pack: JobPack, task: string): MiniIndexEntry | undefined {
  return pack.procedure_index.mini_index.find(entry =>
    entry.task.toLowerCase().includes(task.toLowerCase())
  );
}

/**
 * Check escalation triggers
 */
export function checkEscalation(pack: JobPack, condition: string): EscalationTrigger | undefined {
  return pack.escalation.triggers.find(trigger =>
    condition.toLowerCase().includes(trigger.condition.toLowerCase())
  );
}

export default {
  validateJobPack,
  isActionAllowed,
  getProcedure,
  checkEscalation
};
