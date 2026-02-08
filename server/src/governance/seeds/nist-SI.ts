/**
 * NIST 800-53 Rev. 5 — SI: System and Information Integrity
 *
 * Controls for flaw remediation, malicious code protection,
 * system monitoring, and software integrity. In GIA context:
 * input validation, output sanitization, anomaly detection,
 * and evidence integrity verification.
 */

import type { ControlSeed } from './types';

export const SI_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-SI-1',
    controlFamily: 'SI',
    title: 'System Integrity — Policy and Procedures',
    description: 'Establishes system and information integrity policy. Defines requirements for input validation, output sanitization, and integrity monitoring.',
    requirements: [
      { requirementId: 'SI-1-R1', description: 'System integrity policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'SI-1-R2', description: 'Integrity monitoring requirements defined', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['System integrity policy', 'Monitoring requirements document'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-1-ET1', name: 'Integrity Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-2',
    controlFamily: 'SI',
    title: 'System Integrity — Flaw Remediation',
    description: 'Identifies, reports, and corrects system flaws. Dependency vulnerability scanning, security patch management, and remediation tracking.',
    requirements: [
      { requirementId: 'SI-2-R1', description: 'Dependencies scanned for known vulnerabilities', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-2-R2', description: 'Critical vulnerabilities remediated within defined SLA', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Vulnerability scan reports', 'Remediation tracking records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-2-ET1', name: 'Vulnerability Scan Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-3',
    controlFamily: 'SI',
    title: 'System Integrity — Malicious Code Protection',
    description: 'Protects against malicious code. Input validation on all API endpoints, Zod schema enforcement, forbidden key scanning in worker outputs.',
    requirements: [
      { requirementId: 'SI-3-R1', description: 'All API inputs validated via Zod schemas', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-3-R2', description: 'Worker outputs scanned for forbidden keys (spawn directives)', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-3-R3', description: 'SQL injection prevented via parameterized queries', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Schema validation coverage', 'Forbidden key scan logs', 'Parameterized query patterns'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-3-ET1', name: 'Input Validation Report', templateType: 'ATTESTATION', isRequired: true },
      { templateId: 'SI-3-ET2', name: 'Forbidden Key Scan Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-4',
    controlFamily: 'SI',
    title: 'System Integrity — System Monitoring',
    description: 'Monitors system for attacks and anomalies. Storey Threshold tracks governance health. Compliance analytics detect drift. Boot health checks active.',
    requirements: [
      { requirementId: 'SI-4-R1', description: 'Storey Threshold monitored continuously', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-4-R2', description: 'Compliance drift detection active via z-score analysis', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-4-R3', description: 'System health checked at boot and on schedule', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Threshold evaluation reports', 'Drift alert history', 'Health check results'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-4-ET1', name: 'Monitoring Dashboard Report', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'SI-4-ET2', name: 'Drift Alert Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-5',
    controlFamily: 'SI',
    title: 'System Integrity — Security Alerts and Advisories',
    description: 'Receives and responds to security alerts. Operator console displays alerts with severity levels. Critical alerts require immediate action.',
    requirements: [
      { requirementId: 'SI-5-R1', description: 'Security alerts displayed in operator console', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-5-R2', description: 'Critical alerts trigger immediate notification', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Alert notification logs', 'Alert response records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-5-ET1', name: 'Alert Response Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-7',
    controlFamily: 'SI',
    title: 'System Integrity — Software and Information Integrity',
    description: 'Detects unauthorized changes. SHA-256 content hashing detects policy drift. Pack hash links execution to governance version. Sealed evidence immutable.',
    requirements: [
      { requirementId: 'SI-7-R1', description: 'Content hashing detects unauthorized policy changes', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-7-R2', description: 'Pack hash verified at governance query time', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-7-R3', description: 'Evidence seal prevents post-execution modification', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Content hash comparison reports', 'Pack hash verification logs', 'Seal integrity proofs'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-7-ET1', name: 'Integrity Verification Report', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-10',
    controlFamily: 'SI',
    title: 'System Integrity — Information Input Validation',
    description: 'Validates information inputs. All worker outputs schema-validated. Pipeline inputs validated against spawn plan schemas.',
    requirements: [
      { requirementId: 'SI-10-R1', description: 'Worker outputs validated against WorkerOutput schema', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-10-R2', description: 'Pipeline spawn plans validated against SpawnPlan schema', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Schema validation success/failure logs', 'Validation error records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-10-ET1', name: 'Input Validation Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SI-16',
    controlFamily: 'SI',
    title: 'System Integrity — Memory Protection',
    description: 'Protects system memory. Sensitive data cleared after use, no PII persisted in memory beyond request lifecycle.',
    requirements: [
      { requirementId: 'SI-16-R1', description: 'Sensitive data not persisted in memory beyond request scope', checkType: 'automated', isMandatory: true },
      { requirementId: 'SI-16-R2', description: 'PII handled through streaming without full memory retention', checkType: 'evidence', isMandatory: false },
    ],
    evidenceArtifacts: ['Memory handling patterns documentation', 'PII lifecycle flow diagram'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SI-16-ET1', name: 'Memory Protection Evidence', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
