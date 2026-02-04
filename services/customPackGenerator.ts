/**
 * Custom Pack Generator - AI-Powered
 *
 * Uses Claude (Sonnet) to intelligently parse natural language prompts
 * and generate governed instruction packs with appropriate steps.
 *
 * GOVERNANCE AUDIT VOCABULARY:
 * - BLOCKED: Request rejected at planning time (hard blocks, cannot proceed)
 * - CONSTRAINED: Request modified to comply with governance (domain drift, action limits)
 * - WARNED: Conditions that may trigger runtime stops (login, CAPTCHA)
 * - STOPPED: Runtime halt due to stop condition (CAPTCHA, login page, payment form)
 * - HELD: Awaiting human approval (ADVISORY/MANDATORY gates)
 */

import Anthropic from "@anthropic-ai/sdk";
import { config as appConfig } from '../config.browser';
import {
  InstructionPack,
  InstructionCategory,
  StepAction,
  ActionSensitivity,
  StopConditionType,
  InstructionStep
} from './browserAutomationAgent';
import { MAIClassification } from '../types';

// Get API key
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;

// Create client only if we have an API key
const client = apiKey ? new Anthropic({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

// Audit result types for consistent vocabulary
export type AuditResult = 'BLOCKED' | 'CONSTRAINED' | 'WARNED' | 'STOPPED' | 'HELD';

export interface GovernanceAudit {
  result: AuditResult;
  reason: string;
  details?: string;
  captureEvidence?: boolean;
}

// Loop/refresh rate limiting settings
const LOOP_RATE_LIMITS = {
  max_refresh_attempts: 3,
  min_delay_seconds: 5,
  max_consecutive_same_action: 5
};

// Standard governance policies for custom packs
const CUSTOM_PACK_DATA_HANDLING = {
  redact_pii_before_llm: true,
  no_secrets_in_prompts: true,
  mask_ssn: true,
  mask_credit_cards: true,
  allowed_data_exports: ['text', 'table', 'screenshot']
};

const CUSTOM_PACK_EVIDENCE_REQUIREMENTS = {
  screenshotRequired: true,
  hashRequired: true,
  timestampRequired: true,
  captureDOM: false,
  captureNetwork: false
};

const CUSTOM_PACK_STOP_CONDITIONS: StopConditionType[] = [
  StopConditionType.CAPTCHA_DETECTED,
  StopConditionType.LOGIN_PAGE_DETECTED,
  StopConditionType.PAYMENT_FORM_DETECTED,
  StopConditionType.PII_FIELD_DETECTED,
  StopConditionType.DOMAIN_REDIRECT,
  StopConditionType.BLOCKED_DOMAIN
];

// V1: Only allow safe actions for custom packs
const CUSTOM_PACK_ALLOWED_ACTIONS: StepAction[] = [
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
];

// Default blocked domains for all custom packs
const DEFAULT_BLOCKED_DOMAINS = [
  '*.payment.gov',
  'pay.gov',
  '*.paypal.com',
  '*.stripe.com',
  'login.gov',
  'id.me',
  '*.bank.com',
  'checkout.*'
];

export interface CustomPackRequest {
  prompt: string;
  allowedDomains: string[];
  name?: string;
}

interface AIGeneratedPlan {
  name: string;
  description: string;
  category: 'research' | 'extract' | 'verify' | 'document' | 'shopping' | 'lookup';
  domains: string[];
  steps: Array<{
    action: string;
    target?: string;
    selector?: string;
    url?: string;
    description: string;
    captureData?: string;
    waitAfter?: boolean;
  }>;
  dataToCapture: string[];
  estimatedDuration: string;
}

/**
 * Use Claude to intelligently parse the user's prompt and generate a plan
 */
async function generatePlanWithAI(prompt: string, providedDomains: string[]): Promise<AIGeneratedPlan> {
  if (!client) {
    // Fallback to basic parsing if no API key
    return generateBasicPlan(prompt, providedDomains);
  }

  const systemPrompt = `You are a browser automation planning assistant. Given a user's request, generate a structured plan for browser automation.

IMPORTANT CONSTRAINTS:
- V1 is READ-ONLY. No form submissions, purchases, logins, or account creation.
- For shopping requests: You can BROWSE products, CHECK prices, FIND store locations, but NOT add to cart or checkout.
- For any request requiring login: Suggest browsing public pages only.
- Always capture evidence (screenshots) at key steps.

Available actions (V1 read-only):
- NAVIGATE: Go to a URL
- SCREENSHOT: Capture the current page
- EXTRACT_TEXT: Get text content from a selector
- EXTRACT_TABLE: Get table data
- EXTRACT_LINKS: Get all links from page
- CLICK: Click an element (for navigation only, not forms)
- SCROLL: Scroll the page
- WAIT: Wait for content to load

Respond with a JSON object (no markdown, just JSON):
{
  "name": "Short name for this task",
  "description": "One sentence description",
  "category": "research|extract|verify|document|shopping|lookup",
  "domains": ["domain1.com", "domain2.com"],
  "steps": [
    {
      "action": "NAVIGATE|SCREENSHOT|EXTRACT_TEXT|EXTRACT_TABLE|CLICK|SCROLL|WAIT",
      "url": "https://... (for NAVIGATE)",
      "selector": "CSS selector (for EXTRACT/CLICK)",
      "target": "text to find (for CLICK)",
      "description": "What this step does",
      "captureData": "name for captured data (optional)",
      "waitAfter": true/false
    }
  ],
  "dataToCapture": ["list", "of", "data", "types"],
  "estimatedDuration": "1-2 minutes"
}`;

  const userMessage = `User request: "${prompt}"
${providedDomains.length > 0 ? `Allowed domains: ${providedDomains.join(', ')}` : 'Auto-detect appropriate domains from the request.'}

Generate a browser automation plan. Remember: V1 is READ-ONLY, no purchases or form submissions.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        { role: "user", content: userMessage }
      ],
      system: systemPrompt
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const jsonText = content.text.trim();
    // Handle potential markdown code blocks
    const cleanJson = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const plan: AIGeneratedPlan = JSON.parse(cleanJson);

    return plan;
  } catch (error: any) {
    console.error('AI plan generation failed:', error);
    // Fallback to basic parsing
    return generateBasicPlan(prompt, providedDomains);
  }
}

/**
 * Basic plan generation (fallback when no API)
 */
function generateBasicPlan(prompt: string, providedDomains: string[]): AIGeneratedPlan {
  const lowerPrompt = prompt.toLowerCase();

  // Extract URLs and domains
  const urlMatch = prompt.match(/https?:\/\/[^\s,)]+/);
  let targetUrl = urlMatch ? urlMatch[0].replace(/[.,;:!?]+$/, '') : undefined;
  let targetDomain: string | undefined;

  if (targetUrl) {
    try {
      targetDomain = new URL(targetUrl).hostname.replace(/^www\./, '');
    } catch {
      targetDomain = undefined;
    }
  }

  // Domain detection patterns
  if (!targetDomain) {
    const domainPatterns = [
      /\b(walmart\.com)\b/i,
      /\b(amazon\.com)\b/i,
      /\b(target\.com)\b/i,
      /\b(nike\.com)\b/i,
      /\b(footlocker\.com)\b/i,
      /\b(finishline\.com)\b/i,
      /\b(sam\.gov)\b/i,
      /\b(va\.gov)\b/i,
      /\b(ecfr\.gov)\b/i,
      /\b([a-z0-9-]+\.gov)\b/i,
      /\b([a-z0-9-]+\.(com|org|net|io))\b/i
    ];

    for (const pattern of domainPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        targetDomain = match[1].toLowerCase();
        targetUrl = `https://www.${targetDomain}`;
        break;
      }
    }
  }

  // Detect shopping-related keywords
  const isShoppingRelated = /walmart|amazon|target|nike|jordan|shoe|sneaker|buy|order|price|store|shop/i.test(prompt);
  const isStoreLocator = /store|location|near|find.*store|closest/i.test(prompt);

  // Build domains list
  const domains = providedDomains.length > 0
    ? providedDomains
    : (targetDomain ? [targetDomain, `*.${targetDomain}`] : []);

  // Determine category
  let category: AIGeneratedPlan['category'] = 'research';
  if (isShoppingRelated) category = 'shopping';
  else if (/extract|get|scrape/i.test(lowerPrompt)) category = 'extract';
  else if (/verify|check|confirm/i.test(lowerPrompt)) category = 'verify';
  else if (/document|screenshot|capture/i.test(lowerPrompt)) category = 'document';
  else if (/find|lookup|search/i.test(lowerPrompt)) category = 'lookup';

  // Generate steps based on detected intent
  const steps: AIGeneratedPlan['steps'] = [];

  if (targetUrl) {
    steps.push({
      action: 'NAVIGATE',
      url: targetUrl,
      description: `Navigate to ${targetDomain}`,
      waitAfter: true
    });
  }

  steps.push({
    action: 'SCREENSHOT',
    description: 'Capture initial page',
    waitAfter: false
  });

  if (isShoppingRelated) {
    // Search for product
    const productMatch = prompt.match(/jordan[s]?\s*(\d+)?|nike\s+\w+|shoe[s]?|sneaker[s]?/i);
    const productName = productMatch ? productMatch[0] : 'product';

    steps.push({
      action: 'EXTRACT_TEXT',
      selector: 'input[type="search"], input[name="q"], #search, .search-input',
      description: `Find search box for: ${productName}`,
      captureData: 'search_box_found'
    });

    steps.push({
      action: 'EXTRACT_TEXT',
      selector: '.product-title, .product-name, h1, h2, [data-product-name]',
      description: 'Extract product names',
      captureData: 'product_names'
    });

    steps.push({
      action: 'EXTRACT_TEXT',
      selector: '.price, [data-price], .product-price, .sale-price',
      description: 'Extract prices',
      captureData: 'prices'
    });

    if (isStoreLocator) {
      steps.push({
        action: 'CLICK',
        target: 'Store',
        selector: 'a[href*="store"], a[href*="location"], .store-finder, .find-store',
        description: 'Navigate to store locator'
      });

      steps.push({
        action: 'EXTRACT_TEXT',
        selector: '.store-name, .store-address, .location-info',
        description: 'Extract store locations',
        captureData: 'store_locations'
      });
    }
  } else {
    // General extraction
    steps.push({
      action: 'EXTRACT_TEXT',
      selector: 'main, article, .content, #content, [role="main"]',
      description: 'Extract main content',
      captureData: 'main_content'
    });

    steps.push({
      action: 'EXTRACT_LINKS',
      selector: 'a[href]',
      description: 'Extract page links',
      captureData: 'page_links'
    });
  }

  steps.push({
    action: 'SCROLL',
    description: 'Scroll to load more content'
  });

  steps.push({
    action: 'SCREENSHOT',
    description: 'Capture final page state'
  });

  return {
    name: `Custom: ${prompt.substring(0, 40)}...`,
    description: prompt,
    category,
    domains,
    steps,
    dataToCapture: steps.filter(s => s.captureData).map(s => s.captureData!),
    estimatedDuration: '1-3 minutes'
  };
}

