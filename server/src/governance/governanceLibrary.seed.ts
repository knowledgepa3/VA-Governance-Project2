/**
 * Governance Library Seed — NIST SP 800-53 Base Pack
 *
 * Seeds the initial governance library with real NIST 800-53 Rev. 5 controls.
 * Data sourced from existing FrameworkControlMapping.ts — 16 controls across
 * 6 control families (AC, AU, CA, CM, IR, RA).
 *
 * Also seeds:
 * - Evidence templates for each control
 * - Approval role taxonomy (5 roles matching existing RBAC)
 *
 * Called via POST /api/governance/seed or during tenant onboarding.
 * Idempotent — skips if already seeded.
 */

import * as store from './governanceLibrary.store';
import { hashPolicy } from './governanceLibrary.schema';
import { ALL_EXPANDED_CONTROLS } from './seeds';

// ═══════════════════════════════════════════════════════════════════
// NIST 800-53 CONTROL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

interface ControlSeed {
  policyId: string;
  controlFamily: string;
  title: string;
  description: string;
  requirements: { requirementId: string; description: string; checkType: 'automated' | 'manual' | 'evidence'; isMandatory: boolean }[];
  evidenceArtifacts: string[];
  riskLevel: string;
  maiLevel: string;
  implementationStatus: string;
  applicableWorkerTypes: string[];
  evidenceTemplates: { templateId: string; name: string; templateType: string; isRequired: boolean }[];
}

