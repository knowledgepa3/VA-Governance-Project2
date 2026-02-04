/**
 * PACK CERTIFICATION SCHEMA v1.0.0
 *
 * Certification Levels for Job Packs
 * Ensures packs meet quality, safety, and compliance standards before deployment.
 *
 * CERTIFICATION LEVELS:
 * Level 0: DRAFT       - In development, not validated
 * Level 1: VALIDATED   - Schema valid, runs without errors
 * Level 2: TESTED      - Has test evidence, escalations work
 * Level 3: CERTIFIED   - Full audit trail, reviewed by human
 * Level 4: PRODUCTION  - Deployed, monitored, incident-free for N days
 */

import { JobPack, validateJobPack } from '../workforce/jobpacks/JobPackSchema';
import * as crypto from 'crypto';

// =============================================================================
// CERTIFICATION LEVELS
// =============================================================================

export enum CertificationLevel {
  DRAFT = 0,
  VALIDATED = 1,
  TESTED = 2,
  CERTIFIED = 3,
  PRODUCTION = 4
}

export const CERTIFICATION_LEVEL_NAMES: Record<CertificationLevel, string> = {
  [CertificationLevel.DRAFT]: 'DRAFT',
  [CertificationLevel.VALIDATED]: 'VALIDATED',
  [CertificationLevel.TESTED]: 'TESTED',
  [CertificationLevel.CERTIFIED]: 'CERTIFIED',
  [CertificationLevel.PRODUCTION]: 'PRODUCTION'
};

export const CERTIFICATION_LEVEL_DESCRIPTIONS: Record<CertificationLevel, string> = {
  [CertificationLevel.DRAFT]: 'In development, not validated. Not suitable for any execution.',
  [CertificationLevel.VALIDATED]: 'Schema valid, can run in demo mode without errors.',
  [CertificationLevel.TESTED]: 'Has test evidence, escalations verified to work correctly.',
  [CertificationLevel.CERTIFIED]: 'Full audit trail, reviewed and approved by human certifier.',
  [CertificationLevel.PRODUCTION]: 'Deployed to production, monitored, incident-free for required period.'
};

// =============================================================================
// CERTIFICATION CRITERIA
// =============================================================================

export interface CertificationCriterion {
  criterion_id: string;
  name: string;
  description: string;
  required_for_level: CertificationLevel;
  check_type: 'automated' | 'manual' | 'evidence';
  severity: 'BLOCKER' | 'REQUIRED' | 'RECOMMENDED';
}

/**
 * All certification criteria that packs must meet
 */