/**
 * Convert AI plan to InstructionPack steps
 */
function convertToInstructionSteps(plan: AIGeneratedPlan): InstructionStep[] {
  const steps: InstructionStep[] = [];
  let order = 1;

  for (const step of plan.steps) {
    let action: StepAction;
    switch (step.action.toUpperCase()) {
      case 'NAVIGATE': action = StepAction.NAVIGATE; break;
      case 'SCREENSHOT': action = StepAction.SCREENSHOT; break;
      case 'EXTRACT_TEXT': action = StepAction.EXTRACT_TEXT; break;
      case 'EXTRACT_TABLE': action = StepAction.EXTRACT_TABLE; break;
      case 'EXTRACT_LINKS': action = StepAction.EXTRACT_LINKS; break;
      case 'CLICK': action = StepAction.CLICK; break;
      case 'SCROLL': action = StepAction.SCROLL; break;
      case 'WAIT': action = StepAction.WAIT; break;
      default: action = StepAction.EXTRACT_TEXT;
    }

    const isSafe = [StepAction.NAVIGATE, StepAction.SCREENSHOT, StepAction.EXTRACT_TEXT,
                    StepAction.EXTRACT_TABLE, StepAction.EXTRACT_LINKS, StepAction.SCROLL,
                    StepAction.WAIT, StepAction.VERIFY_TEXT].includes(action);

    const instructionStep: InstructionStep = {
      id: `custom-${order}`,
      order: order++,
      action,
      target: step.url ? { url: step.url } :
              step.selector ? { selector: step.selector } :
              step.target ? { text: step.target } : undefined,
      description: step.description,
      rationale: step.description,
      sensitivity: isSafe ? ActionSensitivity.SAFE : ActionSensitivity.ADVISORY,
      captureEvidence: action === StepAction.SCREENSHOT || action === StepAction.EXTRACT_TEXT,
      captureData: step.captureData ? {
        name: step.captureData,
        type: action === StepAction.EXTRACT_TABLE ? 'table' : 'text'
      } : undefined,
      waitFor: step.waitAfter ? { type: 'network_idle', value: 'idle', timeout: 10000 } : undefined
    };

    steps.push(instructionStep);
  }

  return steps;
}

