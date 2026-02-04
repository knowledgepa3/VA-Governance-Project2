/**
 * Why Agents Fail Audits - Audit Defense Pack
 *
 * Instruction Pack that teaches audit readiness and creates urgency.
 *
 * PURPOSE:
 * This is your BD tool. Creates a "gap" in the prospect's mind by showing
 * them the flaws in standard AI deployments.
 *
 * DUAL USE:
 * - Internal: Red team scenarios, audit preparation
 * - External: Sales enablement, gap analysis for prospects
 */

import { PackManifest, PackType, PackCategory } from '../../types';

export const auditDefenseManifest: PackManifest = {
  id: 'audit-defense',
  name: 'Audit Defense - Why Agents Fail',
  type: PackType.INSTRUCTION,
  category: PackCategory.SECURITY,
  version: '1.0.0',
  description: 'Audit readiness framework that identifies and remediates common AI deployment vulnerabilities before auditors find them.',
  longDescription: `
## The Problem: Standard AI is an Audit Liability

When federal auditors or legal teams examine AI deployments, they ask questions that standard implementations cannot answer:

### The 5 Questions That Kill AI Deployments

1. **"Show me the decision trail"**
   - Standard AI: "We can show you the output..."
   - Auditor: "No, show me HOW it decided. Every step."
   - **Gap: No decision provenance**

2. **"Prove this data is real"**
   - Standard AI: "The model retrieved it from..."
   - Auditor: "Prove it wasn't hallucinated or cached incorrectly"
   - **Gap: No data provenance**

3. **"Who approved this action?"**
   - Standard AI: "The system automatically..."
   - Auditor: "Where's the human authorization?"
   - **Gap: No approval workflow**

4. **"What rules governed this?"**
   - Standard AI: "We have guidelines..."
   - Auditor: "Show me the enforcement log"
   - **Gap: No governance enforcement**

5. **"Has behavior changed over time?"**
   - Standard AI: "We monitor for..."
   - Auditor: "Show me the drift analysis"
   - **Gap: No behavioral baseline**

## The Solution: ACE Audit Defense

This pack implements proactive audit readiness:

- **Decision Trail**: Hash-chained audit logs for every action
- **Data Provenance**: ECV Protocol integration for source verification
- **Approval Workflows**: MAI MANDATORY gates with human authorization
- **Governance Enforcement**: Runtime policy enforcement with logging
- **Drift Detection**: Behavioral baseline monitoring

## Why This Matters

In federal and regulated environments:
- **GAO audits** examine AI decision-making
- **IG investigations** require complete trails
- **Legal discovery** demands defensible documentation
- **Compliance assessments** need control evidence

Without ACE's governance, standard AI is a liability waiting to be discovered.
`,

  author: {
    name: 'ACE Governance',
    email: 'governance@ace-platform.io'
  },

  license: 'proprietary',

  pricing: {
    type: 'paid',
    annual: 3500
  },

  compatibility: {
    platformVersion: '1.0.0'
  },

  dependencies: [
    {
      packId: 'mai-framework',
      version: '>=1.0.0',
      required: true
    },
    {
      packId: 'ecv-protocol',
      version: '>=1.0.0',
      required: true
    }
  ],

  provides: {
    policies: [
      // =======================================================================
      // AUDIT TRAIL POLICIES
      // =======================================================================
      {
        id: 'audit-decision-chain',
        name: 'Decision Chain Documentation',
        description: 'Every decision must be documented with inputs, reasoning, and outputs in an immutable chain.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['decision_made', 'recommendation_generated', 'action_taken']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'audit',
              include: ['inputs', 'reasoning_steps', 'confidence', 'output', 'hash_chain'],
              immutable: true
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'audit-hash-chain',
        name: 'Hash Chain Integrity',
        description: 'Audit log entries are hash-chained to prevent tampering. Chain breaks trigger alerts.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['audit_entry_created']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              include: ['previous_hash', 'entry_hash', 'chain_position']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'audit-chain-verification',
        name: 'Chain Verification Check',
        description: 'Periodically verify audit chain integrity. Alert on any broken links.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'schedule',
            config: {
              interval: '1h'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              condition: 'chain_integrity_failure',
              level: 'critical',
              message: 'Audit chain integrity failure detected'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // APPROVAL TRAIL POLICIES
      // =======================================================================
      {
        id: 'audit-approval-documentation',
        name: 'Approval Documentation',
        description: 'All approvals must capture approver identity, timestamp, scope, and any conditions.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['approval_granted', 'approval_denied', 'approval_expired']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'audit',
              include: ['approver_id', 'approver_role', 'approval_scope', 'conditions', 'expiry', 'timestamp'],
              immutable: true
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'audit-no-implicit-approval',
        name: 'No Implicit Approval',
        description: 'Actions requiring approval cannot proceed on timeout or lack of response.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['approval_timeout', 'approval_skipped']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Explicit approval required - implicit approval not permitted'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // DATA PROVENANCE POLICIES
      // =======================================================================
      {
        id: 'audit-data-provenance',
        name: 'Data Source Documentation',
        description: 'All data used in decisions must have documented provenance (source, retrieval time, verification).',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['data_retrieved', 'data_used_in_decision']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'audit',
              include: ['source_system', 'retrieval_timestamp', 'verification_status', 'data_hash']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'audit-no-mock-production',
        name: 'No Mock Data in Production',
        description: 'Mock or simulated data must never be used in production workflows. Strict mode enforced.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['mock_data', 'simulated_data', 'demo_data']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              condition: 'production_environment',
              message: 'Mock data not permitted in production'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // BEHAVIORAL BASELINE POLICIES
      // =======================================================================
      {
        id: 'audit-behavioral-baseline',
        name: 'Behavioral Baseline Monitoring',
        description: 'Establish and monitor behavioral baselines. Significant deviations trigger alerts.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'behavior_deviation_score',
              operator: '>',
              threshold: 'drift-alert-threshold'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              level: 'warning',
              message: 'Behavioral deviation detected - review recommended'
            }
          },
          {
            type: 'log',
            config: {
              level: 'audit',
              include: ['baseline_metrics', 'current_metrics', 'deviation_details']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'drift-alert-threshold',
            name: 'Drift Alert Threshold',
            description: 'Deviation score above which drift alerts are triggered',
            type: 'percentage',
            defaultValue: 20,
            min: 5,
            max: 50
          }
        ]
      },
      {
        id: 'audit-output-sampling',
        name: 'Output Sampling for Verification',
        description: 'Randomly sample outputs for human verification to detect drift.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'random_sample',
              operator: '<',
              threshold: 'sample-rate'
            }
          }
        ],
        actions: [
          {
            type: 'escalate',
            config: {
              to: 'quality_reviewer',
              reason: 'Random sample for verification'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'sample-rate',
            name: 'Sample Rate (%)',
            description: 'Percentage of outputs to sample for verification',
            type: 'percentage',
            defaultValue: 5,
            min: 1,
            max: 25
          }
        ]
      },

      // =======================================================================
      // AUDIT READINESS POLICIES
      // =======================================================================
      {
        id: 'audit-evidence-retention',
        name: 'Evidence Retention',
        description: 'Audit evidence must be retained for required period. Premature deletion blocked.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['evidence_delete', 'log_purge', 'archive_removal']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              condition: 'within_retention_period',
              message: 'Evidence within retention period - deletion blocked'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'audit-readiness-check',
        name: 'Audit Readiness Self-Assessment',
        description: 'Weekly self-assessment of audit readiness. Gaps flagged for remediation.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'schedule',
            config: {
              interval: '7d'
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'info',
              include: ['readiness_score', 'gap_areas', 'recommendations']
            }
          },
          {
            type: 'alert',
            config: {
              condition: 'readiness_below_threshold',
              message: 'Audit readiness below threshold - review gaps'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      }
    ],

    workflows: [
      {
        id: 'audit-simulation',
        name: 'Audit Simulation',
        description: 'Simulates audit scenarios to identify gaps before real auditors find them',
        entryPoint: 'workflows/audit-simulation.ts',
        requiredPermissions: ['audit:simulate', 'evidence:read']
      },
      {
        id: 'gap-analysis',
        name: 'Gap Analysis Workflow',
        description: 'Analyzes current state against audit requirements and generates remediation plan',
        entryPoint: 'workflows/gap-analysis.ts',
        requiredPermissions: ['audit:analyze', 'report:generate']
      },
      {
        id: 'evidence-bundle-export',
        name: 'Evidence Bundle Export',
        description: 'Packages all audit evidence into exportable bundle',
        entryPoint: 'workflows/evidence-export.ts',
        requiredPermissions: ['evidence:export', 'audit:read']
      }
    ],

    components: [
      {
        id: 'audit-readiness-dashboard',
        name: 'Audit Readiness Dashboard',
        location: 'dashboard',
        component: 'components/AuditReadinessDashboard.tsx',
        icon: '📋',
        requiredPermissions: ['audit:view']
      },
      {
        id: 'gap-analyzer',
        name: 'Gap Analyzer',
        location: 'standalone',
        route: '/audit/gaps',
        component: 'components/GapAnalyzer.tsx',
        icon: '🔍',
        requiredPermissions: ['audit:analyze']
      }
    ],

    reports: [
      {
        id: 'audit-readiness-report',
        name: 'Audit Readiness Report',
        description: 'Comprehensive assessment of audit preparedness with gap analysis',
        template: 'reports/audit-readiness.hbs',
        formats: ['pdf', 'html']
      },
      {
        id: 'decision-trail-report',
        name: 'Decision Trail Report',
        description: 'Complete decision trail for specified time period or workflow',
        template: 'reports/decision-trail.hbs',
        formats: ['pdf', 'json']
      },
      {
        id: 'drift-analysis-report',
        name: 'Behavioral Drift Analysis',
        description: 'Analysis of behavioral changes over time with baseline comparisons',
        template: 'reports/drift-analysis.hbs',
        formats: ['pdf', 'html']
      },
      {
        id: 'gap-remediation-report',
        name: 'Gap Remediation Plan',
        description: 'Prioritized remediation plan for identified audit gaps',
        template: 'reports/gap-remediation.hbs',
        formats: ['pdf', 'html']
      }
    ],

    evidenceTemplates: [
      {
        id: 'audit-evidence-pack',
        name: 'Audit Evidence Pack',
        description: 'Standard format for packaging audit evidence',
        schema: 'schemas/audit-evidence-pack.json'
      }
    ]
  },

  compliance: [
    {
      framework: 'NIST 800-53',
      version: 'Rev 5',
      controls: [
        {
          controlId: 'AU-9',
          controlName: 'Protection of Audit Information',
          implementation: 'Hash-chained audit logs prevent tampering, chain verification detects modifications',
          evidence: ['chain-verification-log', 'integrity-alerts']
        },
        {
          controlId: 'AU-10',
          controlName: 'Non-repudiation',
          implementation: 'Decision trails and approval documentation provide non-repudiation',
          evidence: ['decision-trail-report', 'approval-log']
        },
        {
          controlId: 'AU-11',
          controlName: 'Audit Record Retention',
          implementation: 'Evidence retention policy prevents premature deletion',
          evidence: ['retention-policy-log', 'deletion-block-events']
        },
        {
          controlId: 'CA-2',
          controlName: 'Control Assessments',
          implementation: 'Audit readiness self-assessment provides ongoing control assessment',
          evidence: ['audit-readiness-report', 'gap-analysis']
        },
        {
          controlId: 'CA-7',
          controlName: 'Continuous Monitoring',
          implementation: 'Behavioral baseline monitoring and drift detection',
          evidence: ['drift-analysis-report', 'behavioral-alerts']
        }
      ]
    },
    {
      framework: 'GAO AI Accountability Framework',
      version: '2021',
      controls: [
        {
          controlId: 'GOVERNANCE',
          controlName: 'Governance and Oversight',
          implementation: 'MAI framework provides governance structure, audit trails enable oversight',
          evidence: ['mai-enforcement-report', 'decision-trail-report']
        },
        {
          controlId: 'DATA',
          controlName: 'Data Quality and Bias',
          implementation: 'Data provenance tracking ensures data quality transparency',
          evidence: ['provenance-report', 'data-source-log']
        },
        {
          controlId: 'PERFORMANCE',
          controlName: 'Performance Monitoring',
          implementation: 'Behavioral baseline monitoring tracks performance over time',
          evidence: ['drift-analysis-report', 'performance-metrics']
        },
        {
          controlId: 'ACCOUNTABILITY',
          controlName: 'Accountability',
          implementation: 'Complete decision trails with human approvals provide accountability',
          evidence: ['decision-trail-report', 'approval-log']
        }
      ]
    },
    {
      framework: 'Federal Rules of Evidence',
      version: '2024',
      controls: [
        {
          controlId: '901(b)(9)',
          controlName: 'Evidence from Electronic Process',
          implementation: 'Decision trails and provenance documentation support authenticity',
          evidence: ['decision-trail-report', 'provenance-report']
        },
        {
          controlId: '902(13)',
          controlName: 'Certified Records from Electronic Process',
          implementation: 'Evidence bundles include certification-ready documentation',
          evidence: ['evidence-bundle', 'chain-verification-report']
        }
      ]
    }
  ],

  configuration: {
    sections: [
      {
        id: 'retention-settings',
        title: 'Evidence Retention',
        description: 'Configure retention periods and deletion policies',
        fields: [
          {
            id: 'retention-period-years',
            label: 'Retention Period (Years)',
            description: 'How long to retain audit evidence',
            type: 'number',
            defaultValue: 7,
            validation: { min: 1, max: 10 }
          },
          {
            id: 'allow-early-deletion',
            label: 'Allow Early Deletion (Admin Only)',
            description: 'Allow admins to delete evidence before retention period expires',
            type: 'boolean',
            defaultValue: false
          }
        ]
      },
      {
        id: 'drift-settings',
        title: 'Drift Detection',
        description: 'Configure behavioral baseline monitoring',
        fields: [
          {
            id: 'baseline-window-days',
            label: 'Baseline Window (Days)',
            description: 'Number of days to use for establishing behavioral baseline',
            type: 'number',
            defaultValue: 30,
            validation: { min: 7, max: 90 }
          },
          {
            id: 'sensitivity',
            label: 'Detection Sensitivity',
            description: 'How sensitive drift detection should be',
            type: 'select',
            defaultValue: 'medium',
            options: [
              { value: 'low', label: 'Low (Major changes only)' },
              { value: 'medium', label: 'Medium (Balanced)' },
              { value: 'high', label: 'High (Minor changes flagged)' }
            ]
          }
        ]
      },
      {
        id: 'audit-simulation',
        title: 'Audit Simulation',
        description: 'Configure audit simulation settings',
        fields: [
          {
            id: 'simulation-frequency',
            label: 'Simulation Frequency',
            description: 'How often to run audit simulations',
            type: 'select',
            defaultValue: 'monthly',
            options: [
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'manual', label: 'Manual Only' }
            ]
          },
          {
            id: 'auto-remediation',
            label: 'Auto-Remediation',
            description: 'Automatically remediate minor gaps',
            type: 'boolean',
            defaultValue: false
          }
        ]
      }
    ]
  },

  tags: ['audit', 'compliance', 'governance', 'risk', 'federal', 'legal', 'gap-analysis'],
  icon: '📋'
};

export default auditDefenseManifest;
