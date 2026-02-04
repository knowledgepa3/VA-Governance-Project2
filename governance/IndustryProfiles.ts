/**
 * INDUSTRY RISK PROFILE PRESETS v1.0.0
 *
 * Pre-configured risk profiles for specific industries and compliance frameworks.
 *
 * Supported Frameworks:
 * - FedRAMP (Federal Risk and Authorization Management Program)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - SOC 2 (Service Organization Control 2)
 * - PCI DSS (Payment Card Industry Data Security Standard)
 * - GDPR (General Data Protection Regulation)
 * - StateRAMP (State Risk and Authorization Management Program)
 */

import {
  RiskAppetite,
  RiskTolerance,
  RiskProfile,
  FrameworkMapping
} from './RiskProfileSchema';

// =============================================================================
// INDUSTRY PROFILE METADATA
// =============================================================================

export interface IndustryProfileMetadata {
  profile_key: string;
  name: string;
  description: string;
  industry: string;
  compliance_frameworks: string[];
  suitable_for: string[];
  not_suitable_for: string[];
  certification_requirements: {
    min_pack_level: number;
    requires_sealed_bundles: boolean;
    requires_screenshots: boolean;
    audit_retention_days: number;
  };
}

// =============================================================================
// FEDRAMP PROFILE
// =============================================================================

export const FEDRAMP_PROFILE_METADATA: IndustryProfileMetadata = {
  profile_key: 'FEDRAMP',
  name: 'FedRAMP Compliant',
  description: 'Risk profile aligned with FedRAMP requirements for federal cloud services',
  industry: 'Federal Government',
  compliance_frameworks: ['FedRAMP', 'NIST SP 800-53', 'FISMA'],
  suitable_for: [
    'Federal agency contractors',
    'Cloud service providers to government',
    'FedRAMP authorized services'
  ],
  not_suitable_for: [
    'Consumer applications',
    'Low-sensitivity internal tools'
  ],
  certification_requirements: {
    min_pack_level: 3, // CERTIFIED
    requires_sealed_bundles: true,
    requires_screenshots: true,
    audit_retention_days: 365 * 3 // 3 years
  }
};

export const FEDRAMP_APPETITE: RiskAppetite = {
  appetite_id: 'APPETITE_FEDRAMP',
  name: 'FedRAMP',
  description: 'Maximum security controls aligned with FedRAMP Moderate baseline',

  job_pack_policy: {
    enabled_packs: [], // Must be explicitly enabled per ATO
    allowed_domains: [], // Must be explicitly authorized
    blocked_domains: ['*.ru', '*.cn', '*.ir', '*.kp'], // OFAC-restricted
    max_autonomous_mai_level: 'INFORMATIONAL',
    allow_mandatory_auto_execution: false,
    min_pack_certification_level: 3 // CERTIFIED required
  },

  action_policy: {
    globally_forbidden_actions: [
      'login',
      'create_account',
      'submit_form',
      'make_payment',
      'delete',
      'modify_permissions',
      'send_message',
      'download_file',
      'upload_file',
      'access_pii',
      'export_data',
      'modify_configuration'
    ],
    always_require_approval: [
      'navigate_external',
      'click_submit',
      'fill_form',
      'capture_data'
    ],
    auto_approved_actions: [
      'read_page',
      'screenshot',
      'scroll'
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
      control_family: 'AC',
      control_id: 'AC-1',
      control_name: 'Access Control Policy and Procedures'
    }
  }
};

export const FEDRAMP_TOLERANCE: RiskTolerance = {
  tolerance_id: 'TOLERANCE_FEDRAMP',
  name: 'FedRAMP Strict',
  description: 'Zero tolerance for security deviations',

  confidence_thresholds: {
    critical_field_minimum: 0.99,
    standard_field_minimum: 0.95,
    escalation_threshold: 0.85
  },

  retry_limits: {
    max_retries_per_step: 2,
    max_retries_per_job: 3,
    max_consecutive_failures: 1
  },

  timeouts: {
    step_timeout_ms: 10000,
    job_timeout_ms: 120000,
    idle_escalation_ms: 20000
  },

  escalation_sensitivity: {
    level: 'AGGRESSIVE',
    trigger_overrides: []
  },

  anomaly_detection: {
    enabled: true,
    unusual_action_count_threshold: 20,
    unusual_duration_multiplier: 1.5,
    auto_stop_on_anomaly: true
  },

  framework_mapping: {
    nist_rmf: {
      control_family: 'SI',
      control_id: 'SI-4',
      control_name: 'System Monitoring'
    }
  }
};