export const CERTIFICATION_CRITERIA: CertificationCriterion[] = [
  // ==========================================================================
  // LEVEL 1: VALIDATED (Automated checks)
  // ==========================================================================
  {
    criterion_id: 'V-001',
    name: 'Schema Valid',
    description: 'Pack passes validateJobPack() with no errors',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'V-002',
    name: 'Has Pack ID',
    description: 'Pack has a unique pack_id that follows naming convention',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'V-003',
    name: 'Has Version',
    description: 'Pack has a valid semantic version (e.g., 1.0.0)',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'V-004',
    name: 'MAI Boundaries Defined',
    description: 'All three MAI levels (Mandatory, Advisory, Informational) have at least one action',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-005',
    name: 'Forbidden Actions Defined',
    description: 'Pack explicitly forbids at least 3 dangerous actions',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-006',
    name: 'Escalation Triggers Defined',
    description: 'Pack has at least one escalation trigger for each severity level',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-007',
    name: 'UI Map Complete',
    description: 'UI map has domain, at least 3 stable anchors, and at least 2 URL patterns',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-008',
    name: 'Procedure Index Exists',
    description: 'Mini index has at least 5 task entries',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-009',
    name: 'Evidence Requirements Defined',
    description: 'Pack specifies lightweight capture and at least one milestone screenshot',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'V-010',
    name: 'Constraints Reasonable',
    description: 'Timeout values are between 1s and 10 minutes, max retries between 1 and 5',
    required_for_level: CertificationLevel.VALIDATED,
    check_type: 'automated',
    severity: 'REQUIRED'
  },

  // ==========================================================================
  // LEVEL 2: TESTED (Evidence-based checks)
  // ==========================================================================
  {
    criterion_id: 'T-001',
    name: 'Demo Mode Execution',
    description: 'Pack has been executed successfully in demo mode at least 3 times',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'T-002',
    name: 'Escalation Tested',
    description: 'At least one escalation trigger has been fired and verified in testing',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'T-003',
    name: 'Human Approval Flow Tested',
    description: 'Mandatory actions have triggered human approval flow and been approved/rejected',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'T-004',
    name: 'Evidence Bundle Generated',
    description: 'At least one sealed evidence bundle has been generated from test execution',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'T-005',
    name: 'Error Recovery Tested',
    description: 'Pack has recovered from at least one simulated error condition',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'T-006',
    name: 'UI Anchors Verified',
    description: 'All UI anchors have been verified to match actual UI elements',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'T-007',
    name: 'No Forbidden Actions Triggered',
    description: 'Test executions never attempted any forbidden actions',
    required_for_level: CertificationLevel.TESTED,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },

  // ==========================================================================
  // LEVEL 3: CERTIFIED (Manual review checks)
  // ==========================================================================
  {
    criterion_id: 'C-001',
    name: 'Human Review Complete',
    description: 'Pack has been reviewed by a qualified human certifier',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'C-002',
    name: 'Mission Alignment Verified',
    description: 'Certifier confirms pack mission aligns with intended use case',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'C-003',
    name: 'Risk Assessment Complete',
    description: 'Certifier has completed risk assessment for all mandatory actions',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'C-004',
    name: 'Compliance Mapping Reviewed',
    description: 'Pack controls have been mapped to applicable compliance frameworks',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'C-005',
    name: 'Audit Trail Adequate',
    description: 'Evidence bundle provides sufficient audit trail for compliance needs',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'C-006',
    name: 'Documentation Complete',
    description: 'Pack has complete documentation including failure modes and recovery procedures',
    required_for_level: CertificationLevel.CERTIFIED,
    check_type: 'manual',
    severity: 'REQUIRED'
  },

  // ==========================================================================
  // LEVEL 4: PRODUCTION (Operational checks)
  // ==========================================================================
  {
    criterion_id: 'P-001',
    name: 'Production Deployment',
    description: 'Pack has been deployed to production environment',
    required_for_level: CertificationLevel.PRODUCTION,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'P-002',
    name: 'Monitoring Active',
    description: 'Pack execution is being actively monitored for anomalies',
    required_for_level: CertificationLevel.PRODUCTION,
    check_type: 'manual',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'P-003',
    name: 'Incident-Free Period',
    description: 'Pack has operated without incidents for required burn-in period (default 7 days)',
    required_for_level: CertificationLevel.PRODUCTION,
    check_type: 'evidence',
    severity: 'BLOCKER'
  },
  {
    criterion_id: 'P-004',
    name: 'Success Rate Met',
    description: 'Pack maintains >95% success rate on executed tasks',
    required_for_level: CertificationLevel.PRODUCTION,
    check_type: 'evidence',
    severity: 'REQUIRED'
  },
  {
    criterion_id: 'P-005',
    name: 'Operator Sign-Off',
    description: 'Production operator has signed off on pack behavior',
    required_for_level: CertificationLevel.PRODUCTION,
    check_type: 'manual',
    severity: 'REQUIRED'
  }
];

// =============================================================================
// CERTIFICATION RECORD
// =============================================================================

export interface CriterionResult {
  criterion_id: string;
  passed: boolean;
  evidence?: string;
  notes?: string;
  checked_at: string;
  checked_by: string;  // 'AUTOMATED' or user identifier
}

export interface CertificationRecord {
  // Pack identification
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Current status
  current_level: CertificationLevel;
  target_level: CertificationLevel;

  // Criteria results
  criteria_results: CriterionResult[];

  // History
  certification_history: {
    level: CertificationLevel;
    achieved_at: string;
    certified_by: string;
    notes?: string;
  }[];

  // Metadata
  created_at: string;
  updated_at: string;
  expires_at?: string;  // Certification may require renewal

  // Production tracking (for Level 4)
  production_metrics?: {
    deployment_date: string;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    escalations_triggered: number;
    incidents: {
      date: string;
      severity: string;
      description: string;
      resolved: boolean;
    }[];
    last_incident_date?: string;
    burn_in_complete: boolean;
  };
}

// =============================================================================
// CERTIFICATION FUNCTIONS
// =============================================================================

/**
 * Run automated certification checks for Level 1 (VALIDATED)
 */
