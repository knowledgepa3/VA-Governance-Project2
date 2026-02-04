/**
 * Bundle Packs - Coordinated Multi-Tab Workflows
 *
 * Bundle Packs orchestrate multiple browser tabs working TOGETHER
 * to accomplish complex research tasks. Each tab has a role and
 * they communicate/coordinate to produce a unified result.
 *
 * WORKFLOW PATTERNS:
 * 1. PARALLEL GATHER  - All tabs fetch data simultaneously, then combine
 * 2. SEQUENTIAL CHAIN - Tab 1 output feeds Tab 2 input, feeds Tab 3...
 * 3. CROSS-REFERENCE  - Tab 1 finds item, Tab 2 verifies, Tab 3 gets details
 * 4. MONITOR & REACT  - Tab 1 watches for changes, triggers Tab 2 action
 *
 * USE CASES:
 * - VA Claims: Find regulation → Get policy → Check rates → Compile evidence
 * - BD Capture: Find opportunity → Check incumbent → Get requirements → Package
 * - Compliance: Check multiple sources → Cross-reference → Generate report
 */

import { InstructionPack, StepAction, ActionSensitivity, StopConditionType, InstructionCategory } from './browserAutomationAgent';
import { MAIClassification } from '../types';

// ============================================================================
// BUNDLE PACK TYPES
// ============================================================================

export interface BundlePack {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'va-claims' | 'bd-capture' | 'compliance' | 'research' | 'custom';

  // Tab configuration
  tabs: TabConfig[];

  // Workflow definition
  workflow: WorkflowDefinition;

  // Governance (inherited by all tabs)
  governance: BundleGovernance;

  // Expected outputs
  outputs: BundleOutput[];

  // Metadata
  estimatedDuration: string;
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
}

export interface TabConfig {
  id: string;
  name: string;
  role: TabRole;
  domain: string;
  startUrl: string;
  description: string;

  // What this tab extracts
  extracts: ExtractConfig[];

  // What this tab provides to other tabs
  provides?: string[];  // Variable names

  // What this tab needs from other tabs
  requires?: string[];  // Variable names from other tabs
}

export type TabRole =
  | 'primary'      // Main research/lookup
  | 'reference'    // Cross-reference source
  | 'verification' // Verify/validate data
  | 'details'      // Get detailed information
  | 'evidence'     // Capture evidence/screenshots
  | 'aggregator';  // Combine results from other tabs

export interface ExtractConfig {
  name: string;
  selector?: string;
  type: 'text' | 'table' | 'links' | 'screenshot' | 'structured';
  description: string;
}

export interface WorkflowDefinition {
  type: 'parallel' | 'sequential' | 'cross-reference' | 'conditional';
  steps: WorkflowStep[];
  finalStep: FinalStep;
}

export interface WorkflowStep {
  id: string;
  tabId: string;
  action: 'navigate' | 'extract' | 'search' | 'click' | 'wait' | 'screenshot' | 'pass-data';
  description: string;

  // For search/navigate
  target?: string;
  useVariable?: string;  // Use output from another step

  // For extract
  extract?: ExtractConfig;

  // For pass-data
  passTo?: string;  // Tab ID to pass data to
  variable?: string;

  // Dependencies
  dependsOn?: string[];  // Step IDs that must complete first

  // Conditions
  condition?: {
    variable: string;
    operator: 'exists' | 'equals' | 'contains' | 'not-empty';
    value?: string;
  };
}

export interface FinalStep {
  action: 'compile' | 'report' | 'evidence-package';
  combineFrom: string[];  // Tab IDs
  outputFormat: 'json' | 'markdown' | 'evidence-bundle';
  description: string;
}

export interface BundleGovernance {
  allowedDomains: string[];
  blockedDomains: string[];
  stopConditions: StopConditionType[];
  maxTotalRuntime: number;  // seconds
  requiresApproval: boolean;
  classification: MAIClassification;
}

export interface BundleOutput {
  name: string;
  description: string;
  fromTabs: string[];
  type: 'text' | 'table' | 'screenshot' | 'compiled-report';
}

// ============================================================================
// PREDEFINED BUNDLE PACKS
// ============================================================================

