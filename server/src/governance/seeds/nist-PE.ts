/**
 * NIST 800-53 Rev. 5 — PE: Physical and Environmental Protection
 *
 * Controls for physical access, monitoring, and environmental
 * protection. In GIA context: infrastructure access controls,
 * hosting environment security, and monitoring.
 */

import type { ControlSeed } from './types';

export const PE_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-PE-1',
    controlFamily: 'PE',
    title: 'Physical & Environmental — Policy and Procedures',
    description: 'Establishes physical security policy for hosting infrastructure. Defines access controls for servers, network equipment, and data centers.',
    requirements: [
      { requirementId: 'PE-1-R1', description: 'Physical security policy documented for hosting environment', checkType: 'manual', isMandatory: true },
      { requirementId: 'PE-1-R2', description: 'Cloud provider physical security attestation obtained', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Physical security policy', 'Cloud provider attestation (SOC 2, ISO 27001)'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PE-1-ET1', name: 'Physical Security Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PE-2',
    controlFamily: 'PE',
    title: 'Physical & Environmental — Physical Access Authorizations',
    description: 'Authorizes physical access to hosting infrastructure. SSH access restricted to authorized operators with key-based authentication.',
    requirements: [
      { requirementId: 'PE-2-R1', description: 'SSH access uses key-based authentication only', checkType: 'automated', isMandatory: true },
      { requirementId: 'PE-2-R2', description: 'SSH access limited to authorized IP ranges', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['SSH configuration files', 'Firewall rules', 'Access authorization records'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PE-2-ET1', name: 'SSH Access Config', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PE-2-ET2', name: 'Firewall Rules', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PE-6',
    controlFamily: 'PE',
    title: 'Physical & Environmental — Monitoring Physical Access',
    description: 'Monitors physical access to hosting infrastructure. Server login attempts logged, container restarts monitored, health checks active.',
    requirements: [
      { requirementId: 'PE-6-R1', description: 'Server login attempts logged with source IP', checkType: 'automated', isMandatory: true },
      { requirementId: 'PE-6-R2', description: 'Container health checks active and monitored', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Server auth logs', 'Container health check results', 'Monitoring dashboard'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PE-6-ET1', name: 'Server Access Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PE-13',
    controlFamily: 'PE',
    title: 'Physical & Environmental — Fire Protection',
    description: 'Environmental protection for hosting infrastructure. Cloud provider fire suppression and environmental controls verified.',
    requirements: [
      { requirementId: 'PE-13-R1', description: 'Cloud provider environmental protection attestation current', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Cloud provider environmental protection certification'],
    riskLevel: 'LOW',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PE-13-ET1', name: 'Environmental Attestation', templateType: 'ATTESTATION', isRequired: false },
    ],
  },
];