export function runAutomatedChecks(pack: JobPack): CriterionResult[] {
  const results: CriterionResult[] = [];
  const now = new Date().toISOString();

  // V-001: Schema Valid
  const validation = validateJobPack(pack);
  results.push({
    criterion_id: 'V-001',
    passed: validation.valid,
    evidence: validation.valid ? 'Schema validation passed' : `Errors: ${validation.errors.join('; ')}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-002: Has Pack ID
  const hasPackId = !!pack.pack_id && /^[a-z0-9_-]+$/i.test(pack.pack_id);
  results.push({
    criterion_id: 'V-002',
    passed: hasPackId,
    evidence: hasPackId ? `Pack ID: ${pack.pack_id}` : 'Missing or invalid pack_id',
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-003: Has Version
  const hasVersion = !!pack.pack_version && /^\d+\.\d+\.\d+/.test(pack.pack_version);
  results.push({
    criterion_id: 'V-003',
    passed: hasVersion,
    evidence: hasVersion ? `Version: ${pack.pack_version}` : 'Missing or invalid version',
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-004: MAI Boundaries Defined
  const hasMAI =
    pack.authority.informational_actions.length > 0 &&
    pack.authority.advisory_actions.length > 0 &&
    pack.authority.mandatory_actions.length > 0;
  results.push({
    criterion_id: 'V-004',
    passed: hasMAI,
    evidence: `I:${pack.authority.informational_actions.length} A:${pack.authority.advisory_actions.length} M:${pack.authority.mandatory_actions.length}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-005: Forbidden Actions Defined
  const hasForbidden = pack.permissions.forbidden.length >= 3;
  results.push({
    criterion_id: 'V-005',
    passed: hasForbidden,
    evidence: `${pack.permissions.forbidden.length} forbidden actions defined`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-006: Escalation Triggers Defined
  const severities = new Set(pack.escalation.triggers.map(t => t.severity));
  const hasAllSeverities = severities.has('LOW') && severities.has('MEDIUM') &&
    severities.has('HIGH') && severities.has('CRITICAL');
  results.push({
    criterion_id: 'V-006',
    passed: hasAllSeverities,
    evidence: `Severities: ${Array.from(severities).join(', ')}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-007: UI Map Complete
  const hasUIMap =
    !!pack.ui_map.domain &&
    pack.ui_map.stable_anchors.length >= 3 &&
    pack.ui_map.url_patterns.length >= 2;
  results.push({
    criterion_id: 'V-007',
    passed: hasUIMap,
    evidence: `Domain: ${pack.ui_map.domain}, Anchors: ${pack.ui_map.stable_anchors.length}, Patterns: ${pack.ui_map.url_patterns.length}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-008: Procedure Index Exists
  const hasProcedures = pack.procedure_index.mini_index.length >= 5;
  results.push({
    criterion_id: 'V-008',
    passed: hasProcedures,
    evidence: `${pack.procedure_index.mini_index.length} task entries in mini index`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-009: Evidence Requirements Defined
  const hasEvidence =
    pack.evidence.lightweight_capture.length > 0 &&
    pack.evidence.milestone_screenshots.length > 0;
  results.push({
    criterion_id: 'V-009',
    passed: hasEvidence,
    evidence: `Lightweight: ${pack.evidence.lightweight_capture.length}, Milestones: ${pack.evidence.milestone_screenshots.length}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // V-010: Constraints Reasonable
  const validConstraints =
    pack.constraints.timeout_per_step_ms >= 1000 &&
    pack.constraints.timeout_per_step_ms <= 600000 &&
    pack.constraints.max_retries_per_step >= 1 &&
    pack.constraints.max_retries_per_step <= 5;
  results.push({
    criterion_id: 'V-010',
    passed: validConstraints,
    evidence: `Timeout: ${pack.constraints.timeout_per_step_ms}ms, Retries: ${pack.constraints.max_retries_per_step}`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  return results;
}

/**
 * Calculate current certification level based on results
 */
export function calculateCertificationLevel(record: CertificationRecord): CertificationLevel {
  const passedCriteria = new Set(
    record.criteria_results
      .filter(r => r.passed)
      .map(r => r.criterion_id)
  );

  // Check each level's blockers
  for (let level = CertificationLevel.PRODUCTION; level >= CertificationLevel.DRAFT; level--) {
    const blockers = CERTIFICATION_CRITERIA.filter(c =>
      c.required_for_level <= level && c.severity === 'BLOCKER'
    );

    const allBlockersPassed = blockers.every(b => passedCriteria.has(b.criterion_id));

    if (allBlockersPassed && level > CertificationLevel.DRAFT) {
      // Also check required criteria
      const required = CERTIFICATION_CRITERIA.filter(c =>
        c.required_for_level <= level && c.severity === 'REQUIRED'
      );
      const requiredPassRate = required.filter(r => passedCriteria.has(r.criterion_id)).length / required.length;

      // Must pass all blockers and at least 80% of required
      if (requiredPassRate >= 0.8) {
        return level;
      }
    }
  }

  return CertificationLevel.DRAFT;
}

/**
 * Get criteria required for a specific level
 */
export function getCriteriaForLevel(level: CertificationLevel): CertificationCriterion[] {
  return CERTIFICATION_CRITERIA.filter(c => c.required_for_level <= level);
}

/**
 * Get missing criteria to reach a target level
 */
export function getMissingCriteria(
  record: CertificationRecord,
  targetLevel: CertificationLevel
): CertificationCriterion[] {
  const passedCriteria = new Set(
    record.criteria_results
      .filter(r => r.passed)
      .map(r => r.criterion_id)
  );

  const requiredCriteria = getCriteriaForLevel(targetLevel);

  return requiredCriteria.filter(c => !passedCriteria.has(c.criterion_id));
}

/**
 * Create a new certification record for a pack
 */
export function createCertificationRecord(
  pack: JobPack,
  packHash: string
): CertificationRecord {
  const now = new Date().toISOString();

  // Run automated checks
  const automatedResults = runAutomatedChecks(pack);

  const record: CertificationRecord = {
    pack_id: pack.pack_id,
    pack_version: pack.pack_version,
    pack_hash: packHash,

    current_level: CertificationLevel.DRAFT,
    target_level: CertificationLevel.CERTIFIED,

    criteria_results: automatedResults,

    certification_history: [{
      level: CertificationLevel.DRAFT,
      achieved_at: now,
      certified_by: 'SYSTEM',
      notes: 'Initial certification record created'
    }],

    created_at: now,
    updated_at: now
  };

  // Calculate current level
  record.current_level = calculateCertificationLevel(record);

  // Add level achievement to history if above DRAFT
  if (record.current_level > CertificationLevel.DRAFT) {
    record.certification_history.push({
      level: record.current_level,
      achieved_at: now,
      certified_by: 'AUTOMATED',
      notes: 'Achieved via automated checks'
    });
  }

  return record;
}

/**
 * Generate certification summary
 */
export function certificationSummary(record: CertificationRecord): string {
  const levelName = CERTIFICATION_LEVEL_NAMES[record.current_level];
  const passed = record.criteria_results.filter(r => r.passed).length;
  const total = record.criteria_results.length;

  const blockersFailed = record.criteria_results.filter(r => {
    const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === r.criterion_id);
    return criterion?.severity === 'BLOCKER' && !r.passed;
  });

  const missing = getMissingCriteria(record, record.target_level);

  let summary = `
╔═══════════════════════════════════════════════════════════════╗
║                    PACK CERTIFICATION STATUS                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Pack ID:      ${record.pack_id.padEnd(47)}║
║  Version:      ${record.pack_version.padEnd(47)}║
║  Current:      ${levelName.padEnd(47)}║
║  Target:       ${CERTIFICATION_LEVEL_NAMES[record.target_level].padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  Criteria:     ${`${passed}/${total} passed`.padEnd(47)}║
`;

  if (blockersFailed.length > 0) {
    summary += `║  BLOCKERS:     ${`${blockersFailed.length} failed (must fix)`.padEnd(47)}║\n`;
  }

  summary += `╚═══════════════════════════════════════════════════════════════╝\n`;

  if (blockersFailed.length > 0) {
    summary += '\n❌ FAILED BLOCKERS:\n';
    for (const result of blockersFailed) {
      const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === result.criterion_id);
      summary += `   ${result.criterion_id}: ${criterion?.name}\n`;
      summary += `      → ${result.evidence}\n`;
    }
  }

  if (missing.length > 0 && record.current_level < record.target_level) {
    summary += `\n📋 REMAINING FOR ${CERTIFICATION_LEVEL_NAMES[record.target_level]}:\n`;
    for (const criterion of missing.slice(0, 5)) {
      summary += `   ${criterion.criterion_id}: ${criterion.name} [${criterion.check_type}]\n`;
    }
    if (missing.length > 5) {
      summary += `   ... and ${missing.length - 5} more\n`;
    }
  }

  return summary.trim();
}

// =============================================================================
// PORTABLE CERTIFICATE ARTIFACT
// =============================================================================

/**
 * Portable Pack Certificate
 *
 * This is the artifact that ships with a pack to prove its certification status.
 * Can be verified independently by customers without access to full certification records.
 */
export interface PackCertificate {
  // Certificate identity
  certificate_id: string;
  certificate_version: string;  // "1.0.0"

  // Pack identity (what this certifies)
  pack_id: string;
  pack_version: string;
  pack_hash: string;  // SHA-256 of pack content at certification time

  // Certification status
  certification_level: CertificationLevel;
  certification_level_name: string;

  // Certification metadata
  certified_at: string;       // ISO timestamp
  certified_by: string;       // Certifier name/identifier
  certifier_role?: string;    // e.g., "Security Reviewer", "Platform Admin"

  // Evidence summary (not full record, just summary)
  criteria_summary: {
    total_criteria: number;
    passed: number;
    failed: number;
    blockers_passed: boolean;
    automated_checks_passed: boolean;
    manual_review_complete: boolean;
  };

  // Risk profile compatibility
  risk_profile_compat: {
    // Minimum risk profile level this pack is compatible with
    min_profile_level: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    // What MAI levels this pack uses
    uses_mandatory_actions: boolean;
    uses_advisory_actions: boolean;
    mandatory_action_count: number;
    // Evidence requirements this pack satisfies
    produces_sealed_bundles: boolean;
    produces_screenshots: boolean;
  };

  // Validity
  issued_at: string;
  expires_at?: string;        // Optional expiration
  valid: boolean;

  // Verification
  certificate_hash: string;   // SHA-256 of certificate content (excluding this field)
}

/**
 * Create a portable certificate from a certification record
 */
export function createPackCertificate(
  record: CertificationRecord,
  pack: any,  // JobPack type
  certifierRole?: string
): PackCertificate {
  const now = new Date().toISOString();

  // Calculate criteria summary
  const passed = record.criteria_results.filter(r => r.passed).length;
  const failed = record.criteria_results.filter(r => !r.passed).length;

  const blockerResults = record.criteria_results.filter(r => {
    const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === r.criterion_id);
    return criterion?.severity === 'BLOCKER';
  });
  const blockersPassed = blockerResults.every(r => r.passed);

  const automatedResults = record.criteria_results.filter(r => {
    const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === r.criterion_id);
    return criterion?.check_type === 'automated';
  });
  const automatedPassed = automatedResults.every(r => r.passed);

  const manualResults = record.criteria_results.filter(r => {
    const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === r.criterion_id);
    return criterion?.check_type === 'manual';
  });
  const manualComplete = manualResults.length > 0 && manualResults.every(r => r.passed);

  // Get certifier from history
  const lastCert = record.certification_history.length > 0
    ? record.certification_history[record.certification_history.length - 1]
    : null;

  // Determine minimum compatible profile
  let minProfileLevel: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' = 'AGGRESSIVE';
  if (pack.authority?.mandatory_actions?.length > 0) {
    minProfileLevel = 'BALANCED';  // Packs with mandatory actions need at least BALANCED
  }
  if (pack.constraints?.requires_sealed_evidence_bundle) {
    minProfileLevel = 'CONSERVATIVE';  // Sealed bundles required = CONSERVATIVE
  }

  const certificateContent = {
    certificate_id: `CERT-${record.pack_id}-${Date.now()}`,
    certificate_version: '1.0.0',

    pack_id: record.pack_id,
    pack_version: record.pack_version,
    pack_hash: record.pack_hash,

    certification_level: record.current_level,
    certification_level_name: CERTIFICATION_LEVEL_NAMES[record.current_level],

    certified_at: lastCert?.achieved_at || now,
    certified_by: lastCert?.certified_by || 'AUTOMATED',
    certifier_role: certifierRole,

    criteria_summary: {
      total_criteria: record.criteria_results.length,
      passed,
      failed,
      blockers_passed: blockersPassed,
      automated_checks_passed: automatedPassed,
      manual_review_complete: manualComplete
    },

    risk_profile_compat: {
      min_profile_level: minProfileLevel,
      uses_mandatory_actions: (pack.authority?.mandatory_actions?.length || 0) > 0,
      uses_advisory_actions: (pack.authority?.advisory_actions?.length || 0) > 0,
      mandatory_action_count: pack.authority?.mandatory_actions?.length || 0,
      produces_sealed_bundles: pack.constraints?.requires_sealed_evidence_bundle || false,
      produces_screenshots: pack.evidence?.milestone_screenshots?.length > 0 || false
    },

    issued_at: now,
    expires_at: undefined,  // Can be set for time-limited certs
    valid: record.current_level >= CertificationLevel.VALIDATED,

    certificate_hash: ''  // Will be filled after hashing
  };

  // Calculate certificate hash (excluding the hash field itself)
  const contentToHash = JSON.stringify(certificateContent);
  certificateContent.certificate_hash = crypto
    .createHash('sha256')
    .update(contentToHash)
    .digest('hex');

  return certificateContent as PackCertificate;
}

/**
 * Verify a pack certificate
 */
export function verifyPackCertificate(
  certificate: PackCertificate,
  packHash: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check pack hash matches
  if (certificate.pack_hash !== packHash) {
    errors.push(`Pack hash mismatch: certificate has ${certificate.pack_hash.substring(0, 16)}..., pack has ${packHash.substring(0, 16)}...`);
  }

  // Check expiration
  if (certificate.expires_at) {
    const expiresAt = new Date(certificate.expires_at);
    if (expiresAt < new Date()) {
      errors.push(`Certificate expired at ${certificate.expires_at}`);
    }
  }

  // Check validity flag
  if (!certificate.valid) {
    errors.push('Certificate is marked as invalid');
  }

  // Verify certificate hash (recalculate and compare)
  const certCopy = { ...certificate, certificate_hash: '' };
  const contentToHash = JSON.stringify(certCopy);
  const recalculatedHash = crypto
    .createHash('sha256')
    .update(contentToHash)
    .digest('hex');

  if (recalculatedHash !== certificate.certificate_hash) {
    errors.push('Certificate hash verification failed - certificate may have been tampered with');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format certificate for display
 */
export function formatCertificate(cert: PackCertificate): string {
  const levelBadge =
    cert.certification_level >= CertificationLevel.PRODUCTION ? '★★' :
    cert.certification_level >= CertificationLevel.CERTIFIED ? '★' :
    cert.certification_level >= CertificationLevel.TESTED ? '✓✓' :
    cert.certification_level >= CertificationLevel.VALIDATED ? '✓' : '○';

  return `
╔═══════════════════════════════════════════════════════════════╗
║                      PACK CERTIFICATE                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Pack:         ${cert.pack_id.padEnd(47)}║
║  Version:      ${cert.pack_version.padEnd(47)}║
║  Level:        ${levelBadge} ${cert.certification_level_name.padEnd(44)}║
║  Certified:    ${cert.certified_at.substring(0, 19).padEnd(47)}║
║  Certified By: ${cert.certified_by.padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  CRITERIA SUMMARY                                             ║
║    Passed: ${cert.criteria_summary.passed}/${cert.criteria_summary.total_criteria}                                                  ║
║    Blockers: ${cert.criteria_summary.blockers_passed ? '✓ All passed' : '✗ Some failed'.padEnd(50)}║
║    Automated: ${cert.criteria_summary.automated_checks_passed ? '✓ Passed' : '✗ Failed'.padEnd(49)}║
║    Manual: ${cert.criteria_summary.manual_review_complete ? '✓ Complete' : '○ Pending'.padEnd(51)}║
╠═══════════════════════════════════════════════════════════════╣
║  COMPATIBILITY                                                ║
║    Min Profile: ${cert.risk_profile_compat.min_profile_level.padEnd(46)}║
║    Mandatory Actions: ${cert.risk_profile_compat.mandatory_action_count.toString().padEnd(41)}║
║    Sealed Bundles: ${cert.risk_profile_compat.produces_sealed_bundles ? 'Yes' : 'No'.padEnd(44)}║
╠═══════════════════════════════════════════════════════════════╣
║  Pack Hash:    ${cert.pack_hash.substring(0, 32)}...             ║
║  Cert Hash:    ${cert.certificate_hash.substring(0, 32)}...             ║
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

export default {
  CertificationLevel,
  CERTIFICATION_LEVEL_NAMES,
  CERTIFICATION_LEVEL_DESCRIPTIONS,
  CERTIFICATION_CRITERIA,
  runAutomatedChecks,
  calculateCertificationLevel,
  getCriteriaForLevel,
  getMissingCriteria,
  createCertificationRecord,
  certificationSummary,
  // Portable certificate functions (v1.1.0)
  createPackCertificate,
  verifyPackCertificate,
  formatCertificate
};
