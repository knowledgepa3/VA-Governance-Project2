/**
 * SAM.gov Browser Automation - Evidence-Based Opportunity Extraction
 *
 * ACE GOVERNANCE POLICY:
 * ✅ PERMITTED: navigate, search, filter, open details, extract metadata, screenshot
 * ❌ PROHIBITED: login, form submission, file uploads, bidding/submission
 *
 * This module produces ARTIFACT-DRIVEN outputs, not narration.
 * Every extraction generates:
 *   1. opportunity.json (structured data)
 *   2. evidence/ screenshots (proof of extraction)
 *   3. opportunity.md (human summary)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface SAMOpportunity {
  // Core identifiers
  notice_id: string;
  title: string;
  url: string;

  // Agency info
  agency: string;
  sub_tier?: string;
  office?: string;

  // Classification
  notice_type: 'Sources Sought' | 'Presolicitation' | 'Combined Synopsis/Solicitation' |
               'Solicitation' | 'Award Notice' | 'Special Notice' | 'Intent to Bundle' | string;
  set_aside?: string;
  naics_code?: string;
  psc_code?: string;

  // Dates
  posted_date: string;
  response_deadline?: string;
  archive_date?: string;

  // Contacts
  primary_contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
  secondary_contact?: {
    name: string;
    email?: string;
    phone?: string;
  };

  // Content
  description_summary?: string;
  place_of_performance?: string;

  // Attachments
  attachments?: {
    filename: string;
    url: string;
    size?: string;
  }[];

  // Extraction metadata
  extraction_timestamp: string;
  extraction_method: 'browser_automation' | 'api' | 'manual';
  confidence_score: number; // 0-100, based on fields successfully extracted
  missing_fields: string[];
}

export interface EvidenceBundle {
  opportunity: SAMOpportunity;
  evidence: {
    search_results_screenshot?: string;  // base64 or file path
    opportunity_header_screenshot?: string;
    description_screenshot?: string;
    attachments_screenshot?: string;
    raw_html_hash?: string;
  };
  extraction_log: {
    timestamp: string;
    action: string;
    result: 'success' | 'failure' | 'partial';
    details?: string;
  }[];
}

export interface AutomationPolicy {
  allowed_actions: string[];
  prohibited_actions: string[];
  max_opportunities_per_session: number;
  require_evidence_screenshots: boolean;
  require_human_review_before_capture: boolean;
}

// =============================================================================
// GOVERNANCE POLICY
// =============================================================================

export const SAM_GOV_AUTOMATION_POLICY: AutomationPolicy = {
  allowed_actions: [
    'navigate',
    'search',
    'filter',
    'scroll',
    'click_opportunity_link',
    'read_page_content',
    'take_screenshot',
    'extract_text',
    'download_attachment_metadata'  // metadata only, not actual download
  ],
  prohibited_actions: [
    'login',
    'create_account',
    'submit_form',
    'upload_file',
    'submit_bid',
    'submit_response',
    'modify_saved_searches',
    'register_interest',
    'contact_via_form'
  ],
  max_opportunities_per_session: 25,
  require_evidence_screenshots: true,
  require_human_review_before_capture: false  // Set true for extra safety
};

// =============================================================================
// BROWSER AUTOMATION HELPERS
// =============================================================================

/**
 * MCP Browser Action Helpers
 * These wrap the MCP tool calls with proper parameters
 */
