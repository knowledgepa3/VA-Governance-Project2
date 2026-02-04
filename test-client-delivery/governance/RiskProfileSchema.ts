/**
 * RISK PROFILE CONFIGURATION SCHEMA v1.1.0
 *
 * Enterprise risk appetite and tolerance as first-class controls.
 *
 * Maps to:
 * - NIST RMF (Risk Management Framework)
 * - COSO ERM (Enterprise Risk Management)
 * - ISO 31000 (Risk Management Standard)
 *
 * Core Concept:
 * - Risk Appetite = POLICY (what's allowed) - set by executives/risk officers
 * - Risk Tolerance = CONTROL (how much deviation is acceptable) - operational parameters
 * - Risk Profile = Appetite + Tolerance + Audit Trail
 */

// =============================================================================
// FRAMEWORK MAPPINGS
// =============================================================================

/**
 * Maps our controls to established risk management frameworks
 */
export interface FrameworkMapping {
  nist_rmf?: {
    control_family: string;      // e.g., "CA" (Assessment), "AU" (Audit)
    control_id: string;          // e.g., "CA-7", "AU-2"
    control_name: string;        // e.g., "Continuous Monitoring"
  };
  coso_erm?: {
    component: string;           // e.g., "Control Activities", "Monitoring"
    principle: number;           // 1-17
    principle_name: string;
  };
  iso_31000?: {
    clause: string;              // e.g., "6.4", "6.5"
    process: string;             // e.g., "Risk Treatment", "Monitoring and Review"
  };
}

// =============================================================================
// RISK APPETITE (POLICY LAYER)
// =============================================================================

/**
 * Risk Appetite: How much risk the organization is willing to accept
 * This is a POLICY decision, typically set at executive/board level
 */
export interface RiskAppetite {
  // Unique identifier for this appetite configuration
  appetite_id: string;

  // Human-readable name
  name: string;  // e.g., "Conservative", "Balanced", "Aggressive"

  // Description of this risk posture
  description: string;

  // === JOB PACK CONTROLS ===
  job_pack_policy: {
    // Which job packs are enabled for this org
    enabled_packs: string[];      // Pack IDs that can be used

    // Which domains are allowed
    allowed_domains: string[];    // e.g., ["sam.gov", "usajobs.gov"]

    // Domain blocklist (takes precedence)
    blocked_domains: string[];

    // Maximum MAI level allowed without escalation
    max_autonomous_mai_level: 'INFORMATIONAL' | 'ADVISORY' | 'MANDATORY';

    // Whether MANDATORY actions can ever be auto-executed
    allow_mandatory_auto_execution: boolean;

    // MINIMUM CERTIFICATION LEVEL TO RUN (v1.1.0)
    // Executor refuses to run packs below this certification level
    // This is your "safety default" - the execution gate
    min_pack_certification_level: 0 | 1 | 2 | 3 | 4;  // DRAFT=0, VALIDATED=1, TESTED=2, CERTIFIED=3, PRODUCTION=4
  };

  // === ACTION CONTROLS ===
  action_policy: {
    // Actions that are NEVER allowed, regardless of pack
    globally_forbidden_actions: string[];

    // Actions that ALWAYS require human approval
    always_require_approval: string[];

    // Actions allowed without any approval
    auto_approved_actions: string[];
  };

  // === EVIDENCE CONTROLS ===
  evidence_policy: {
    // Minimum evidence level required
    minimum_evidence_level: 'NONE' | 'LIGHT' | 'STANDARD' | 'COMPREHENSIVE';

    // Must evidence bundle be sealed before downstream use?
    require_sealed_bundles: boolean;

    // Require screenshots for all milestones?
    require_milestone_screenshots: boolean;

    // Require source provenance (source_context.json)?
    require_source_provenance: boolean;
  };

  // === AUTHENTICATION CONTROLS ===
  auth_policy: {
    // Can AI use logged-in sessions?
    allow_authenticated_sessions: boolean;

    // Can AI perform actions that modify account state?
    allow_account_modifications: boolean;

    // Can AI access saved credentials/payment methods?
    allow_credential_access: boolean;
  };

