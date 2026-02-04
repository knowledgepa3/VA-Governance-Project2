#!/usr/bin/env node
/**
 * COMPLIANCE REPORT GENERATOR v1.1.0
 *
 * Generates framework compliance reports for ACE Governance Platform.
 *
 * Usage:
 *   node scripts/generate-compliance-report.js <framework> [output-file]
 *
 * Frameworks:
 *   nist    NIST SP 800-53 Rev. 5 (RMF-aligned controls)
 *   coso    COSO Enterprise Risk Management 2017
 *   iso     ISO 31000:2018 Risk Management
 *   all     Generate all framework reports
 *
 * Examples:
 *   node scripts/generate-compliance-report.js nist
 *   node scripts/generate-compliance-report.js coso compliance/coso-report.md
 *   node scripts/generate-compliance-report.js all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Implementation status - more precise than simple "IMPLEMENTED"
 *
 * ENFORCED     - Runtime gate exists that blocks non-compliant actions
 * EVIDENCED    - Artifact is produced that proves compliance
 * CONFIGURABLE - Risk profile controls this behavior
 * PARTIAL      - Exists but may not be sealed/signed/complete
 */
const STATUS_ICONS = {
  ENFORCED: '✅',
  EVIDENCED: '📋',
  CONFIGURABLE: '⚙️',
  PARTIAL: '⚠️'
};

const STATUS_DESCRIPTIONS = {
  ENFORCED: 'Runtime gate blocks non-compliant actions',
  EVIDENCED: 'Artifact produced proves compliance',
  CONFIGURABLE: 'Risk profile controls this behavior',
  PARTIAL: 'Exists but may need additional configuration'
};

// =============================================================================
// NIST SP 800-53 MAPPINGS (RMF-ALIGNED)
// =============================================================================

