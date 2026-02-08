/**
 * NIST 800-53 Rev. 5 — PL: Planning
 *
 * Controls for security planning, system security plans,
 * rules of behavior, and information security architecture.
 * In GIA context: governance planning, system boundaries,
 * and agent behavioral constraints.
 */

import type { ControlSeed } from './types';

export const PL_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-PL-1',
    controlFamily: 'PL',
    title: 'Planning — Policy and Procedures',
    description: 'Establishes security planning policy. Defines system security planning requirements including governance architecture documentation.',
    requirements: [
      { requirementId: 'PL-1-R1', description: 'Security planning policy documented and approved', checkType: 'manual', isMandatory: true },
      { requirementId: 'PL-1-R2', description: 'Planning procedures defined for governance changes', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Security planning policy', 'Governance change planning procedures'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-1-ET1', name: 'Security Planning Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PL-2',
    controlFamily: 'PL',
    title: 'Planning — System Security Plan',
    description: 'Develops and maintains system security plan. Documents all governance controls, their implementation status, and responsible roles.',
    requirements: [
      { requirementId: 'PL-2-R1', description: 'System security plan documents all active governance controls', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PL-2-R2', description: 'Plan updated when governance library changes', checkType: 'manual', isMandatory: true },
      { requirementId: 'PL-2-R3', description: 'Plan reviewed and approved by ISSO', checkType: 'manual', isMandatory: true },
    ],
    evidenceArtifacts: ['System security plan document', 'Plan version history', 'ISSO approval records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-2-ET1', name: 'System Security Plan', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PL-2-ET2', name: 'ISSO Approval Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PL-4',
    controlFamily: 'PL',
    title: 'Planning — Rules of Behavior',
    description: 'Establishes rules of behavior for system users and agents. Agent behavioral constraints defined by Job Packs, MAI levels, and forbidden actions.',
    requirements: [
      { requirementId: 'PL-4-R1', description: 'Agent behavioral constraints defined in Job Pack', checkType: 'automated', isMandatory: true },
      { requirementId: 'PL-4-R2', description: 'Forbidden actions list enforced at runtime', checkType: 'automated', isMandatory: true },
      { requirementId: 'PL-4-R3', description: 'Operator accepts rules of behavior before console access', checkType: 'evidence', isMandatory: false },
    ],
    evidenceArtifacts: ['Job Pack behavioral constraints', 'Forbidden actions enforcement logs', 'Operator acceptance records'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-4-ET1', name: 'Behavioral Constraint Config', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PL-4-ET2', name: 'Rules Acceptance Record', templateType: 'APPROVAL_RECORD', isRequired: false },
    ],
  },
  {
    policyId: 'NIST-PL-7',
    controlFamily: 'PL',
    title: 'Planning — Concept of Operations',
    description: 'Defines concept of operations for the governance system. Documents the pipeline execution model, supervision hierarchy, and evidence flow.',
    requirements: [
      { requirementId: 'PL-7-R1', description: 'Pipeline execution model documented', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PL-7-R2', description: 'Supervision hierarchy and escalation paths defined', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Pipeline architecture document', 'Supervision hierarchy diagram'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-7-ET1', name: 'Architecture Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PL-8',
    controlFamily: 'PL',
    title: 'Planning — Security Architecture',
    description: 'Develops information security architecture. Documents trust boundaries, data flow, and governance enforcement points.',
    requirements: [
      { requirementId: 'PL-8-R1', description: 'Trust boundaries documented between system components', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PL-8-R2', description: 'Data flow diagram shows governance enforcement points', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Trust boundary documentation', 'Data flow diagrams', 'Governance enforcement point map'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-8-ET1', name: 'Security Architecture Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PL-10',
    controlFamily: 'PL',
    title: 'Planning — Baseline Selection',
    description: 'Selects control baselines appropriate to system categorization. Pack priority hierarchy (BASE→INDUSTRY→ENTERPRISE→DEPARTMENT) implements baseline layering.',
    requirements: [
      { requirementId: 'PL-10-R1', description: 'Baseline control set selected per system categorization', checkType: 'automated', isMandatory: true },
      { requirementId: 'PL-10-R2', description: 'Pack hierarchy enforces baseline layering', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['System categorization document', 'Pack priority configuration', 'Baseline selection rationale'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PL-10-ET1', name: 'Baseline Selection Record', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
