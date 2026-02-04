/**
 * Federal BD Governance Pack - Manifest
 *
 * Complete governance configuration for federal business development
 * including SAM.gov opportunity management, competitive analysis,
 * and bid/no-bid decision workflows.
 */

import { PackManifest, PackType, PackCategory } from '../../types';

export const federalBDManifest: PackManifest = {
  // ==========================================================================
  // IDENTIFICATION
  // ==========================================================================
  id: 'federal-bd',
  name: 'Federal BD Governance Pack',
  type: PackType.GOVERNANCE,
  category: PackCategory.FEDERAL,
  version: '1.0.0',

  description: 'Complete governance for federal business development including opportunity qualification, competitive analysis, and bid/no-bid decisions with full audit trails.',

  longDescription: `
The Federal BD Governance Pack provides enterprise-grade governance for federal
contracting business development operations. It includes:

- **SAM.gov Integration**: Automated opportunity discovery and data ingestion
- **Competitive Analysis**: USASpending.gov integration for market intelligence
- **Win Probability Scoring**: AI-assisted probability calculation with human checkpoints
- **Bid/No-Bid Workflow**: Governed decision process with audit trail
- **Evidence Pack Generation**: Automated documentation for proposal support
- **Compliance Mapping**: FAR/DFAR and NIST 800-171 alignment

All AI-assisted functions operate under MAI governance with configurable
human oversight thresholds.
  `.trim(),

  author: {
    name: 'Storey Governance Solutions',
    email: 'support@storeygovernance.com',
    url: 'https://storeygovernance.com'
  },

  license: 'proprietary',

  pricing: {
    type: 'paid',
    perpetual: 15000,
    annual: 5000
  },

  // ==========================================================================
  // COMPATIBILITY
  // ==========================================================================
  compatibility: {
    platformVersion: '1.0.0'
  },

  dependencies: [],
  conflicts: [],

  tags: [
    'federal', 'government', 'contracting', 'bd', 'business-development',
    'sam-gov', 'rfp', 'proposal', 'capture', 'far', 'dfar'
  ],

  // ==========================================================================
  // PROVIDES
  // ==========================================================================
  provides: {
    // ========================================================================
    // POLICIES
    // ========================================================================
    policies: [
      {
        id: 'bd-data-source-verification',
        name: 'Data Source Verification',
        description: 'Ensures all opportunity data comes from verified government sources (SAM.gov, USASpending.gov). Blocks mock data in production.',
        classification: 'MANDATORY',
        triggers: [
          { type: 'action', config: { actions: ['opportunity.analyze', 'opportunity.qualify'] } }
        ],
        actions: [
          { type: 'block', config: { when: 'strict_mode && data_source == mock' } },
          { type: 'log', config: { fields: ['data_source', 'timestamp', 'opportunity_id'] } }
        ],
        enabledByDefault: true,
        canDisable: false,
        thresholds: []
      },
      {
        id: 'bd-win-probability-review',
        name: 'Win Probability Review Threshold',
        description: 'Requires human review when AI-calculated win probability is used for bid decisions above configured value.',
        classification: 'MANDATORY',
        triggers: [
          { type: 'threshold', config: { field: 'win_probability', operator: '>=', value: 'threshold' } }
        ],
        actions: [
          { type: 'require_approval', config: { roles: ['BD_MANAGER', 'CAPTURE_MANAGER', 'ISSO'] } },
          { type: 'log', config: { fields: ['calculated_probability', 'reviewer', 'decision'] } }
        ],
        enabledByDefault: true,
        canDisable: false,
        thresholds: [
          {
            id: 'review-threshold',
            name: 'Review Threshold',
            description: 'Win probability percentage that triggers mandatory review',
            type: 'percentage',
            defaultValue: 50,
            min: 0,
            max: 100
          }
        ]
      },
      {
        id: 'bd-bid-decision-approval',
        name: 'Bid Decision Approval',
        description: 'All final bid/no-bid decisions must be approved by authorized personnel.',
        classification: 'MANDATORY',
        triggers: [
          { type: 'action', config: { actions: ['opportunity.bid', 'opportunity.no_bid'] } }
        ],
        actions: [
          { type: 'require_approval', config: { roles: ['BD_MANAGER', 'ISSO'] } },
          { type: 'log', config: { fields: ['decision', 'approver', 'rationale', 'timestamp'] } }
        ],
        enabledByDefault: true,
        canDisable: false,
        thresholds: []
      },
      {
        id: 'bd-high-value-escalation',
        name: 'High Value Opportunity Escalation',
        description: 'Opportunities above threshold value require executive review.',
        classification: 'MANDATORY',
        triggers: [
          { type: 'threshold', config: { field: 'estimated_value', operator: '>=', value: 'threshold' } }
        ],
        actions: [
          { type: 'escalate', config: { to: ['ISSO'], reason: 'High value opportunity' } },
          { type: 'log', config: { fields: ['opportunity_id', 'estimated_value', 'escalated_to'] } }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'high-value-threshold',
            name: 'High Value Threshold',
            description: 'Dollar amount that triggers executive escalation',
            type: 'number',
            defaultValue: 5000000,
            min: 100000,
            max: 1000000000
          }
        ]
      },
      {
        id: 'bd-competitor-analysis-logging',
        name: 'Competitor Analysis Audit',
        description: 'All competitor intelligence gathering is logged for audit purposes.',
        classification: 'INFORMATIONAL',
        triggers: [
          { type: 'action', config: { actions: ['competitor.analyze', 'market.research'] } }
        ],
        actions: [
          { type: 'log', config: { fields: ['data_sources', 'competitors_analyzed', 'timestamp'] } }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: []
      },
      {
        id: 'bd-teaming-recommendation-review',
        name: 'Teaming Recommendation Review',
        description: 'AI teaming partner recommendations should be reviewed before outreach.',
        classification: 'ADVISORY',
        triggers: [
          { type: 'action', config: { actions: ['teaming.recommend'] } }
        ],
        actions: [
          { type: 'alert', config: { message: 'Review AI teaming recommendations before partner outreach' } },
          { type: 'log', config: { fields: ['recommendations', 'reviewed_by', 'timestamp'] } }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: []
      },
      {
        id: 'bd-deadline-warning',
        name: 'Response Deadline Warning',
        description: 'Alerts when opportunity deadline is approaching.',
        classification: 'ADVISORY',
        triggers: [
          { type: 'schedule', config: { check: 'daily', field: 'response_deadline' } }
        ],
        actions: [
          { type: 'alert', config: { when: 'days_until_deadline <= threshold' } }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'deadline-warning-days',
            name: 'Warning Days',
            description: 'Days before deadline to start warning',
            type: 'number',
            defaultValue: 14,
            min: 1,
            max: 90
          }
        ]
      }
    ],

    // ========================================================================
    // WORKFLOWS
    // ========================================================================
    workflows: [
      {
        id: 'opportunity-qualification',
        name: 'Opportunity Qualification',
        description: 'Qualify SAM.gov opportunities for pursuit',
        entryPoint: 'workflows/qualifyOpportunity.ts',
        requiredPermissions: ['opportunity:qualify'],
        inputSchema: {
          type: 'object',
          properties: {
            rfpNumber: { type: 'string' },
            naicsCodes: { type: 'array', items: { type: 'string' } },
            minValue: { type: 'number' },
            maxValue: { type: 'number' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            qualified: { type: 'boolean' },
            score: { type: 'number' },
            factors: { type: 'array' }
          }
        }
      },
      {
        id: 'competitive-analysis',
        name: 'Competitive Analysis',
        description: 'Analyze competitive landscape using USASpending data',
        entryPoint: 'workflows/analyzeCompetition.ts',
        requiredPermissions: ['opportunity:qualify'],
        inputSchema: {
          type: 'object',
          properties: {
            agency: { type: 'string' },
            naicsCode: { type: 'string' },
            yearsBack: { type: 'number' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            competitors: { type: 'array' },
            marketTrends: { type: 'object' },
            incumbentAnalysis: { type: 'object' }
          }
        }
      },
      {
        id: 'bid-decision',
        name: 'Bid/No-Bid Decision',
        description: 'Execute governed bid/no-bid decision process',
        entryPoint: 'workflows/bidDecision.ts',
        requiredPermissions: ['opportunity:decide'],
        inputSchema: {
          type: 'object',
          properties: {
            opportunityId: { type: 'string' },
            recommendation: { type: 'string', enum: ['bid', 'no_bid', 'review'] }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            decision: { type: 'string' },
            approvedBy: { type: 'string' },
            rationale: { type: 'string' },
            evidencePackId: { type: 'string' }
          }
        }
      }
    ],

    // ========================================================================
    // COMPONENTS
    // ========================================================================
    components: [
      {
        id: 'bd-dashboard',
        name: 'BD Pipeline Dashboard',
        location: 'dashboard',
        component: 'components/BDDashboard.tsx',
        icon: 'briefcase',
        requiredPermissions: ['opportunity:view']
      },
      {
        id: 'opportunity-detail',
        name: 'Opportunity Detail',
        location: 'standalone',
        component: 'components/OpportunityDetail.tsx',
        route: '/bd/opportunity/:id',
        requiredPermissions: ['opportunity:view']
      },
      {
        id: 'competitive-landscape',
        name: 'Competitive Landscape',
        location: 'standalone',
        component: 'components/CompetitiveLandscape.tsx',
        route: '/bd/competitive/:opportunityId',
        requiredPermissions: ['opportunity:qualify']
      }
    ],

    // ========================================================================
    // REPORTS
    // ========================================================================
    reports: [
      {
        id: 'pipeline-summary',
        name: 'Pipeline Summary Report',
        description: 'Summary of all opportunities in pipeline with status and value',
        template: 'reports/pipelineSummary.hbs',
        formats: ['pdf', 'html', 'csv']
      },
      {
        id: 'bid-decision-report',
        name: 'Bid Decision Report',
        description: 'Detailed report of bid decision with all supporting analysis',
        template: 'reports/bidDecision.hbs',
        formats: ['pdf', 'html']
      },
      {
        id: 'win-loss-analysis',
        name: 'Win/Loss Analysis',
        description: 'Analysis of won and lost opportunities for lessons learned',
        template: 'reports/winLossAnalysis.hbs',
        formats: ['pdf', 'html']
      }
    ],

    // ========================================================================
    // EVIDENCE TEMPLATES
    // ========================================================================
    evidenceTemplates: [
      {
        id: 'opportunity-evidence-pack',
        name: 'Opportunity Evidence Pack',
        description: 'Complete evidence package for opportunity pursuit decision',
        schema: 'schemas/opportunityEvidencePack.json'
      }
    ]
  },

  // ==========================================================================
  // COMPLIANCE MAPPING
  // ==========================================================================
  compliance: [
    {
      framework: 'FAR',
      version: '2024',
      controls: [
        {
          controlId: 'FAR 3.104',
          controlName: 'Procurement Integrity',
          implementation: 'All competitive intelligence is logged with source attribution. No non-public information is accessed.',
          evidence: ['competitor-analysis-audit-log', 'data-source-verification-log']
        },
        {
          controlId: 'FAR 9.5',
          controlName: 'Organizational Conflicts of Interest',
          implementation: 'Teaming recommendations include OCI screening. Human review required before partner outreach.',
          evidence: ['teaming-recommendation-review-log']
        }
      ]
    },
    {
      framework: 'NIST 800-171',
      version: 'Rev 2',
      controls: [
        {
          controlId: '3.1.1',
          controlName: 'Authorized Access Control',
          implementation: 'Role-based access to opportunity data. BD_MANAGER and CAPTURE_MANAGER roles defined.',
          evidence: ['access-control-audit-log']
        },
        {
          controlId: '3.3.1',
          controlName: 'Audit Events',
          implementation: 'All BD actions logged with user, timestamp, action, and outcome.',
          evidence: ['bd-audit-trail']
        }
      ]
    }
  ],

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  configuration: {
    sections: [
      {
        id: 'company-profile',
        title: 'Company Profile',
        description: 'Your company information for win probability calculations',
        fields: [
          {
            id: 'companyName',
            label: 'Company Name',
            type: 'text',
            defaultValue: '',
            required: true
          },
          {
            id: 'yearsInBusiness',
            label: 'Years in Business',
            type: 'number',
            defaultValue: 10,
            validation: { min: 0, max: 200 }
          },
          {
            id: 'naicsCodes',
            label: 'NAICS Codes',
            description: 'Your company\'s primary NAICS codes (comma-separated)',
            type: 'text',
            defaultValue: '541512,541511,541519'
          },
          {
            id: 'certifications',
            label: 'Certifications',
            description: 'Your set-aside certifications',
            type: 'multiselect',
            defaultValue: [],
            options: [
              { value: 'SDVOSB', label: 'Service-Disabled Veteran-Owned Small Business' },
              { value: 'VOSB', label: 'Veteran-Owned Small Business' },
              { value: '8a', label: '8(a) Business Development' },
              { value: 'HUBZone', label: 'HUBZone' },
              { value: 'WOSB', label: 'Women-Owned Small Business' },
              { value: 'small', label: 'Small Business' }
            ]
          }
        ]
      },
      {
        id: 'opportunity-filters',
        title: 'Opportunity Filters',
        description: 'Default filters for opportunity discovery',
        fields: [
          {
            id: 'minContractValue',
            label: 'Minimum Contract Value',
            type: 'number',
            defaultValue: 100000,
            validation: { min: 0 }
          },
          {
            id: 'maxContractValue',
            label: 'Maximum Contract Value',
            type: 'number',
            defaultValue: 50000000,
            validation: { min: 0 }
          },
          {
            id: 'targetAgencies',
            label: 'Target Agencies',
            description: 'Preferred agencies to monitor (leave empty for all)',
            type: 'textarea',
            defaultValue: ''
          }
        ]
      },
      {
        id: 'analysis-settings',
        title: 'Analysis Settings',
        description: 'Settings for AI-assisted analysis',
        fields: [
          {
            id: 'competitorAnalysisYears',
            label: 'Competitor Analysis Years',
            description: 'How many years of past awards to analyze',
            type: 'number',
            defaultValue: 3,
            validation: { min: 1, max: 10 }
          },
          {
            id: 'autoQualifyThreshold',
            label: 'Auto-Qualify Threshold',
            description: 'Score threshold for automatic qualification (0-100). Set to 100 to disable.',
            type: 'number',
            defaultValue: 100,
            validation: { min: 0, max: 100 }
          },
          {
            id: 'strictDataMode',
            label: 'Strict Data Mode',
            description: 'Fail if real data sources are unavailable (recommended for production)',
            type: 'boolean',
            defaultValue: false
          }
        ]
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Alert and notification settings',
        fields: [
          {
            id: 'deadlineAlertDays',
            label: 'Deadline Alert Days',
            description: 'Days before deadline to send alerts',
            type: 'number',
            defaultValue: 14,
            validation: { min: 1, max: 90 }
          },
          {
            id: 'emailNotifications',
            label: 'Email Notifications',
            type: 'boolean',
            defaultValue: true
          },
          {
            id: 'notificationEmail',
            label: 'Notification Email',
            type: 'text',
            defaultValue: '',
            showWhen: { field: 'emailNotifications', equals: true }
          }
        ]
      }
    ]
  },

  // ==========================================================================
  // HOOKS
  // ==========================================================================
  hooks: {
    postInstall: 'hooks/postInstall.ts',
    onConfigChange: 'hooks/onConfigChange.ts'
  },

  // ==========================================================================
  // DOCUMENTATION
  // ==========================================================================
  documentation: {
    readme: 'README.md',
    quickStart: 'docs/QUICK-START.md',
    configuration: 'docs/CONFIGURATION.md'
  }
};

export default federalBDManifest;