  // Framework mapping for compliance documentation
  framework_mapping: FrameworkMapping;
}

// =============================================================================
// RISK TOLERANCE (CONTROL LAYER)
// =============================================================================

/**
 * Risk Tolerance: How much deviation from expected behavior is acceptable
 * This is an OPERATIONAL decision, typically set by risk/compliance teams
 */
export interface RiskTolerance {
  // Unique identifier
  tolerance_id: string;

  // Human-readable name
  name: string;

  // Description
  description: string;

  // === CONFIDENCE THRESHOLDS ===
  confidence_thresholds: {
    // Minimum confidence for critical fields (0.0 - 1.0)
    critical_field_minimum: number;    // e.g., 0.95

    // Minimum confidence for standard fields
    standard_field_minimum: number;    // e.g., 0.80

    // Below this, escalate immediately
    escalation_threshold: number;      // e.g., 0.60
  };

  // === RETRY LIMITS ===
  retry_limits: {
    // Max retries per step before escalating
    max_retries_per_step: number;      // e.g., 3

    // Max retries per job before failing
    max_retries_per_job: number;       // e.g., 5

    // Max consecutive failures before stopping
    max_consecutive_failures: number;  // e.g., 2
  };

  // === TIMEOUT THRESHOLDS ===
  timeouts: {
    // Max time per step (ms)
    step_timeout_ms: number;           // e.g., 15000

    // Max time per job (ms)
    job_timeout_ms: number;            // e.g., 300000

    // Max idle time before auto-escalate (ms)
    idle_escalation_ms: number;        // e.g., 60000
  };

  // === ESCALATION SENSITIVITY ===
  escalation_sensitivity: {
    // How aggressive should escalation triggers be?
    level: 'AGGRESSIVE' | 'STANDARD' | 'RELAXED';

    // Specific trigger overrides
    trigger_overrides: {
      trigger_id: string;
      enabled: boolean;
      severity_override?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
  };

  // === ANOMALY DETECTION ===
  anomaly_detection: {
    // Flag unusual patterns?
    enabled: boolean;

    // What counts as unusual?
    unusual_action_count_threshold: number;  // e.g., 50 actions in one job
    unusual_duration_multiplier: number;     // e.g., 3x expected duration

    // Auto-stop on anomaly?
    auto_stop_on_anomaly: boolean;
  };

  // Framework mapping
  framework_mapping: FrameworkMapping;
}

// =============================================================================
// RISK PROFILE (COMBINED)
// =============================================================================

/**
 * Risk Profile: Complete risk configuration combining appetite and tolerance
 * This is what gets attached to an organization/team/project
 */
export interface RiskProfile {
  // === IDENTITY ===
  profile_id: string;
  profile_version: string;        // Semantic version, e.g., "2.3.0"
  profile_hash: string;           // SHA-256 of profile content

  // Human-readable name
  name: string;                   // e.g., "ACME Corp Production Profile"

  // === COMPOSITION ===
  appetite: RiskAppetite;
  tolerance: RiskTolerance;

  // === METADATA ===
  metadata: {
    created_at: string;           // ISO timestamp
    created_by: string;           // User/system that created
    created_by_role: string;      // e.g., "Risk Officer", "CISO"

    last_modified_at: string;
    last_modified_by: string;
    last_modified_by_role: string;

    // Approval chain
    approved_by?: string;
    approved_at?: string;
    approval_notes?: string;

    // Review schedule
    next_review_date?: string;
    review_frequency_days: number;  // e.g., 90
  };

  // === SCOPE ===
  scope: {
    // What this profile applies to
    applies_to: 'ORGANIZATION' | 'TEAM' | 'PROJECT' | 'USER';

    // Specific entity IDs this applies to
    entity_ids: string[];

    // Environment restrictions
    environments: ('DEMO' | 'STAGING' | 'PRODUCTION')[];

    // Time-based restrictions
    active_hours?: {
      timezone: string;
      start_hour: number;  // 0-23
      end_hour: number;
      days: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    };
  };

