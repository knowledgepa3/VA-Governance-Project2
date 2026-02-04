/**
 * FRAMEWORK CONTROL MAPPING v1.1.0
 *
 * Maps ACE Governance Platform controls to established risk management frameworks:
 * - NIST SP 800-53 Rev. 5 (Security Controls used in RMF)
 * - COSO ERM 2017 (Enterprise Risk Management)
 * - ISO 31000:2018 (Risk Management)
 *
 * IMPORTANT DISTINCTIONS:
 * - NIST RMF = the PROCESS (Categorize → Select → Implement → Assess → Authorize → Monitor)
 * - NIST SP 800-53 = the CONTROLS (AC, AU, CA, CM, IR, RA families)
 * - This document maps to 800-53 controls that are selected/implemented via RMF
 *
 * Purpose: Enable compliance teams to document how ACE controls satisfy
 * existing framework requirements with defensible evidence.
 */

// =============================================================================
// IMPLEMENTATION STATUS TYPES
// =============================================================================

/**
 * Implementation status - more precise than simple "IMPLEMENTED"
 *
 * ENFORCED     - Runtime gate exists that blocks non-compliant actions
 * EVIDENCED    - Artifact is produced that proves compliance
 * CONFIGURABLE - Risk profile controls this behavior
 * PARTIAL      - Exists but may not be sealed/signed/complete
 */
export type ImplementationStatus = 'ENFORCED' | 'EVIDENCED' | 'CONFIGURABLE' | 'PARTIAL';

export interface ControlImplementation {
  status: ImplementationStatus;
  description: string;
}

// =============================================================================
// NIST SP 800-53 CONTROL MAPPINGS (RMF-ALIGNED)
// =============================================================================

/**
 * NIST SP 800-53 Rev. 5 Security Control Mappings
 *
 * These are security controls from SP 800-53 that organizations select
 * and implement as part of the NIST Risk Management Framework (RMF) process.
 *
 * NOT "RMF controls" - RMF is the process, 800-53 provides the controls.
 */
