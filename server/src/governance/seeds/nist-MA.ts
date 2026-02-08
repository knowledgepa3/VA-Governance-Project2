/**
 * NIST 800-53 Rev. 5 — MA: Maintenance
 *
 * Controls for system maintenance, maintenance tools, and
 * timely maintenance. In GIA context: system updates, migration
 * procedures, health monitoring, and scheduled maintenance windows.
 */

import type { ControlSeed } from './types';

export const MA_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-MA-1',
    controlFamily: 'MA',
    title: 'Maintenance — Policy and Procedures',
    description: 'Establishes organizational system maintenance policy. Defines scheduled maintenance windows, update procedures, and rollback capabilities.',
    requirements: [
      { requirementId: 'MA-1-R1', description: 'Maintenance policy documented with scheduled windows', checkType: 'manual', isMandatory: true },
      { requirementId: 'MA-1-R2', description: 'Rollback procedures defined for all maintenance activities', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Maintenance policy document', 'Rollback procedure documentation'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MA-1-ET1', name: 'Maintenance Policy', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MA-2',
    controlFamily: 'MA',
    title: 'Maintenance — Controlled Maintenance',
    description: 'Schedules, documents, and reviews maintenance activities. Database migrations tracked and versioned. Docker container updates coordinated.',
    requirements: [
      { requirementId: 'MA-2-R1', description: 'Database migrations versioned and tracked sequentially', checkType: 'automated', isMandatory: true },
      { requirementId: 'MA-2-R2', description: 'Container updates follow blue-green or rolling deployment', checkType: 'evidence', isMandatory: true },
      { requirementId: 'MA-2-R3', description: 'Maintenance activities logged with start/end timestamps', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Migration version history', 'Deployment logs', 'Maintenance activity records'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MA-2-ET1', name: 'Migration History', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'MA-2-ET2', name: 'Deployment Log', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MA-3',
    controlFamily: 'MA',
    title: 'Maintenance — Maintenance Tools',
    description: 'Controls and monitors tools used for system maintenance. CLI tools, database clients, and deployment scripts tracked and validated.',
    requirements: [
      { requirementId: 'MA-3-R1', description: 'Maintenance tools inventoried and version-controlled', checkType: 'evidence', isMandatory: true },
      { requirementId: 'MA-3-R2', description: 'Tool access restricted to authorized operators', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Tool inventory list', 'Access control records for maintenance tools'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MA-3-ET1', name: 'Tool Inventory', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-MA-5',
    controlFamily: 'MA',
    title: 'Maintenance — Maintenance Personnel',
    description: 'Authorizes maintenance personnel and supervises activities. Only ISSO/Admin roles can perform database migrations and system updates.',
    requirements: [
      { requirementId: 'MA-5-R1', description: 'System maintenance restricted to ISSO/Admin roles', checkType: 'automated', isMandatory: true },
      { requirementId: 'MA-5-R2', description: 'Maintenance activities audited with operator attribution', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['RBAC enforcement for maintenance endpoints', 'Maintenance audit trail'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'MA-5-ET1', name: 'Maintenance Authorization Log', templateType: 'APPROVAL_RECORD', isRequired: true },
    ],
  },
];
