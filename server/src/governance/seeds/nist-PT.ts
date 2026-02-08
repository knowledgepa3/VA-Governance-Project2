/**
 * NIST 800-53 Rev. 5 — PT: PII Processing and Transparency
 *
 * Controls for PII processing consent, purpose limitation,
 * data minimization, and privacy notice. In GIA context:
 * veteran PII handling, consent tracking, data minimization
 * in evidence bundles, and privacy-preserving analytics.
 */

import type { ControlSeed } from './types';

export const PT_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-PT-1',
    controlFamily: 'PT',
    title: 'PII Processing — Policy and Procedures',
    description: 'Establishes PII processing and transparency policy. Defines handling requirements for veteran personal information across all pipeline stages.',
    requirements: [
      { requirementId: 'PT-1-R1', description: 'PII processing policy documented and approved', checkType: 'manual', isMandatory: true },
      { requirementId: 'PT-1-R2', description: 'PII data types inventoried and classified', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['PII processing policy', 'Data type inventory and classification'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PT-1-ET1', name: 'PII Processing Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PT-2',
    controlFamily: 'PT',
    title: 'PII Processing — Authority to Process',
    description: 'Determines and documents authority to process PII. Legal basis for veteran data processing established and tracked.',
    requirements: [
      { requirementId: 'PT-2-R1', description: 'Legal authority for PII processing documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'PT-2-R2', description: 'Processing authority reviewed when regulations change', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Legal authority documentation', 'Regulatory review records'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PT-2-ET1', name: 'Processing Authority Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PT-3',
    controlFamily: 'PT',
    title: 'PII Processing — Purpose Specification',
    description: 'Specifies purposes for PII processing. Each pipeline run documents purpose for any PII accessed. Purpose limitation enforced at runtime.',
    requirements: [
      { requirementId: 'PT-3-R1', description: 'Pipeline runs document purpose for PII access', checkType: 'automated', isMandatory: true },
      { requirementId: 'PT-3-R2', description: 'PII access restricted to documented purposes', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Pipeline purpose declarations', 'PII access restriction logs'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['medical', 'legal', 'intake'],
    evidenceTemplates: [
      { templateId: 'PT-3-ET1', name: 'Purpose Declaration', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PT-3-ET2', name: 'PII Access Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PT-4',
    controlFamily: 'PT',
    title: 'PII Processing — Consent',
    description: 'Obtains consent for PII processing where required. Veteran consent tracked and verified before processing sensitive data.',
    requirements: [
      { requirementId: 'PT-4-R1', description: 'Consent obtained before processing sensitive PII', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PT-4-R2', description: 'Consent records maintained with timestamps', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Consent records', 'Consent verification logs'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: ['medical', 'legal', 'intake'],
    evidenceTemplates: [
      { templateId: 'PT-4-ET1', name: 'Consent Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PT-6',
    controlFamily: 'PT',
    title: 'PII Processing — Data Minimization',
    description: 'Minimizes PII collected and retained. Evidence bundles include only necessary PII. Hashing preferred over raw storage.',
    requirements: [
      { requirementId: 'PT-6-R1', description: 'PII minimized in evidence bundles to necessary fields', checkType: 'automated', isMandatory: true },
      { requirementId: 'PT-6-R2', description: 'PII hashed where identification not required', checkType: 'automated', isMandatory: true },
      { requirementId: 'PT-6-R3', description: 'Data minimization audited per pipeline run', checkType: 'evidence', isMandatory: false },
    ],
    evidenceArtifacts: ['PII field minimization records', 'Hash-instead-of-store evidence', 'Minimization audit reports'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PT-6-ET1', name: 'Data Minimization Report', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PT-6-ET2', name: 'PII Hashing Proof', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PT-7',
    controlFamily: 'PT',
    title: 'PII Processing — Privacy Notice',
    description: 'Provides notice to individuals regarding PII processing. Privacy notice accessible and clear about data handling practices.',
    requirements: [
      { requirementId: 'PT-7-R1', description: 'Privacy notice published and accessible', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PT-7-R2', description: 'Notice updated when processing practices change', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Published privacy notice', 'Notice update history'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PT-7-ET1', name: 'Privacy Notice', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
