/**
 * NIST 800-53 Rev. 5 — CP: Contingency Planning
 *
 * Controls for contingency planning, backup, recovery,
 * and continuity of operations. In GIA context: database backups,
 * disaster recovery, service continuity, and failover procedures.
 */

import type { ControlSeed } from './types';

export const CP_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-CP-1',
    controlFamily: 'CP',
    title: 'Contingency Planning — Policy and Procedures',
    description: 'Establishes contingency planning policy. Defines backup, recovery, and continuity requirements for all governance system components.',
    requirements: [
      { requirementId: 'CP-1-R1', description: 'Contingency planning policy documented', checkType: 'manual', isMandatory: true },
      { requirementId: 'CP-1-R2', description: 'Recovery procedures defined for each system component', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Contingency planning policy', 'Component recovery procedures'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-1-ET1', name: 'Contingency Plan', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CP-2',
    controlFamily: 'CP',
    title: 'Contingency Planning — Contingency Plan',
    description: 'Develops contingency plan for system recovery. Documents recovery time objectives, recovery point objectives, and restoration priorities.',
    requirements: [
      { requirementId: 'CP-2-R1', description: 'Recovery Time Objective (RTO) defined per service', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CP-2-R2', description: 'Recovery Point Objective (RPO) defined for data', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CP-2-R3', description: 'Restoration priority order documented', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['RTO/RPO definitions', 'Restoration priority matrix', 'Contingency plan document'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-2-ET1', name: 'Contingency Plan Document', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CP-4',
    controlFamily: 'CP',
    title: 'Contingency Planning — Contingency Plan Testing',
    description: 'Tests contingency plan to verify effectiveness. Backup restoration tested, failover procedures validated, recovery time measured.',
    requirements: [
      { requirementId: 'CP-4-R1', description: 'Backup restoration tested on schedule', checkType: 'manual', isMandatory: true },
      { requirementId: 'CP-4-R2', description: 'Test results documented with lessons learned', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Backup restoration test results', 'Recovery test timing records', 'Lessons learned documentation'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'CONFIGURABLE',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-4-ET1', name: 'Contingency Test Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CP-6',
    controlFamily: 'CP',
    title: 'Contingency Planning — Alternate Storage Site',
    description: 'Establishes alternate storage for backups. Database backups stored separately from primary, evidence bundles archived off-site.',
    requirements: [
      { requirementId: 'CP-6-R1', description: 'Database backups stored in separate location from primary', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CP-6-R2', description: 'Backup integrity verified via checksums', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Backup storage location documentation', 'Backup integrity verification logs'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-6-ET1', name: 'Backup Storage Proof', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CP-9',
    controlFamily: 'CP',
    title: 'Contingency Planning — System Backup',
    description: 'Conducts system backups. PostgreSQL database backed up on schedule, governance library state preserved, evidence bundles archived.',
    requirements: [
      { requirementId: 'CP-9-R1', description: 'Database backups run on defined schedule', checkType: 'automated', isMandatory: true },
      { requirementId: 'CP-9-R2', description: 'Governance library state included in backups', checkType: 'automated', isMandatory: true },
      { requirementId: 'CP-9-R3', description: 'Backup retention follows organizational policy', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Backup schedule configuration', 'Backup completion logs', 'Retention policy compliance'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-9-ET1', name: 'Backup Completion Log', templateType: 'LOG_ENTRY', isRequired: true },
      { templateId: 'CP-9-ET2', name: 'Backup Integrity Check', templateType: 'HASH_PROOF', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-CP-10',
    controlFamily: 'CP',
    title: 'Contingency Planning — System Recovery and Reconstitution',
    description: 'Provides for system recovery. Docker compose enables rapid reconstitution, migrations auto-run on startup, governance re-seeded if needed.',
    requirements: [
      { requirementId: 'CP-10-R1', description: 'System recoverable via docker compose from clean state', checkType: 'evidence', isMandatory: true },
      { requirementId: 'CP-10-R2', description: 'Migrations auto-apply on service startup', checkType: 'automated', isMandatory: true },
      { requirementId: 'CP-10-R3', description: 'Governance library re-seedable via API endpoint', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Docker compose recovery documentation', 'Auto-migration verification', 'Re-seed capability test results'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'CP-10-ET1', name: 'Recovery Procedure Documentation', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
];
