/**
 * MAI Framework - Mandatory/Advisory/Informational
 *
 * Instruction Pack defining the core governance classification system.
 *
 * PURPOSE:
 * Prevent Agent Drift by establishing clear "rules of engagement" for
 * AI behavior in governed environments.
 *
 * DUAL USE:
 * - Internal: Core governance engine for all ACE operations
 * - External: Key differentiator in proposals, training for customers
 */

import { PackManifest, PackType, PackCategory } from '../../types';

export const maiFrameworkManifest: PackManifest = {
  id: 'mai-framework',
  name: 'MAI Framework - Governance Classification',
  type: PackType.INSTRUCTION,
  category: PackCategory.SECURITY,
  version: '1.0.0',
  description: 'The Mandatory/Advisory/Informational framework for AI governance. Prevents agent drift through clear behavioral classification and runtime enforcement.',
  longDescription: `
## What is MAI?

MAI (Mandatory/Advisory/Informational) is ACE's core governance pattern for classifying and enforcing AI behavior rules.

## The Agent Drift Problem

Uncontrolled AI agents:
- Evolve behavior over time without oversight
- Make decisions outside their authorized scope
- Create audit gaps when actions can't be traced to policy
- Generate compliance risk through inconsistent enforcement

## The MAI Solution

Every AI action is classified into one of three categories:

### 🔴 MANDATORY (M)
**Hard-coded rules that cannot be bypassed**

- Blocking actions that violate policy
- Required approvals before sensitive operations
- Non-negotiable compliance requirements
- Examples: No PII export, human approval for legal documents

### 🟡 ADVISORY (A)
**Guidelines that should be followed, with override capability**

- Best practices and SOPs
- Recommended workflows
- Escalation suggestions
- Override requires justification (logged)
- Examples: Review low-confidence outputs, prefer authoritative sources

### 🟢 INFORMATIONAL (I)
**Context and awareness for decision-making**

- Real-time data feeds
- Situational awareness
- Logging and monitoring
- No enforcement, pure observation
- Examples: System status, workload metrics, deadline tracking

## Why MAI Matters

1. **Auditability**: Every action maps to a policy classification
2. **Consistency**: Rules are enforced the same way every time
3. **Flexibility**: Advisory rules allow human judgment
4. **Transparency**: Clear distinction between hard rules and guidance
`,

  author: {
    name: 'ACE Governance',
    email: 'governance@ace-platform.io'
  },

  license: 'proprietary',

  pricing: {
    type: 'paid',
    annual: 3000
  },

  compatibility: {
    platformVersion: '1.0.0'
  },

  provides: {
    policies: [
      // =======================================================================
      // MANDATORY (M) - CORE NON-NEGOTIABLES
      // =======================================================================
      {
        id: 'mai-no-auth-bypass',
        name: 'No Authentication Bypass',
        description: 'AI must never attempt to bypass, circumvent, or work around authentication mechanisms.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['auth_bypass_attempt', 'credential_fabrication', 'session_hijack']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Authentication bypass attempts are prohibited'
            }
          },
          {
            type: 'alert',
            config: {
              level: 'critical',
              notify: ['security_team']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'mai-no-captcha-solve',
        name: 'No CAPTCHA/Bot Detection Bypass',
        description: 'AI must respect bot detection mechanisms and never attempt to solve CAPTCHAs or bypass verification.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['captcha_solve', 'bot_detection_bypass', 'rate_limit_evasion']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Bot detection bypass is prohibited'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'mai-human-approval-submissions',
        name: 'Human Approval for External Submissions',
        description: 'All submissions to external systems (forms, applications, communications) require human approval.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['form_submit', 'application_submit', 'external_communication']
            }
          }
        ],
        actions: [
          {
            type: 'require_approval',
            config: {
              approverRole: 'operator',
              timeout: 3600,
              message: 'External submission requires human approval'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'mai-no-pii-export',
        name: 'PII Export Prevention',
        description: 'Personally Identifiable Information cannot be exported or transmitted without explicit authorization.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['pii_ssn', 'pii_financial', 'pii_health', 'pii_biometric']
            }
          }
        ],
        actions: [
          {
            type: 'redact',
            config: {
              replacement: '[REDACTED-PII]'
            }
          },
          {
            type: 'block',
            config: {
              condition: 'export_attempt',
              message: 'PII export requires explicit authorization'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'mai-scope-boundary',
        name: 'Scope Boundary Enforcement',
        description: 'AI operations must stay within defined scope boundaries. Actions outside scope are blocked.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['out_of_scope_action', 'unauthorized_system_access', 'scope_expansion']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Action outside authorized scope'
            }
          },
          {
            type: 'log',
            config: {
              level: 'warning',
              reason: 'scope_violation_attempt'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // ADVISORY (A) - GUIDELINES WITH OVERRIDE
      // =======================================================================
      {
        id: 'mai-low-confidence-review',
        name: 'Low Confidence Output Review',
        description: 'Outputs below confidence threshold should be reviewed by human before use.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'confidence_score',
              operator: '<',
              threshold: 'advisory-confidence-threshold'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              message: 'Low confidence output - review recommended'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'advisory-confidence-threshold',
            name: 'Confidence Review Threshold',
            description: 'Confidence score below which human review is recommended',
            type: 'percentage',
            defaultValue: 75,
            min: 50,
            max: 95
          }
        ]
      },
      {
        id: 'mai-prefer-authoritative',
        name: 'Prefer Authoritative Sources',
        description: 'When multiple sources available, prefer authoritative (.gov, primary) sources.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['multiple_sources_available']
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              condition: 'non_authoritative_selected',
              message: 'Authoritative source available - consider using instead'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      },
      {
        id: 'mai-escalation-complex',
        name: 'Complex Decision Escalation',
        description: 'Complex decisions with multiple factors should be escalated to appropriate human role.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'decision_complexity',
              operator: '>',
              threshold: 'complexity-escalation-threshold'
            }
          }
        ],
        actions: [
          {
            type: 'escalate',
            config: {
              to: 'analyst',
              reason: 'Complex decision - human judgment recommended'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'complexity-escalation-threshold',
            name: 'Complexity Escalation Threshold',
            description: 'Complexity score above which escalation is recommended',
            type: 'number',
            defaultValue: 7,
            min: 1,
            max: 10
          }
        ]
      },
      {
        id: 'mai-sop-compliance',
        name: 'SOP Compliance Guidance',
        description: 'Operations should follow established Standard Operating Procedures. Deviations require justification.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['sop_deviation']
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              message: 'Action deviates from SOP - justification recommended'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      },
      {
        id: 'mai-dual-control-sensitive',
        name: 'Dual Control for Sensitive Operations',
        description: 'Sensitive operations should have secondary review before execution.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'action',
            config: {
              actions: ['sensitive_data_access', 'privileged_operation', 'configuration_change']
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              message: 'Sensitive operation - secondary review recommended'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      },

      // =======================================================================
      // INFORMATIONAL (I) - AWARENESS & LOGGING
      // =======================================================================
      {
        id: 'mai-action-logging',
        name: 'Comprehensive Action Logging',
        description: 'All AI actions are logged with timestamp, context, and classification.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['action_start', 'action_complete', 'action_failed']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'info',
              include: ['action', 'actor', 'context', 'classification', 'outcome']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'mai-performance-metrics',
        name: 'Performance Metrics Collection',
        description: 'Tracks execution time, resource usage, and throughput metrics.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'schedule',
            config: {
              interval: '1m'
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'debug',
              include: ['execution_time', 'memory_usage', 'api_calls', 'queue_depth']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      },
      {
        id: 'mai-deadline-awareness',
        name: 'Deadline Tracking',
        description: 'Monitors approaching deadlines and provides awareness alerts.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'days_to_deadline',
              operator: '<',
              threshold: 'deadline-warning-days'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              level: 'info',
              message: 'Deadline approaching'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'deadline-warning-days',
            name: 'Deadline Warning (Days)',
            description: 'Days before deadline to trigger awareness alert',
            type: 'number',
            defaultValue: 7,
            min: 1,
            max: 30
          }
        ]
      },
      {
        id: 'mai-drift-detection',
        name: 'Agent Drift Detection',
        description: 'Monitors for behavioral changes that may indicate agent drift from established patterns.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['behavior_anomaly', 'pattern_deviation', 'unexpected_output']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'warning',
              include: ['deviation_type', 'baseline', 'observed', 'confidence']
            }
          },
          {
            type: 'alert',
            config: {
              level: 'info',
              message: 'Potential agent drift detected - review recommended'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      }
    ],

    workflows: [
      {
        id: 'mai-classification-check',
        name: 'MAI Classification Check',
        description: 'Validates action against MAI classification before execution',
        entryPoint: 'workflows/mai-check.ts',
        requiredPermissions: ['policy:read', 'action:classify']
      },
      {
        id: 'mai-override-workflow',
        name: 'Advisory Override Workflow',
        description: 'Handles justified overrides of Advisory policies',
        entryPoint: 'workflows/advisory-override.ts',
        requiredPermissions: ['policy:override', 'audit:write']
      }
    ],

    components: [
      {
        id: 'mai-dashboard',
        name: 'MAI Governance Dashboard',
        location: 'dashboard',
        component: 'components/MAIDashboard.tsx',
        icon: '🛡️',
        requiredPermissions: ['dashboard:view']
      }
    ],

    reports: [
      {
        id: 'mai-enforcement-report',
        name: 'MAI Enforcement Report',
        description: 'Summary of policy enforcement: blocks, approvals, overrides',
        template: 'reports/mai-enforcement.hbs',
        formats: ['pdf', 'html', 'json']
      },
      {
        id: 'mai-drift-report',
        name: 'Agent Drift Analysis',
        description: 'Analysis of behavioral changes and drift indicators',
        template: 'reports/drift-analysis.hbs',
        formats: ['pdf', 'html']
      }
    ]
  },

  compliance: [
    {
      framework: 'NIST 800-53',
      version: 'Rev 5',
      controls: [
        {
          controlId: 'AC-3',
          controlName: 'Access Enforcement',
          implementation: 'MAI Mandatory policies enforce access decisions at runtime',
          evidence: ['enforcement-log', 'block-events']
        },
        {
          controlId: 'AC-6',
          controlName: 'Least Privilege',
          implementation: 'Scope boundary enforcement limits AI to authorized actions',
          evidence: ['scope-boundary-log']
        },
        {
          controlId: 'AU-2',
          controlName: 'Audit Events',
          implementation: 'Informational policies log all auditable events',
          evidence: ['action-log', 'audit-trail']
        },
        {
          controlId: 'AU-3',
          controlName: 'Content of Audit Records',
          implementation: 'Logs include timestamp, actor, action, classification, outcome',
          evidence: ['audit-record-sample']
        },
        {
          controlId: 'AU-12',
          controlName: 'Audit Generation',
          implementation: 'Automatic audit record generation for all classified actions',
          evidence: ['audit-generation-config']
        },
        {
          controlId: 'SI-4',
          controlName: 'System Monitoring',
          implementation: 'Drift detection monitors for behavioral anomalies',
          evidence: ['drift-detection-log', 'anomaly-alerts']
        }
      ]
    },
    {
      framework: 'NIST AI RMF',
      version: '1.0',
      controls: [
        {
          controlId: 'GOVERN 1.1',
          controlName: 'Legal and regulatory requirements',
          implementation: 'MAI framework ensures AI operates within legal boundaries',
          evidence: ['mai-enforcement-report']
        },
        {
          controlId: 'MAP 1.5',
          controlName: 'Impacts to individuals, groups, communities',
          implementation: 'PII protection and scope boundaries prevent harmful impacts',
          evidence: ['pii-protection-log', 'scope-enforcement-log']
        },
        {
          controlId: 'MEASURE 2.6',
          controlName: 'AI system performance or assurance criteria',
          implementation: 'Drift detection monitors AI performance against baseline',
          evidence: ['drift-analysis-report']
        }
      ]
    }
  ],

  configuration: {
    sections: [
      {
        id: 'mandatory-settings',
        title: 'Mandatory Policy Settings',
        description: 'Configure non-bypassable rules (some settings may be locked)',
        fields: [
          {
            id: 'block-mode',
            label: 'Block Mode',
            description: 'How to handle Mandatory policy violations',
            type: 'select',
            defaultValue: 'hard-block',
            options: [
              { value: 'hard-block', label: 'Hard Block (No Override)' },
              { value: 'soft-block', label: 'Soft Block (Admin Override Only)' }
            ]
          },
          {
            id: 'notify-on-block',
            label: 'Notify on Block',
            description: 'Send notification when Mandatory policy blocks action',
            type: 'boolean',
            defaultValue: true
          }
        ]
      },
      {
        id: 'advisory-settings',
        title: 'Advisory Policy Settings',
        description: 'Configure guideline enforcement and override requirements',
        fields: [
          {
            id: 'require-justification',
            label: 'Require Override Justification',
            description: 'Require written justification when overriding Advisory policies',
            type: 'boolean',
            defaultValue: true
          },
          {
            id: 'log-overrides',
            label: 'Log All Overrides',
            description: 'Create audit record for every Advisory override',
            type: 'boolean',
            defaultValue: true
          },
          {
            id: 'override-expiry',
            label: 'Override Expiry (Hours)',
            description: 'How long an override remains valid',
            type: 'number',
            defaultValue: 24,
            validation: { min: 1, max: 168 }
          }
        ]
      },
      {
        id: 'informational-settings',
        title: 'Informational Policy Settings',
        description: 'Configure logging and monitoring behavior',
        fields: [
          {
            id: 'log-level',
            label: 'Default Log Level',
            description: 'Minimum severity for logged events',
            type: 'select',
            defaultValue: 'info',
            options: [
              { value: 'debug', label: 'Debug (Verbose)' },
              { value: 'info', label: 'Info (Standard)' },
              { value: 'warning', label: 'Warning (Important Only)' }
            ]
          },
          {
            id: 'metrics-interval',
            label: 'Metrics Collection Interval',
            description: 'How often to collect performance metrics',
            type: 'select',
            defaultValue: '1m',
            options: [
              { value: '30s', label: '30 Seconds' },
              { value: '1m', label: '1 Minute' },
              { value: '5m', label: '5 Minutes' }
            ]
          }
        ]
      }
    ]
  },

  tags: ['governance', 'compliance', 'audit', 'enforcement', 'drift-prevention', 'mai'],
  icon: '🛡️'
};

export default maiFrameworkManifest;