/**
 * Generate a governed instruction pack from a natural language prompt
 */
export async function generateCustomPack(request: CustomPackRequest): Promise<InstructionPack & {
  _warnings?: string[];
  _constraints?: string[];
  _audits?: GovernanceAudit[];
  _rateLimits?: typeof LOOP_RATE_LIMITS;
}> {
  const { prompt, allowedDomains, name } = request;

  // Validate request FIRST - block dangerous operations
  const validation = validateCustomPackRequest(request);
  if (!validation.valid) {
    // BLOCKED - capture evidence for audit trail
    const blockedAudits = validation.audits.filter(a => a.result === 'BLOCKED');
    console.log('[GOVERNANCE] Request BLOCKED:', blockedAudits);
    throw new Error(`Request BLOCKED by governance:\n• ${validation.issues.join('\n• ')}`);
  }

  // Use AI to generate the plan
  const aiPlan = await generatePlanWithAI(prompt, allowedDomains);

  // Build domain lists
  const domains = aiPlan.domains.length > 0 ? aiPlan.domains : allowedDomains;

  if (domains.length === 0) {
    throw new Error('Could not detect a target website. Please include a website name (e.g., walmart.com, sam.gov) or URL in your prompt.');
  }

  // Add wildcard variants
  const expandedDomains = [...new Set([
    ...domains,
    ...domains.map(d => `*.${d.replace(/^\*\./, '')}`),
    ...domains.map(d => `www.${d.replace(/^(www\.|^\*\.)/, '')}`)
  ])];

  // Convert to instruction steps
  const steps = convertToInstructionSteps(aiPlan);

  // Determine category
  let category: InstructionCategory;
  switch (aiPlan.category) {
    case 'extract':
    case 'shopping':
      category = InstructionCategory.DATA_EXTRACTION;
      break;
    case 'verify':
      category = InstructionCategory.VERIFICATION;
      break;
    case 'document':
      category = InstructionCategory.EVIDENCE_COLLECTION;
      break;
    default:
      category = InstructionCategory.RESEARCH;
  }

  // Generate outputs
  const outputs = steps
    .filter(s => s.captureData)
    .map(s => ({
      name: s.captureData!.name,
      type: s.captureData!.type as 'text' | 'table' | 'screenshot' | 'json' | 'file',
      description: s.description,
      required: true
    }));

  outputs.push({
    name: 'evidence_screenshots',
    type: 'screenshot',
    description: 'Visual evidence of execution',
    required: true
  });

  // Build the pack
  const pack: InstructionPack = {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name || aiPlan.name,
    description: aiPlan.description,
    version: '1.0.0',
    workforce: 'UNIVERSAL',
    category,

    // GOVERNANCE - enforced even for custom packs
    allowed_domains: expandedDomains,
    blocked_domains: DEFAULT_BLOCKED_DOMAINS,
    allowed_actions: CUSTOM_PACK_ALLOWED_ACTIONS,
    sensitive_actions: [StepAction.CLICK],
    required_gates: [
      {
        condition: 'Before clicking interactive elements',
        gate_type: MAIClassification.ADVISORY,
        rationale: 'Custom pack - verify navigation is safe'
      }
    ],
    data_handling: CUSTOM_PACK_DATA_HANDLING,
    evidence_requirements: CUSTOM_PACK_EVIDENCE_REQUIREMENTS,
    stop_conditions: CUSTOM_PACK_STOP_CONDITIONS,
    max_runtime_seconds: 300,

    // METADATA
    estimatedDuration: aiPlan.estimatedDuration,
    tags: ['custom', 'ai-generated', ...domains.slice(0, 2)],
    created: new Date().toISOString().split('T')[0],
    author: 'AI Pack Generator (Claude)',
    classification: MAIClassification.ADVISORY,

    // STEPS & OUTPUTS
    steps,
    outputs
  };

  // Attach governance audit information for UI to display
  // Note: validation was already run at start of function
  const extendedPack = pack as InstructionPack & {
    _warnings?: string[];
    _constraints?: string[];
    _audits?: GovernanceAudit[];
    _rateLimits?: typeof LOOP_RATE_LIMITS;
  };

  if (validation.warnings.length > 0) {
    extendedPack._warnings = validation.warnings;
  }

  if (validation.constraints.length > 0) {
    extendedPack._constraints = validation.constraints;
    console.log('[GOVERNANCE] Request CONSTRAINED:', validation.constraints);
  }

  // Always attach full audit trail for transparency
  if (validation.audits.length > 0) {
    extendedPack._audits = validation.audits;
  }

  // Attach rate limits for loop operations
  const hasLoopWarning = validation.audits.some(a =>
    a.result === 'WARNED' && a.details?.includes('CAPTCHA_DETECTED')
  );
  if (hasLoopWarning) {
    extendedPack._rateLimits = { ...LOOP_RATE_LIMITS };
  }

  return extendedPack;
}

