/**
 * ACE Governed Instruction Packs
 *
 * V1 Flagship Packs - Read-Only Operations Only
 * 1. BD Capture Pack - SAM.gov research
 * 2. VA Workflow Pack - Public VA resources (no login)
 * 3. Compliance Evidence Pack - Internal evidence collection
 *
 * All packs enforce:
 * - Domain allowlists
 * - Action restrictions
 * - MAI gates for sensitive actions
 * - Evidence capture with hashes
 * - Stop conditions for safety
 */

import {
  InstructionPack,
  InstructionCategory,
  StepAction,
  ActionSensitivity,
  StopConditionType,
  SAFE_ACTIONS,
  ADVISORY_ACTIONS
} from './browserAutomationAgent';
import { WorkforceType, MAIClassification } from '../types';

// ============================================================================
// STANDARD GOVERNANCE POLICIES
// ============================================================================

const STANDARD_DATA_HANDLING = {
  redact_pii_before_llm: true,
  no_secrets_in_prompts: true,
  mask_ssn: true,
  mask_credit_cards: true,
  allowed_data_exports: ['text', 'table', 'screenshot']
};

const STANDARD_EVIDENCE_REQUIREMENTS = {
  screenshotRequired: true,
  hashRequired: true,
  timestampRequired: true,
  captureDOM: false,
  captureNetwork: false
};

const STANDARD_STOP_CONDITIONS: StopConditionType[] = [
  StopConditionType.CAPTCHA_DETECTED,
  StopConditionType.LOGIN_PAGE_DETECTED,
  StopConditionType.PAYMENT_FORM_DETECTED,
  StopConditionType.PII_FIELD_DETECTED,
  StopConditionType.DOMAIN_REDIRECT,
  StopConditionType.BLOCKED_DOMAIN
];

// ============================================================================
// PACK 1: BD CAPTURE - SAM.GOV RESEARCH
// ============================================================================

