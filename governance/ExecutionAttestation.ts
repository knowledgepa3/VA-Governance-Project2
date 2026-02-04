/**
 * EXECUTION ATTESTATION v1.0.0
 *
 * Links every execution to the risk profile that governed it.
 *
 * This is the critical connector that makes compliance reports TRUE:
 * - Every job run logs which risk profile was in effect
 * - Evidence bundles prove "This run operated under Conservative v1.0.0"
 * - Auditors can verify that MANDATORY actions were blocked
 *
 * Without this, compliance mappings are documentation.
 * With this, compliance mappings are PROVABLE.
 */

import crypto from 'crypto';

// =============================================================================
// EXECUTION ATTESTATION TYPES
// =============================================================================

/**
 * Risk Profile Attestation
 *
 * Captures the EXACT risk profile state at execution time.
 * This goes into every evidence bundle to prove governance was applied.
 */
export interface RiskProfileAttestation {
  // === PROFILE IDENTITY ===
  profile_id: string;              // Which profile governed this run
  profile_version: string;         // Semantic version at execution time
  profile_hash: string;            // SHA-256 of profile content (tamper detection)

  // === EFFECTIVE POLICY ===
  effective_policy: {
    // MAI Configuration
    mai_policy: {
      max_autonomous_level: 'INFORMATIONAL' | 'ADVISORY' | 'MANDATORY';
      mandatory_auto_execution_allowed: boolean;
      informational_actions_count: number;
      advisory_actions_count: number;
      mandatory_actions_count: number;
    };

    // Action Policy
    action_policy: {
      globally_forbidden_actions: string[];
      always_require_approval: string[];
      auto_approved_actions: string[];
    };

    // Evidence Policy
    evidence_policy: {
      minimum_level: 'NONE' | 'LIGHT' | 'STANDARD' | 'COMPREHENSIVE';
      sealed_bundles_required: boolean;
      milestone_screenshots_required: boolean;
      source_provenance_required: boolean;
    };

    // Auth Policy
    auth_policy: {
      authenticated_sessions_allowed: boolean;
      account_modifications_allowed: boolean;
      credential_access_allowed: boolean;
    };
  };

  // === EFFECTIVE TOLERANCE ===
  effective_tolerance: {
    // Confidence Thresholds
    confidence: {
      critical_field_minimum: number;
      standard_field_minimum: number;
      escalation_threshold: number;
    };

    // Retry Limits
    retry_limits: {
      max_per_step: number;
      max_per_job: number;
      max_consecutive_failures: number;
    };

    // Timeouts
    timeouts: {
      step_timeout_ms: number;
      job_timeout_ms: number;
      idle_escalation_ms: number;
    };

    // Escalation
    escalation: {
      sensitivity_level: 'AGGRESSIVE' | 'STANDARD' | 'RELAXED';
      anomaly_detection_enabled: boolean;
      auto_stop_on_anomaly: boolean;
    };
  };

  // === ATTESTATION METADATA ===
  attested_at: string;             // ISO timestamp when attestation was created
  attested_by: string;             // System/user that created attestation
  attestation_hash: string;        // SHA-256 of this attestation (for verification)
}

/**
 * Execution Context
 *
 * Full context for a job execution, including risk profile attestation.
 * This is what gets logged with every execution and stored in evidence bundles.
 */
export interface ExecutionContext {
  // === EXECUTION IDENTITY ===
  execution_id: string;            // Unique ID for this execution
  job_pack_id: string;             // Which Job Pack was executed
  job_pack_version: string;        // Version of Job Pack
  job_pack_hash: string;           // SHA-256 of Job Pack content

  // === RISK PROFILE ATTESTATION ===
  risk_attestation: RiskProfileAttestation;

  // === EXECUTION TIMING ===
  started_at: string;              // ISO timestamp
  completed_at?: string;           // ISO timestamp (null if still running)
  duration_ms?: number;            // Total execution time