  // === AUDIT ===
  audit: {
    // History of changes
    change_log: ProfileChangeEntry[];

    // Link to executions that used this profile
    execution_count: number;
    last_execution_at?: string;
  };
}

/**
 * Change log entry for profile audit trail
 */
export interface ProfileChangeEntry {
  change_id: string;
  timestamp: string;
  changed_by: string;
  changed_by_role: string;

  change_type: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SUSPEND' | 'REACTIVATE';

  // What changed
  field_path: string;           // e.g., "appetite.action_policy.globally_forbidden_actions"
  previous_value: any;
  new_value: any;

  // Why it changed
  change_reason: string;

  // Previous version hash (for chain verification)
  previous_version_hash: string;
}

// =============================================================================
// PRESET PROFILES
// =============================================================================

/**
 * Conservative Profile
 * - Maximum oversight
 * - Full evidence capture
 * - Aggressive escalation
 * - Suitable for: Regulated industries, initial deployment, high-stakes operations
 */
export const CONSERVATIVE_PROFILE: Partial<RiskProfile> = {
  name: "Conservative",
  appetite: {
    appetite_id: "APPETITE_CONSERVATIVE",
    name: "Conservative",
    description: "Maximum oversight, all significant actions require human approval",
    job_pack_policy: {
      enabled_packs: [],  // Must be explicitly enabled
      allowed_domains: [],  // Must be explicitly allowed
      blocked_domains: [],
      max_autonomous_mai_level: 'INFORMATIONAL',
      allow_mandatory_auto_execution: false,
      min_pack_certification_level: 3  // CERTIFIED - requires human review
    },
    action_policy: {
      globally_forbidden_actions: [
        'login', 'create_account', 'submit_form', 'make_payment',
        'delete', 'modify_permissions', 'send_message', 'download_file'
      ],
      always_require_approval: [
        'navigate_external', 'click_submit', 'fill_form', 'upload'
      ],
      auto_approved_actions: [
        'read_page', 'screenshot', 'scroll'
      ]
    },
    evidence_policy: {
      minimum_evidence_level: 'COMPREHENSIVE',
      require_sealed_bundles: true,
      require_milestone_screenshots: true,
      require_source_provenance: true
    },
    auth_policy: {
      allow_authenticated_sessions: false,
      allow_account_modifications: false,
      allow_credential_access: false
    },
    framework_mapping: {
      nist_rmf: {
        control_family: "CA",
        control_id: "CA-7",
        control_name: "Continuous Monitoring"
      },
      coso_erm: {
        component: "Control Activities",
        principle: 12,
        principle_name: "Deploys Control Activities"
      }
    }
  },
  tolerance: {
    tolerance_id: "TOLERANCE_TIGHT",
    name: "Tight",
    description: "Low tolerance for deviation, frequent escalations",
    confidence_thresholds: {
      critical_field_minimum: 0.98,
      standard_field_minimum: 0.90,
      escalation_threshold: 0.75
    },
    retry_limits: {
      max_retries_per_step: 2,
      max_retries_per_job: 3,
      max_consecutive_failures: 1
    },
    timeouts: {
      step_timeout_ms: 10000,
      job_timeout_ms: 180000,
      idle_escalation_ms: 30000
    },
    escalation_sensitivity: {
      level: 'AGGRESSIVE',
      trigger_overrides: []
    },
    anomaly_detection: {
      enabled: true,
      unusual_action_count_threshold: 30,
      unusual_duration_multiplier: 2,
      auto_stop_on_anomaly: true
    },
    framework_mapping: {
      iso_31000: {
        clause: "6.5",
        process: "Monitoring and Review"
      }
    }
  }
};

/**
 * Balanced Profile
 * - Reasonable oversight
 * - Milestone evidence capture
 * - Standard escalation
 * - Suitable for: Most enterprise use cases, mature deployments
 */
export const BALANCED_PROFILE: Partial<RiskProfile> = {
  name: "Balanced",
  appetite: {
    appetite_id: "APPETITE_BALANCED",
    name: "Balanced",
    description: "Reasonable oversight with efficiency, advisory actions autonomous",
    job_pack_policy: {
      enabled_packs: [],  // Configured per org
      allowed_domains: [],
      blocked_domains: [],
      max_autonomous_mai_level: 'ADVISORY',
      allow_mandatory_auto_execution: false,
      min_pack_certification_level: 2  // TESTED - has execution evidence
    },
    action_policy: {
      globally_forbidden_actions: [
        'login', 'create_account', 'make_payment', 'delete',
        'modify_permissions'
      ],
      always_require_approval: [
        'submit_form', 'send_message', 'upload'
      ],
      auto_approved_actions: [
        'read_page', 'screenshot', 'scroll', 'navigate',
        'click_filter', 'type_search', 'expand_section'
      ]
    },
    evidence_policy: {
      minimum_evidence_level: 'STANDARD',
      require_sealed_bundles: true,
      require_milestone_screenshots: true,
      require_source_provenance: true
    },
    auth_policy: {
      allow_authenticated_sessions: false,
      allow_account_modifications: false,
      allow_credential_access: false
    },
    framework_mapping: {
      nist_rmf: {
        control_family: "AU",
        control_id: "AU-2",
        control_name: "Event Logging"
      },
      coso_erm: {
        component: "Control Activities",
        principle: 11,
        principle_name: "Selects and Develops Technology Controls"
      }
    }
  },
  tolerance: {
    tolerance_id: "TOLERANCE_STANDARD",
    name: "Standard",
    description: "Balanced tolerance with reasonable checkpoints",
    confidence_thresholds: {
      critical_field_minimum: 0.95,
      standard_field_minimum: 0.80,
      escalation_threshold: 0.60
    },
    retry_limits: {
      max_retries_per_step: 3,
      max_retries_per_job: 5,
      max_consecutive_failures: 2
    },
    timeouts: {
      step_timeout_ms: 15000,
      job_timeout_ms: 300000,
      idle_escalation_ms: 60000
    },
    escalation_sensitivity: {
      level: 'STANDARD',
      trigger_overrides: []
    },
    anomaly_detection: {
      enabled: true,
      unusual_action_count_threshold: 50,
      unusual_duration_multiplier: 3,
      auto_stop_on_anomaly: false
    },
    framework_mapping: {
      iso_31000: {
        clause: "6.4",
        process: "Risk Treatment"
      }
    }
  }
};

/**
 * Aggressive Profile
 * - Minimal oversight for efficiency
 * - Light evidence capture
 * - Relaxed escalation
 * - Suitable for: Low-stakes research, internal tools, trusted environments
 */
export const AGGRESSIVE_PROFILE: Partial<RiskProfile> = {
  name: "Aggressive",
  appetite: {
    appetite_id: "APPETITE_AGGRESSIVE",
    name: "Aggressive",
    description: "Efficiency-focused with minimal interruptions",
    job_pack_policy: {
      enabled_packs: [],  // Configured per org
      allowed_domains: [],
      blocked_domains: [],
      max_autonomous_mai_level: 'MANDATORY',  // Even mandatory can auto-execute
      allow_mandatory_auto_execution: true,
      min_pack_certification_level: 1  // VALIDATED - just needs schema valid
    },
    action_policy: {
      globally_forbidden_actions: [
        'create_account', 'make_payment', 'delete', 'modify_permissions'
      ],
      always_require_approval: [
        'login', 'upload'  // Still require approval
      ],
      auto_approved_actions: [
        'read_page', 'screenshot', 'scroll', 'navigate',
        'click_filter', 'type_search', 'expand_section',
        'submit_form', 'send_message'  // Auto-approved in aggressive mode
      ]
    },
    evidence_policy: {
      minimum_evidence_level: 'LIGHT',
      require_sealed_bundles: false,  // Not required
      require_milestone_screenshots: false,
      require_source_provenance: true  // Still want provenance
    },
    auth_policy: {
      allow_authenticated_sessions: true,  // Can use logged-in sessions
      allow_account_modifications: false,
      allow_credential_access: false
    },
    framework_mapping: {
      coso_erm: {
        component: "Risk Response",
        principle: 9,
        principle_name: "Identifies and Assesses Changes"
      }
    }
  },
  tolerance: {
    tolerance_id: "TOLERANCE_RELAXED",
    name: "Relaxed",
    description: "High tolerance for variation, minimal interruptions",
    confidence_thresholds: {
      critical_field_minimum: 0.85,
      standard_field_minimum: 0.70,
      escalation_threshold: 0.50
    },
    retry_limits: {
      max_retries_per_step: 5,
      max_retries_per_job: 10,
      max_consecutive_failures: 3
    },
    timeouts: {
      step_timeout_ms: 30000,
      job_timeout_ms: 600000,
      idle_escalation_ms: 120000
    },
    escalation_sensitivity: {
      level: 'RELAXED',
      trigger_overrides: []
    },
    anomaly_detection: {
      enabled: false,  // Disabled for speed
      unusual_action_count_threshold: 100,
      unusual_duration_multiplier: 5,
      auto_stop_on_anomaly: false
    },
    framework_mapping: {}
  }
};

// =============================================================================
// VALIDATION
// =============================================================================

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  framework_coverage: {
    nist_rmf: boolean;
    coso_erm: boolean;
    iso_31000: boolean;
  };
}