export const BD_CAPTURE_PACK: InstructionPack = {
  id: 'bd-capture-sam-gov',
  name: 'BD Capture: SAM.gov Solicitation Research',
  description: 'Search and extract solicitation details from SAM.gov for capture analysis. Read-only - no submissions.',
  version: '1.0.0',
  workforce: WorkforceType.BD_CAPTURE,
  category: InstructionCategory.RESEARCH,

  // GOVERNANCE
  allowed_domains: [
    'sam.gov',
    '*.sam.gov',
    'api.sam.gov'
  ],
  blocked_domains: [
    'login.sam.gov',      // Block login pages
    '*.payment.gov',       // Block payment
    'pay.gov'
  ],
  allowed_actions: [
    StepAction.NAVIGATE,
    StepAction.SCREENSHOT,
    StepAction.EXTRACT_TEXT,
    StepAction.EXTRACT_TABLE,
    StepAction.EXTRACT_LINKS,
    StepAction.WAIT,
    StepAction.SCROLL,
    StepAction.VERIFY_ELEMENT,
    StepAction.VERIFY_TEXT,
    StepAction.STORE_VALUE,
    StepAction.CLICK,       // ADVISORY
    StepAction.DOWNLOAD     // ADVISORY
  ],
  sensitive_actions: [
    StepAction.DOWNLOAD     // Requires MANDATORY gate
  ],
  required_gates: [
    {
      condition: 'Before downloading any file',
      gate_type: MAIClassification.MANDATORY,
      rationale: 'Downloaded files must be reviewed before use'
    },
    {
      condition: 'Before clicking interactive elements',
      gate_type: MAIClassification.ADVISORY,
      rationale: 'Verify navigation is to expected destination'
    }
  ],
  data_handling: STANDARD_DATA_HANDLING,
  evidence_requirements: STANDARD_EVIDENCE_REQUIREMENTS,
  stop_conditions: STANDARD_STOP_CONDITIONS,
  max_runtime_seconds: 300,

  // METADATA
  estimatedDuration: '3-5 minutes',
  tags: ['sam.gov', 'solicitation', 'rfp', 'federal', 'bd-capture'],
  created: '2025-02-01',
  author: 'ACE System',
  classification: MAIClassification.ADVISORY,

  // STEPS
  steps: [
    {
      id: 'sam-navigate',
      order: 1,
      action: StepAction.NAVIGATE,
      target: { url: 'https://sam.gov/search/?index=opp&sort=-modifiedDate&page=1&pageSize=25' },
      description: 'Navigate to SAM.gov opportunities search',
      rationale: 'Starting point for solicitation research',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'Search', timeout: 15000 }
    },
    {
      id: 'sam-search',
      order: 2,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: 'input[type="search"]' },
      description: 'Locate search input field',
      rationale: 'Prepare for search entry',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: false
    },
    {
      id: 'sam-screenshot-search',
      order: 3,
      action: StepAction.SCREENSHOT,
      description: 'Capture search page state',
      rationale: 'Evidence of initial state',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'sam-click-result',
      order: 4,
      action: StepAction.CLICK,
      target: { selector: '.result-title a', nth: 1 },
      description: 'Click first search result to view details',
      rationale: 'Navigate to solicitation details',
      sensitivity: ActionSensitivity.ADVISORY,
      captureEvidence: true,
      waitFor: { type: 'url', value: 'opp/', timeout: 10000 }
    },
    {
      id: 'sam-extract-overview',
      order: 5,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: '.opportunity-overview, .opp-overview, main' },
      description: 'Extract opportunity overview text',
      rationale: 'Capture solicitation details for analysis',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'solicitation_overview',
        type: 'text'
      }
    },
    {
      id: 'sam-extract-dates',
      order: 6,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: '.key-dates, .dates-section' },
      description: 'Extract key dates and deadlines',
      rationale: 'Capture timeline for capture planning',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'key_dates',
        type: 'text'
      }
    },
    {
      id: 'sam-extract-contacts',
      order: 7,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: '.contact-info, .poc-section' },
      description: 'Extract contracting officer information',
      rationale: 'Capture POC for follow-up',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'contracting_officer',
        type: 'text'
      }
    },
    {
      id: 'sam-scroll-attachments',
      order: 8,
      action: StepAction.SCROLL,
      value: 'down',
      description: 'Scroll to attachments section',
      rationale: 'Navigate to document list',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: false
    },
    {
      id: 'sam-extract-attachments',
      order: 9,
      action: StepAction.EXTRACT_TABLE,
      target: { selector: '.attachments-table, .documents-list' },
      description: 'Extract list of attachments',
      rationale: 'Identify available RFP documents',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'attachment_list',
        type: 'table'
      }
    },
    {
      id: 'sam-final-screenshot',
      order: 10,
      action: StepAction.SCREENSHOT,
      description: 'Capture final page state',
      rationale: 'Complete evidence capture',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    }
  ],

  outputs: [
    { name: 'solicitation_overview', type: 'text', description: 'Full solicitation details', required: true },
    { name: 'key_dates', type: 'text', description: 'Deadlines and timeline', required: true },
    { name: 'contracting_officer', type: 'text', description: 'CO contact information', required: true },
    { name: 'attachment_list', type: 'table', description: 'List of RFP documents', required: false },
    { name: 'evidence_screenshots', type: 'screenshot', description: 'Visual evidence', required: true }
  ]
};

// ============================================================================
// PACK 2: VA WORKFLOW - PUBLIC RESOURCES (NO LOGIN)
// ============================================================================