const NIST_CONTROLS: ControlSeed[] = [
  // ═══════════════════════════════════════════════════════════════
  // AC — Access Control Family
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-AC-1',
    controlFamily: 'AC',
    title: 'Access Control — Policy and Procedures',
    description: 'Defines organizational access policy through risk profiles, job pack permissions, and MAI authority levels.',
    requirements: [
      { requirementId: 'AC-1-R1', description: 'RiskProfile.appetite defines organizational access policy', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-1-R2', description: 'Job Pack permissions.forbidden defines prohibited actions at runtime', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-1-R3', description: 'MAI levels (Mandatory/Advisory/Informational) define access tiers', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['RiskProfile JSON (versioned, hash-verified)', 'Job Pack permission blocks', 'Profile change audit log'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AC-1-ET1', name: 'Risk Profile Configuration', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'AC-1-ET2', name: 'Permission Block Snapshot', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AC-2',
    controlFamily: 'AC',
    title: 'Access Control — Account Management',
    description: 'Controls session use, account modifications, and account creation through auth policies and forbidden actions.',
    requirements: [
      { requirementId: 'AC-2-R1', description: 'auth_policy.allow_authenticated_sessions controls session use', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-2-R2', description: 'auth_policy.allow_account_modifications prevents account changes', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-2-R3', description: 'Forbidden action: create_account blocks at runtime', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Risk appetite auth_policy configuration', 'Execution logs showing blocked account creation attempts', 'Escalation records for auth-related triggers'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['gateway'],
    evidenceTemplates: [
      { templateId: 'AC-2-ET1', name: 'Auth Policy Configuration', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'AC-2-ET2', name: 'Blocked Action Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AC-3',
    controlFamily: 'AC',
    title: 'Access Control — Access Enforcement',
    description: 'Runtime enforcement of permissions through permission checks before every action and MAI boundary validation.',
    requirements: [
      { requirementId: 'AC-3-R1', description: 'Permission check enforced before every action', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-3-R2', description: 'isActionAllowed() validates against MAI boundaries at runtime', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-3-R3', description: 'Permission check results logged in extraction log', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Permission check implementation', 'Execution logs with permission check results', 'Blocked action records'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AC-3-ET1', name: 'Permission Check Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'AC-3-ET2', name: 'Blocked Action Record', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AC-6',
    controlFamily: 'AC',
    title: 'Access Control — Least Privilege',
    description: 'Job Packs define minimum necessary permissions. INFORMATIONAL is read-only by default. MANDATORY requires human approval.',
    requirements: [
      { requirementId: 'AC-6-R1', description: 'Job Packs define minimum necessary permissions per task', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-6-R2', description: 'INFORMATIONAL level is read-only by default, enforced at runtime', checkType: 'automated', isMandatory: true },
      { requirementId: 'AC-6-R3', description: 'MANDATORY actions require explicit human approval before execution', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Job Pack permissions.allowed (minimal set)', 'MAI profile showing action distribution', 'Human approval records for MANDATORY actions'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AC-6-ET1', name: 'Permission Minimal Set', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'AC-6-ET2', name: 'Human Approval Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // AU — Audit and Accountability Family
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-AU-2',
    controlFamily: 'AU',
    title: 'Audit — Event Logging',
    description: 'Every action captured with timestamp in extraction logs. Evidence bundles record all state changes. Profile changes tracked with attribution.',
    requirements: [
      { requirementId: 'AU-2-R1', description: 'Extraction log captures every action with timestamp', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-2-R2', description: 'Evidence bundle records all state changes with artifacts', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AU-2-R3', description: 'Profile change log tracks configuration changes with attribution', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Extraction log in evidence bundle', 'Profile audit change log array', 'Timestamped action records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: ['telemetry'],
    evidenceTemplates: [
      { templateId: 'AU-2-ET1', name: 'Extraction Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'AU-2-ET2', name: 'Evidence Bundle', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AU-3',
    controlFamily: 'AU',
    title: 'Audit — Content of Audit Records',
    description: 'Each log entry includes timestamp, action, result, duration, actor. Source context captures tool identity. Manifest records artifact hashes.',
    requirements: [
      { requirementId: 'AU-3-R1', description: 'Each log entry includes: timestamp, action, result, duration, actor', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AU-3-R2', description: 'Source context captures tool identity and access mode', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AU-3-R3', description: 'Manifest records artifact hashes for integrity verification', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Extraction log entry structure', 'Source context fields', 'Manifest artifact hashes'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: ['telemetry'],
    evidenceTemplates: [
      { templateId: 'AU-3-ET1', name: 'Audit Record Structure Proof', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'AU-3-ET2', name: 'Manifest Hash Proof', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AU-6',
    controlFamily: 'AU',
    title: 'Audit — Audit Record Review',
    description: 'Hash integrity validated before use. Sealed bundles are immutable. Periodic review schedule enforced.',
    requirements: [
      { requirementId: 'AU-6-R1', description: 'Hash integrity validated before evidence bundle use', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-6-R2', description: 'Sealed bundles cannot be modified post-seal (state machine)', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-6-R3', description: 'Review frequency enforces periodic review schedule', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Bundle verification output', 'Seal status in manifest', 'Review schedule in profile metadata'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['validator'],
    evidenceTemplates: [
      { templateId: 'AU-6-ET1', name: 'Bundle Verification Report', templateType: 'HASH_PROOF', isRequired: true },
      { templateId: 'AU-6-ET2', name: 'Seal Immutability Proof', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AU-9',
    controlFamily: 'AU',
    title: 'Audit — Protection of Audit Information',
    description: 'SHA-256 hashes detect tampering. Seal state machine prevents modification. Pack hash links execution to specific profile version.',
    requirements: [
      { requirementId: 'AU-9-R1', description: 'SHA-256 hashes detect tampering (verification fails on mismatch)', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-9-R2', description: 'Seal state machine prevents post-hoc modification', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-9-R3', description: 'Pack hash links execution to specific profile version', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Manifest hash values', 'Seal pack hash linking to profile', 'Hash verification failure logs'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AU-9-ET1', name: 'Hash Chain Verification', templateType: 'HASH_PROOF', isRequired: true },
      { templateId: 'AU-9-ET2', name: 'Tamper Detection Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AU-11',
    controlFamily: 'AU',
    title: 'Audit — Audit Record Retention',
    description: 'Evidence retention policy configurable per risk profile. Standard: 30 days, Escalated: 90 days.',
    requirements: [
      { requirementId: 'AU-11-R1', description: 'Evidence retention policy defined in job pack', checkType: 'automated', isMandatory: true },
      { requirementId: 'AU-11-R2', description: 'Retention periods: Standard 30 days, Escalated 90 days (configurable)', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['Job Pack evidence retention policy', 'Archived evidence bundles with retention metadata'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: ['telemetry'],
    evidenceTemplates: [
      { templateId: 'AU-11-ET1', name: 'Retention Policy Config', templateType: 'DOCUMENT', isRequired: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CA — Assessment, Authorization, and Monitoring
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-CA-2',
    controlFamily: 'CA',
    title: 'Assessment — Control Assessments',
    description: 'Automated validation of risk profiles, job packs, and evidence bundles before use.',
    requirements: [
      { requirementId: 'CA-2-R1', description: 'Risk profile validated for completeness before use', checkType: 'automated', isMandatory: true },
      { requirementId: 'CA-2-R2', description: 'Job pack structure validated before registration', checkType: 'automated', isMandatory: true },
      { requirementId: 'CA-2-R3', description: 'Evidence bundle validated before sealing', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Validation function outputs', 'Profile validation results', 'Pack registration logs'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['validator', 'compliance'],
    evidenceTemplates: [
      { templateId: 'CA-2-ET1', name: 'Validation Results', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'CA-2-ET2', name: 'Assessment Attestation', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CA-7',
    controlFamily: 'CA',
    title: 'Assessment — Continuous Monitoring',
    description: 'Real-time escalation triggers halt execution on detection. Confidence thresholds monitored per field. Anomaly detection flags unusual patterns.',
    requirements: [
      { requirementId: 'CA-7-R1', description: 'Real-time escalation triggers halt execution on detection', checkType: 'automated', isMandatory: true },
      { requirementId: 'CA-7-R2', description: 'Confidence thresholds monitored and recorded per field', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CA-7-R3', description: 'Anomaly detection flags unusual patterns', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['Escalation trigger logs', 'Field confidence scores', 'Anomaly detection alerts'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CA-7-ET1', name: 'Escalation Trigger Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'CA-7-ET2', name: 'Confidence Score Report', templateType: 'DOCUMENT', isRequired: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CM — Configuration Management
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-CM-2',
    controlFamily: 'CM',
    title: 'Configuration — Baseline Configuration',
    description: 'Preset profiles define baselines. Profile versioning tracks deviations. Registry index maintains pack inventory.',
    requirements: [
      { requirementId: 'CM-2-R1', description: 'Preset profiles (Conservative/Balanced/Aggressive) define baselines', checkType: 'automated', isMandatory: true },
      { requirementId: 'CM-2-R2', description: 'Profile version tracks deviations from baseline', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CM-2-R3', description: 'Registry index maintains pack inventory with hashes', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Preset profile definitions', 'Profile version field', 'Registry index'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CM-2-ET1', name: 'Baseline Configuration Snapshot', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CM-3',
    controlFamily: 'CM',
    title: 'Configuration — Change Control',
    description: 'Profile change log records all modifications with attribution. Hash chain enables verification.',
    requirements: [
      { requirementId: 'CM-3-R1', description: 'Change log records all modifications with who/when/what/why', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CM-3-R2', description: 'Previous version hash enables chain verification', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Profile change entry records', 'Previous version hash chain', 'Change attribution fields'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CM-3-ET1', name: 'Change Log Entry', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'CM-3-ET2', name: 'Hash Chain Proof', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CM-6',
    controlFamily: 'CM',
    title: 'Configuration — Configuration Settings',
    description: 'Risk appetite, tolerance, and profile scope define allowed operational parameters.',
    requirements: [
      { requirementId: 'CM-6-R1', description: 'Risk appetite defines allowed settings', checkType: 'automated', isMandatory: true },
      { requirementId: 'CM-6-R2', description: 'Risk tolerance defines operational parameters', checkType: 'automated', isMandatory: true },
      { requirementId: 'CM-6-R3', description: 'Profile scope limits where settings apply', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['RiskAppetite configuration', 'RiskTolerance parameters', 'Profile scope definition'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CM-6-ET1', name: 'Configuration Settings Export', templateType: 'DOCUMENT', isRequired: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // IR — Incident Response
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-IR-4',
    controlFamily: 'IR',
    title: 'Incident Response — Incident Handling',
    description: 'Escalation triggers define incident detection. Stop-and-ask halts execution. Evidence captured for incidents.',
    requirements: [
      { requirementId: 'IR-4-R1', description: 'Escalation triggers define incident detection criteria', checkType: 'automated', isMandatory: true },
      { requirementId: 'IR-4-R2', description: 'stop_and_ask action halts execution for human intervention', checkType: 'automated', isMandatory: true },
      { requirementId: 'IR-4-R3', description: 'capture_evidence action preserves incident context', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Escalation trigger definitions', 'Escalation logs', 'Incident evidence bundles'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IR-4-ET1', name: 'Incident Detection Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'IR-4-ET2', name: 'Incident Evidence Bundle', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'IR-4-ET3', name: 'Human Intervention Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IR-6',
    controlFamily: 'IR',
    title: 'Incident Response — Incident Reporting',
    description: 'Escalated bundles flagged with severity. Extended retention for incidents. Evidence bundle provides full incident context.',
    requirements: [
      { requirementId: 'IR-6-R1', description: 'Escalated bundles flagged with severity level', checkType: 'evidence', isMandatory: true },
      { requirementId: 'IR-6-R2', description: 'Retention policy extended for escalated incidents', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['Escalation severity in logs', 'Extended retention bundles', 'Incident summary in manifest'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: ['telemetry'],
    evidenceTemplates: [
      { templateId: 'IR-6-ET1', name: 'Incident Severity Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // RA — Risk Assessment
  // ═══════════════════════════════════════════════════════════════
  {
    policyId: 'NIST-RA-1',
    controlFamily: 'RA',
    title: 'Risk Assessment — Policy and Procedures',
    description: 'RiskAppetite is organizational policy on acceptable risk. RiskTolerance defines operational deviation parameters.',
    requirements: [
      { requirementId: 'RA-1-R1', description: 'RiskAppetite defines organizational policy on acceptable risk', checkType: 'manual', isMandatory: true },
      { requirementId: 'RA-1-R2', description: 'RiskTolerance defines operational deviation parameters', checkType: 'manual', isMandatory: true },
      { requirementId: 'RA-1-R3', description: 'Profile presets provide starting points for policy', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['RiskProfile documentation', 'Preset definitions', 'Profile approval records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'RA-1-ET1', name: 'Risk Profile Documentation', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'RA-1-ET2', name: 'Profile Approval Record', templateType: 'APPROVAL_RECORD', isRequired: false },
    ],
  },
  {
    policyId: 'NIST-RA-3',
    controlFamily: 'RA',
    title: 'Risk Assessment — Risk Assessment',
    description: 'Profile comparison identifies risk impact of changes. Framework mappings enable compliance assessment.',
    requirements: [
      { requirementId: 'RA-3-R1', description: 'compareProfiles() identifies risk impact of changes', checkType: 'automated', isMandatory: true },
      { requirementId: 'RA-3-R2', description: 'risk_impact field flags INCREASES_RISK changes', checkType: 'evidence', isMandatory: true },
      { requirementId: 'RA-3-R3', description: 'Framework mappings enable compliance assessment', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Profile comparison diffs', 'Risk impact analysis', 'Framework mapping documentation'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: ['compliance'],
    evidenceTemplates: [
      { templateId: 'RA-3-ET1', name: 'Risk Impact Analysis', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'RA-3-ET2', name: 'Framework Mapping Report', templateType: 'DOCUMENT', isRequired: false },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// APPROVAL ROLES
// ═══════════════════════════════════════════════════════════════════

const APPROVAL_ROLES = [
  {
    roleName: 'ISSO / ACE Architect',
    description: 'Information System Security Officer — full governance authority. Can approve all risk levels, MAI levels, and control families.',
    canApproveRiskLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    canApproveMaiLevels: ['INFORMATIONAL', 'ADVISORY', 'MANDATORY'],
    canApproveControlFamilies: ['AC', 'AU', 'CA', 'CM', 'IR', 'RA'],
    requiresMfa: true,
  },
  {
    roleName: 'Chief Compliance Officer',
    description: 'Senior compliance authority. Can approve HIGH/CRITICAL risk and MANDATORY actions.',
    canApproveRiskLevels: ['MEDIUM', 'HIGH', 'CRITICAL'],
    canApproveMaiLevels: ['ADVISORY', 'MANDATORY'],
    canApproveControlFamilies: ['AC', 'AU', 'CA', 'CM', 'IR', 'RA'],
    requiresMfa: true,
  },
  {
    roleName: 'Federal Auditor',
    description: 'External audit authority. Can approve HIGH risk controls for audit verification. CRITICAL requires ISSO co-approval.',
    canApproveRiskLevels: ['LOW', 'MEDIUM', 'HIGH'],
    canApproveMaiLevels: ['INFORMATIONAL', 'ADVISORY', 'MANDATORY'],
    canApproveControlFamilies: ['AU', 'CA', 'CM', 'RA'],
    requiresMfa: false,
  },
  {
    roleName: 'Governance Reviewer',
    description: 'Standard governance reviewer. Can approve LOW/MEDIUM risk and ADVISORY actions.',
    canApproveRiskLevels: ['LOW', 'MEDIUM'],
    canApproveMaiLevels: ['INFORMATIONAL', 'ADVISORY'],
    canApproveControlFamilies: ['CM', 'RA'],
    requiresMfa: false,
  },
  {
    roleName: 'Security Analyst',
    description: 'Junior security role. Can approve LOW risk INFORMATIONAL actions only.',
    canApproveRiskLevels: ['LOW'],
    canApproveMaiLevels: ['INFORMATIONAL'],
    canApproveControlFamilies: ['AU'],
    requiresMfa: false,
  },
];

// ═══════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════

export async function seedGovernanceLibrary(tenantId: string): Promise<{
  packId: string;
  policiesCreated: number;
  templatesCreated: number;
  rolesCreated: number;
}> {
  // Check if already seeded
  const alreadySeeded = await store.isSeeded(tenantId);
  if (alreadySeeded) {
    const existing = await store.getPackByPackId('nist-800-53-base', tenantId);
    return {
      packId: existing?.id || '',
      policiesCreated: 0,
      templatesCreated: 0,
      rolesCreated: 0,
    };
  }

  console.log(`[GOVERNANCE] Seeding Governance Library for tenant: ${tenantId}`);

  // 1. Create the base pack
  const pack = await store.createPack({
    packId: 'nist-800-53-base',
    name: 'NIST SP 800-53 Rev. 5 Base Pack',
    description: 'GIA base governance pack implementing NIST SP 800-53 security controls across 6 families: Access Control, Audit, Assessment, Configuration, Incident Response, and Risk Assessment.',
    packType: 'BASE',
    sourceFramework: 'NIST_800_53',
    version: '1.0.0',
    priority: 10,
    metadata: {
      createdBy: 'SYSTEM',
      certificationLevel: 3,
    },
  }, tenantId);

  console.log(`[GOVERNANCE] Created base pack: ${pack.id}`);

  // 2. Create policies
  let policiesCreated = 0;
  let templatesCreated = 0;

  for (const control of NIST_CONTROLS) {
    // Calculate content hash
    const contentHash = hashPolicy({
      policyId: control.policyId,
      tenantId,
      packId: pack.id,
      controlFamily: control.controlFamily,
      title: control.title,
      description: control.description,
      requirements: control.requirements,
      evidenceRequired: control.evidenceTemplates.map(t => ({
        templateId: t.templateId,
        name: t.name,
        templateType: t.templateType as any,
        isRequired: t.isRequired,
      })),
      approvalRoles: control.maiLevel === 'MANDATORY'
        ? ['ISSO / ACE Architect', 'Chief Compliance Officer']
        : control.maiLevel === 'ADVISORY'
          ? ['ISSO / ACE Architect', 'Governance Reviewer']
          : ['Security Analyst'],
      riskLevel: control.riskLevel as any,
      maiLevel: control.maiLevel as any,
      applicableWorkerTypes: control.applicableWorkerTypes,
      applicableDomains: [],
      implementationStatus: control.implementationStatus as any,
      frameworkRefs: [{
        framework: 'NIST_800_53',
        controlId: control.policyId.replace('NIST-', ''),
        controlName: control.title.split(' — ')[1] || control.title,
      }],
      isActive: true,
    });

    const policy = await store.createPolicy({
      policyId: control.policyId,
      packId: pack.id,
      controlFamily: control.controlFamily,
      title: control.title,
      description: control.description,
      requirements: control.requirements,
      evidenceRequired: control.evidenceTemplates.map(t => ({
        templateId: t.templateId,
        name: t.name,
        templateType: t.templateType,
        isRequired: t.isRequired,
      })),
      approvalRoles: control.maiLevel === 'MANDATORY'
        ? ['ISSO / ACE Architect', 'Chief Compliance Officer']
        : control.maiLevel === 'ADVISORY'
          ? ['ISSO / ACE Architect', 'Governance Reviewer']
          : ['Security Analyst'],
      riskLevel: control.riskLevel,
      maiLevel: control.maiLevel,
      applicableWorkerTypes: control.applicableWorkerTypes,
      applicableDomains: [],
      implementationStatus: control.implementationStatus,
      frameworkRefs: [{
        framework: 'NIST_800_53',
        controlId: control.policyId.replace('NIST-', ''),
        controlName: control.title.split(' — ')[1] || control.title,
      }],
      metadata: {
        version: '1.0.0',
        createdBy: 'SYSTEM',
        sourceFramework: 'NIST_800_53',
        effectiveDate: new Date().toISOString(),
      },
      contentHash,
    }, tenantId);

    policiesCreated++;

    // 3. Create evidence templates for this policy
    for (const tmpl of control.evidenceTemplates) {
      await store.createEvidenceTemplate({
        templateId: tmpl.templateId,
        policyId: policy.id,
        name: tmpl.name,
        description: `Evidence template for ${control.policyId}: ${tmpl.name}`,
        templateType: tmpl.templateType,
        isRequired: tmpl.isRequired,
      }, tenantId);
      templatesCreated++;
    }
  }

  // 4. Update pack counts
  await store.updatePackCounts(pack.id, tenantId);

  // 5. Create approval roles
  let rolesCreated = 0;
  for (const role of APPROVAL_ROLES) {
    const created = await store.createApprovalRole(role, tenantId);
    if (created) rolesCreated++;
  }

  console.log(`[GOVERNANCE] Seed complete: ${policiesCreated} policies, ${templatesCreated} templates, ${rolesCreated} roles`);

  return {
    packId: pack.id,
    policiesCreated,
    templatesCreated,
    rolesCreated,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPANDED LIBRARY SEED — 14 additional NIST 800-53 families
// ═══════════════════════════════════════════════════════════════════

const EXPANDED_APPROVAL_ROLES_UPDATE = [
  'AT', 'IA', 'MA', 'MP', 'PE', 'PL', 'PM', 'PS',
  'SA', 'SC', 'SI', 'CP', 'PT', 'SR',
];

export async function seedExpandedLibrary(tenantId: string): Promise<{
  packId: string;
  policiesCreated: number;
  templatesCreated: number;
  familiesAdded: string[];
}> {
  // Check if expanded pack already exists
  const existing = await store.getPackByPackId('nist-800-53-expanded', tenantId);
  if (existing) {
    return {
      packId: existing.id,
      policiesCreated: 0,
      templatesCreated: 0,
      familiesAdded: [],
    };
  }

  console.log(`[GOVERNANCE] Seeding Expanded Library for tenant: ${tenantId} (${ALL_EXPANDED_CONTROLS.length} controls)`);

  // 1. Create the expanded pack (INDUSTRY priority — stacks on BASE)
  const pack = await store.createPack({
    packId: 'nist-800-53-expanded',
    name: 'NIST SP 800-53 Rev. 5 — Expanded Controls',
    description: `Extended NIST 800-53 coverage: ${EXPANDED_APPROVAL_ROLES_UPDATE.length} additional control families (${EXPANDED_APPROVAL_ROLES_UPDATE.join(', ')}). Stacks on the base pack for comprehensive governance.`,
    packType: 'INDUSTRY',
    sourceFramework: 'NIST_800_53',
    version: '1.0.0',
    priority: 50,
    metadata: {
      createdBy: 'SYSTEM',
      certificationLevel: 3,
    },
  }, tenantId);

  console.log(`[GOVERNANCE] Created expanded pack: ${pack.id}`);

  // 2. Batch-create all policies
  const policyInputs = ALL_EXPANDED_CONTROLS.map(control => {
    const contentHash = hashPolicy({
      policyId: control.policyId,
      tenantId,
      packId: pack.id,
      controlFamily: control.controlFamily,
      title: control.title,
      description: control.description,
      requirements: control.requirements,
      evidenceRequired: control.evidenceTemplates.map(t => ({
        templateId: t.templateId,
        name: t.name,
        templateType: t.templateType as any,
        isRequired: t.isRequired,
      })),
      approvalRoles: control.maiLevel === 'MANDATORY'
        ? ['ISSO / ACE Architect', 'Chief Compliance Officer']
        : control.maiLevel === 'ADVISORY'
          ? ['ISSO / ACE Architect', 'Governance Reviewer']
          : ['Security Analyst'],
      riskLevel: control.riskLevel as any,
      maiLevel: control.maiLevel as any,
      applicableWorkerTypes: control.applicableWorkerTypes,
      applicableDomains: [],
      implementationStatus: control.implementationStatus as any,
      frameworkRefs: [{
        framework: 'NIST_800_53',
        controlId: control.policyId.replace('NIST-', ''),
        controlName: control.title.split(' — ')[1] || control.title,
      }],
      isActive: true,
    });

    return {
      policyId: control.policyId,
      packId: pack.id,
      controlFamily: control.controlFamily,
      title: control.title,
      description: control.description,
      requirements: control.requirements,
      evidenceRequired: control.evidenceTemplates.map(t => ({
        templateId: t.templateId,
        name: t.name,
        templateType: t.templateType,
        isRequired: t.isRequired,
      })),
      approvalRoles: control.maiLevel === 'MANDATORY'
        ? ['ISSO / ACE Architect', 'Chief Compliance Officer']
        : control.maiLevel === 'ADVISORY'
          ? ['ISSO / ACE Architect', 'Governance Reviewer']
          : ['Security Analyst'],
      riskLevel: control.riskLevel,
      maiLevel: control.maiLevel,
      applicableWorkerTypes: control.applicableWorkerTypes,
      applicableDomains: [],
      implementationStatus: control.implementationStatus,
      frameworkRefs: [{
        framework: 'NIST_800_53',
        controlId: control.policyId.replace('NIST-', ''),
        controlName: control.title.split(' — ')[1] || control.title,
      }],
      metadata: {
        version: '1.0.0',
        createdBy: 'SYSTEM',
        sourceFramework: 'NIST_800_53',
        effectiveDate: new Date().toISOString(),
      },
      contentHash,
    };
  });

  const policiesCreated = await store.createPoliciesBatch(policyInputs, tenantId);

  // 3. Create evidence templates for each control
  let templatesCreated = 0;
  // Need to fetch created policies to get their DB IDs for evidence template FK
  const createdPolicies = await store.listPolicies(tenantId, { packId: pack.id, limit: 200 });
  const policyIdMap = new Map(createdPolicies.map(p => [p.policyId, p.id]));

  for (const control of ALL_EXPANDED_CONTROLS) {
    const dbPolicyId = policyIdMap.get(control.policyId);
    if (!dbPolicyId) continue;

    for (const tmpl of control.evidenceTemplates) {
      await store.createEvidenceTemplate({
        templateId: tmpl.templateId,
        policyId: dbPolicyId,
        name: tmpl.name,
        description: `Evidence template for ${control.policyId}: ${tmpl.name}`,
        templateType: tmpl.templateType,
        isRequired: tmpl.isRequired,
      }, tenantId);
      templatesCreated++;
    }
  }

  // 4. Update pack counts
  await store.updatePackCounts(pack.id, tenantId);

  const familiesAdded = [...new Set(ALL_EXPANDED_CONTROLS.map(c => c.controlFamily))].sort();

  console.log(`[GOVERNANCE] Expanded seed complete: ${policiesCreated} policies, ${templatesCreated} templates, ${familiesAdded.length} families`);

  return {
    packId: pack.id,
    policiesCreated,
    templatesCreated,
    familiesAdded,
  };
}