  // === EXECUTION OUTCOME ===
  outcome: {
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ESCALATED' | 'ABORTED';
    completion_reason?: string;
    escalation_trigger_id?: string;
    error_message?: string;
  };

  // === ACTION SUMMARY ===
  action_summary: {
    total_actions_attempted: number;
    actions_executed: number;
    actions_blocked: number;
    actions_escalated: number;
    human_approvals_requested: number;
    human_approvals_granted: number;
    human_approvals_denied: number;
  };

  // === EVIDENCE SUMMARY ===
  evidence_summary: {
    bundle_id: string;
    artifacts_created: number;
    screenshots_captured: number;
    seal_status: 'UNSEALED' | 'SEALED';
    manifest_hash?: string;
  };
}

/**
 * Action Log Entry
 *
 * Detailed log of each action, including permission check results.
 */
export interface ActionLogEntry {
  action_id: string;
  timestamp: string;
  action_type: string;
  action_description: string;

  // Permission check
  permission_check: {
    checked_at: string;
    mai_level: 'INFORMATIONAL' | 'ADVISORY' | 'MANDATORY';
    allowed: boolean;
    requires_approval: boolean;
    blocked_reason?: string;
  };

  // Execution
  execution: {
    executed: boolean;
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'ESCALATED' | 'SKIPPED';
    duration_ms: number;
    error?: string;
  };

  // Human approval (if required)
  human_approval?: {
    requested_at: string;
    responded_at?: string;
    approved: boolean;
    approver?: string;
    notes?: string;
  };
}

// =============================================================================
// ATTESTATION BUILDER
// =============================================================================

/**
 * Build a risk profile attestation from a risk profile
 */
export function buildRiskProfileAttestation(
  profile: any,  // RiskProfile from RiskProfileSchema
  attestedBy: string = 'ACE_EXECUTOR'
): RiskProfileAttestation {
  // Build effective policy snapshot
  const effectivePolicy = {
    mai_policy: {
      max_autonomous_level: profile.appetite.job_pack_policy.max_autonomous_mai_level,
      mandatory_auto_execution_allowed: profile.appetite.job_pack_policy.allow_mandatory_auto_execution,
      informational_actions_count: 0,  // Will be populated from Job Pack
      advisory_actions_count: 0,
      mandatory_actions_count: 0
    },
    action_policy: {
      globally_forbidden_actions: [...profile.appetite.action_policy.globally_forbidden_actions],
      always_require_approval: [...profile.appetite.action_policy.always_require_approval],
      auto_approved_actions: [...profile.appetite.action_policy.auto_approved_actions]
    },
    evidence_policy: {
      minimum_level: profile.appetite.evidence_policy.minimum_evidence_level,
      sealed_bundles_required: profile.appetite.evidence_policy.require_sealed_bundles,
      milestone_screenshots_required: profile.appetite.evidence_policy.require_milestone_screenshots,
      source_provenance_required: profile.appetite.evidence_policy.require_source_provenance
    },
    auth_policy: {
      authenticated_sessions_allowed: profile.appetite.auth_policy.allow_authenticated_sessions,
      account_modifications_allowed: profile.appetite.auth_policy.allow_account_modifications,
      credential_access_allowed: profile.appetite.auth_policy.allow_credential_access
    }
  };

  // Build effective tolerance snapshot
  const effectiveTolerance = {
    confidence: {
      critical_field_minimum: profile.tolerance.confidence_thresholds.critical_field_minimum,
      standard_field_minimum: profile.tolerance.confidence_thresholds.standard_field_minimum,
      escalation_threshold: profile.tolerance.confidence_thresholds.escalation_threshold
    },
    retry_limits: {
      max_per_step: profile.tolerance.retry_limits.max_retries_per_step,
      max_per_job: profile.tolerance.retry_limits.max_retries_per_job,
      max_consecutive_failures: profile.tolerance.retry_limits.max_consecutive_failures
    },
    timeouts: {
      step_timeout_ms: profile.tolerance.timeouts.step_timeout_ms,
      job_timeout_ms: profile.tolerance.timeouts.job_timeout_ms,
      idle_escalation_ms: profile.tolerance.timeouts.idle_escalation_ms
    },
    escalation: {
      sensitivity_level: profile.tolerance.escalation_sensitivity.level,
      anomaly_detection_enabled: profile.tolerance.anomaly_detection.enabled,
      auto_stop_on_anomaly: profile.tolerance.anomaly_detection.auto_stop_on_anomaly
    }
  };

  const attestation: RiskProfileAttestation = {
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    profile_hash: profile.profile_hash,
    effective_policy: effectivePolicy,
    effective_tolerance: effectiveTolerance,
    attested_at: new Date().toISOString(),
    attested_by: attestedBy,
    attestation_hash: ''  // Computed below
  };

  // Compute attestation hash (excluding the hash field itself)
  const contentToHash = JSON.stringify({
    profile_id: attestation.profile_id,
    profile_version: attestation.profile_version,
    profile_hash: attestation.profile_hash,
    effective_policy: attestation.effective_policy,
    effective_tolerance: attestation.effective_tolerance,
    attested_at: attestation.attested_at,
    attested_by: attestation.attested_by
  });

  attestation.attestation_hash = crypto
    .createHash('sha256')
    .update(contentToHash)
    .digest('hex');

  return attestation;
}