export function validateRiskProfile(profile: RiskProfile): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!profile.profile_id) errors.push('profile_id is required');
  if (!profile.profile_version) errors.push('profile_version is required');
  if (!profile.appetite) errors.push('appetite is required');
  if (!profile.tolerance) errors.push('tolerance is required');

  // Appetite validation
  if (profile.appetite) {
    if (!profile.appetite.appetite_id) errors.push('appetite.appetite_id is required');
    if (!profile.appetite.job_pack_policy) errors.push('appetite.job_pack_policy is required');
    if (!profile.appetite.action_policy) errors.push('appetite.action_policy is required');
    if (!profile.appetite.evidence_policy) errors.push('appetite.evidence_policy is required');
  }

  // Tolerance validation
  if (profile.tolerance) {
    if (!profile.tolerance.tolerance_id) errors.push('tolerance.tolerance_id is required');
    if (!profile.tolerance.confidence_thresholds) errors.push('tolerance.confidence_thresholds is required');

    // Threshold sanity checks
    const ct = profile.tolerance.confidence_thresholds;
    if (ct) {
      if (ct.critical_field_minimum < ct.standard_field_minimum) {
        warnings.push('critical_field_minimum should be >= standard_field_minimum');
      }
      if (ct.escalation_threshold >= ct.standard_field_minimum) {
        warnings.push('escalation_threshold should be < standard_field_minimum');
      }
    }
  }

  // Metadata validation
  if (!profile.metadata?.created_by) {
    errors.push('metadata.created_by is required for audit trail');
  }
  if (!profile.metadata?.review_frequency_days) {
    warnings.push('metadata.review_frequency_days should be set for governance');
  }

  // Framework coverage
  const framework_coverage = {
    nist_rmf: !!(profile.appetite?.framework_mapping?.nist_rmf || profile.tolerance?.framework_mapping?.nist_rmf),
    coso_erm: !!(profile.appetite?.framework_mapping?.coso_erm || profile.tolerance?.framework_mapping?.coso_erm),
    iso_31000: !!(profile.appetite?.framework_mapping?.iso_31000 || profile.tolerance?.framework_mapping?.iso_31000)
  };

  if (!framework_coverage.nist_rmf && !framework_coverage.coso_erm && !framework_coverage.iso_31000) {
    warnings.push('No framework mappings provided - consider adding for compliance documentation');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    framework_coverage
  };
}

