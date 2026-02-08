/**
 * NIST 800-53 Rev. 5 — AT: Awareness and Training
 *
 * Controls for security awareness training, role-based training,
 * and training records. In GIA context: agent competency validation,
 * worker capability verification, and training evidence.
 */

import type { ControlSeed } from './types';

export const AT_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-AT-1',
    controlFamily: 'AT',
    title: 'Awareness & Training — Policy and Procedures',
    description: 'Establishes organizational security awareness and training policy. Defines training requirements for all agent types and worker roles.',
    requirements: [
      { requirementId: 'AT-1-R1', description: 'Security awareness policy documented and approved', checkType: 'manual', isMandatory: true },
      { requirementId: 'AT-1-R2', description: 'Training requirements defined per worker type', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AT-1-R3', description: 'Policy reviewed annually or after significant changes', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Training policy document', 'Worker type capability matrix', 'Policy review records'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AT-1-ET1', name: 'Training Policy Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AT-2',
    controlFamily: 'AT',
    title: 'Awareness & Training — Literacy Training and Awareness',
    description: 'Ensures all system users (agents and operators) understand security responsibilities. Agents must demonstrate awareness of governance constraints.',
    requirements: [
      { requirementId: 'AT-2-R1', description: 'Agent system prompts include governance awareness directives', checkType: 'automated', isMandatory: true },
      { requirementId: 'AT-2-R2', description: 'Operator console displays governance status on login', checkType: 'automated', isMandatory: true },
      { requirementId: 'AT-2-R3', description: 'Security awareness refreshed after policy changes', checkType: 'evidence', isMandatory: false },
    ],
    evidenceArtifacts: ['Agent prompt governance directives', 'Console boot sequence screenshots', 'Awareness refresh logs'],
    riskLevel: 'LOW',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AT-2-ET1', name: 'Governance Awareness Evidence', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-AT-3',
    controlFamily: 'AT',
    title: 'Awareness & Training — Role-Based Training',
    description: 'Role-specific training for agents with elevated privileges. MANDATORY-level workers require additional capability validation before deployment.',
    requirements: [
      { requirementId: 'AT-3-R1', description: 'Workers handling MANDATORY actions validated for capability', checkType: 'automated', isMandatory: true },
      { requirementId: 'AT-3-R2', description: 'Role-based capability matrix maintained per worker type', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AT-3-R3', description: 'Training records retained for audit trail', checkType: 'evidence', isMandatory: false },
    ],
    evidenceArtifacts: ['Worker capability validation results', 'Role capability matrix', 'Training completion records'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: ['compliance', 'validator'],
    evidenceTemplates: [
      { templateId: 'AT-3-ET1', name: 'Capability Validation Results', templateType: 'ATTESTATION', isRequired: true },
      { templateId: 'AT-3-ET2', name: 'Training Completion Record', templateType: 'LOG_ENTRY', isRequired: false },
    ],
  },
  {
    policyId: 'NIST-AT-4',
    controlFamily: 'AT',
    title: 'Awareness & Training — Training Records',
    description: 'Maintains records of all training activities including agent capability assessments, operator certifications, and competency updates.',
    requirements: [
      { requirementId: 'AT-4-R1', description: 'Training records stored with timestamps and outcomes', checkType: 'evidence', isMandatory: true },
      { requirementId: 'AT-4-R2', description: 'Records retained per organizational retention policy', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Training record database entries', 'Retention policy compliance reports'],
    riskLevel: 'LOW',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'AT-4-ET1', name: 'Training Record Archive', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