export const VA_READONLY_PACK: InstructionPack = {
  id: 'va-public-resources',
  name: 'VA Workflow: Public Resources Research',
  description: 'Research VA public resources including 38 CFR, WARMS references, and VA.gov public pages. Read-only - no login required.',
  version: '1.0.0',
  workforce: WorkforceType.VA_CLAIMS,
  category: InstructionCategory.RESEARCH,

  // GOVERNANCE
  allowed_domains: [
    'va.gov',
    '*.va.gov',
    'ecfr.gov',           // Electronic CFR
    'govinfo.gov',        // Government Publishing
    'law.cornell.edu'     // Legal resources
  ],
  blocked_domains: [
    'eauth.va.gov',       // Block auth
    'login.va.gov',       // Block login
    'id.me',              // Block identity verification
    'accessva.va.gov',    // Block authenticated areas
    '*.payment.gov'
  ],
  allowed_actions: [
    StepAction.NAVIGATE,
    StepAction.SCREENSHOT,
    StepAction.EXTRACT_TEXT,
    StepAction.EXTRACT_TABLE,
    StepAction.EXTRACT_LINKS,
    StepAction.WAIT,
    StepAction.SCROLL,
    StepAction.VERIFY_ELEMENT,
    StepAction.VERIFY_TEXT,
    StepAction.STORE_VALUE,
    StepAction.CLICK
  ],
  sensitive_actions: [],  // No sensitive actions in read-only mode
  required_gates: [
    {
      condition: 'Before clicking navigation links',
      gate_type: MAIClassification.ADVISORY,
      rationale: 'Verify navigation stays within allowed domains'
    }
  ],
  data_handling: STANDARD_DATA_HANDLING,
  evidence_requirements: STANDARD_EVIDENCE_REQUIREMENTS,
  stop_conditions: [
    ...STANDARD_STOP_CONDITIONS,
    StopConditionType.DOMAIN_REDIRECT  // Extra sensitive to redirects
  ],
  max_runtime_seconds: 300,

  // METADATA
  estimatedDuration: '3-5 minutes',
  tags: ['va', 'cfr', '38-cfr', 'warms', 'regulations', 'public'],
  created: '2025-02-01',
  author: 'ACE System',
  classification: MAIClassification.ADVISORY,

  // STEPS
  steps: [
    {
      id: 'va-navigate-cfr',
      order: 1,
      action: StepAction.NAVIGATE,
      target: { url: 'https://www.ecfr.gov/current/title-38' },
      description: 'Navigate to 38 CFR (VA regulations)',
      rationale: 'Access authoritative VA regulations',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'Title 38', timeout: 15000 }
    },
    {
      id: 'va-screenshot-cfr',
      order: 2,
      action: StepAction.SCREENSHOT,
      description: 'Capture 38 CFR landing page',
      rationale: 'Evidence of regulation access',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'va-extract-toc',
      order: 3,
      action: StepAction.EXTRACT_TABLE,
      target: { selector: '.toc, .table-of-contents, nav' },
      description: 'Extract table of contents',
      rationale: 'Map available regulation sections',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'cfr_table_of_contents',
        type: 'table'
      }
    },
    {
      id: 'va-click-part4',
      order: 4,
      action: StepAction.CLICK,
      target: { text: 'Part 4' },
      description: 'Navigate to Part 4 (Rating Schedule)',
      rationale: 'Access disability rating schedule',
      sensitivity: ActionSensitivity.ADVISORY,
      captureEvidence: true,
      waitFor: { type: 'text', value: 'Rating Schedule', timeout: 10000 }
    },
    {
      id: 'va-extract-rating',
      order: 5,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: 'main, article, .content' },
      description: 'Extract rating schedule content',
      rationale: 'Capture regulation text for analysis',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'rating_schedule_text',
        type: 'text'
      }
    },
    {
      id: 'va-navigate-vamc',
      order: 6,
      action: StepAction.NAVIGATE,
      target: { url: 'https://www.va.gov/disability/eligibility/' },
      description: 'Navigate to VA disability eligibility info',
      rationale: 'Access public eligibility information',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'eligibility', timeout: 15000 }
    },
    {
      id: 'va-extract-eligibility',
      order: 7,
      action: StepAction.EXTRACT_TEXT,
      target: { selector: 'main, .va-introtext, article' },
      description: 'Extract eligibility criteria',
      rationale: 'Capture public eligibility information',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'eligibility_criteria',
        type: 'text'
      }
    },
    {
      id: 'va-final-screenshot',
      order: 8,
      action: StepAction.SCREENSHOT,
      description: 'Capture final page state',
      rationale: 'Complete evidence capture',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    }
  ],

  outputs: [
    { name: 'cfr_table_of_contents', type: 'table', description: '38 CFR structure', required: true },
    { name: 'rating_schedule_text', type: 'text', description: 'Rating schedule content', required: false },
    { name: 'eligibility_criteria', type: 'text', description: 'VA eligibility info', required: true },
    { name: 'evidence_screenshots', type: 'screenshot', description: 'Visual evidence', required: true }
  ]
};