export const NIST_SP_800_53_MAPPINGS = {
  /**
   * AC - Access Control Family
   * ACE Implementation: MAI authority levels, action permissions, forbidden actions
   */
  AC: {
    'AC-1': {
      name: 'Policy and Procedures',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'RiskProfile.appetite defines organizational access policy'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Job Pack permissions.forbidden defines prohibited actions at runtime'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'MAI levels (Mandatory/Advisory/Informational) define access tiers'
        }
      ],
      evidence_artifacts: [
        'RiskProfile JSON (versioned, hash-verified)',
        'Job Pack permission blocks',
        'Profile change audit log'
      ]
    },
    'AC-2': {
      name: 'Account Management',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'auth_policy.allow_authenticated_sessions controls session use'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'auth_policy.allow_account_modifications prevents account changes'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Forbidden action: create_account blocks at runtime'
        }
      ],
      evidence_artifacts: [
        'Risk appetite auth_policy configuration',
        'Execution logs showing blocked account creation attempts',
        'Escalation records for auth-related triggers'
      ]
    },
    'AC-3': {
      name: 'Access Enforcement',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'JobPackExecutor.checkPermission() enforces before every action'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'isActionAllowed() validates against MAI boundaries at runtime'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Permission check results logged in extraction_log.json'
        }
      ],
      evidence_artifacts: [
        'JobPackExecutor.ts permission check implementation',
        'Execution logs with permission check results',
        'Blocked action records in extraction_log.json'
      ]
    },
    'AC-6': {
      name: 'Least Privilege',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Job Packs define minimum necessary permissions per task'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'INFORMATIONAL level = read-only by default, enforced at runtime'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'MANDATORY actions require explicit human approval before execution'
        }
      ],
      evidence_artifacts: [
        'Job Pack permissions.allowed (minimal set)',
        'MAI profile showing action distribution',
        'Human approval records for MANDATORY actions'
      ]
    }
  },

  /**
   * AU - Audit and Accountability Family
   * ACE Implementation: Evidence bundles, extraction logs, manifest hashes
   */
  AU: {
    'AU-2': {
      name: 'Event Logging',
      implementation: [
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'extraction_log.json captures every action with timestamp'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Evidence bundle records all state changes with artifacts'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Profile change_log tracks configuration changes with attribution'
        }
      ],
      evidence_artifacts: [
        'extraction_log.json in evidence bundle',
        'Profile audit.change_log array',
        'Timestamped action records'
      ]
    },
    'AU-3': {
      name: 'Content of Audit Records',
      implementation: [
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Each log entry includes: timestamp, action, result, duration, actor'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'source_context.json captures tool identity and access mode'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'manifest.json records artifact hashes for integrity verification'
        }
      ],
      evidence_artifacts: [
        'extraction_log.json entry structure',
        'source_context.json fields',
        'manifest.json artifact_hashes'
      ]
    },
    'AU-6': {
      name: 'Audit Record Review',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'verifyEvidenceBundle.js validates hash integrity before use'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Sealed bundles cannot be modified post-seal (state machine)'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Profile review_frequency_days enforces periodic review schedule'
        }
      ],
      evidence_artifacts: [
        'Bundle verification script output',
        'Seal status in manifest.json',
        'Review schedule in profile metadata'
      ]
    },
    'AU-9': {
      name: 'Protection of Audit Information',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'SHA-256 hashes detect tampering (verification fails on mismatch)'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Seal state machine (UNSEALED → SEALED) prevents post-hoc modification'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'pack_hash links execution to specific profile version'
        }
      ],
      evidence_artifacts: [
        'manifest.json hash values',
        'seal.pack_hash linking to profile',
        'Hash verification failure logs'
      ]
    },
    'AU-11': {
      name: 'Audit Record Retention',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'evidence.retention_policy in Job Pack defines retention period'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Standard: 30 days, Escalated: 90 days (configurable)'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Retention policy configurable per risk profile'
        }
      ],
      evidence_artifacts: [
        'Job Pack evidence.retention_policy',
        'Archived evidence bundles with retention metadata'
      ]
    }
  },

  /**
   * CA - Assessment, Authorization, and Monitoring Family
   * ACE Implementation: Confidence thresholds, escalation triggers, bundle validation
   */
  CA: {
    'CA-2': {
      name: 'Control Assessments',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'validateRiskProfile() assesses profile completeness before use'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'validateJobPack() assesses pack structure before registration'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'validateEvidenceBundle() assesses artifacts before sealing'
        }
      ],
      evidence_artifacts: [
        'Validation function outputs',
        'Profile validation results',
        'Pack registration logs'
      ]
    },
    'CA-7': {
      name: 'Continuous Monitoring',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Real-time escalation triggers during execution halt on detection'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Confidence thresholds monitored and recorded per field'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Anomaly detection flags unusual patterns (configurable sensitivity)'
        }
      ],
      evidence_artifacts: [
        'Escalation trigger logs',
        'Field confidence scores in opportunity.json',
        'Anomaly detection alerts'
      ]
    }
  },

  /**
   * CM - Configuration Management Family
   * ACE Implementation: Profile versioning, pack hashing, registry management
   */
  CM: {
    'CM-2': {
      name: 'Baseline Configuration',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'CONSERVATIVE/BALANCED/AGGRESSIVE presets define baselines'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Profile version tracks deviations from baseline'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Registry index maintains pack inventory with hashes'
        }
      ],
      evidence_artifacts: [
        'Preset profile definitions',
        'profile_version field',
        '_registry_index.json'
      ]
    },
    'CM-3': {
      name: 'Configuration Change Control',
      implementation: [
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Profile change_log records all modifications with attribution'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Each change includes: who, when, what, why, previous_hash'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'Previous version hash enables chain verification'
        }
      ],
      evidence_artifacts: [
        'ProfileChangeEntry records',
        'previous_version_hash chain',
        'Change attribution fields'
      ]
    },
    'CM-6': {
      name: 'Configuration Settings',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Risk appetite defines allowed settings'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Risk tolerance defines operational parameters'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Profile scope limits where settings apply'
        }
      ],
      evidence_artifacts: [
        'RiskAppetite configuration',
        'RiskTolerance parameters',
        'Profile scope definition'
      ]
    }
  },

  /**
   * IR - Incident Response Family
   * ACE Implementation: Escalation handling, fail-closed behavior
   */
  IR: {
    'IR-4': {
      name: 'Incident Handling',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Escalation triggers define incident detection criteria'
        },
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'stop_and_ask action halts execution for human intervention'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'capture_evidence action preserves incident context'
        }
      ],
      evidence_artifacts: [
        'Escalation trigger definitions',
        'Escalation logs in extraction_log.json',
        'Incident evidence bundles'
      ]
    },
    'IR-6': {
      name: 'Incident Reporting',
      implementation: [
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Escalated bundles flagged with severity level'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'retention_policy extended for escalated incidents'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Evidence bundle provides full incident context'
        }
      ],
      evidence_artifacts: [
        'Escalation severity in logs',
        'Extended retention bundles',
        'Incident summary in manifest'
      ]
    }
  },

  /**
   * RA - Risk Assessment Family
   * ACE Implementation: Risk profiles, appetite/tolerance separation
   */
  RA: {
    'RA-1': {
      name: 'Policy and Procedures',
      implementation: [
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'RiskAppetite = organizational policy on acceptable risk'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'RiskTolerance = operational parameters for deviation'
        },
        {
          status: 'CONFIGURABLE' as ImplementationStatus,
          description: 'Profile presets provide starting points for policy'
        }
      ],
      evidence_artifacts: [
        'RiskProfile documentation',
        'Preset definitions',
        'Profile approval records'
      ]
    },
    'RA-3': {
      name: 'Risk Assessment',
      implementation: [
        {
          status: 'ENFORCED' as ImplementationStatus,
          description: 'compareProfiles() identifies risk impact of changes'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'risk_impact field flags INCREASES_RISK changes'
        },
        {
          status: 'EVIDENCED' as ImplementationStatus,
          description: 'Framework mappings enable compliance assessment'
        }
      ],
      evidence_artifacts: [
        'Profile comparison diffs',
        'risk_impact analysis',
        'Framework mapping documentation'
      ]
    }
  }
};