const NIST_SP_800_53_MAPPINGS = {
  AC: {
    'AC-1': {
      name: 'Policy and Procedures',
      implementation: [
        { status: 'CONFIGURABLE', description: 'RiskProfile.appetite defines organizational access policy' },
        { status: 'ENFORCED', description: 'Job Pack permissions.forbidden defines prohibited actions at runtime' },
        { status: 'CONFIGURABLE', description: 'MAI levels (Mandatory/Advisory/Informational) define access tiers' }
      ],
      evidence_artifacts: ['RiskProfile JSON (versioned, hash-verified)', 'Job Pack permission blocks', 'Profile change audit log']
    },
    'AC-2': {
      name: 'Account Management',
      implementation: [
        { status: 'CONFIGURABLE', description: 'auth_policy.allow_authenticated_sessions controls session use' },
        { status: 'ENFORCED', description: 'auth_policy.allow_account_modifications prevents account changes' },
        { status: 'ENFORCED', description: 'Forbidden action: create_account blocks at runtime' }
      ],
      evidence_artifacts: ['Risk appetite auth_policy configuration', 'Execution logs showing blocked account creation attempts']
    },
    'AC-3': {
      name: 'Access Enforcement',
      implementation: [
        { status: 'ENFORCED', description: 'JobPackExecutor.checkPermission() enforces before every action' },
        { status: 'ENFORCED', description: 'isActionAllowed() validates against MAI boundaries at runtime' },
        { status: 'EVIDENCED', description: 'Permission check results logged in extraction_log.json' }
      ],
      evidence_artifacts: ['JobPackExecutor.ts permission check implementation', 'Execution logs with permission check results']
    },
    'AC-6': {
      name: 'Least Privilege',
      implementation: [
        { status: 'CONFIGURABLE', description: 'Job Packs define minimum necessary permissions per task' },
        { status: 'ENFORCED', description: 'INFORMATIONAL level = read-only by default, enforced at runtime' },
        { status: 'ENFORCED', description: 'MANDATORY actions require explicit human approval before execution' }
      ],
      evidence_artifacts: ['Job Pack permissions.allowed (minimal set)', 'MAI profile showing action distribution']
    }
  },
  AU: {
    'AU-2': {
      name: 'Event Logging',
      implementation: [
        { status: 'EVIDENCED', description: 'extraction_log.json captures every action with timestamp' },
        { status: 'EVIDENCED', description: 'Evidence bundle records all state changes with artifacts' },
        { status: 'EVIDENCED', description: 'Profile change_log tracks configuration changes with attribution' }
      ],
      evidence_artifacts: ['extraction_log.json in evidence bundle', 'Profile audit.change_log array']
    },
    'AU-3': {
      name: 'Content of Audit Records',
      implementation: [
        { status: 'EVIDENCED', description: 'Each log entry includes: timestamp, action, result, duration, actor' },
        { status: 'EVIDENCED', description: 'source_context.json captures tool identity and access mode' },
        { status: 'EVIDENCED', description: 'manifest.json records artifact hashes for integrity verification' }
      ],
      evidence_artifacts: ['extraction_log.json entry structure', 'source_context.json fields', 'manifest.json artifact_hashes']
    },
    'AU-6': {
      name: 'Audit Record Review',
      implementation: [
        { status: 'ENFORCED', description: 'verifyEvidenceBundle.js validates hash integrity before use' },
        { status: 'ENFORCED', description: 'Sealed bundles cannot be modified post-seal (state machine)' },
        { status: 'CONFIGURABLE', description: 'Profile review_frequency_days enforces periodic review schedule' }
      ],
      evidence_artifacts: ['Bundle verification script output', 'Seal status in manifest.json']
    },
    'AU-9': {
      name: 'Protection of Audit Information',
      implementation: [
        { status: 'ENFORCED', description: 'SHA-256 hashes detect tampering (verification fails on mismatch)' },
        { status: 'ENFORCED', description: 'Seal state machine (UNSEALED → SEALED) prevents post-hoc modification' },
        { status: 'EVIDENCED', description: 'pack_hash links execution to specific profile version' }
      ],
      evidence_artifacts: ['manifest.json hash values', 'seal.pack_hash linking to profile']
    },
    'AU-11': {
      name: 'Audit Record Retention',
      implementation: [
        { status: 'CONFIGURABLE', description: 'evidence.retention_policy in Job Pack defines retention period' },
        { status: 'CONFIGURABLE', description: 'Standard: 30 days, Escalated: 90 days (configurable)' },
        { status: 'CONFIGURABLE', description: 'Retention policy configurable per risk profile' }
      ],
      evidence_artifacts: ['Job Pack evidence.retention_policy', 'Archived evidence bundles with retention metadata']
    }
  },
  CA: {
    'CA-2': {
      name: 'Control Assessments',
      implementation: [
        { status: 'ENFORCED', description: 'validateRiskProfile() assesses profile completeness before use' },
        { status: 'ENFORCED', description: 'validateJobPack() assesses pack structure before registration' },
        { status: 'ENFORCED', description: 'validateEvidenceBundle() assesses artifacts before sealing' }
      ],
      evidence_artifacts: ['Validation function outputs', 'Profile validation results']
    },
    'CA-7': {
      name: 'Continuous Monitoring',
      implementation: [
        { status: 'ENFORCED', description: 'Real-time escalation triggers during execution halt on detection' },
        { status: 'EVIDENCED', description: 'Confidence thresholds monitored and recorded per field' },
        { status: 'CONFIGURABLE', description: 'Anomaly detection flags unusual patterns (configurable sensitivity)' }
      ],
      evidence_artifacts: ['Escalation trigger logs', 'Field confidence scores in opportunity.json']
    }
  },
  CM: {
    'CM-2': {
      name: 'Baseline Configuration',
      implementation: [
        { status: 'CONFIGURABLE', description: 'CONSERVATIVE/BALANCED/AGGRESSIVE presets define baselines' },
        { status: 'EVIDENCED', description: 'Profile version tracks deviations from baseline' },
        { status: 'EVIDENCED', description: 'Registry index maintains pack inventory with hashes' }
      ],
      evidence_artifacts: ['Preset profile definitions', 'profile_version field', '_registry_index.json']
    },
    'CM-3': {
      name: 'Configuration Change Control',
      implementation: [
        { status: 'EVIDENCED', description: 'Profile change_log records all modifications with attribution' },
        { status: 'EVIDENCED', description: 'Each change includes: who, when, what, why, previous_hash' },
        { status: 'ENFORCED', description: 'Previous version hash enables chain verification' }
      ],
      evidence_artifacts: ['ProfileChangeEntry records', 'previous_version_hash chain']
    },
    'CM-6': {
      name: 'Configuration Settings',
      implementation: [
        { status: 'CONFIGURABLE', description: 'Risk appetite defines allowed settings' },
        { status: 'CONFIGURABLE', description: 'Risk tolerance defines operational parameters' },
        { status: 'CONFIGURABLE', description: 'Profile scope limits where settings apply' }
      ],
      evidence_artifacts: ['RiskAppetite configuration', 'RiskTolerance parameters', 'Profile scope definition']
    }
  },
  IR: {
    'IR-4': {
      name: 'Incident Handling',
      implementation: [
        { status: 'CONFIGURABLE', description: 'Escalation triggers define incident detection criteria' },
        { status: 'ENFORCED', description: 'stop_and_ask action halts execution for human intervention' },
        { status: 'EVIDENCED', description: 'capture_evidence action preserves incident context' }
      ],
      evidence_artifacts: ['Escalation trigger definitions', 'Escalation logs in extraction_log.json']
    },
    'IR-6': {
      name: 'Incident Reporting',
      implementation: [
        { status: 'EVIDENCED', description: 'Escalated bundles flagged with severity level' },
        { status: 'CONFIGURABLE', description: 'retention_policy extended for escalated incidents' },
        { status: 'EVIDENCED', description: 'Evidence bundle provides full incident context' }
      ],
      evidence_artifacts: ['Escalation severity in logs', 'Extended retention bundles']
    }
  },
  RA: {
    'RA-1': {
      name: 'Policy and Procedures',
      implementation: [
        { status: 'CONFIGURABLE', description: 'RiskAppetite = organizational policy on acceptable risk' },
        { status: 'CONFIGURABLE', description: 'RiskTolerance = operational parameters for deviation' },
        { status: 'CONFIGURABLE', description: 'Profile presets provide starting points for policy' }
      ],
      evidence_artifacts: ['RiskProfile documentation', 'Preset definitions']
    },
    'RA-3': {
      name: 'Risk Assessment',
      implementation: [
        { status: 'ENFORCED', description: 'compareProfiles() identifies risk impact of changes' },
        { status: 'EVIDENCED', description: 'risk_impact field flags INCREASES_RISK changes' },
        { status: 'EVIDENCED', description: 'Framework mappings enable compliance assessment' }
      ],
      evidence_artifacts: ['Profile comparison diffs', 'risk_impact analysis']
    }
  }
};

