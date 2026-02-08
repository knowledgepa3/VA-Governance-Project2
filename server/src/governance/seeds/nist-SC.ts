/**
 * NIST 800-53 Rev. 5 — SC: System and Communications Protection
 *
 * Controls for boundary protection, cryptographic protection,
 * network security, and communication integrity. In GIA context:
 * HTTPS enforcement, SHA-256 hashing, tenant isolation, egress filtering.
 */

import type { ControlSeed } from './types';

export const SC_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-SC-1',
    controlFamily: 'SC',
    title: 'System & Communications — Policy and Procedures',
    description: 'Establishes system and communications protection policy. Defines encryption, network security, and data-in-transit protection requirements.',
    requirements: [
      { requirementId: 'SC-1-R1', description: 'Communications protection policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'SC-1-R2', description: 'Encryption requirements defined per data classification', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Communications protection policy', 'Encryption requirements matrix'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-1-ET1', name: 'Communications Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-7',
    controlFamily: 'SC',
    title: 'System & Communications — Boundary Protection',
    description: 'Monitors and controls communications at system boundaries. Egress filtering controls outbound API calls. Ingress filtered by reverse proxy.',
    requirements: [
      { requirementId: 'SC-7-R1', description: 'Egress filtering enforced for outbound API calls', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-7-R2', description: 'Reverse proxy handles ingress filtering and rate limiting', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-7-R3', description: 'Boundary violations logged and alerted', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Egress filter configuration', 'Reverse proxy rules', 'Boundary violation alerts'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-7-ET1', name: 'Boundary Protection Config', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'SC-7-ET2', name: 'Boundary Violation Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-8',
    controlFamily: 'SC',
    title: 'System & Communications — Transmission Confidentiality',
    description: 'Protects confidentiality of transmitted information. HTTPS enforced for all API communications. TLS 1.2+ required.',
    requirements: [
      { requirementId: 'SC-8-R1', description: 'HTTPS enforced for all API endpoints', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-8-R2', description: 'TLS 1.2 or higher required for all connections', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['HTTPS enforcement configuration', 'TLS version verification'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-8-ET1', name: 'TLS Configuration Proof', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-12',
    controlFamily: 'SC',
    title: 'System & Communications — Cryptographic Key Establishment',
    description: 'Establishes and manages cryptographic keys. Key Manager handles API key lifecycle, rotation, and secure storage.',
    requirements: [
      { requirementId: 'SC-12-R1', description: 'Cryptographic keys managed by Key Manager service', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-12-R2', description: 'Key rotation schedule defined and enforced', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Key Manager health reports', 'Key rotation audit logs'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-12-ET1', name: 'Key Management Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-13',
    controlFamily: 'SC',
    title: 'System & Communications — Cryptographic Protection',
    description: 'Implements cryptographic mechanisms. SHA-256 hash chains for evidence integrity, content hashing for drift detection, JWT signing.',
    requirements: [
      { requirementId: 'SC-13-R1', description: 'SHA-256 used for all hash chain operations', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-13-R2', description: 'Content hashing detects policy drift', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-13-R3', description: 'JWT tokens signed with secure algorithm', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Hash chain verification reports', 'Content hash drift detection logs', 'JWT signing configuration'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-13-ET1', name: 'Crypto Implementation Proof', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-17',
    controlFamily: 'SC',
    title: 'System & Communications — Public Key Infrastructure Certificates',
    description: 'Manages PKI certificates for system communications. SSL certificates for HTTPS, certificate renewal tracking.',
    requirements: [
      { requirementId: 'SC-17-R1', description: 'SSL certificates valid and from trusted CA', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-17-R2', description: 'Certificate expiration monitored with renewal alerts', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['SSL certificate chain', 'Certificate expiration monitoring logs'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-17-ET1', name: 'Certificate Status Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-23',
    controlFamily: 'SC',
    title: 'System & Communications — Session Authenticity',
    description: 'Protects session authenticity. JWT session binding prevents session hijacking. Session tokens have bounded lifetime.',
    requirements: [
      { requirementId: 'SC-23-R1', description: 'Sessions bound to authenticated identity via JWT', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-23-R2', description: 'Session tokens include anti-replay mechanisms', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Session binding implementation', 'Anti-replay mechanism configuration'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['gateway'],
    evidenceTemplates: [
      { templateId: 'SC-23-ET1', name: 'Session Authenticity Proof', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-28',
    controlFamily: 'SC',
    title: 'System & Communications — Protection of Information at Rest',
    description: 'Protects information at rest. Database encryption, evidence bundle integrity verification, PII redaction in stored data.',
    requirements: [
      { requirementId: 'SC-28-R1', description: 'Database storage encrypted at rest', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SC-28-R2', description: 'PII redacted or hashed in stored evidence', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Database encryption verification', 'PII redaction audit reports'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-28-ET1', name: 'Data-at-Rest Protection Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-39',
    controlFamily: 'SC',
    title: 'System & Communications — Process Isolation',
    description: 'Maintains separate execution domains. Docker containers provide process isolation. Tenant data isolation enforced at database level.',
    requirements: [
      { requirementId: 'SC-39-R1', description: 'Services run in isolated Docker containers', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-39-R2', description: 'Tenant data isolation enforced at query level', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Docker container configuration', 'Tenant isolation query patterns'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-39-ET1', name: 'Process Isolation Proof', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SC-45',
    controlFamily: 'SC',
    title: 'System & Communications — System Time Synchronization',
    description: 'Synchronizes system clocks for accurate timestamping. All audit entries, evidence bundles, and metrics use synchronized timestamps.',
    requirements: [
      { requirementId: 'SC-45-R1', description: 'System clocks synchronized via NTP', checkType: 'automated', isMandatory: true },
      { requirementId: 'SC-45-R2', description: 'All timestamps use ISO 8601 UTC format', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['NTP configuration', 'Timestamp format verification'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SC-45-ET1', name: 'Time Sync Config', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