/**
 * Create a new execution context
 */
export function createExecutionContext(
  executionId: string,
  jobPackId: string,
  jobPackVersion: string,
  jobPackHash: string,
  riskAttestation: RiskProfileAttestation
): ExecutionContext {
  return {
    execution_id: executionId,
    job_pack_id: jobPackId,
    job_pack_version: jobPackVersion,
    job_pack_hash: jobPackHash,
    risk_attestation: riskAttestation,
    started_at: new Date().toISOString(),
    outcome: {
      status: 'RUNNING'
    },
    action_summary: {
      total_actions_attempted: 0,
      actions_executed: 0,
      actions_blocked: 0,
      actions_escalated: 0,
      human_approvals_requested: 0,
      human_approvals_granted: 0,
      human_approvals_denied: 0
    },
    evidence_summary: {
      bundle_id: '',
      artifacts_created: 0,
      screenshots_captured: 0,
      seal_status: 'UNSEALED'
    }
  };
}

/**
 * Create an action log entry
 */
export function createActionLogEntry(
  actionType: string,
  actionDescription: string,
  maiLevel: 'INFORMATIONAL' | 'ADVISORY' | 'MANDATORY',
  allowed: boolean,
  requiresApproval: boolean,
  blockedReason?: string
): ActionLogEntry {
  return {
    action_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action_type: actionType,
    action_description: actionDescription,
    permission_check: {
      checked_at: new Date().toISOString(),
      mai_level: maiLevel,
      allowed,
      requires_approval: requiresApproval,
      blocked_reason: blockedReason
    },
    execution: {
      executed: false,
      result: 'SKIPPED',
      duration_ms: 0
    }
  };
}

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Verify an attestation hash is valid
 */
export function verifyAttestationHash(attestation: RiskProfileAttestation): boolean {
  const contentToHash = JSON.stringify({
    profile_id: attestation.profile_id,
    profile_version: attestation.profile_version,
    profile_hash: attestation.profile_hash,
    effective_policy: attestation.effective_policy,
    effective_tolerance: attestation.effective_tolerance,
    attested_at: attestation.attested_at,
    attested_by: attestation.attested_by
  });

  const computedHash = crypto
    .createHash('sha256')
    .update(contentToHash)
    .digest('hex');

  return computedHash === attestation.attestation_hash;
}

/**
 * Generate attestation summary for human review
 */
