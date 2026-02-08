/**
 * NIST 800-53 Rev. 5 — IA: Identification and Authentication
 *
 * Controls for identity management, authentication mechanisms,
 * credential management, and session binding. In GIA context:
 * JWT auth, tenant isolation, API key management, session integrity.
 */

import type { ControlSeed } from './types';

export const IA_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-IA-1',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Policy and Procedures',
    description: 'Establishes organizational identification and authentication policy. Defines authentication requirements for operators, agents, and API consumers.',
    requirements: [
      { requirementId: 'IA-1-R1', description: 'Authentication policy documented and approved', checkType: 'manual', isMandatory: true },
      { requirementId: 'IA-1-R2', description: 'Authentication mechanisms defined per access tier', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Authentication policy document', 'Access tier definitions'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-1-ET1', name: 'Auth Policy Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-2',
    controlFamily: 'IA',
    title: 'Identification & Authentication — User Identification',
    description: 'Uniquely identifies and authenticates organizational users. JWT tokens bind sessions to authenticated identities with tenant isolation.',
    requirements: [
      { requirementId: 'IA-2-R1', description: 'All API requests authenticated via JWT token', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-2-R2', description: 'JWT contains tenant_id for isolation enforcement', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-2-R3', description: 'Failed authentication attempts logged with source', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['JWT validation middleware logs', 'Tenant isolation proof', 'Auth failure audit entries'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['gateway'],
    evidenceTemplates: [
      { templateId: 'IA-2-ET1', name: 'JWT Validation Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'IA-2-ET2', name: 'Tenant Isolation Proof', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-3',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Device Identification',
    description: 'Identifies and authenticates devices before establishing connections. API consumers identified by API key or service token.',
    requirements: [
      { requirementId: 'IA-3-R1', description: 'Service-to-service calls authenticated via service token', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-3-R2', description: 'MCP server connections verified by transport binding', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Service token validation logs', 'Transport binding verification'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-3-ET1', name: 'Service Auth Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-4',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Identifier Management',
    description: 'Manages user and system identifiers. Prevents identifier reuse and ensures timely deactivation of inactive identifiers.',
    requirements: [
      { requirementId: 'IA-4-R1', description: 'User identifiers are unique and non-reusable', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-4-R2', description: 'Inactive identifiers disabled after configurable period', checkType: 'automated', isMandatory: false },
    ],
    evidenceArtifacts: ['User registry with uniqueness constraints', 'Inactive identifier audit'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-4-ET1', name: 'Identifier Uniqueness Proof', templateType: 'ATTESTATION', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-5',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Authenticator Management',
    description: 'Manages authentication credentials including password policies, token rotation, and secret storage. Key Manager handles API key lifecycle.',
    requirements: [
      { requirementId: 'IA-5-R1', description: 'Passwords meet minimum complexity requirements', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-5-R2', description: 'API keys stored encrypted and rotatable', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-5-R3', description: 'JWT tokens have bounded expiration (configurable)', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Password policy enforcement logs', 'Key Manager health reports', 'Token expiration configuration'],
    riskLevel: 'CRITICAL',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-5-ET1', name: 'Credential Management Report', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'IA-5-ET2', name: 'Key Rotation Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-6',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Authentication Feedback',
    description: 'Obscures authentication feedback to prevent credential exposure. Error messages do not reveal which part of credentials was incorrect.',
    requirements: [
      { requirementId: 'IA-6-R1', description: 'Auth error messages are generic (no credential hints)', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-6-R2', description: 'Password fields masked in all interfaces', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Auth error response samples', 'UI password masking screenshots'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-6-ET1', name: 'Auth Feedback Audit', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-8',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Non-Organizational Users',
    description: 'Identifies and authenticates external users and services. External API consumers subject to rate limiting and enhanced monitoring.',
    requirements: [
      { requirementId: 'IA-8-R1', description: 'External API access requires valid API key', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-8-R2', description: 'External access rate-limited per key', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-8-R3', description: 'External access logged with enhanced detail', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['External access API key validation', 'Rate limiter configuration', 'Enhanced access logs'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: ['gateway'],
    evidenceTemplates: [
      { templateId: 'IA-8-ET1', name: 'External Access Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'IA-8-ET2', name: 'Rate Limit Configuration', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-IA-11',
    controlFamily: 'IA',
    title: 'Identification & Authentication — Re-Authentication',
    description: 'Requires re-authentication for privileged operations. MANDATORY gate actions require fresh authentication confirmation.',
    requirements: [
      { requirementId: 'IA-11-R1', description: 'MANDATORY gate approvals require active session verification', checkType: 'automated', isMandatory: true },
      { requirementId: 'IA-11-R2', description: 'Session timeout forces re-authentication', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Session verification logs for gate approvals', 'Session timeout configuration'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'IA-11-ET1', name: 'Re-Authentication Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
];
