/**
 * NIST 800-53 Rev. 5 — MP: Media Protection
 *
 * Controls for media access, marking, storage, transport, and
 * sanitization. In GIA context: data classification, PII handling,
 * export controls, and evidence bundle protection.
 */

import type { ControlSeed } from './types';

export const MP_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-MP-1',
    controlFamily: 'MP',
    title: 'Media Protection — Policy and Procedures',
    description: 'Establishes data classification and media protection policy. Defines handling requirements for PII, PHI, and classified evidence.',
    requirements: [
      { requirementId: 'MP-1-R1', description: 'Data classification policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'MP-1-R2', description: 'PII handling procedures defined per data type', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Data classification policy', 'PII handling procedures'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MP-1-ET1', name: 'Data Classification Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MP-2',
    controlFamily: 'MP',
    title: 'Media Protection — Media Access',
    description: 'Restricts access to digital media. Evidence bundles access-controlled by tenant isolation and RBAC. Sealed bundles are read-only.',
    requirements: [
      { requirementId: 'MP-2-R1', description: 'Evidence bundles scoped to tenant_id', checkType: 'automated', isMandatory: true },
      { requirementId: 'MP-2-R2', description: 'Sealed evidence bundles are immutable (read-only)', checkType: 'automated', isMandatory: true },
      { requirementId: 'MP-2-R3', description: 'Access to evidence requires authenticated session', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Tenant isolation enforcement logs', 'Seal immutability verification', 'Access control audit trail'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MP-2-ET1', name: 'Media Access Control Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'MP-2-ET2', name: 'Seal Immutability Proof', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MP-4',
    controlFamily: 'MP',
    title: 'Media Protection — Media Storage',
    description: 'Protects stored media. Database encryption at rest, evidence bundle integrity via SHA-256 hash chains, backup encryption.',
    requirements: [
      { requirementId: 'MP-4-R1', description: 'Database storage encrypted at rest', checkType: 'evidence', isMandatory: true },
      { requirementId: 'MP-4-R2', description: 'Evidence bundles integrity-verified via hash chain', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Database encryption configuration', 'Hash chain verification reports'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MP-4-ET1', name: 'Storage Encryption Config', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'MP-4-ET2', name: 'Hash Chain Report', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MP-6',
    controlFamily: 'MP',
    title: 'Media Protection — Media Sanitization',
    description: 'Sanitizes media prior to disposal or reuse. PII redaction in evidence exports, secure deletion of expired evidence bundles.',
    requirements: [
      { requirementId: 'MP-6-R1', description: 'PII redacted before evidence export or sharing', checkType: 'automated', isMandatory: true },
      { requirementId: 'MP-6-R2', description: 'Expired evidence sanitized per retention policy', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['PII redaction logs', 'Evidence sanitization records'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MP-6-ET1', name: 'PII Redaction Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
];