export const VA_CLAIMS_RESEARCH_BUNDLE: BundlePack = {
  id: 'va-claims-research-bundle',
  name: 'VA Claims Research Bundle',
  description: 'Coordinated research across CFR regulations, VA policies, and compensation rates for disability claims',
  version: '1.0.0',
  category: 'va-claims',

  tabs: [
    {
      id: 'cfr-tab',
      name: 'CFR Regulations',
      role: 'reference',
      domain: 'ecfr.gov',
      startUrl: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4',
      description: 'Look up 38 CFR Part 4 - Rating Schedule for Disabilities',
      extracts: [
        { name: 'regulation_text', type: 'text', description: 'Relevant regulation sections' },
        { name: 'rating_criteria', type: 'structured', description: 'Disability rating criteria' }
      ],
      provides: ['regulation_citation', 'rating_criteria']
    },
    {
      id: 'va-eligibility-tab',
      name: 'VA Eligibility',
      role: 'primary',
      domain: 'va.gov',
      startUrl: 'https://www.va.gov/disability/eligibility/',
      description: 'Check VA disability eligibility requirements',
      extracts: [
        { name: 'eligibility_requirements', type: 'text', description: 'Eligibility criteria' },
        { name: 'claim_types', type: 'text', description: 'Types of claims available' }
      ],
      provides: ['eligibility_summary']
    },
    {
      id: 'rates-tab',
      name: 'Compensation Rates',
      role: 'details',
      domain: 'va.gov',
      startUrl: 'https://www.va.gov/disability/compensation-rates/',
      description: 'Get current compensation rate tables',
      extracts: [
        { name: 'rate_table', type: 'table', description: 'Compensation rates by percentage' },
        { name: 'effective_date', type: 'text', description: 'Rate effective date' }
      ],
      provides: ['compensation_rates'],
      requires: ['rating_criteria']  // Uses rating info from CFR tab
    }
  ],

  workflow: {
    type: 'cross-reference',
    steps: [
      // Step 1: All tabs navigate to start URLs (parallel)
      {
        id: 'nav-cfr',
        tabId: 'cfr-tab',
        action: 'navigate',
        target: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4',
        description: 'Navigate to 38 CFR Part 4'
      },
      {
        id: 'nav-eligibility',
        tabId: 'va-eligibility-tab',
        action: 'navigate',
        target: 'https://www.va.gov/disability/eligibility/',
        description: 'Navigate to VA eligibility page'
      },
      {
        id: 'nav-rates',
        tabId: 'rates-tab',
        action: 'navigate',
        target: 'https://www.va.gov/disability/compensation-rates/',
        description: 'Navigate to compensation rates'
      },

      // Step 2: Extract from CFR (provides rating criteria)
      {
        id: 'extract-cfr',
        tabId: 'cfr-tab',
        action: 'extract',
        extract: { name: 'rating_criteria', type: 'text', description: 'Rating criteria from CFR' },
        description: 'Extract rating criteria from regulations',
        dependsOn: ['nav-cfr']
      },

      // Step 3: Extract eligibility (parallel with CFR)
      {
        id: 'extract-eligibility',
        tabId: 'va-eligibility-tab',
        action: 'extract',
        extract: { name: 'eligibility_requirements', type: 'text', description: 'Eligibility requirements' },
        description: 'Extract eligibility requirements',
        dependsOn: ['nav-eligibility']
      },

      // Step 4: Extract rates (can reference CFR data)
      {
        id: 'extract-rates',
        tabId: 'rates-tab',
        action: 'extract',
        extract: { name: 'rate_table', type: 'table', description: 'Compensation rate table' },
        description: 'Extract compensation rates',
        dependsOn: ['nav-rates', 'extract-cfr']  // Waits for CFR to complete
      },

      // Step 5: Capture evidence from all tabs
      {
        id: 'screenshot-cfr',
        tabId: 'cfr-tab',
        action: 'screenshot',
        description: 'Capture CFR evidence',
        dependsOn: ['extract-cfr']
      },
      {
        id: 'screenshot-eligibility',
        tabId: 'va-eligibility-tab',
        action: 'screenshot',
        description: 'Capture eligibility evidence',
        dependsOn: ['extract-eligibility']
      },
      {
        id: 'screenshot-rates',
        tabId: 'rates-tab',
        action: 'screenshot',
        description: 'Capture rates evidence',
        dependsOn: ['extract-rates']
      }
    ],

    finalStep: {
      action: 'compile',
      combineFrom: ['cfr-tab', 'va-eligibility-tab', 'rates-tab'],
      outputFormat: 'evidence-bundle',
      description: 'Compile all research into evidence package'
    }
  },

  governance: {
    allowedDomains: ['ecfr.gov', 'va.gov', 'benefits.va.gov', '*.va.gov'],
    blockedDomains: ['login.gov', 'id.me', '*.payment.gov'],
    stopConditions: [
      StopConditionType.LOGIN_PAGE_DETECTED,
      StopConditionType.CAPTCHA_DETECTED,
      StopConditionType.PAYMENT_FORM_DETECTED
    ],
    maxTotalRuntime: 300,
    requiresApproval: true,
    classification: MAIClassification.ADVISORY
  },

  outputs: [
    {
      name: 'regulation_summary',
      description: '38 CFR rating criteria for the condition',
      fromTabs: ['cfr-tab'],
      type: 'text'
    },
    {
      name: 'eligibility_summary',
      description: 'VA eligibility requirements',
      fromTabs: ['va-eligibility-tab'],
      type: 'text'
    },
    {
      name: 'rate_table',
      description: 'Current compensation rates',
      fromTabs: ['rates-tab'],
      type: 'table'
    },
    {
      name: 'evidence_package',
      description: 'Screenshots from all sources with hashes',
      fromTabs: ['cfr-tab', 'va-eligibility-tab', 'rates-tab'],
      type: 'screenshot'
    }
  ],

  estimatedDuration: '2-4 minutes',
  complexity: 'moderate',
  tags: ['va', 'disability', 'claims', 'research', 'multi-source']
};