export const BrowserHelpers = {
  /**
   * Scroll down from a coordinate anchor
   * Required because MCP scroll needs coordinates
   */
  scrollDown: (tabId: number, x: number = 400, y: number = 300, amount: number = 3) => ({
    tool: 'mcp__Claude_in_Chrome__computer',
    params: {
      action: 'scroll',
      tabId,
      coordinate: [x, y],
      scroll_direction: 'down',
      scroll_amount: amount
    }
  }),

  /**
   * Click at specific coordinates
   */
  clickAt: (tabId: number, x: number, y: number) => ({
    tool: 'mcp__Claude_in_Chrome__computer',
    params: {
      action: 'left_click',
      tabId,
      coordinate: [x, y]
    }
  }),

  /**
   * Click on element by reference (from find tool)
   * Use left_click action, not click
   */
  clickRef: (tabId: number, ref: string) => ({
    tool: 'mcp__Claude_in_Chrome__computer',
    params: {
      action: 'left_click',
      tabId,
      ref
    }
  }),

  /**
   * Take screenshot for evidence
   */
  screenshot: (tabId: number) => ({
    tool: 'mcp__Claude_in_Chrome__computer',
    params: {
      action: 'screenshot',
      tabId
    }
  }),

  /**
   * Navigate to URL
   */
  navigate: (tabId: number, url: string) => ({
    tool: 'mcp__Claude_in_Chrome__navigate',
    params: {
      tabId,
      url
    }
  }),

  /**
   * Find element by natural language query
   */
  find: (tabId: number, query: string) => ({
    tool: 'mcp__Claude_in_Chrome__find',
    params: {
      tabId,
      query
    }
  }),

  /**
   * Fill form input
   */
  formInput: (tabId: number, ref: string, value: string) => ({
    tool: 'mcp__Claude_in_Chrome__form_input',
    params: {
      tabId,
      ref,
      value
    }
  }),

  /**
   * Read page text content
   */
  readPageText: (tabId: number) => ({
    tool: 'mcp__Claude_in_Chrome__get_page_text',
    params: {
      tabId
    }
  }),

  /**
   * Read accessibility tree for structured content
   */
  readPage: (tabId: number, depth?: number) => ({
    tool: 'mcp__Claude_in_Chrome__read_page',
    params: {
      tabId,
      depth: depth || 5
    }
  })
};

// =============================================================================
// SAM.GOV SPECIFIC URLS & SELECTORS
// =============================================================================

export const SAM_GOV_URLS = {
  base: 'https://sam.gov',
  search: 'https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate&sfm%5Bstatus%5D%5Bis_active%5D=true',
  searchWithKeyword: (keyword: string) =>
    `https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B0%5D%5Bkey%5D=${encodeURIComponent(keyword)}&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B0%5D%5Bvalue%5D=${encodeURIComponent(keyword)}`,
  opportunity: (id: string) => `https://sam.gov/opp/${id}/view`
};

export const SAM_GOV_SELECTORS = {
  searchInput: 'search input box',
  searchButton: 'search button',
  opportunityLinks: 'contract opportunity link',
  noticeId: 'Notice ID',
  responseDeadline: 'Response Date',
  agency: 'Department',
  description: 'Description',
  contactInfo: 'Contact Information',
  attachments: 'Attachments'
};

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Parse opportunity data from page text
 * Returns structured SAMOpportunity with confidence score
 */