// =============================================================================
// PROFILE COMPARISON
// =============================================================================

export interface ProfileDiff {
  field_path: string;
  profile_a_value: any;
  profile_b_value: any;
  risk_impact: 'INCREASES_RISK' | 'DECREASES_RISK' | 'NEUTRAL';
}

export function compareProfiles(profileA: RiskProfile, profileB: RiskProfile): ProfileDiff[] {
  const diffs: ProfileDiff[] = [];

  // Compare MAI levels
  const maiLevels = { 'INFORMATIONAL': 1, 'ADVISORY': 2, 'MANDATORY': 3 };
  const maiA = maiLevels[profileA.appetite.job_pack_policy.max_autonomous_mai_level];
  const maiB = maiLevels[profileB.appetite.job_pack_policy.max_autonomous_mai_level];

  if (maiA !== maiB) {
    diffs.push({
      field_path: 'appetite.job_pack_policy.max_autonomous_mai_level',
      profile_a_value: profileA.appetite.job_pack_policy.max_autonomous_mai_level,
      profile_b_value: profileB.appetite.job_pack_policy.max_autonomous_mai_level,
      risk_impact: maiB > maiA ? 'INCREASES_RISK' : 'DECREASES_RISK'
    });
  }

  // Compare confidence thresholds
  const ctA = profileA.tolerance.confidence_thresholds.critical_field_minimum;
  const ctB = profileB.tolerance.confidence_thresholds.critical_field_minimum;

  if (ctA !== ctB) {
    diffs.push({
      field_path: 'tolerance.confidence_thresholds.critical_field_minimum',
      profile_a_value: ctA,
      profile_b_value: ctB,
      risk_impact: ctB < ctA ? 'INCREASES_RISK' : 'DECREASES_RISK'
    });
  }

  // Compare evidence requirements
  const evidenceLevels = { 'NONE': 0, 'LIGHT': 1, 'STANDARD': 2, 'COMPREHENSIVE': 3 };
  const evA = evidenceLevels[profileA.appetite.evidence_policy.minimum_evidence_level];
  const evB = evidenceLevels[profileB.appetite.evidence_policy.minimum_evidence_level];

  if (evA !== evB) {
    diffs.push({
      field_path: 'appetite.evidence_policy.minimum_evidence_level',
      profile_a_value: profileA.appetite.evidence_policy.minimum_evidence_level,
      profile_b_value: profileB.appetite.evidence_policy.minimum_evidence_level,
      risk_impact: evB < evA ? 'INCREASES_RISK' : 'DECREASES_RISK'
    });
  }

  // Compare sealed bundle requirement
  if (profileA.appetite.evidence_policy.require_sealed_bundles !== profileB.appetite.evidence_policy.require_sealed_bundles) {
    diffs.push({
      field_path: 'appetite.evidence_policy.require_sealed_bundles',
      profile_a_value: profileA.appetite.evidence_policy.require_sealed_bundles,
      profile_b_value: profileB.appetite.evidence_policy.require_sealed_bundles,
      risk_impact: !profileB.appetite.evidence_policy.require_sealed_bundles ? 'INCREASES_RISK' : 'DECREASES_RISK'
    });
  }

  return diffs;
}

// =============================================================================
// PRESET PROFILES COLLECTION
// =============================================================================

export const PRESET_PROFILES = {
  CONSERVATIVE_PROFILE,
  BALANCED_PROFILE,
  AGGRESSIVE_PROFILE
};

// =============================================================================
// CERTIFICATION LEVEL CONSTANTS (for reference)
// =============================================================================

export const CERTIFICATION_LEVELS = {
  DRAFT: 0,
  VALIDATED: 1,
  TESTED: 2,
  CERTIFIED: 3,
  PRODUCTION: 4
} as const;

export default {
  CONSERVATIVE_PROFILE,
  BALANCED_PROFILE,
  AGGRESSIVE_PROFILE,
  PRESET_PROFILES,
  CERTIFICATION_LEVELS,
  validateRiskProfile,
  compareProfiles
};