/**
 * Validate that a custom pack request is safe
 * Returns governance audit results with consistent vocabulary:
 * - BLOCKED: Hard blocks that reject the request
 * - CONSTRAINED: Modifications made to comply with governance
 * - WARNED: Conditions that may trigger runtime stops
 */
export function validateCustomPackRequest(request: CustomPackRequest): {
  valid: boolean;
  issues: string[];           // BLOCKED reasons
  warnings: string[];         // WARNED conditions
  constraints: string[];      // CONSTRAINED modifications
  audits: GovernanceAudit[];  // Full audit trail
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const constraints: string[] = [];
  const audits: GovernanceAudit[] = [];

  if (request.prompt.length < 10) {
    const audit: GovernanceAudit = {
      result: 'BLOCKED',
      reason: 'Prompt too short',
      details: 'Please describe what you want to do in more detail.',
      captureEvidence: true
    };
    audits.push(audit);
    issues.push(audit.details!);
  }

  if (request.prompt.length > 2000) {
    const audit: GovernanceAudit = {
      result: 'BLOCKED',
      reason: 'Prompt too long',
      details: 'Please keep it under 2000 characters.',
      captureEvidence: true
    };
    audits.push(audit);
    issues.push(audit.details!);
  }

  // HARD BLOCKS - operations that are completely blocked in V1
  // These result in BLOCKED audit entries
  const blockedPatterns = [
    // Destructive operations
    { pattern: /\bdelete\b/i, reason: 'delete operations' },
    { pattern: /\bremove\b/i, reason: 'remove operations' },

    // Content creation
    { pattern: /\bpost\s+(?:a\s+)?(?:comment|review|message)/i, reason: 'posting content' },
    { pattern: /\bsend\s+(?:a\s+)?(?:message|email)/i, reason: 'sending messages' },

    // Account operations
    { pattern: /\bcreate\s+(?:an?\s+)?account/i, reason: 'account creation' },
    { pattern: /\bsign\s*up/i, reason: 'sign up' },

    // Form submission
    { pattern: /\bsubmit\s+(?:a\s+)?form/i, reason: 'form submission' },
    { pattern: /\bapply\s+for\b/i, reason: 'applications (requires form submission)' },
    { pattern: /\bfill\s+(?:out|in)\s+(?:my|the|a)?\s*(?:info|information|form|application)/i, reason: 'filling out forms' },

    // Transaction operations
    { pattern: /\bpurchase\b/i, reason: 'purchasing' },
    { pattern: /\bbuy\s+(?:it|this|that|now)/i, reason: 'buying' },
    { pattern: /\badd\s+to\s+cart/i, reason: 'adding to cart' },
    { pattern: /\bcheckout\b/i, reason: 'checkout' },
    { pattern: /\bproceed\s+to\s+(?:checkout|payment)/i, reason: 'checkout/payment' },
    { pattern: /\bplace\s+(?:an?\s+)?order/i, reason: 'placing orders' },
    { pattern: /\bcredit\s*card/i, reason: 'credit card entry' },
    { pattern: /\bpayment\s+(?:info|information|details)/i, reason: 'payment information' },

    // CREDENTIAL HARD BLOCKS - V1 cannot handle authentication
    { pattern: /\benter\s+(?:my\s+)?password/i, reason: 'credential entry (password)' },
    { pattern: /\btype\s+(?:my\s+)?(?:password|pin|passcode)/i, reason: 'credential entry (password/PIN)' },
    { pattern: /\binput\s+(?:my\s+)?(?:password|credentials)/i, reason: 'credential entry' },
    { pattern: /\buse\s+(?:my\s+)?password/i, reason: 'credential entry (password)' },
    { pattern: /\bverify\s+(?:with\s+)?(?:otp|code|sms|2fa|mfa)/i, reason: 'OTP/verification code entry' },
    { pattern: /\benter\s+(?:the\s+)?(?:verification\s+)?code/i, reason: 'verification code entry' },
    { pattern: /\b(?:one[\s-]?time|otp)\s*(?:password|code)/i, reason: 'OTP entry' },
    { pattern: /\bssn\b/i, reason: 'SSN entry' },
    { pattern: /\bsocial\s*security/i, reason: 'social security number entry' },
    { pattern: /\benter\s+(?:my\s+)?(?:ssn|ein|itin)/i, reason: 'tax ID entry' },
    { pattern: /\bbank\s+(?:account|routing)\s*(?:number)?/i, reason: 'bank account entry' },
    { pattern: /\bdriver'?s?\s*licen[cs]e\s*(?:number)?/i, reason: 'driver\'s license entry' },
    { pattern: /\bpassport\s*(?:number)?/i, reason: 'passport number entry' },
  ];

  for (const { pattern, reason } of blockedPatterns) {
    if (pattern.test(request.prompt)) {
      const audit: GovernanceAudit = {
        result: 'BLOCKED',
        reason: `Blocked operation: ${reason}`,
        details: `V1 is read-only. "${reason}" is not supported. You can browse and research, but not complete transactions or enter credentials.`,
        captureEvidence: true
      };
      audits.push(audit);
      issues.push(audit.details!);
    }
  }

  // CONSTRAINED - operations that will be modified to comply
  // Domain drift is CONSTRAINED (plan mutation), not just warned
  const constrainedPatterns = [
    {
      pattern: /\bany\s+(?:other\s+)?site/i,
      constraint: 'Domain drift requested → CONSTRAINED to allowlisted domains only',
      mutation: 'Alternative sites removed; only allowlisted domains permitted'
    },
    {
      pattern: /\bif\s+(?:it\'?s?\s+)?(?:not\s+)?(?:available|there|working)/i,
      constraint: 'Fallback site requested → CONSTRAINED to original domain',
      mutation: 'Fallback removed; execution limited to primary domain'
    },
    {
      pattern: /\bor\s+(?:try|check|go\s+to)\s+(?:another|different|other)/i,
      constraint: 'Alternative navigation requested → CONSTRAINED',
      mutation: 'Alternative paths removed; single domain execution enforced'
    },
    {
      pattern: /\bif\s+(?:it\'?s?\s+)?easier/i,
      constraint: 'Convenience fallback requested → CONSTRAINED',
      mutation: 'Convenience alternatives removed; strict domain adherence'
    },
  ];

  for (const { pattern, constraint, mutation } of constrainedPatterns) {
    if (pattern.test(request.prompt)) {
      const audit: GovernanceAudit = {
        result: 'CONSTRAINED',
        reason: constraint,
        details: mutation,
        captureEvidence: false
      };
      audits.push(audit);
      constraints.push(`${constraint}. ${mutation}`);
    }
  }

  // WARNED - operations that may trigger runtime stops
  // These don't block but inform user of potential STOPPED outcomes
  const warningPatterns = [
    {
      pattern: /\blog\s*in/i,
      warning: 'WARNED: This request may require login. Runner will STOP at login pages.',
      stopCondition: 'LOGIN_PAGE_DETECTED'
    },
    {
      pattern: /\bmy\s+(?:order|account|profile)/i,
      warning: 'WARNED: Accessing personal account data requires login. Runner will STOP at login pages.',
      stopCondition: 'LOGIN_PAGE_DETECTED'
    },
    {
      pattern: /\bcheck\s+(?:my|order)\s+status/i,
      warning: 'WARNED: Order status requires login. Runner will STOP at login pages.',
      stopCondition: 'LOGIN_PAGE_DETECTED'
    },
    {
      pattern: /\bkeep\s+(?:trying|refreshing|checking)/i,
      warning: `WARNED: Continuous operations limited to ${LOOP_RATE_LIMITS.max_refresh_attempts} attempts with ${LOOP_RATE_LIMITS.min_delay_seconds}s minimum delay. May STOP if CAPTCHA detected.`,
      stopCondition: 'CAPTCHA_DETECTED'
    },
    {
      pattern: /\brefresh\s+until/i,
      warning: `WARNED: Refresh loops limited to ${LOOP_RATE_LIMITS.max_refresh_attempts} attempts. May STOP if CAPTCHA detected.`,
      stopCondition: 'CAPTCHA_DETECTED'
    },
    {
      pattern: /\bwait\s+(?:for|until)\s+(?:it|the|stock)/i,
      warning: `WARNED: Polling operations limited to ${LOOP_RATE_LIMITS.max_refresh_attempts} checks. May STOP if CAPTCHA detected.`,
      stopCondition: 'CAPTCHA_DETECTED'
    },
    {
      pattern: /\bmonitor\b/i,
      warning: `WARNED: Monitoring limited to ${LOOP_RATE_LIMITS.max_refresh_attempts} iterations with ${LOOP_RATE_LIMITS.min_delay_seconds}s minimum interval.`,
      stopCondition: 'CAPTCHA_DETECTED'
    },
  ];

  for (const { pattern, warning, stopCondition } of warningPatterns) {
    if (pattern.test(request.prompt)) {
      const audit: GovernanceAudit = {
        result: 'WARNED',
        reason: warning,
        details: `May trigger ${stopCondition} stop condition`,
        captureEvidence: false
      };
      audits.push(audit);
      warnings.push(warning);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    constraints,
    audits
  };
}

/**
 * Get loop rate limiting configuration
 */
export function getLoopRateLimits() {
  return { ...LOOP_RATE_LIMITS };
}