export const BD_OPPORTUNITY_BUNDLE: BundlePack = {
  id: 'bd-opportunity-bundle',
  name: 'BD Opportunity Research Bundle',
  description: 'Research federal contract opportunities across SAM.gov, agency sites, and FPDS',
  version: '1.0.0',
  category: 'bd-capture',

  tabs: [
    {
      id: 'sam-tab',
      name: 'SAM.gov Opportunities',
      role: 'primary',
      domain: 'sam.gov',
      startUrl: 'https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate',
      description: 'Search for federal contract opportunities',
      extracts: [
        { name: 'opportunity_list', type: 'table', description: 'List of opportunities' },
        { name: 'opportunity_details', type: 'structured', description: 'Selected opportunity details' }
      ],
      provides: ['solicitation_number', 'agency_name', 'naics_code']
    },
    {
      id: 'fpds-tab',
      name: 'FPDS Contract History',
      role: 'reference',
      domain: 'fpds.gov',
      startUrl: 'https://www.fpds.gov/',
      description: 'Look up contract history and incumbent information',
      extracts: [
        { name: 'contract_history', type: 'table', description: 'Past contract awards' },
        { name: 'incumbent_info', type: 'text', description: 'Current/previous contractors' }
      ],
      provides: ['incumbent_name', 'contract_value'],
      requires: ['solicitation_number']  // Uses SAM data
    },
    {
      id: 'usaspending-tab',
      name: 'USASpending Details',
      role: 'details',
      domain: 'usaspending.gov',
      startUrl: 'https://www.usaspending.gov/',
      description: 'Get detailed spending and award information',
      extracts: [
        { name: 'spending_data', type: 'structured', description: 'Award and spending details' }
      ],
      provides: ['total_funding', 'award_history'],
      requires: ['agency_name']
    }
  ],

  workflow: {
    type: 'sequential',
    steps: [
      {
        id: 'search-sam',
        tabId: 'sam-tab',
        action: 'navigate',
        target: 'https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate',
        description: 'Navigate to SAM.gov opportunities'
      },
      {
        id: 'extract-opportunities',
        tabId: 'sam-tab',
        action: 'extract',
        extract: { name: 'opportunity_list', type: 'table', description: 'Opportunity listings' },
        description: 'Extract opportunity list',
        dependsOn: ['search-sam']
      },
      {
        id: 'lookup-fpds',
        tabId: 'fpds-tab',
        action: 'navigate',
        target: 'https://www.fpds.gov/',
        useVariable: 'solicitation_number',
        description: 'Look up contract history in FPDS',
        dependsOn: ['extract-opportunities']
      },
      {
        id: 'extract-history',
        tabId: 'fpds-tab',
        action: 'extract',
        extract: { name: 'contract_history', type: 'table', description: 'Contract history' },
        description: 'Extract contract history',
        dependsOn: ['lookup-fpds']
      },
      {
        id: 'lookup-spending',
        tabId: 'usaspending-tab',
        action: 'navigate',
        target: 'https://www.usaspending.gov/',
        useVariable: 'agency_name',
        description: 'Look up spending data',
        dependsOn: ['extract-opportunities']
      },
      {
        id: 'screenshot-all',
        tabId: 'sam-tab',
        action: 'screenshot',
        description: 'Capture evidence from all sources',
        dependsOn: ['extract-history', 'lookup-spending']
      }
    ],

    finalStep: {
      action: 'report',
      combineFrom: ['sam-tab', 'fpds-tab', 'usaspending-tab'],
      outputFormat: 'markdown',
      description: 'Generate opportunity research report'
    }
  },

  governance: {
    allowedDomains: ['sam.gov', 'fpds.gov', 'usaspending.gov', '*.gov'],
    blockedDomains: ['login.gov', '*.payment.gov'],
    stopConditions: [
      StopConditionType.LOGIN_PAGE_DETECTED,
      StopConditionType.CAPTCHA_DETECTED
    ],
    maxTotalRuntime: 300,
    requiresApproval: true,
    classification: MAIClassification.ADVISORY
  },

  outputs: [
    {
      name: 'opportunity_summary',
      description: 'Selected opportunity details from SAM.gov',
      fromTabs: ['sam-tab'],
      type: 'text'
    },
    {
      name: 'incumbent_analysis',
      description: 'Contract history and incumbent information',
      fromTabs: ['fpds-tab'],
      type: 'text'
    },
    {
      name: 'spending_analysis',
      description: 'Historical spending and funding data',
      fromTabs: ['usaspending-tab'],
      type: 'text'
    }
  ],

  estimatedDuration: '3-5 minutes',
  complexity: 'complex',
  tags: ['bd', 'federal', 'contracts', 'sam.gov', 'research']
};