// Legacy export name for backward compatibility
export const NIST_RMF_MAPPINGS = NIST_SP_800_53_MAPPINGS;

// =============================================================================
// COSO ERM PRINCIPLES
// =============================================================================

/**
 * COSO ERM Framework Principles (2017)
 * Maps ACE controls to COSO's 20 principles across 5 components
 */
export const COSO_ERM_MAPPINGS = {
  /**
   * Component 1: Governance and Culture
   */
  governance_and_culture: {
    principle_1: {
      name: 'Exercises Board Risk Oversight',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Risk profiles require approval by designated role' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'approved_by and approval_notes track oversight' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'review_frequency_days ensures periodic board review' }
      ]
    },
    principle_2: {
      name: 'Establishes Operating Structures',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Profile scope defines organizational applicability' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'MAI levels establish and enforce authority hierarchy' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Job Pack roles define operational boundaries' }
      ]
    },
    principle_3: {
      name: 'Defines Desired Culture',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Preset profiles (Conservative/Balanced/Aggressive) reflect culture' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'globally_forbidden_actions define non-negotiable boundaries' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Evidence requirements reflect accountability culture' }
      ]
    }
  },

  /**
   * Component 2: Strategy and Objective-Setting
   */
  strategy_and_objectives: {
    principle_6: {
      name: 'Analyzes Business Context',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'UI map captures domain-specific context' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'url_patterns define expected business flows' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'stable_anchors map to business UI elements' }
      ]
    },
    principle_7: {
      name: 'Defines Risk Appetite',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'RiskAppetite is a first-class control object' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'job_pack_policy defines what work is acceptable' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'action_policy enforces what actions are acceptable' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'evidence_policy defines what proof is acceptable' }
      ]
    },
    principle_8: {
      name: 'Evaluates Alternative Strategies',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Multiple profile presets offer strategic options' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'compareProfiles() enables strategy comparison with impact analysis' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Profile versioning allows strategy evolution tracking' }
      ]
    }
  },

  /**
   * Component 3: Performance
   */
  performance: {
    principle_10: {
      name: 'Identifies Risk',
      implementation: [
        { status: 'ENFORCED' as ImplementationStatus, description: 'Escalation triggers identify and halt on runtime risks' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'forbidden actions identify and block policy risks' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'confidence thresholds identify data quality risks' }
      ]
    },
    principle_11: {
      name: 'Assesses Severity of Risk',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Escalation severity levels (LOW/MEDIUM/HIGH/CRITICAL)' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'risk_impact analysis in profile comparisons' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'MAI levels reflect and enforce action severity' }
      ]
    },
    principle_12: {
      name: 'Prioritizes Risks',
      implementation: [
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'critical_field_minimum vs standard_field_minimum thresholds' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'MANDATORY actions prioritized for human oversight' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Escalation triggers sorted by severity' }
      ]
    },
    principle_13: {
      name: 'Implements Risk Responses',
      implementation: [
        { status: 'ENFORCED' as ImplementationStatus, description: 'Escalation actions: stop_and_ask, capture_evidence, flag_for_review' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'Retry limits control response to failures' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'auto_stop_on_anomaly implements automatic response' }
      ]
    },
    principle_14: {
      name: 'Develops Portfolio View',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Job Pack Registry provides portfolio of capabilities' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'by_domain, by_category indexes enable portfolio analysis' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'MAI profiles summarize risk across packs' }
      ]
    }
  },

  /**
   * Component 4: Review and Revision
   */
  review_and_revision: {
    principle_16: {
      name: 'Assesses Substantial Change',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Profile change_log tracks all changes with attribution' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'compareProfiles() assesses change impact' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'risk_impact flags substantial risk changes' }
      ]
    },
    principle_17: {
      name: 'Pursues Improvement',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Profile versioning enables iterative improvement' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Job Pack versioning allows SOP refinement' },
        { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Evidence quality improves within risk envelope' }
      ]
    }
  },

  /**
   * Component 5: Information, Communication, and Reporting
   */
  information_and_reporting: {
    principle_18: {
      name: 'Leverages Information Systems',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Evidence bundles capture information systematically' },
        { status: 'ENFORCED' as ImplementationStatus, description: 'manifest.json provides information integrity verification' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'source_context.json captures information provenance' }
      ]
    },
    principle_19: {
      name: 'Communicates Risk Information',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'opportunity.md provides human-readable summary' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Profile validation results communicate issues' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Escalation notifications communicate runtime risks' }
      ]
    },
    principle_20: {
      name: 'Reports on Risk, Culture, and Performance',
      implementation: [
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Execution logs report on performance' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Profile presets report on risk culture' },
        { status: 'EVIDENCED' as ImplementationStatus, description: 'Bundle statistics report on completion rates' }
      ]
    }
  }
};