// =============================================================================
// HIPAA PROFILE
// =============================================================================

export const HIPAA_PROFILE_METADATA: IndustryProfileMetadata = {
  profile_key: 'HIPAA',
  name: 'HIPAA Compliant',
  description: 'Risk profile for healthcare organizations handling PHI',
  industry: 'Healthcare',
  compliance_frameworks: ['HIPAA', 'HITECH', 'NIST CSF'],
  suitable_for: [
    'Healthcare providers',
    'Health insurance companies',
    'Healthcare clearinghouses',
    'Business associates handling PHI'
  ],
  not_suitable_for: [
    'Non-healthcare organizations',
    'Consumer health apps (non-covered entities)'
  ],
  certification_requirements: {
    min_pack_level: 3, // CERTIFIED
    requires_sealed_bundles: true,
    requires_screenshots: true,
    audit_retention_days: 365 * 6 // 6 years per HIPAA
  }
};

export const HIPAA_APPETITE: RiskAppetite = {
  appetite_id: 'APPETITE_HIPAA',
  name: 'HIPAA',
  description: 'Protected health information safeguards',

  job_pack_policy: {
    enabled_packs: [],
    allowed_domains: [],
    blocked_domains: [],
    max_autonomous_mai_level: 'INFORMATIONAL',
    allow_mandatory_auto_execution: false,
    min_pack_certification_level: 3
  },

  action_policy: {
    globally_forbidden_actions: [
      'login',
      'create_account',
      'access_phi', // Protected Health Information
      'access_pii',
      'export_patient_data',
      'modify_patient_record',
      'delete',
      'send_message',
      'make_payment'
    ],
    always_require_approval: [
      'navigate_healthcare_system',
      'view_patient_list',
      'search_patient',
      'download_report'
    ],
    auto_approved_actions: [
      'read_page',
      'screenshot',
      'scroll'
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
      control_family: 'AC',
      control_id: 'AC-3',
      control_name: 'Access Enforcement'
    }
  }
};

export const HIPAA_TOLERANCE: RiskTolerance = {
  tolerance_id: 'TOLERANCE_HIPAA',
  name: 'HIPAA Strict',
  description: 'Healthcare data protection requirements',

  confidence_thresholds: {
    critical_field_minimum: 0.99, // PHI fields must be highly accurate
    standard_field_minimum: 0.90,
    escalation_threshold: 0.80
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
    trigger_overrides: [
      { trigger_id: 'PHI_DETECTED', enabled: true, severity_override: 'CRITICAL' }
    ]
  },

  anomaly_detection: {
    enabled: true,
    unusual_action_count_threshold: 25,
    unusual_duration_multiplier: 2,
    auto_stop_on_anomaly: true
  },

  framework_mapping: {}
};

// =============================================================================
// SOC 2 PROFILE
// =============================================================================

export const SOC2_PROFILE_METADATA: IndustryProfileMetadata = {
  profile_key: 'SOC2',
  name: 'SOC 2 Compliant',
  description: 'Risk profile aligned with SOC 2 Trust Services Criteria',
  industry: 'Technology / SaaS',
  compliance_frameworks: ['SOC 2 Type II', 'AICPA TSC'],
  suitable_for: [
    'SaaS providers',
    'Cloud service providers',
    'Data processors',
    'Technology service companies'
  ],
  not_suitable_for: [
    'Companies not pursuing SOC 2',
    'Internal-only tools'
  ],
  certification_requirements: {
    min_pack_level: 2, // TESTED
    requires_sealed_bundles: true,
    requires_screenshots: true,
    audit_retention_days: 365 // 1 year minimum
  }
};

