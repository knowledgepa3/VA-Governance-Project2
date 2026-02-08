/**
 * NIST 800-53 Rev. 5 — PM: Program Management
 *
 * Controls for information security program management,
 * risk strategy, threat awareness, and insider threat.
 * In GIA context: governance program oversight, risk management
 * strategy, and organizational threat awareness.
 */

import type { ControlSeed } from './types';

export const PM_CONTROLS: ControlSeed[] = [
  {
    policyId: 'NIST-PM-1',
    controlFamily: 'PM',
    title: 'Program Management — Information Security Program Plan',
    description: 'Develops and disseminates organization-wide information security program plan. GIA governance library serves as the living security plan.',
    requirements: [
      { requirementId: 'PM-1-R1', description: 'Governance library serves as active security program plan', checkType: 'automated', isMandatory: true },
      { requirementId: 'PM-1-R2', description: 'Program plan updated when governance library changes', checkType: 'evidence', isMandatory: true },
    ],
    evidenceArtifacts: ['Governance library state snapshot', 'Library update changelog'],
    riskLevel: 'HIGH',
    maiLevel: 'ADVISORY',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-1-ET1', name: 'Program Plan Snapshot', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PM-3',
    controlFamily: 'PM',
    title: 'Program Management — Information Security Resources',
    description: 'Ensures adequate resources for the governance program. Token budgets, compute allocation, and cost monitoring tracked.',
    requirements: [
      { requirementId: 'PM-3-R1', description: 'Token usage tracked per pipeline run', checkType: 'automated', isMandatory: true },
      { requirementId: 'PM-3-R2', description: 'Cost monitoring active with alerting thresholds', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Token usage reports', 'Cost monitoring dashboard', 'Budget allocation records'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-3-ET1', name: 'Resource Allocation Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PM-9',
    controlFamily: 'PM',
    title: 'Program Management — Risk Strategy',
    description: 'Develops comprehensive risk management strategy. Storey Threshold provides quantitative governance health metric. Risk appetite defines organizational tolerance.',
    requirements: [
      { requirementId: 'PM-9-R1', description: 'Storey Threshold evaluated regularly (10-18% healthy band)', checkType: 'automated', isMandatory: true },
      { requirementId: 'PM-9-R2', description: 'Risk appetite defined per organizational profile', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PM-9-R3', description: 'Risk strategy reviewed when threshold deviates', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Storey Threshold evaluation reports', 'Risk appetite configuration', 'Strategy review records'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-9-ET1', name: 'Threshold Evaluation Report', templateType: 'DOCUMENT', isRequired: true },
      { templateId: 'PM-9-ET2', name: 'Risk Appetite Config', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PM-12',
    controlFamily: 'PM',
    title: 'Program Management — Insider Threat Program',
    description: 'Implements insider threat program. Monitors for privilege abuse, unauthorized data access, and anomalous agent behavior patterns.',
    requirements: [
      { requirementId: 'PM-12-R1', description: 'Anomaly detection monitors for unusual compliance patterns', checkType: 'automated', isMandatory: true },
      { requirementId: 'PM-12-R2', description: 'Privilege escalation attempts logged and alerted', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Anomaly detection reports', 'Privilege escalation alerts', 'Behavioral pattern analysis'],
    riskLevel: 'HIGH',
    maiLevel: 'MANDATORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-12-ET1', name: 'Threat Detection Report', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PM-15',
    controlFamily: 'PM',
    title: 'Program Management — Security Groups and Associations',
    description: 'Establishes contact with security groups for threat intelligence. Framework compliance mapping tracks industry standards alignment.',
    requirements: [
      { requirementId: 'PM-15-R1', description: 'Compliance framework mappings maintained and current', checkType: 'evidence', isMandatory: true },
      { requirementId: 'PM-15-R2', description: 'Industry threat intelligence incorporated into risk assessment', checkType: 'manual', isMandatory: false },
    ],
    evidenceArtifacts: ['Framework mapping reports', 'Threat intelligence integration records'],
    riskLevel: 'MEDIUM',
    maiLevel: 'INFORMATIONAL',
    implementationStatus: 'EVIDENCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-15-ET1', name: 'Framework Mapping Report', templateType: 'DOCUMENT', isRequired: true },
    ],
  },
  {
    policyId: 'NIST-PM-16',
    controlFamily: 'PM',
    title: 'Program Management — Threat Awareness Program',
    description: 'Implements threat awareness program. Drift alerts and anomaly detection provide real-time threat awareness for governance deviations.',
    requirements: [
      { requirementId: 'PM-16-R1', description: 'Drift alerts generated when compliance deviates from baseline', checkType: 'automated', isMandatory: true },
      { requirementId: 'PM-16-R2', description: 'Threat awareness shared via operator console alerts', checkType: 'automated', isMandatory: true },
    ],
    evidenceArtifacts: ['Drift alert history', 'Console alert notifications', 'Threat awareness briefings'],
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    implementationStatus: 'ENFORCED',
    applicableWorkerTypes: [],
    evidenceTemplates: [
      { templateId: 'PM-16-ET1', name: 'Drift Alert Report', templateType: 'LOG_ENTRY', isRequired: true },
    ],
  },
];