// =============================================================================
// COSO ERM MAPPINGS
// =============================================================================

const COSO_ERM_MAPPINGS = {
  governance_and_culture: {
    principle_1: { name: 'Exercises Board Risk Oversight', implementation: [
      { status: 'CONFIGURABLE', description: 'Risk profiles require approval by designated role' },
      { status: 'EVIDENCED', description: 'approved_by and approval_notes track oversight' },
      { status: 'CONFIGURABLE', description: 'review_frequency_days ensures periodic board review' }
    ]},
    principle_2: { name: 'Establishes Operating Structures', implementation: [
      { status: 'CONFIGURABLE', description: 'Profile scope defines organizational applicability' },
      { status: 'ENFORCED', description: 'MAI levels establish and enforce authority hierarchy' },
      { status: 'CONFIGURABLE', description: 'Job Pack roles define operational boundaries' }
    ]},
    principle_3: { name: 'Defines Desired Culture', implementation: [
      { status: 'CONFIGURABLE', description: 'Preset profiles (Conservative/Balanced/Aggressive) reflect culture' },
      { status: 'ENFORCED', description: 'globally_forbidden_actions define non-negotiable boundaries' },
      { status: 'CONFIGURABLE', description: 'Evidence requirements reflect accountability culture' }
    ]}
  },
  strategy_and_objectives: {
    principle_6: { name: 'Analyzes Business Context', implementation: [
      { status: 'CONFIGURABLE', description: 'UI map captures domain-specific context' },
      { status: 'CONFIGURABLE', description: 'url_patterns define expected business flows' },
      { status: 'CONFIGURABLE', description: 'stable_anchors map to business UI elements' }
    ]},
    principle_7: { name: 'Defines Risk Appetite', implementation: [
      { status: 'CONFIGURABLE', description: 'RiskAppetite is a first-class control object' },
      { status: 'CONFIGURABLE', description: 'job_pack_policy defines what work is acceptable' },
      { status: 'ENFORCED', description: 'action_policy enforces what actions are acceptable' },
      { status: 'CONFIGURABLE', description: 'evidence_policy defines what proof is acceptable' }
    ]},
    principle_8: { name: 'Evaluates Alternative Strategies', implementation: [
      { status: 'CONFIGURABLE', description: 'Multiple profile presets offer strategic options' },
      { status: 'EVIDENCED', description: 'compareProfiles() enables strategy comparison with impact analysis' },
      { status: 'EVIDENCED', description: 'Profile versioning allows strategy evolution tracking' }
    ]}
  },
  performance: {
    principle_10: { name: 'Identifies Risk', implementation: [
      { status: 'ENFORCED', description: 'Escalation triggers identify and halt on runtime risks' },
      { status: 'ENFORCED', description: 'forbidden actions identify and block policy risks' },
      { status: 'EVIDENCED', description: 'confidence thresholds identify data quality risks' }
    ]},
    principle_11: { name: 'Assesses Severity of Risk', implementation: [
      { status: 'CONFIGURABLE', description: 'Escalation severity levels (LOW/MEDIUM/HIGH/CRITICAL)' },
      { status: 'EVIDENCED', description: 'risk_impact analysis in profile comparisons' },
      { status: 'ENFORCED', description: 'MAI levels reflect and enforce action severity' }
    ]},
    principle_12: { name: 'Prioritizes Risks', implementation: [
      { status: 'CONFIGURABLE', description: 'critical_field_minimum vs standard_field_minimum thresholds' },
      { status: 'ENFORCED', description: 'MANDATORY actions prioritized for human oversight' },
      { status: 'CONFIGURABLE', description: 'Escalation triggers sorted by severity' }
    ]},
    principle_13: { name: 'Implements Risk Responses', implementation: [
      { status: 'ENFORCED', description: 'Escalation actions: stop_and_ask, capture_evidence, flag_for_review' },
      { status: 'ENFORCED', description: 'Retry limits control response to failures' },
      { status: 'ENFORCED', description: 'auto_stop_on_anomaly implements automatic response' }
    ]},
    principle_14: { name: 'Develops Portfolio View', implementation: [
      { status: 'EVIDENCED', description: 'Job Pack Registry provides portfolio of capabilities' },
      { status: 'EVIDENCED', description: 'by_domain, by_category indexes enable portfolio analysis' },
      { status: 'EVIDENCED', description: 'MAI profiles summarize risk across packs' }
    ]}
  },
  review_and_revision: {
    principle_16: { name: 'Assesses Substantial Change', implementation: [
      { status: 'EVIDENCED', description: 'Profile change_log tracks all changes with attribution' },
      { status: 'EVIDENCED', description: 'compareProfiles() assesses change impact' },
      { status: 'EVIDENCED', description: 'risk_impact flags substantial risk changes' }
    ]},
    principle_17: { name: 'Pursues Improvement', implementation: [
      { status: 'EVIDENCED', description: 'Profile versioning enables iterative improvement' },
      { status: 'EVIDENCED', description: 'Job Pack versioning allows SOP refinement' },
      { status: 'CONFIGURABLE', description: 'Evidence quality improves within risk envelope' }
    ]}
  },
  information_and_reporting: {
    principle_18: { name: 'Leverages Information Systems', implementation: [
      { status: 'EVIDENCED', description: 'Evidence bundles capture information systematically' },
      { status: 'ENFORCED', description: 'manifest.json provides information integrity verification' },
      { status: 'EVIDENCED', description: 'source_context.json captures information provenance' }
    ]},
    principle_19: { name: 'Communicates Risk Information', implementation: [
      { status: 'EVIDENCED', description: 'opportunity.md provides human-readable summary' },
      { status: 'EVIDENCED', description: 'Profile validation results communicate issues' },
      { status: 'EVIDENCED', description: 'Escalation notifications communicate runtime risks' }
    ]},
    principle_20: { name: 'Reports on Risk, Culture, and Performance', implementation: [
      { status: 'EVIDENCED', description: 'Execution logs report on performance' },
      { status: 'EVIDENCED', description: 'Profile presets report on risk culture' },
      { status: 'EVIDENCED', description: 'Bundle statistics report on completion rates' }
    ]}
  }
};