// Export all bundle packs
export const BUNDLE_PACKS: BundlePack[] = [
  VA_CLAIMS_RESEARCH_BUNDLE,
  BD_OPPORTUNITY_BUNDLE
];

// ============================================================================
// BUNDLE EXECUTOR
// ============================================================================

export interface BundleExecutionState {
  bundleId: string;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'stopped' | 'error';
  currentStep: string | null;
  completedSteps: string[];
  tabStates: Map<string, TabExecutionState>;
  collectedData: Map<string, any>;
  evidence: BundleEvidence[];
  startTime: Date;
  errors: string[];
}

export interface TabExecutionState {
  tabId: string;
  browserTabId: number | null;  // Actual Chrome tab ID
  status: 'idle' | 'navigating' | 'extracting' | 'waiting' | 'done' | 'error';
  currentUrl: string;
  extractedData: Map<string, any>;
  screenshots: string[];
}

export interface BundleEvidence {
  tabId: string;
  stepId: string;
  type: 'screenshot' | 'extracted-data';
  timestamp: string;
  data: string;  // Base64 for screenshots, JSON string for data
  hash: string;
}

/**
 * Get workflow steps that can run in parallel (no unmet dependencies)
 */
export function getReadySteps(
  workflow: WorkflowDefinition,
  completedSteps: string[]
): WorkflowStep[] {
  return workflow.steps.filter(step => {
    // Already completed?
    if (completedSteps.includes(step.id)) return false;

    // Check dependencies
    if (step.dependsOn && step.dependsOn.length > 0) {
      return step.dependsOn.every(dep => completedSteps.includes(dep));
    }

    return true;
  });
}

/**
 * Visualize workflow as dependency graph
 */
export function getWorkflowVisualization(bundle: BundlePack): string {
  const lines: string[] = [];
  lines.push(`Bundle: ${bundle.name}`);
  lines.push(`Tabs: ${bundle.tabs.map(t => t.name).join(' | ')}`);
  lines.push('');
  lines.push('Workflow:');

  for (const step of bundle.workflow.steps) {
    const tab = bundle.tabs.find(t => t.id === step.tabId);
    const deps = step.dependsOn ? ` (after: ${step.dependsOn.join(', ')})` : '';
    lines.push(`  [${tab?.name}] ${step.action}: ${step.description}${deps}`);
  }

  lines.push('');
  lines.push(`Final: ${bundle.workflow.finalStep.description}`);

  return lines.join('\n');
}