export const SOC2_APPETITE: RiskAppetite = {
  appetite_id: 'APPETITE_SOC2',
  name: 'SOC 2',
  description: 'Trust Services Criteria compliance',

  job_pack_policy: {
    enabled_packs: [],
    allowed_domains: [],
    blocked_domains: [],
    max_autonomous_mai_level: 'ADVISORY',
    allow_mandatory_auto_execution: false,
    min_pack_certification_level: 2 // TESTED sufficient
  },

  action_policy: {
    globally_forbidden_actions: [
      'login',
      'create_account',
      'delete',
      'modify_permissions',
      'access_customer_data',
      'export_pii'
    ],
    always_require_approval: [
      'submit_form',
      'send_message',
      'download_file'
    ],
    auto_approved_actions: [
      'read_page',
      'screenshot',
      'scroll',
      'navigate',
      'search'
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
    coso_erm: {
      component: 'Control Activities',
      principle: 12,
      principle_name: 'Deploys Control Activities'
    }
  }
};

export const SOC2_TOLERANCE: RiskTolerance = {
  tolerance_id: 'TOLERANCE_SOC2',
  name: 'SOC 2 Standard',
  description: 'Balanced controls for SOC 2 compliance',

  confidence_thresholds: {
    critical_field_minimum: 0.95,
    standard_field_minimum: 0.85,
    escalation_threshold: 0.70
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

  framework_mapping: {}
};

// =============================================================================
// PCI DSS PROFILE
// =============================================================================

export const PCIDSS_PROFILE_METADATA: IndustryProfileMetadata = {
  profile_key: 'PCI_DSS',
  name: 'PCI DSS Compliant',
  description: 'Risk profile for payment card data handling',
  industry: 'Financial Services / Retail',
  compliance_frameworks: ['PCI DSS v4.0'],
  suitable_for: [
    'Payment processors',
    'Merchants handling card data',
    'Service providers in payment ecosystem'
  ],
  not_suitable_for: [
    'Organizations not handling payment cards',
    'B2B services without card data'
  ],
  certification_requirements: {
    min_pack_level: 3, // CERTIFIED
    requires_sealed_bundles: true,
    requires_screenshots: true,
    audit_retention_days: 365 // 1 year
  }
};

export const PCIDSS_APPETITE: RiskAppetite = {
  appetite_id: 'APPETITE_PCIDSS',
  name: 'PCI DSS',
  description: 'Payment card industry data security',

  job_pack_policy: {
    enabled_packs: [],
    allowed_domains: [],
    blocked_domains: [],
    max_autonomous_mai_level: 'INFORMATIONAL',
    allow_mandatory_auto_execution: false,
    min_pack_certification_level: 3
  },

  action_policy: {
    globally_forbidden_actions: [
      'login',
      'create_account',
      'access_card_data', // PAN, CVV, etc.
      'store_card_data',
      'transmit_card_data',
      'make_payment',
      'process_transaction',
      'access_encryption_keys',
      'delete',
      'modify_permissions'
    ],
    always_require_approval: [
      'access_payment_system',
      'view_transaction',
      'generate_report'
    ],
    auto_approved_actions: [
      'read_page',
      'screenshot',
      'scroll'
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

  framework_mapping: {}
};

export const PCIDSS_TOLERANCE: RiskTolerance = {
  tolerance_id: 'TOLERANCE_PCIDSS',
  name: 'PCI DSS Strict',
  description: 'Zero tolerance for payment data exposure',

  confidence_thresholds: {
    critical_field_minimum: 0.99,
    standard_field_minimum: 0.95,
    escalation_threshold: 0.90
  },

  retry_limits: {
    max_retries_per_step: 1,
    max_retries_per_job: 2,
    max_consecutive_failures: 1
  },

  timeouts: {
    step_timeout_ms: 8000,
    job_timeout_ms: 90000,
    idle_escalation_ms: 15000
  },

  escalation_sensitivity: {
    level: 'AGGRESSIVE',
    trigger_overrides: [
      { trigger_id: 'CARD_DATA_DETECTED', enabled: true, severity_override: 'CRITICAL' }
    ]
  },

  anomaly_detection: {
    enabled: true,
    unusual_action_count_threshold: 15,
    unusual_duration_multiplier: 1.5,
    auto_stop_on_anomaly: true
  },

  framework_mapping: {}
};

// =============================================================================
// GDPR PROFILE
// =============================================================================

export const GDPR_PROFILE_METADATA: IndustryProfileMetadata = {
  profile_key: 'GDPR',
  name: 'GDPR Compliant',
  description: 'Risk profile for EU personal data protection',
  industry: 'Any (EU operations)',
  compliance_frameworks: ['GDPR', 'ePrivacy'],
  suitable_for: [
    'Organizations processing EU citizen data',
    'Companies with EU customers',
    'Data processors operating in EU'
  ],
  not_suitable_for: [
    'Organizations with no EU data subjects',
    'Fully anonymized data processing'
  ],
  certification_requirements: {
    min_pack_level: 2, // TESTED
    requires_sealed_bundles: true,
    requires_screenshots: true,
    audit_retention_days: 365 * 5 // 5 years
  }
};

export const GDPR_APPETITE: RiskAppetite = {
  appetite_id: 'APPETITE_GDPR',
  name: 'GDPR',
  description: 'EU General Data Protection Regulation compliance',

  job_pack_policy: {
    enabled_packs: [],
    allowed_domains: [],
    blocked_domains: [],
    max_autonomous_mai_level: 'ADVISORY',
    allow_mandatory_auto_execution: false,
    min_pack_certification_level: 2
  },

  action_policy: {
    globally_forbidden_actions: [
      'login',
      'create_account',
      'collect_personal_data',
      'transfer_data_outside_eu',
      'process_special_category_data', // Race, religion, health, etc.
      'automated_decision_making', // Article 22
      'delete',
      'modify_consent'
    ],
    always_require_approval: [
      'access_personal_data',
      'export_data',
      'share_data',
      'send_message'
    ],
    auto_approved_actions: [
      'read_page',
      'screenshot',
      'scroll',
      'search_public_data'
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
    iso_31000: {
      clause: '6.4',
      process: 'Risk Assessment'
    }
  }
};

export const GDPR_TOLERANCE: RiskTolerance = {
  tolerance_id: 'TOLERANCE_GDPR',
  name: 'GDPR Standard',
  description: 'Data protection by design and default',

  confidence_thresholds: {
    critical_field_minimum: 0.95,
    standard_field_minimum: 0.85,
    escalation_threshold: 0.70
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
    trigger_overrides: [
      { trigger_id: 'PII_DETECTED', enabled: true, severity_override: 'HIGH' }
    ]
  },

  anomaly_detection: {
    enabled: true,
    unusual_action_count_threshold: 40,
    unusual_duration_multiplier: 2.5,
    auto_stop_on_anomaly: false
  },

  framework_mapping: {}
};

// =============================================================================
// PROFILE COLLECTION
// =============================================================================

export interface IndustryProfileBundle {
  metadata: IndustryProfileMetadata;
  appetite: RiskAppetite;
  tolerance: RiskTolerance;
}

export const INDUSTRY_PROFILES: Record<string, IndustryProfileBundle> = {
  FEDRAMP: {
    metadata: FEDRAMP_PROFILE_METADATA,
    appetite: FEDRAMP_APPETITE,
    tolerance: FEDRAMP_TOLERANCE
  },
  HIPAA: {
    metadata: HIPAA_PROFILE_METADATA,
    appetite: HIPAA_APPETITE,
    tolerance: HIPAA_TOLERANCE
  },
  SOC2: {
    metadata: SOC2_PROFILE_METADATA,
    appetite: SOC2_APPETITE,
    tolerance: SOC2_TOLERANCE
  },
  PCI_DSS: {
    metadata: PCIDSS_PROFILE_METADATA,
    appetite: PCIDSS_APPETITE,
    tolerance: PCIDSS_TOLERANCE
  },
  GDPR: {
    metadata: GDPR_PROFILE_METADATA,
    appetite: GDPR_APPETITE,
    tolerance: GDPR_TOLERANCE
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get industry profile by key
 */
export function getIndustryProfile(key: string): IndustryProfileBundle | undefined {
  return INDUSTRY_PROFILES[key.toUpperCase()];
}

/**
 * List all available industry profiles
 */
export function listIndustryProfiles(): IndustryProfileMetadata[] {
  return Object.values(INDUSTRY_PROFILES).map(p => p.metadata);
}

/**
 * Find profiles suitable for given compliance frameworks
 */
export function findProfilesByFramework(framework: string): IndustryProfileBundle[] {
  return Object.values(INDUSTRY_PROFILES).filter(p =>
    p.metadata.compliance_frameworks.some(f =>
      f.toLowerCase().includes(framework.toLowerCase())
    )
  );
}

/**
 * Generate profile comparison
 */
export function compareProfiles(profileKeys: string[]): string {
  const profiles = profileKeys.map(k => INDUSTRY_PROFILES[k]).filter(Boolean);

  if (profiles.length < 2) {
    return 'Need at least 2 profiles to compare';
  }

  let comparison = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        INDUSTRY PROFILE COMPARISON                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Attribute                ${profiles.map(p => p.metadata.profile_key.padEnd(15)).join('')}║
╠═══════════════════════════════════════════════════════════════════════════════╣
`;

  // MAI Level
  comparison += `║ Max MAI Level            ${profiles.map(p => p.appetite.job_pack_policy.max_autonomous_mai_level.padEnd(15)).join('')}║\n`;

  // Min Cert Level
  comparison += `║ Min Cert Level           ${profiles.map(p => p.appetite.job_pack_policy.min_pack_certification_level.toString().padEnd(15)).join('')}║\n`;

  // Sealed Bundles
  comparison += `║ Sealed Bundles           ${profiles.map(p => (p.appetite.evidence_policy.require_sealed_bundles ? 'Required' : 'Optional').padEnd(15)).join('')}║\n`;

  // Confidence Threshold
  comparison += `║ Critical Confidence      ${profiles.map(p => (p.tolerance.confidence_thresholds.critical_field_minimum * 100).toFixed(0) + '%').map(s => s.padEnd(15)).join('')}║\n`;

  // Anomaly Detection
  comparison += `║ Anomaly Detection        ${profiles.map(p => (p.tolerance.anomaly_detection.enabled ? 'Enabled' : 'Disabled').padEnd(15)).join('')}║\n`;

  // Auto-stop
  comparison += `║ Auto-stop on Anomaly     ${profiles.map(p => (p.tolerance.anomaly_detection.auto_stop_on_anomaly ? 'Yes' : 'No').padEnd(15)).join('')}║\n`;

  comparison += `╚═══════════════════════════════════════════════════════════════════════════════╝`;

  return comparison;
}

/**
 * Format single profile summary
 */
export function formatProfileSummary(key: string): string {
  const profile = INDUSTRY_PROFILES[key];
  if (!profile) return `Profile not found: ${key}`;

  const meta = profile.metadata;

  return `
╔═══════════════════════════════════════════════════════════════╗
║  ${meta.name.toUpperCase().padEnd(59)}║
╠═══════════════════════════════════════════════════════════════╣
║  ${meta.description.substring(0, 59).padEnd(59)}║
╠═══════════════════════════════════════════════════════════════╣
║  Industry:      ${meta.industry.padEnd(45)}║
║  Frameworks:    ${meta.compliance_frameworks.join(', ').substring(0, 45).padEnd(45)}║
╠═══════════════════════════════════════════════════════════════╣
║  REQUIREMENTS                                                 ║
║    Min Pack Level:    ${meta.certification_requirements.min_pack_level.toString().padEnd(39)}║
║    Sealed Bundles:    ${(meta.certification_requirements.requires_sealed_bundles ? 'Required' : 'Optional').padEnd(39)}║
║    Screenshots:       ${(meta.certification_requirements.requires_screenshots ? 'Required' : 'Optional').padEnd(39)}║
║    Retention:         ${(meta.certification_requirements.audit_retention_days + ' days').padEnd(39)}║
╠═══════════════════════════════════════════════════════════════╣
║  SUITABLE FOR                                                 ║
${meta.suitable_for.map(s => `║    ✓ ${s.substring(0, 55).padEnd(55)}║`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  NOT SUITABLE FOR                                             ║
${meta.not_suitable_for.map(s => `║    ✗ ${s.substring(0, 55).padEnd(55)}║`).join('\n')}
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

export default {
  INDUSTRY_PROFILES,
  getIndustryProfile,
  listIndustryProfiles,
  findProfilesByFramework,
  compareProfiles,
  formatProfileSummary
};
