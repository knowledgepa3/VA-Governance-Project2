/**
 * NIST 800-53 Rev. 5 — PS: Personnel Security
 *
 * Controls for personnel screening, termination, transfer,
 * and access agreements. In GIA context: operator onboarding,
 * role assignment, access revocation, and NDA/agreement tracking.
 */

import type { ControlSeed } from './types';

export const PS_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-PS-1',
    controlFamily: 'PS',
    title: 'Personnel Security — Policy and Procedures',
    description: 'Establishes personnel security policy. Defines operator onboarding, role assignment, and access agreement requirements.',
    requirements: [
      { requirementId: 'PS-1-R1', description: 'Personnel security policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'PS-1-R2', description: 'Onboarding procedures include security training requirement', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Personnel security policy', 'Onboarding procedure documentation'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PS-1-ET1', name: 'Personnel Security Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PS-3',
    controlFamily: 'PS',
    title: 'Personnel Security — Personnel Screening',
    description: 'Screens individuals prior to authorizing access. Operators verified before ISSO/Admin role assignment. Background check requirements defined.',
    requirements: [
      { requirementId: 'PS-3-R1', description: 'Privileged role assignments require approval from ISSO', checkType: 'automated', isMandatory: true },
      { requirementId: 'PS-3-R2', description: 'Role assignment decisions logged with attribution', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Role assignment approval records', 'Screening verification logs'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PS-3-ET1', name: 'Screening Verification Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PS-4',
    controlFamily: 'PS',
    title: 'Personnel Security — Personnel Termination',
    description: 'Ensures timely revocation of access upon termination. System access disabled, API keys revoked, and evidence preserved.',
    requirements: [
      { requirementId: 'PS-4-R1', description: 'Access revoked within 24 hours of termination', checkType: 'automated', isMandatory: true },
      { requirementId: 'PS-4-R2', description: 'API keys associated with terminated user revoked', checkType: 'automated', isMandatory: true },
      { requirementId: 'PS-4-R3', description: 'Termination evidence preserved in audit trail', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Access revocation logs', 'API key revocation records', 'Termination audit entries'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PS-4-ET1', name: 'Access Revocation Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'PS-4-ET2', name: 'Termination Evidence', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PS-6',
    controlFamily: 'PS',
    title: 'Personnel Security — Access Agreements',
    description: 'Requires access agreements before granting system access. Operators acknowledge terms of use and governance constraints.',
    requirements: [
      { requirementId: 'PS-6-R1', description: 'Access agreements required before system access granted', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PS-6-R2', description: 'Agreements reviewed and re-signed annually', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Signed access agreements', 'Agreement review records'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PS-6-ET1', name: 'Access Agreement Record', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
];