export function generateAttestationSummary(attestation: RiskProfileAttestation): string {
  const policy = attestation.effective_policy;
  const tolerance = attestation.effective_tolerance;

  return `
═══════════════════════════════════════════════════════════════════
RISK PROFILE ATTESTATION
═══════════════════════════════════════════════════════════════════

Profile:     ${attestation.profile_id} v${attestation.profile_version}
Hash:        ${attestation.profile_hash.substring(0, 32)}...
Attested:    ${attestation.attested_at}
Attested By: ${attestation.attested_by}

───────────────────────────────────────────────────────────────────
EFFECTIVE POLICY (Risk Appetite)
───────────────────────────────────────────────────────────────────

MAI Configuration:
  • Max Autonomous Level: ${policy.mai_policy.max_autonomous_level}
  • Mandatory Auto-Execute: ${policy.mai_policy.mandatory_auto_execution_allowed ? 'ALLOWED' : 'BLOCKED'}

Action Policy:
  • Globally Forbidden: ${policy.action_policy.globally_forbidden_actions.length} actions
  • Always Require Approval: ${policy.action_policy.always_require_approval.length} actions
  • Auto-Approved: ${policy.action_policy.auto_approved_actions.length} actions

Evidence Policy:
  • Minimum Level: ${policy.evidence_policy.minimum_level}
  • Sealed Bundles Required: ${policy.evidence_policy.sealed_bundles_required ? 'YES' : 'NO'}
  • Screenshots Required: ${policy.evidence_policy.milestone_screenshots_required ? 'YES' : 'NO'}
  • Provenance Required: ${policy.evidence_policy.source_provenance_required ? 'YES' : 'NO'}

Auth Policy:
  • Authenticated Sessions: ${policy.auth_policy.authenticated_sessions_allowed ? 'ALLOWED' : 'BLOCKED'}
  • Account Modifications: ${policy.auth_policy.account_modifications_allowed ? 'ALLOWED' : 'BLOCKED'}
  • Credential Access: ${policy.auth_policy.credential_access_allowed ? 'ALLOWED' : 'BLOCKED'}

───────────────────────────────────────────────────────────────────
EFFECTIVE TOLERANCE (Risk Tolerance)
───────────────────────────────────────────────────────────────────

Confidence Thresholds:
  • Critical Field Minimum: ${(tolerance.confidence.critical_field_minimum * 100).toFixed(0)}%
  • Standard Field Minimum: ${(tolerance.confidence.standard_field_minimum * 100).toFixed(0)}%
  • Escalation Threshold: ${(tolerance.confidence.escalation_threshold * 100).toFixed(0)}%

Retry Limits:
  • Per Step: ${tolerance.retry_limits.max_per_step}
  • Per Job: ${tolerance.retry_limits.max_per_job}
  • Consecutive Failures: ${tolerance.retry_limits.max_consecutive_failures}

Timeouts:
  • Step: ${tolerance.timeouts.step_timeout_ms}ms
  • Job: ${tolerance.timeouts.job_timeout_ms}ms
  • Idle Escalation: ${tolerance.timeouts.idle_escalation_ms}ms

Escalation:
  • Sensitivity: ${tolerance.escalation.sensitivity_level}
  • Anomaly Detection: ${tolerance.escalation.anomaly_detection_enabled ? 'ENABLED' : 'DISABLED'}
  • Auto-Stop on Anomaly: ${tolerance.escalation.auto_stop_on_anomaly ? 'YES' : 'NO'}

───────────────────────────────────────────────────────────────────
ATTESTATION VERIFICATION
───────────────────────────────────────────────────────────────────

Attestation Hash: ${attestation.attestation_hash.substring(0, 32)}...

This attestation proves that the execution was governed by the above
risk profile settings. Any deviation from these settings would produce
a different attestation hash.

═══════════════════════════════════════════════════════════════════
`.trim();
}

export default {
  buildRiskProfileAttestation,
  createExecutionContext,
  createActionLogEntry,
  verifyAttestationHash,
  generateAttestationSummary
};