// ============================================================================
// PACK 3: COMPLIANCE EVIDENCE - INTERNAL COLLECTION
// ============================================================================

export const COMPLIANCE_EVIDENCE_PACK: InstructionPack = {
  id: 'compliance-evidence-collection',
  name: 'Compliance: Evidence Package Collection',
  description: 'Collect evidence from internal ACE platform for compliance documentation. Screenshots, logs, and configuration verification.',
  version: '1.0.0',
  workforce: 'UNIVERSAL',
  category: InstructionCategory.EVIDENCE_COLLECTION,

  // GOVERNANCE
  allowed_domains: [
    'localhost',
    '127.0.0.1',
    '{{app_domain}}'      // Parameterized for deployment
  ],
  blocked_domains: [
    '*.google.com',       // Block external
    '*.facebook.com',
    '*.twitter.com',
    '*.payment.gov'
  ],
  allowed_actions: [
    StepAction.NAVIGATE,
    StepAction.SCREENSHOT,
    StepAction.EXTRACT_TEXT,
    StepAction.EXTRACT_TABLE,
    StepAction.WAIT,
    StepAction.SCROLL,
    StepAction.VERIFY_ELEMENT,
    StepAction.VERIFY_TEXT,
    StepAction.STORE_VALUE,
    StepAction.CLICK
  ],
  sensitive_actions: [],
  required_gates: [
    {
      condition: 'Before capturing audit logs',
      gate_type: MAIClassification.ADVISORY,
      rationale: 'Verify correct log scope'
    }
  ],
  data_handling: {
    ...STANDARD_DATA_HANDLING,
    redact_pii_before_llm: true,
    mask_ssn: true
  },
  evidence_requirements: {
    screenshotRequired: true,
    hashRequired: true,
    timestampRequired: true,
    captureDOM: true,       // Full DOM capture for compliance
    captureNetwork: false
  },
  stop_conditions: [
    StopConditionType.DOMAIN_REDIRECT,
    StopConditionType.BLOCKED_DOMAIN,
    StopConditionType.UNEXPECTED_CONTENT
  ],
  max_runtime_seconds: 180,

  // METADATA
  estimatedDuration: '2-3 minutes',
  tags: ['compliance', 'evidence', 'audit', 'internal', 'documentation'],
  created: '2025-02-01',
  author: 'ACE System',
  classification: MAIClassification.ADVISORY,

  // STEPS
  steps: [
    {
      id: 'comp-navigate-dashboard',
      order: 1,
      action: StepAction.NAVIGATE,
      target: { url: '{{app_url}}/dashboard' },
      description: 'Navigate to ACE dashboard',
      rationale: 'Access main governance dashboard',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'dashboard', timeout: 10000 }
    },
    {
      id: 'comp-screenshot-dashboard',
      order: 2,
      action: StepAction.SCREENSHOT,
      description: 'Capture dashboard state',
      rationale: 'Evidence of operational status',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'comp-click-audit',
      order: 3,
      action: StepAction.CLICK,
      target: { text: 'Ledger' },
      description: 'Navigate to audit ledger',
      rationale: 'Access audit trail',
      sensitivity: ActionSensitivity.ADVISORY,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'audit', timeout: 5000 }
    },
    {
      id: 'comp-extract-audit',
      order: 4,
      action: StepAction.EXTRACT_TABLE,
      target: { selector: 'table, .audit-log, .ledger' },
      description: 'Extract audit log entries',
      rationale: 'Capture audit trail for compliance',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'audit_log_entries',
        type: 'table'
      }
    },
    {
      id: 'comp-screenshot-audit',
      order: 5,
      action: StepAction.SCREENSHOT,
      description: 'Capture audit log view',
      rationale: 'Visual evidence of audit capability',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'comp-click-compliance',
      order: 6,
      action: StepAction.CLICK,
      target: { text: 'Compliance' },
      description: 'Navigate to compliance view',
      rationale: 'Access compliance dashboard',
      sensitivity: ActionSensitivity.ADVISORY,
      captureEvidence: true,
      waitFor: { type: 'element', value: 'compliance', timeout: 5000 }
    },
    {
      id: 'comp-extract-controls',
      order: 7,
      action: StepAction.EXTRACT_TABLE,
      target: { selector: 'table, .controls-list, .compliance-matrix' },
      description: 'Extract control implementation status',
      rationale: 'Capture compliance posture',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true,
      captureData: {
        name: 'control_status',
        type: 'table'
      }
    },
    {
      id: 'comp-screenshot-compliance',
      order: 8,
      action: StepAction.SCREENSHOT,
      description: 'Capture compliance dashboard',
      rationale: 'Visual evidence of compliance monitoring',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'comp-verify-elements',
      order: 9,
      action: StepAction.VERIFY_ELEMENT,
      target: { selector: '.governance-badge, .mai-classification' },
      description: 'Verify governance elements present',
      rationale: 'Confirm MAI classification visible',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    },
    {
      id: 'comp-final-screenshot',
      order: 10,
      action: StepAction.SCREENSHOT,
      description: 'Capture final evidence state',
      rationale: 'Complete evidence package',
      sensitivity: ActionSensitivity.SAFE,
      captureEvidence: true
    }
  ],

  outputs: [
    { name: 'audit_log_entries', type: 'table', description: 'Audit trail data', required: true },
    { name: 'control_status', type: 'table', description: 'Control implementation status', required: true },
    { name: 'evidence_screenshots', type: 'screenshot', description: 'Visual evidence package', required: true }
  ]
};