export function parseOpportunityFromText(
  pageText: string,
  url: string,
  extractionTimestamp: string
): SAMOpportunity {
  const missing: string[] = [];

  // Extract notice ID (format: various patterns)
  const noticeIdMatch = pageText.match(/Notice ID[:\s]*([A-Z0-9\-]+)/i) ||
                        pageText.match(/Solicitation Number[:\s]*([A-Z0-9\-]+)/i);
  const notice_id = noticeIdMatch ? noticeIdMatch[1] : 'UNKNOWN';
  if (!noticeIdMatch) missing.push('notice_id');

  // Extract title (usually the first major heading)
  const titleMatch = pageText.match(/^([A-Z][^\.]{10,100})/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
  if (!titleMatch) missing.push('title');

  // Extract agency
  const agencyMatch = pageText.match(/Department\/Ind\. Agency[:\s]*([^\n]+)/i) ||
                      pageText.match(/Agency[:\s]*([^\n]+)/i);
  const agency = agencyMatch ? agencyMatch[1].trim() : 'Unknown Agency';
  if (!agencyMatch) missing.push('agency');

  // Extract notice type
  const noticeTypeMatch = pageText.match(/Notice Type[:\s]*([^\n]+)/i);
  const notice_type = noticeTypeMatch ? noticeTypeMatch[1].trim() : 'Unknown';
  if (!noticeTypeMatch) missing.push('notice_type');

  // Extract response deadline
  const deadlineMatch = pageText.match(/Response Date[:\s]*([^\n]+)/i) ||
                        pageText.match(/Current Response Date[:\s]*([^\n]+)/i);
  const response_deadline = deadlineMatch ? deadlineMatch[1].trim() : undefined;
  if (!deadlineMatch) missing.push('response_deadline');

  // Extract NAICS
  const naicsMatch = pageText.match(/NAICS[:\s]*(\d{6})/i);
  const naics_code = naicsMatch ? naicsMatch[1] : undefined;
  if (!naicsMatch) missing.push('naics_code');

  // Extract set-aside
  const setAsideMatch = pageText.match(/Set[- ]?Aside[:\s]*([^\n]+)/i);
  const set_aside = setAsideMatch ? setAsideMatch[1].trim() : undefined;
  if (!setAsideMatch) missing.push('set_aside');

  // Extract primary contact
  const contactMatch = pageText.match(/Primary Point of Contact[\s\S]*?([A-Z][a-z]+ [A-Z][a-z]+)[\s\S]*?Email[:\s]*([^\s]+@[^\s]+)/i);
  const primary_contact = contactMatch ? {
    name: contactMatch[1],
    email: contactMatch[2]
  } : undefined;
  if (!contactMatch) missing.push('primary_contact');

  // Extract posted date
  const postedMatch = pageText.match(/Published Date[:\s]*([^\n]+)/i) ||
                      pageText.match(/Posted Date[:\s]*([^\n]+)/i);
  const posted_date = postedMatch ? postedMatch[1].trim() : extractionTimestamp;
  if (!postedMatch) missing.push('posted_date');

  // Calculate confidence score
  const totalFields = 10;
  const foundFields = totalFields - missing.length;
  const confidence_score = Math.round((foundFields / totalFields) * 100);

  return {
    notice_id,
    title,
    url,
    agency,
    notice_type,
    set_aside,
    naics_code,
    posted_date,
    response_deadline,
    primary_contact,
    extraction_timestamp: extractionTimestamp,
    extraction_method: 'browser_automation',
    confidence_score,
    missing_fields: missing
  };
}

/**
 * Create markdown summary from opportunity
 */
export function generateOpportunitySummary(opp: SAMOpportunity): string {
  return `# ${opp.title}

## Quick Facts

| Field | Value |
|-------|-------|
| Notice ID | ${opp.notice_id} |
| Agency | ${opp.agency} |
| Notice Type | ${opp.notice_type} |
| Set-Aside | ${opp.set_aside || 'N/A'} |
| NAICS | ${opp.naics_code || 'N/A'} |
| Response Deadline | ${opp.response_deadline || 'TBD'} |
| Posted Date | ${opp.posted_date} |

## Contact Information

${opp.primary_contact ? `**${opp.primary_contact.name}**
Email: ${opp.primary_contact.email || 'N/A'}
Phone: ${opp.primary_contact.phone || 'N/A'}` : 'No contact information extracted'}

## Extraction Metadata

- **URL:** ${opp.url}
- **Extracted:** ${opp.extraction_timestamp}
- **Method:** ${opp.extraction_method}
- **Confidence Score:** ${opp.confidence_score}%

${opp.missing_fields.length > 0 ? `
### Missing/Unextracted Fields
${opp.missing_fields.map(f => `- ${f}`).join('\n')}
` : ''}

---
*Extracted by ACE Governance Platform - SAM.gov Automation*
*This is READ-ONLY extraction for capture planning purposes*
`;
}

// =============================================================================
// EVIDENCE BUNDLE BUILDER
// =============================================================================

export class EvidenceBundleBuilder {
  private bundle: Partial<EvidenceBundle>;
  private log: EvidenceBundle['extraction_log'];

  constructor() {
    this.bundle = {
      evidence: {},
      extraction_log: []
    };
    this.log = [];
  }

  logAction(action: string, result: 'success' | 'failure' | 'partial', details?: string) {
    this.log.push({
      timestamp: new Date().toISOString(),
      action,
      result,
      details
    });
  }

  setOpportunity(opp: SAMOpportunity) {
    this.bundle.opportunity = opp;
  }

  addScreenshot(type: keyof EvidenceBundle['evidence'], data: string) {
    if (this.bundle.evidence) {
      (this.bundle.evidence as any)[type] = data;
    }
  }

  build(): EvidenceBundle {
    if (!this.bundle.opportunity) {
      throw new Error('Cannot build evidence bundle without opportunity data');
    }
    return {
      opportunity: this.bundle.opportunity,
      evidence: this.bundle.evidence || {},
      extraction_log: this.log
    };
  }

  exportJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  exportMarkdown(): string {
    const bundle = this.build();
    return generateOpportunitySummary(bundle.opportunity);
  }
}

// =============================================================================
// AUTOMATION WORKFLOW
// =============================================================================

/**
 * SAM.gov Automation Workflow Steps
 *
 * This is a GUIDE for the browser automation sequence.
 * Each step should be executed via MCP tools with proper error handling.
 */
export const SAMGovWorkflow = {
  /**
   * Step 1: Initialize session
   */
  initSession: {
    description: 'Create MCP tab group and new tab',
    actions: [
      'tabs_context_mcp with createIfEmpty: true',
      'tabs_create_mcp'
    ]
  },

  /**
   * Step 2: Navigate to search
   */
  navigateToSearch: {
    description: 'Navigate to SAM.gov contract opportunities search',
    url: SAM_GOV_URLS.search,
    action: 'navigate'
  },

  /**
   * Step 3: Execute search
   */
  executeSearch: {
    description: 'Enter search terms and execute',
    steps: [
      'find: search input box',
      'form_input: enter search terms',
      'find: search button',
      'left_click: submit search',
      'wait for results (screenshot)'
    ]
  },

  /**
   * Step 4: Extract search results
   */
  extractSearchResults: {
    description: 'Capture search results list',
    steps: [
      'screenshot: search results',
      'scroll down to see more results',
      'read_page: extract opportunity titles and links'
    ]
  },

  /**
   * Step 5: Open opportunity detail
   */
  openOpportunityDetail: {
    description: 'Click into an opportunity for full details',
    steps: [
      'find: opportunity link by title',
      'left_click: open opportunity',
      'wait for page load',
      'screenshot: opportunity header'
    ]
  },

  /**
   * Step 6: Extract opportunity data
   */
  extractOpportunityData: {
    description: 'Extract all available fields',
    steps: [
      'get_page_text: full page content',
      'parseOpportunityFromText: structure data',
      'screenshot: description section',
      'screenshot: contact section',
      'screenshot: attachments section (if any)'
    ]
  },

  /**
   * Step 7: Build evidence bundle
   */
  buildEvidenceBundle: {
    description: 'Compile all extracted data and evidence',
    steps: [
      'Create EvidenceBundleBuilder',
      'setOpportunity with parsed data',
      'addScreenshot for each captured image',
      'exportJSON for structured data',
      'exportMarkdown for human summary'
    ]
  }
};

// =============================================================================
// DEMO: How to use this in BD Capture workflow
// =============================================================================

export const INTEGRATION_EXAMPLE = `
// Example: Integrate SAM.gov automation with BD Capture

import { EvidenceBundleBuilder, parseOpportunityFromText } from './SAMGovAutomation';
import { analyzeOpportunityFull } from './BDCaptureWorkforce';

async function captureOpportunityFromSAM(pageText: string, url: string) {
  // 1. Extract structured data
  const opportunity = parseOpportunityFromText(
    pageText,
    url,
    new Date().toISOString()
  );

  // 2. Build evidence bundle
  const builder = new EvidenceBundleBuilder();
  builder.setOpportunity(opportunity);
  builder.logAction('extract_opportunity', 'success');

  // 3. Feed to BD Capture workflow
  const captureInput = {
    title: opportunity.title,
    agency: opportunity.agency,
    rfpNumber: opportunity.notice_id,
    deadline: opportunity.response_deadline,
    naicsCode: opportunity.naics_code,
    setAsideType: opportunity.set_aside,
    solicitationUrl: opportunity.url
  };

  // 4. Run BD Capture analysis
  const captureResult = await analyzeOpportunityFull(captureInput);

  // 5. Export proposal + evidence
  return {
    evidenceBundle: builder.exportJSON(),
    opportunitySummary: builder.exportMarkdown(),
    captureReport: captureResult,
    confidenceScore: opportunity.confidence_score
  };
}
`;

export default {
  SAM_GOV_AUTOMATION_POLICY,
  SAM_GOV_URLS,
  BrowserHelpers,
  parseOpportunityFromText,
  generateOpportunitySummary,
  EvidenceBundleBuilder,
  SAMGovWorkflow
};