// =============================================================================
// ISO 31000 PROCESS MAPPING
// =============================================================================

/**
 * ISO 31000:2018 Risk Management Process
 */
export const ISO_31000_MAPPINGS = {
  '5.2': {
    name: 'Leadership and Commitment',
    implementation: [
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Profile approval workflow ensures leadership buy-in' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'approved_by, approved_by_role track accountability' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'review_frequency_days enforces ongoing commitment' }
    ]
  },
  '5.4': {
    name: 'Organizational Integration',
    implementation: [
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Profile scope integrates with org structure' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'entity_ids link to organizational units' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'environments control deployment contexts' }
    ]
  },
  '6.3': {
    name: 'Scope, Context and Criteria',
    implementation: [
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'RiskAppetite defines criteria for acceptable risk' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'RiskTolerance defines criteria for deviation' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'Profile scope defines organizational context' }
    ]
  },
  '6.4': {
    name: 'Risk Assessment',
    implementation: [
      { status: 'ENFORCED' as ImplementationStatus, description: 'validateRiskProfile() assesses profile risks before use' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'compareProfiles() assesses change risks with impact' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'Confidence thresholds assess data risks per field' }
    ]
  },
  '6.5': {
    name: 'Risk Treatment',
    implementation: [
      { status: 'ENFORCED' as ImplementationStatus, description: 'MAI levels determine and enforce treatment approach' },
      { status: 'ENFORCED' as ImplementationStatus, description: 'Escalation actions implement treatment responses' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'Evidence requirements support treatment verification' }
    ]
  },
  '6.6': {
    name: 'Monitoring and Review',
    implementation: [
      { status: 'ENFORCED' as ImplementationStatus, description: 'Real-time escalation monitoring during execution' },
      { status: 'CONFIGURABLE' as ImplementationStatus, description: 'review_frequency_days enforces periodic review' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'change_log enables audit review' }
    ]
  },
  '6.7': {
    name: 'Recording and Reporting',
    implementation: [
      { status: 'EVIDENCED' as ImplementationStatus, description: 'Evidence bundles record all activities' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'manifest.json reports on bundle integrity' },
      { status: 'EVIDENCED' as ImplementationStatus, description: 'extraction_log.json reports on execution details' }
    ]
  }
};