// =============================================================================
// ISO 31000 MAPPINGS
// =============================================================================

const ISO_31000_MAPPINGS = {
  '5.2': { name: 'Leadership and Commitment', implementation: [
    { status: 'CONFIGURABLE', description: 'Profile approval workflow ensures leadership buy-in' },
    { status: 'EVIDENCED', description: 'approved_by, approved_by_role track accountability' },
    { status: 'CONFIGURABLE', description: 'review_frequency_days enforces ongoing commitment' }
  ]},
  '5.4': { name: 'Organizational Integration', implementation: [
    { status: 'CONFIGURABLE', description: 'Profile scope integrates with org structure' },
    { status: 'CONFIGURABLE', description: 'entity_ids link to organizational units' },
    { status: 'CONFIGURABLE', description: 'environments control deployment contexts' }
  ]},
  '6.3': { name: 'Scope, Context and Criteria', implementation: [
    { status: 'CONFIGURABLE', description: 'RiskAppetite defines criteria for acceptable risk' },
    { status: 'CONFIGURABLE', description: 'RiskTolerance defines criteria for deviation' },
    { status: 'CONFIGURABLE', description: 'Profile scope defines organizational context' }
  ]},
  '6.4': { name: 'Risk Assessment', implementation: [
    { status: 'ENFORCED', description: 'validateRiskProfile() assesses profile risks before use' },
    { status: 'EVIDENCED', description: 'compareProfiles() assesses change risks with impact' },
    { status: 'EVIDENCED', description: 'Confidence thresholds assess data risks per field' }
  ]},
  '6.5': { name: 'Risk Treatment', implementation: [
    { status: 'ENFORCED', description: 'MAI levels determine and enforce treatment approach' },
    { status: 'ENFORCED', description: 'Escalation actions implement treatment responses' },
    { status: 'EVIDENCED', description: 'Evidence requirements support treatment verification' }
  ]},
  '6.6': { name: 'Monitoring and Review', implementation: [
    { status: 'ENFORCED', description: 'Real-time escalation monitoring during execution' },
    { status: 'CONFIGURABLE', description: 'review_frequency_days enforces periodic review' },
    { status: 'EVIDENCED', description: 'change_log enables audit review' }
  ]},
  '6.7': { name: 'Recording and Reporting', implementation: [
    { status: 'EVIDENCED', description: 'Evidence bundles record all activities' },
    { status: 'EVIDENCED', description: 'manifest.json reports on bundle integrity' },
    { status: 'EVIDENCED', description: 'extraction_log.json reports on execution details' }
  ]}
};

