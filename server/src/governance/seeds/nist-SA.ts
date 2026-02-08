/**
 * NIST 800-53 Rev. 5 — SA: System and Services Acquisition
 *
 * Controls for system development lifecycle, supply chain risk,
 * external services, and developer security. In GIA context:
 * AI model selection, third-party API governance, dependency management.
 */

import type { ControlSeed } from './types';

export const SA_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-SA-1',
    controlFamily: 'SA',
    title: 'System Acquisition — Policy and Procedures',
    description: 'Establishes system and services acquisition policy. Defines requirements for AI model selection, API integration, and dependency management.',
    requirements: [
      { requirementId: 'SA-1-R1', description: 'Acquisition policy documented for AI services', checkType: 'manual', isMandatory: true },
      { requirementId: 'SA-1-R2', description: 'Third-party service evaluation criteria defined', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Acquisition policy document', 'Service evaluation criteria'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-1-ET1', name: 'Acquisition Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-3',
    controlFamily: 'SA',
    title: 'System Acquisition — System Development Life Cycle',
    description: 'Manages system using SDLC methodology. Version-controlled governance library, migration-based schema evolution, containerized deployment.',
    requirements: [
      { requirementId: 'SA-3-R1', description: 'Source code version-controlled in git', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-3-R2', description: 'Database changes managed through versioned migrations', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-3-R3', description: 'Deployment artifacts containerized and reproducible', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Git commit history', 'Migration version chain', 'Docker build manifests'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-3-ET1', name: 'SDLC Evidence', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-4',
    controlFamily: 'SA',
    title: 'System Acquisition — Acquisition Process',
    description: 'Includes security requirements in acquisition specifications. AI model API contracts include data handling, privacy, and compliance requirements.',
    requirements: [
      { requirementId: 'SA-4-R1', description: 'AI model API contracts specify data handling requirements', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SA-4-R2', description: 'Egress filtering controls external API access', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['API contract documents', 'Egress filter configuration'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-4-ET1', name: 'API Contract', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'SA-4-ET2', name: 'Egress Filter Config', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-8',
    controlFamily: 'SA',
    title: 'System Acquisition — Security Engineering Principles',
    description: 'Applies security engineering principles. Defense in depth through MAI classification + governance scoring + evidence sealing + hash chaining.',
    requirements: [
      { requirementId: 'SA-8-R1', description: 'Defense in depth implemented across governance layers', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SA-8-R2', description: 'Separation of duties between agent types', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Defense in depth architecture document', 'Agent type separation evidence'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-8-ET1', name: 'Security Architecture Review', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-9',
    controlFamily: 'SA',
    title: 'System Acquisition — External System Services',
    description: 'Controls external system service usage. AI model API calls governed by egress filtering, token budgets, and response validation.',
    requirements: [
      { requirementId: 'SA-9-R1', description: 'External AI API calls filtered by egress controls', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-9-R2', description: 'Token budgets enforced per pipeline run', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-9-R3', description: 'External service responses validated before use', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Egress filter logs', 'Token budget enforcement records', 'Response validation logs'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-9-ET1', name: 'External Service Audit', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-10',
    controlFamily: 'SA',
    title: 'System Acquisition — Developer Configuration Management',
    description: 'Requires configuration management during development. Git-based version control, migration numbering, and build reproducibility.',
    requirements: [
      { requirementId: 'SA-10-R1', description: 'All configuration changes tracked in version control', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-10-R2', description: 'Migration files sequentially numbered and immutable', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Git commit log', 'Migration sequence verification'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-10-ET1', name: 'Config Management Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-11',
    controlFamily: 'SA',
    title: 'System Acquisition — Developer Testing',
    description: 'Requires security testing during development. TypeScript type checking, schema validation, and governance compliance testing.',
    requirements: [
      { requirementId: 'SA-11-R1', description: 'TypeScript strict mode enforces type safety', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-11-R2', description: 'Zod schema validation on all external inputs', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['TSC build output', 'Schema validation coverage report'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-11-ET1', name: 'Build Validation Report', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SA-12',
    controlFamily: 'SA',
    title: 'System Acquisition — Supply Chain Protection',
    description: 'Protects against supply chain threats. NPM dependency auditing, container image scanning, and third-party code review.',
    requirements: [
      { requirementId: 'SA-12-R1', description: 'NPM dependencies audited for known vulnerabilities', checkType: 'automated', isMandatory: true },
      { requirementId: 'SA-12-R2', description: 'Container base images from trusted registries only', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['npm audit output', 'Container image provenance records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SA-12-ET1', name: 'Dependency Audit Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