// ============================================================================
// PACK REGISTRY - V1 FLAGSHIP PACKS ONLY
// ============================================================================

export const INSTRUCTION_PACKS: InstructionPack[] = [
  BD_CAPTURE_PACK,
  VA_READONLY_PACK,
  COMPLIANCE_EVIDENCE_PACK
];

/**
 * Get packs filtered by workforce type
 */
export function getPacksByWorkforce(workforce: WorkforceType | 'UNIVERSAL'): InstructionPack[] {
  return INSTRUCTION_PACKS.filter(p => p.workforce === workforce || p.workforce === 'UNIVERSAL');
}

/**
 * Get packs filtered by category
 */
export function getPacksByCategory(category: InstructionCategory): InstructionPack[] {
  return INSTRUCTION_PACKS.filter(p => p.category === category);
}

/**
 * Get pack by ID
 */
export function getPackById(id: string): InstructionPack | undefined {
  return INSTRUCTION_PACKS.find(p => p.id === id);
}

/**
 * Search packs by tags or name
 */
export function searchPacks(query: string): InstructionPack[] {
  const lower = query.toLowerCase();
  return INSTRUCTION_PACKS.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower) ||
    p.tags.some(t => t.toLowerCase().includes(lower))
  );
}

/**
 * Validate a pack meets governance requirements
 */
export function validatePack(pack: InstructionPack): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Must have allowed domains
  if (!pack.allowed_domains || pack.allowed_domains.length === 0) {
    issues.push('Pack must define allowed_domains');
  }

  // Must have allowed actions
  if (!pack.allowed_actions || pack.allowed_actions.length === 0) {
    issues.push('Pack must define allowed_actions');
  }

  // All step actions must be in allowed list
  for (const step of pack.steps) {
    if (!pack.allowed_actions.includes(step.action)) {
      issues.push(`Step "${step.id}" uses action "${step.action}" not in allowed_actions`);
    }
  }

  // Must have evidence requirements
  if (!pack.evidence_requirements) {
    issues.push('Pack must define evidence_requirements');
  }

  // Must have stop conditions
  if (!pack.stop_conditions || pack.stop_conditions.length === 0) {
    issues.push('Pack must define stop_conditions');
  }

  // Must have data handling policy
  if (!pack.data_handling) {
    issues.push('Pack must define data_handling policy');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