// =============================================================================
// COMPLIANCE REPORT GENERATOR
// =============================================================================

export interface ComplianceReportSection {
  framework: 'NIST_SP_800_53' | 'COSO_ERM' | 'ISO_31000';
  control_id: string;
  control_name: string;
  implementation: ControlImplementation[];
  evidence_artifacts: string[];
  notes?: string;
}

/**
 * Status summary for a control
 */
export function summarizeStatus(implementations: ControlImplementation[]): string {
  const statuses = implementations.map(i => i.status);

  if (statuses.every(s => s === 'ENFORCED')) return '✅ ENFORCED';
  if (statuses.every(s => s === 'EVIDENCED')) return '📋 EVIDENCED';
  if (statuses.every(s => s === 'CONFIGURABLE')) return '⚙️ CONFIGURABLE';
  if (statuses.includes('ENFORCED')) return '✅ ENFORCED + ⚙️ CONFIGURABLE';
  if (statuses.includes('PARTIAL')) return '⚠️ PARTIAL';

  // Mixed status
  const unique = [...new Set(statuses)];
  return unique.map(s => {
    switch (s) {
      case 'ENFORCED': return '✅';
      case 'EVIDENCED': return '📋';
      case 'CONFIGURABLE': return '⚙️';
      case 'PARTIAL': return '⚠️';
    }
  }).join(' ') + ' MIXED';
}

export function generateComplianceReport(
  framework: 'NIST_SP_800_53' | 'COSO_ERM' | 'ISO_31000'
): ComplianceReportSection[] {
  const sections: ComplianceReportSection[] = [];

  if (framework === 'NIST_SP_800_53') {
    for (const [family, controls] of Object.entries(NIST_SP_800_53_MAPPINGS)) {
      for (const [controlId, control] of Object.entries(controls)) {
        sections.push({
          framework: 'NIST_SP_800_53',
          control_id: controlId,
          control_name: control.name,
          implementation: control.implementation,
          evidence_artifacts: control.evidence_artifacts || []
        });
      }
    }
  }

  if (framework === 'COSO_ERM') {
    for (const [component, principles] of Object.entries(COSO_ERM_MAPPINGS)) {
      for (const [principleKey, principle] of Object.entries(principles)) {
        const principleNum = principleKey.replace('principle_', '');
        sections.push({
          framework: 'COSO_ERM',
          control_id: `Principle ${principleNum}`,
          control_name: principle.name,
          implementation: principle.implementation,
          evidence_artifacts: []
        });
      }
    }
  }

  if (framework === 'ISO_31000') {
    for (const [clause, mapping] of Object.entries(ISO_31000_MAPPINGS)) {
      sections.push({
        framework: 'ISO_31000',
        control_id: `Clause ${clause}`,
        control_name: mapping.name,
        implementation: mapping.implementation,
        evidence_artifacts: []
      });
    }
  }

  return sections;
}

export default {
  NIST_SP_800_53_MAPPINGS,
  NIST_RMF_MAPPINGS, // Legacy alias
  COSO_ERM_MAPPINGS,
  ISO_31000_MAPPINGS,
  generateComplianceReport,
  summarizeStatus
};