// =============================================================================
// UTILITIES
// =============================================================================

function colorize(text, color) {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function summarizeStatus(implementations) {
  const statuses = implementations.map(i => i.status);

  if (statuses.every(s => s === 'ENFORCED')) return '✅ ENFORCED';
  if (statuses.every(s => s === 'EVIDENCED')) return '📋 EVIDENCED';
  if (statuses.every(s => s === 'CONFIGURABLE')) return '⚙️ CONFIGURABLE';

  // Mixed - show primary
  const counts = { ENFORCED: 0, EVIDENCED: 0, CONFIGURABLE: 0, PARTIAL: 0 };
  statuses.forEach(s => counts[s]++);

  const parts = [];
  if (counts.ENFORCED > 0) parts.push(`✅ ${counts.ENFORCED} ENFORCED`);
  if (counts.EVIDENCED > 0) parts.push(`📋 ${counts.EVIDENCED} EVIDENCED`);
  if (counts.CONFIGURABLE > 0) parts.push(`⚙️ ${counts.CONFIGURABLE} CONFIGURABLE`);
  if (counts.PARTIAL > 0) parts.push(`⚠️ ${counts.PARTIAL} PARTIAL`);

  return parts.join(' / ');
}

// =============================================================================
// REPORT GENERATORS
// =============================================================================

function generateNISTReport() {
  const familyNames = {
    AC: 'Access Control',
    AU: 'Audit and Accountability',
    CA: 'Assessment, Authorization, and Monitoring',
    CM: 'Configuration Management',
    IR: 'Incident Response',
    RA: 'Risk Assessment'
  };

  // Count controls and statuses
  let totalControls = 0;
  let enforced = 0;
  let evidenced = 0;
  let configurable = 0;

  for (const controls of Object.values(NIST_SP_800_53_MAPPINGS)) {
    for (const control of Object.values(controls)) {
      totalControls++;
      control.implementation.forEach(i => {
        if (i.status === 'ENFORCED') enforced++;
        if (i.status === 'EVIDENCED') evidenced++;
        if (i.status === 'CONFIGURABLE') configurable++;
      });
    }
  }

  let md = `# NIST SP 800-53 Rev. 5 Compliance Mapping (RMF-Aligned)

**Platform:** ACE Governance Platform
**Generated:** ${new Date().toISOString()}
**Standard:** NIST SP 800-53 Rev. 5 (Security and Privacy Controls)
**Process:** NIST Risk Management Framework (RMF)

---

## Important Distinction

- **NIST RMF** = the *process* (Categorize → Select → Implement → Assess → Authorize → Monitor)
- **NIST SP 800-53** = the *controls* (AC, AU, CA, CM, IR, RA families)

This document maps ACE controls to **SP 800-53 controls** that organizations select and implement as part of the **RMF process**.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Controls Mapped | ${totalControls} |
| Implementation Points | ${enforced + evidenced + configurable} |
| ✅ ENFORCED (Runtime Gates) | ${enforced} |
| 📋 EVIDENCED (Artifacts Produced) | ${evidenced} |
| ⚙️ CONFIGURABLE (Profile-Controlled) | ${configurable} |

### Control Families

| Family | Description | Controls |
|--------|-------------|----------|
`;

  for (const [family, controls] of Object.entries(NIST_SP_800_53_MAPPINGS)) {
    md += `| ${family} | ${familyNames[family]} | ${Object.keys(controls).length} |\n`;
  }

  md += `
---

## Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| ENFORCED | ✅ | Runtime gate exists that blocks non-compliant actions |
| EVIDENCED | 📋 | Artifact is produced that proves compliance |
| CONFIGURABLE | ⚙️ | Risk profile controls this behavior |
| PARTIAL | ⚠️ | Exists but may need additional configuration |

---

`;

  for (const [family, controls] of Object.entries(NIST_SP_800_53_MAPPINGS)) {
    md += `## ${family} - ${familyNames[family]}\n\n`;

    for (const [controlId, control] of Object.entries(controls)) {
      const statusSummary = summarizeStatus(control.implementation);
      md += `### ${controlId}: ${control.name}\n\n`;
      md += `**Status:** ${statusSummary}\n\n`;

      md += `#### Implementation Details\n\n`;
      md += `| Status | Description |\n`;
      md += `|--------|-------------|\n`;
      for (const impl of control.implementation) {
        md += `| ${STATUS_ICONS[impl.status]} ${impl.status} | ${impl.description} |\n`;
      }
      md += `\n`;

      if (control.evidence_artifacts && control.evidence_artifacts.length > 0) {
        md += `#### Evidence Artifacts\n\n`;
        for (const artifact of control.evidence_artifacts) {
          md += `- \`${artifact}\`\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    }
  }

  return md;
}

function generateCOSOReport() {
  const componentNames = {
    governance_and_culture: 'Governance and Culture',
    strategy_and_objectives: 'Strategy and Objective-Setting',
    performance: 'Performance',
    review_and_revision: 'Review and Revision',
    information_and_reporting: 'Information, Communication, and Reporting'
  };

  let md = `# COSO Enterprise Risk Management (ERM) Compliance Mapping

**Platform:** ACE Governance Platform
**Generated:** ${new Date().toISOString()}
**Framework:** COSO ERM 2017

---

## Executive Summary

This document maps ACE Governance Platform controls to COSO ERM principles across all five components.

### Component Coverage

| Component | Principles Mapped |
|-----------|-------------------|
`;

  for (const [component, principles] of Object.entries(COSO_ERM_MAPPINGS)) {
    md += `| ${componentNames[component]} | ${Object.keys(principles).length} |\n`;
  }

  md += `
---

## Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| ENFORCED | ✅ | Runtime gate exists that blocks non-compliant actions |
| EVIDENCED | 📋 | Artifact is produced that proves compliance |
| CONFIGURABLE | ⚙️ | Risk profile controls this behavior |

---

`;

  for (const [component, principles] of Object.entries(COSO_ERM_MAPPINGS)) {
    md += `## ${componentNames[component]}\n\n`;

    for (const [principleKey, principle] of Object.entries(principles)) {
      const num = principleKey.replace('principle_', '');
      const statusSummary = summarizeStatus(principle.implementation);

      md += `### Principle ${num}: ${principle.name}\n\n`;
      md += `**Status:** ${statusSummary}\n\n`;

      md += `| Status | Description |\n`;
      md += `|--------|-------------|\n`;
      for (const impl of principle.implementation) {
        md += `| ${STATUS_ICONS[impl.status]} ${impl.status} | ${impl.description} |\n`;
      }
      md += `\n---\n\n`;
    }
  }

  return md;
}

function generateISOReport() {
  let md = `# ISO 31000:2018 Risk Management Compliance Mapping

**Platform:** ACE Governance Platform
**Generated:** ${new Date().toISOString()}
**Standard:** ISO 31000:2018

---

## Executive Summary

This document maps ACE Governance Platform controls to ISO 31000 risk management process clauses.

### Clause Coverage

| Clause | Process | Status |
|--------|---------|--------|
`;

  for (const [clause, mapping] of Object.entries(ISO_31000_MAPPINGS)) {
    const statusSummary = summarizeStatus(mapping.implementation);
    md += `| ${clause} | ${mapping.name} | ${statusSummary.split(' ')[0]} |\n`;
  }

  md += `
---

## Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| ENFORCED | ✅ | Runtime gate exists that blocks non-compliant actions |
| EVIDENCED | 📋 | Artifact is produced that proves compliance |
| CONFIGURABLE | ⚙️ | Risk profile controls this behavior |

---

`;

  for (const [clause, mapping] of Object.entries(ISO_31000_MAPPINGS)) {
    const statusSummary = summarizeStatus(mapping.implementation);

    md += `## Clause ${clause}: ${mapping.name}\n\n`;
    md += `**Status:** ${statusSummary}\n\n`;

    md += `| Status | Description |\n`;
    md += `|--------|-------------|\n`;
    for (const impl of mapping.implementation) {
      md += `| ${STATUS_ICONS[impl.status]} ${impl.status} | ${impl.description} |\n`;
    }
    md += `\n---\n\n`;
  }

  return md;
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
const framework = args[0]?.toLowerCase();
const outputFile = args[1];

if (!framework || ['help', '-h', '--help'].includes(framework)) {
  console.log(`
${colorize('COMPLIANCE REPORT GENERATOR v1.1.0', 'bold')}

Usage: node scripts/generate-compliance-report.js <framework> [output-file]

${colorize('Frameworks:', 'cyan')}
  nist    NIST SP 800-53 Rev. 5 (RMF-aligned controls)
  coso    COSO Enterprise Risk Management 2017
  iso     ISO 31000:2018 Risk Management
  all     Generate all framework reports

${colorize('Status Types:', 'cyan')}
  ✅ ENFORCED     Runtime gate blocks non-compliant actions
  📋 EVIDENCED    Artifact produced proves compliance
  ⚙️ CONFIGURABLE Risk profile controls this behavior
  ⚠️ PARTIAL      Exists but may need additional configuration

${colorize('Examples:', 'cyan')}
  node scripts/generate-compliance-report.js nist
  node scripts/generate-compliance-report.js coso compliance/coso-report.md
  node scripts/generate-compliance-report.js all
`);
  process.exit(0);
}

// Ensure compliance directory exists
const complianceDir = path.join(__dirname, '..', 'compliance');
if (!fs.existsSync(complianceDir)) {
  fs.mkdirSync(complianceDir, { recursive: true });
}

const reports = [];

if (framework === 'nist' || framework === 'all') {
  const report = generateNISTReport();
  const filePath = outputFile || path.join(complianceDir, 'NIST-SP-800-53-Compliance.md');
  fs.writeFileSync(filePath, report);
  reports.push({ framework: 'NIST SP 800-53', file: filePath });
}

if (framework === 'coso' || framework === 'all') {
  const report = generateCOSOReport();
  const filePath = framework === 'all'
    ? path.join(complianceDir, 'COSO-ERM-Compliance.md')
    : (outputFile || path.join(complianceDir, 'COSO-ERM-Compliance.md'));
  fs.writeFileSync(filePath, report);
  reports.push({ framework: 'COSO ERM', file: filePath });
}

if (framework === 'iso' || framework === 'all') {
  const report = generateISOReport();
  const filePath = framework === 'all'
    ? path.join(complianceDir, 'ISO-31000-Compliance.md')
    : (outputFile || path.join(complianceDir, 'ISO-31000-Compliance.md'));
  fs.writeFileSync(filePath, report);
  reports.push({ framework: 'ISO 31000', file: filePath });
}

if (reports.length === 0) {
  console.log(colorize(`\nUnknown framework: ${framework}`, 'red'));
  console.log('Use: nist, coso, iso, or all\n');
  process.exit(1);
}

console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
console.log(colorize('║          COMPLIANCE REPORTS GENERATED                    ║', 'cyan'));
console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

for (const r of reports) {
  console.log(`  ${colorize('✓', 'green')} ${r.framework}`);
  console.log(`    ${r.file}\n`);
}
