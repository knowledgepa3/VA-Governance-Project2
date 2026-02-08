/**
 * NIST 800-53 Rev. 5 — SR: Supply Chain Risk Management
 *
 * Controls for supply chain risk assessment, component provenance,
 * supplier assessment, and acquisition safeguards. In GIA context:
 * AI model provider governance, dependency supply chain, and
 * third-party service risk management.
 */

import type { ControlSeed } from './types';

export const SR_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-SR-1',
    controlFamily: 'SR',
    title: 'Supply Chain — Policy and Procedures',
    description: 'Establishes supply chain risk management policy. Defines governance requirements for AI model providers, dependencies, and third-party services.',
    requirements: [
      { requirementId: 'SR-1-R1', description: 'Supply chain risk management policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'SR-1-R2', description: 'Third-party service risk assessment criteria defined', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Supply chain policy document', 'Risk assessment criteria'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SR-1-ET1', name: 'Supply Chain Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SR-2',
    controlFamily: 'SR',
    title: 'Supply Chain — Supply Chain Risk Assessment',
    description: 'Assesses supply chain risks for AI model providers and infrastructure services. Evaluates provider reliability, data handling, and compliance.',
    requirements: [
      { requirementId: 'SR-2-R1', description: 'AI model provider risk assessment completed', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SR-2-R2', description: 'Infrastructure provider compliance verified', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SR-2-R3', description: 'Risk assessment updated annually or after provider changes', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Provider risk assessment reports', 'Compliance verification records', 'Assessment update history'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SR-2-ET1', name: 'Provider Risk Assessment', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SR-3',
    controlFamily: 'SR',
    title: 'Supply Chain — Supply Chain Controls and Processes',
    description: 'Establishes controls for supply chain protection. Dependency lock files, container image pinning, and API version constraints.',
    requirements: [
      { requirementId: 'SR-3-R1', description: 'Dependency versions locked (package-lock.json)', checkType: 'automated', isMandatory: true },
      { requirementId: 'SR-3-R2', description: 'Container base images pinned to specific versions', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SR-3-R3', description: 'External API versions constrained in configuration', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Lock file verification', 'Container image version records', 'API version configuration'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SR-3-ET1', name: 'Supply Chain Control Evidence', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-SR-5',
    controlFamily: 'SR',
    title: 'Supply Chain — Acquisition Strategies and Tools',
    description: 'Employs acquisition strategies to limit supply chain risk. AI model provider diversification strategy, fallback procedures for provider outages.',
    requirements: [
      { requirementId: 'SR-5-R1', description: 'Provider fallback procedures documented', checkType: 'evidence', isMandatory: true },
      { requirementId: 'SR-5-R2', description: 'Egress filtering limits external service exposure', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Fallback procedure documentation', 'Egress filter configuration'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'SR-5-ET1', name: 'Acquisition Strategy Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
