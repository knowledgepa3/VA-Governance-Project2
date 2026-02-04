/**
 * ECV Protocol - Evidence Chain Verification
 *
 * Instruction Pack for ensuring forensic-grade evidence from AI outputs.
 *
 * PURPOSE:
 * Turn standard AI output into auditable, source-grounded evidence with
 * unbroken chains back to original documents.
 *
 * DUAL USE:
 * - Internal: Enforces evidence integrity in all ACE workflows
 * - External: Whitepaper / technical credibility for prospects
 */

import { PackManifest, PackType, PackCategory } from '../../types';

export const ecvProtocolManifest: PackManifest = {
  id: 'ecv-protocol',
  name: 'ECV Protocol - Evidence Chain Verification',
  type: PackType.INSTRUCTION,
  category: PackCategory.SECURITY,
  version: '1.0.0',
  description: 'Methodology for source grounding, citation mapping, and cross-verification. Ensures every AI-generated fact has a direct, unbroken chain back to the original source document.',
  longDescription: `
## What is ECV?

Evidence Chain Verification (ECV) is the ACE methodology for transforming standard AI outputs into forensic-grade evidence suitable for federal audits, legal discovery, and compliance documentation.

## The Problem

Standard AI outputs are:
- Unverifiable (no source attribution)
- Potentially hallucinated (no ground truth validation)
- Legally risky (no chain of custody)

## The ECV Solution

Every piece of information produced by an ACE-governed workflow includes:

1. **Source Grounding** - Direct link to authoritative source
2. **Citation Mapping** - Specific document, page, section references
3. **Cross-Verification** - Multiple source confirmation where available
4. **Confidence Scoring** - Transparency about certainty levels
5. **Provenance Trail** - Complete chain from source to output

## Why This Matters

In federal contexts, "the AI told me" is not a valid defense. ECV ensures that:
- Auditors can trace any claim to its source
- Legal teams have defensible documentation
- Compliance officers can demonstrate due diligence
`,

  author: {
    name: 'ACE Governance',
    email: 'governance@ace-platform.io'
  },

  license: 'proprietary',

  pricing: {
    type: 'paid',
    annual: 2500
  },

  compatibility: {
    platformVersion: '1.0.0'
  },

  provides: {
    policies: [
      // =======================================================================
      // SOURCE GROUNDING
      // =======================================================================
      {
        id: 'ecv-source-required',
        name: 'Source Attribution Required',
        description: 'All factual claims must include source attribution. Outputs without sources are blocked in strict mode.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['factual_claim', 'statistic', 'quote', 'date_reference']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              condition: 'no_source_attribution',
              message: 'Factual claim requires source attribution'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'ecv-authoritative-sources',
        name: 'Authoritative Source Preference',
        description: 'Primary sources (.gov, official documents) preferred over secondary. Alerts when using non-authoritative sources.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['source_citation']
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              condition: 'non_authoritative_source',
              message: 'Consider using primary/authoritative source'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true
      },

      // =======================================================================
      // CITATION MAPPING
      // =======================================================================
      {
        id: 'ecv-citation-specificity',
        name: 'Citation Specificity Required',
        description: 'Citations must include document name, date, and specific location (page, section, paragraph). Generic citations blocked.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['citation']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              condition: 'generic_citation',
              message: 'Citation must include specific document location'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'ecv-citation-freshness',
        name: 'Citation Freshness Check',
        description: 'Warns when citing documents older than threshold. Critical for regulatory/legal contexts where current versions matter.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'citation_age_days',
              operator: '>',
              threshold: 'citation-freshness-days'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              message: 'Citation may be outdated - verify current version'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'citation-freshness-days',
            name: 'Citation Freshness (Days)',
            description: 'Alert when citation source is older than this many days',
            type: 'number',
            defaultValue: 365,
            min: 30,
            max: 1825 // 5 years
          }
        ]
      },

      // =======================================================================
      // CROSS-VERIFICATION
      // =======================================================================
      {
        id: 'ecv-cross-verify-critical',
        name: 'Cross-Verification for Critical Claims',
        description: 'Critical claims (legal, financial, compliance) require verification from multiple independent sources.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['critical_claim', 'legal_assertion', 'compliance_statement', 'financial_figure']
            }
          }
        ],
        actions: [
          {
            type: 'require_approval',
            config: {
              condition: 'single_source_critical',
              message: 'Critical claim requires multi-source verification',
              approverRole: 'analyst'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },
      {
        id: 'ecv-contradiction-detection',
        name: 'Source Contradiction Detection',
        description: 'Flags when multiple sources provide conflicting information. Requires human resolution.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['source_contradiction']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Conflicting sources detected - human resolution required'
            }
          },
          {
            type: 'escalate',
            config: {
              to: 'analyst',
              reason: 'Source contradiction'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // CONFIDENCE & PROVENANCE
      // =======================================================================
      {
        id: 'ecv-confidence-disclosure',
        name: 'Confidence Score Disclosure',
        description: 'All outputs must include confidence indicators. Low-confidence outputs require explicit acknowledgment.',
        classification: 'ADVISORY',
        triggers: [
          {
            type: 'threshold',
            config: {
              field: 'confidence_score',
              operator: '<',
              threshold: 'confidence-threshold'
            }
          }
        ],
        actions: [
          {
            type: 'alert',
            config: {
              message: 'Low confidence output - explicit disclosure required'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: true,
        thresholds: [
          {
            id: 'confidence-threshold',
            name: 'Minimum Confidence Score',
            description: 'Alert when confidence falls below this percentage',
            type: 'percentage',
            defaultValue: 70,
            min: 50,
            max: 95
          }
        ]
      },
      {
        id: 'ecv-provenance-logging',
        name: 'Complete Provenance Trail',
        description: 'Logs the complete chain from source retrieval to output generation for every evidence-bearing output.',
        classification: 'INFORMATIONAL',
        triggers: [
          {
            type: 'event',
            config: {
              events: ['output_generated']
            }
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'info',
              include: ['sources', 'transformations', 'confidence', 'timestamp']
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      },

      // =======================================================================
      // HALLUCINATION PREVENTION
      // =======================================================================
      {
        id: 'ecv-no-hallucination',
        name: 'Hallucination Prevention',
        description: 'Blocks outputs that cannot be grounded in provided sources. AI must acknowledge when information is not available.',
        classification: 'MANDATORY',
        triggers: [
          {
            type: 'data_pattern',
            config: {
              patterns: ['ungrounded_claim', 'fabricated_reference']
            }
          }
        ],
        actions: [
          {
            type: 'block',
            config: {
              message: 'Cannot verify claim in available sources. Acknowledge limitation or provide source.'
            }
          }
        ],
        enabledByDefault: true,
        canDisable: false
      }
    ],

    workflows: [
      {
        id: 'evidence-verification',
        name: 'Evidence Verification Workflow',
        description: 'Validates outputs against ECV protocol before release',
        entryPoint: 'workflows/evidence-verification.ts',
        requiredPermissions: ['evidence:verify', 'source:access']
      }
    ],

    reports: [
      {
        id: 'evidence-chain-report',
        name: 'Evidence Chain Report',
        description: 'Complete provenance report for all outputs in a time period',
        template: 'reports/evidence-chain.hbs',
        formats: ['pdf', 'json']
      },
      {
        id: 'source-utilization-report',
        name: 'Source Utilization Report',
        description: 'Analysis of which sources were used and their authority levels',
        template: 'reports/source-utilization.hbs',
        formats: ['pdf', 'html']
      }
    ],

    evidenceTemplates: [
      {
        id: 'ecv-citation-record',
        name: 'ECV Citation Record',
        description: 'Standard format for capturing citation with full provenance',
        schema: 'schemas/ecv-citation.json'
      }
    ]
  },

  compliance: [
    {
      framework: 'NIST 800-53',
      version: 'Rev 5',
      controls: [
        {
          controlId: 'AU-10',
          controlName: 'Non-repudiation',
          implementation: 'ECV provenance trail ensures outputs cannot be denied or altered without detection',
          evidence: ['provenance-log', 'hash-chain']
        },
        {
          controlId: 'SI-7',
          controlName: 'Software, Firmware, and Information Integrity',
          implementation: 'Source verification ensures information integrity from retrieval to output',
          evidence: ['source-verification-log', 'cross-reference-report']
        }
      ]
    },
    {
      framework: 'FRE 902',
      version: '2024',
      controls: [
        {
          controlId: '902(13)',
          controlName: 'Certified Records Generated by an Electronic Process',
          implementation: 'ECV maintains complete chain of custody documentation for AI-generated evidence',
          evidence: ['evidence-chain-report', 'certification-statement']
        }
      ]
    }
  ],

  configuration: {
    sections: [
      {
        id: 'source-settings',
        title: 'Source Settings',
        description: 'Configure source authority and verification requirements',
        fields: [
          {
            id: 'authoritative-domains',
            label: 'Authoritative Domains',
            description: 'Domain patterns considered authoritative (e.g., .gov, .mil)',
            type: 'textarea',
            defaultValue: '.gov\n.mil\n.edu',
            required: true
          },
          {
            id: 'require-gov-sources',
            label: 'Require Government Sources',
            description: 'Require at least one .gov source for federal-related claims',
            type: 'boolean',
            defaultValue: true
          }
        ]
      },
      {
        id: 'verification-settings',
        title: 'Verification Settings',
        description: 'Configure cross-verification requirements',
        fields: [
          {
            id: 'min-sources-critical',
            label: 'Minimum Sources for Critical Claims',
            description: 'Number of independent sources required for critical claims',
            type: 'number',
            defaultValue: 2,
            validation: { min: 1, max: 5 }
          },
          {
            id: 'allow-single-source',
            label: 'Allow Single Source (Non-Critical)',
            description: 'Allow single-source citations for non-critical information',
            type: 'boolean',
            defaultValue: true
          }
        ]
      },
      {
        id: 'output-settings',
        title: 'Output Settings',
        description: 'Configure output formatting and disclosures',
        fields: [
          {
            id: 'include-confidence-scores',
            label: 'Include Confidence Scores',
            description: 'Include confidence scores in all outputs',
            type: 'boolean',
            defaultValue: true
          },
          {
            id: 'footnote-style',
            label: 'Citation Footnote Style',
            description: 'How to format source citations in outputs',
            type: 'select',
            defaultValue: 'inline',
            options: [
              { value: 'inline', label: 'Inline Citations' },
              { value: 'footnote', label: 'Footnotes' },
              { value: 'endnote', label: 'Endnotes' },
              { value: 'hyperlink', label: 'Hyperlinks Only' }
            ]
          }
        ]
      }
    ]
  },

  tags: ['evidence', 'verification', 'audit', 'compliance', 'forensic', 'citation'],
  icon: '🔗'
};

export default ecvProtocolManifest;
