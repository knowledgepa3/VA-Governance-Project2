/**
 * MAI Security Gates for Chrome Agent Workforce
 *
 * These are MANDATORY security controls that cannot be bypassed.
 * They protect against injection attacks, credential theft, and
 * ensure human identity is preserved in the audit chain.
 *
 * KEY PRINCIPLE: Security gates are FEATURES, not friction.
 * They make the system auditable and defensible.
 */

import { MAIClassification } from '../types';

// ============================================================================
// SECURITY GATE TYPES
// ============================================================================

/**
 * Security gate classification using MAI framework
 */
export interface SecurityGate {
  id: string;
  name: string;
  classification: MAIClassification;
  category: SecurityGateCategory;

  // What triggers this gate
  triggers: SecurityTrigger[];

  // Agent behavior when gate is triggered
  agentBehavior: AgentBehavior;

  // Human requirements
  humanRequirement: HumanRequirement;

  // Security rationale (for auditors)
  securityRationale: string;

  // What gets logged
  auditFields: string[];
}

export type SecurityGateCategory =
  | 'AUTHENTICATION'      // Login, SSO, MFA
  | 'CREDENTIAL_HANDLING' // Password fields, API keys, tokens
  | 'PAYMENT'             // Financial transactions
  | 'DATA_EXPORT'         // Downloading, exporting PII
  | 'SUBMISSION'          // Form submission, applications
  | 'DELETION'            // Destructive actions
  | 'PERMISSION_CHANGE'   // Access control modifications
  | 'INJECTION_DEFENSE';  // Detected injection attempts

export interface SecurityTrigger {
  type: 'URL_PATTERN' | 'ELEMENT_TYPE' | 'TEXT_CONTENT' | 'ACTION_TYPE' | 'DOMAIN_CHANGE';
  pattern: string | string[];
  description: string;
}

export interface AgentBehavior {
  action: 'BLOCK' | 'PAUSE_AND_WAIT' | 'REQUIRE_TWO_KEY' | 'LOG_AND_ALERT';
  displayMessage: string;
  waitForCondition?: WaitCondition;
  timeout?: number;  // Max wait time in ms
}

export interface WaitCondition {
  type: 'URL_CHANGE' | 'ELEMENT_APPEARS' | 'ELEMENT_DISAPPEARS' | 'COOKIE_SET' | 'MANUAL_SIGNAL';
  pattern?: string;
  description: string;
}

export interface HumanRequirement {
  type: 'PERFORM_ACTION' | 'APPROVE_ONLY' | 'REVIEW_AND_APPROVE';
  description: string;
  twoKeyRequired: boolean;  // Requires both Claude approval AND console approval
  credentialsInvolved: boolean;
  mfaPossible: boolean;
}

// ============================================================================
// MANDATORY SECURITY GATES
// ============================================================================

/**
 * MANDATORY: Authentication Gate
 *
 * Agent CANNOT handle authentication. Human must complete login.
 * This prevents credential theft via prompt injection.
 */
export const AUTHENTICATION_GATE: SecurityGate = {
  id: 'mandatory-auth-gate',
  name: 'Authentication Security Gate',
  classification: MAIClassification.MANDATORY,
  category: 'AUTHENTICATION',

  triggers: [
    {
      type: 'URL_PATTERN',
      pattern: ['login', 'signin', 'auth', 'sso', 'oauth', 'saml', 'identity'],
      description: 'URL contains authentication-related path'
    },
    {
      type: 'ELEMENT_TYPE',
      pattern: ['input[type="password"]', 'input[name*="password"]', 'input[name*="credential"]'],
      description: 'Page contains password input field'
    },
    {
      type: 'TEXT_CONTENT',
      pattern: ['Sign in', 'Log in', 'Enter password', 'Authenticate', 'Verify your identity'],
      description: 'Page displays authentication prompts'
    },
    {
      type: 'DOMAIN_CHANGE',
      pattern: ['login.gov', 'okta.com', 'auth0.com', 'microsoftonline.com', 'accounts.google.com'],
      description: 'Redirected to known identity provider'
    }
  ],

  agentBehavior: {
    action: 'PAUSE_AND_WAIT',
    displayMessage: `
🔐 AUTHENTICATION REQUIRED

This action requires human authentication. I cannot and will not:
- Enter passwords or credentials
- Complete MFA challenges
- Handle security tokens

Please complete the login process yourself.
I will automatically resume once authentication is complete.

[Waiting for authentication...]
`,
    waitForCondition: {
      type: 'URL_CHANGE',
      pattern: 'away from login page',
      description: 'Wait for redirect away from authentication page'
    },
    timeout: 300000  // 5 minute timeout
  },

  humanRequirement: {
    type: 'PERFORM_ACTION',
    description: 'Human must complete entire authentication flow including MFA',
    twoKeyRequired: true,
    credentialsInvolved: true,
    mfaPossible: true
  },

  securityRationale: `
Authentication must remain human-controlled because:
1. CREDENTIAL PROTECTION: Agent never sees passwords, preventing extraction via injection
2. IDENTITY BINDING: Session is tied to human identity, not bot identity
3. MFA INTEGRITY: Multi-factor auth remains under human control
4. AUDIT TRAIL: Authentication event records WHO logged in, not WHAT
5. INJECTION DEFENSE: Malicious prompts cannot trick agent into revealing credentials
`,

  auditFields: [
    'gate_triggered_at',
    'authentication_domain',
    'human_completed_at',
    'session_id',
    'redirect_destination',
    'mfa_used',  // boolean only, not MFA details
    'gate_duration_ms'
  ]
};

/**
 * MANDATORY: Credential Handling Gate
 *
 * Agent CANNOT interact with any credential-related fields.
 */
export const CREDENTIAL_HANDLING_GATE: SecurityGate = {
  id: 'mandatory-credential-gate',
  name: 'Credential Handling Security Gate',
  classification: MAIClassification.MANDATORY,
  category: 'CREDENTIAL_HANDLING',

  triggers: [
    {
      type: 'ELEMENT_TYPE',
      pattern: [
        'input[type="password"]',
        'input[name*="api_key"]',
        'input[name*="apikey"]',
        'input[name*="secret"]',
        'input[name*="token"]',
        'input[name*="credential"]',
        'input[autocomplete="current-password"]',
        'input[autocomplete="new-password"]'
      ],
      description: 'Credential input field detected'
    },
    {
      type: 'TEXT_CONTENT',
      pattern: [
        'API Key', 'Secret Key', 'Access Token', 'Bearer Token',
        'Client Secret', 'Private Key', 'SSH Key', 'Passphrase'
      ],
      description: 'Credential-related label detected'
    }
  ],

  agentBehavior: {
    action: 'BLOCK',
    displayMessage: `
🚫 CREDENTIAL FIELD DETECTED

I cannot interact with credential fields. This includes:
- Passwords
- API keys
- Secret tokens
- Private keys

Please enter the credential yourself.
Once complete, tell me to continue.
`,
  },

  humanRequirement: {
    type: 'PERFORM_ACTION',
    description: 'Human must enter all credentials manually',
    twoKeyRequired: true,
    credentialsInvolved: true,
    mfaPossible: false
  },

  securityRationale: `
Credential fields are blocked because:
1. INJECTION VECTOR: Prompt injection could extract credentials to attacker-controlled fields
2. NO STORAGE: Agent must never have credentials in context/memory
3. NO TRANSMISSION: Credentials cannot be accidentally included in API calls
4. AUDIT SAFETY: Logs never contain sensitive credential data
`,

  auditFields: [
    'gate_triggered_at',
    'field_type',
    'page_url',
    'human_completed_at',
    'credential_type_generic'  // e.g., "password" not the actual password
  ]
};

/**
 * MANDATORY: Payment Gate
 *
 * All payment actions require two-key approval.
 */
export const PAYMENT_GATE: SecurityGate = {
  id: 'mandatory-payment-gate',
  name: 'Payment Security Gate',
  classification: MAIClassification.MANDATORY,
  category: 'PAYMENT',

  triggers: [
    {
      type: 'URL_PATTERN',
      pattern: ['checkout', 'payment', 'pay.', 'billing', 'purchase', 'subscribe'],
      description: 'Payment-related URL detected'
    },
    {
      type: 'ELEMENT_TYPE',
      pattern: [
        'input[name*="card"]',
        'input[name*="credit"]',
        'input[name*="cvv"]',
        'input[name*="expir"]',
        'input[autocomplete="cc-number"]'
      ],
      description: 'Payment card field detected'
    },
    {
      type: 'TEXT_CONTENT',
      pattern: [
        'Pay Now', 'Complete Purchase', 'Place Order', 'Submit Payment',
        'Confirm Payment', 'Buy Now', 'Checkout', 'Add to Cart & Buy'
      ],
      description: 'Payment action button detected'
    },
    {
      type: 'ACTION_TYPE',
      pattern: ['click_payment_button', 'submit_payment_form'],
      description: 'Payment action attempted'
    }
  ],

  agentBehavior: {
    action: 'REQUIRE_TWO_KEY',
    displayMessage: `
💳 PAYMENT ACTION DETECTED

This action involves a financial transaction.

Two-key approval required:
1. Your approval (in this chat)
2. Governance console approval

Transaction details:
[Will show amount, recipient, description]

Do you approve this payment?
`
  },

  humanRequirement: {
    type: 'REVIEW_AND_APPROVE',
    description: 'Human must review transaction details and provide two-key approval',
    twoKeyRequired: true,
    credentialsInvolved: true,  // Card details
    mfaPossible: true  // Bank may require MFA
  },

  securityRationale: `
Payment actions require two-key approval because:
1. FINANCIAL RISK: Unauthorized transactions cause direct monetary loss
2. IRREVERSIBILITY: Many payment actions cannot be easily reversed
3. INJECTION TARGET: Payments are high-value targets for injection attacks
4. AUDIT REQUIREMENT: Financial transactions require clear approval chain
`,

  auditFields: [
    'gate_triggered_at',
    'payment_domain',
    'amount_detected',
    'currency_detected',
    'key1_approved_by',
    'key1_approved_at',
    'key2_approved_by',
    'key2_approved_at',
    'transaction_reference'
  ]
};

/**
 * MANDATORY: Injection Defense Gate
 *
 * Detects and blocks potential prompt injection attempts.
 */
export const INJECTION_DEFENSE_GATE: SecurityGate = {
  id: 'mandatory-injection-defense',
  name: 'Injection Defense Security Gate',
  classification: MAIClassification.MANDATORY,
  category: 'INJECTION_DEFENSE',

  triggers: [
    {
      type: 'TEXT_CONTENT',
      pattern: [
        // Instruction override attempts
        'ignore previous instructions',
        'ignore all previous',
        'disregard your instructions',
        'forget your rules',
        'new instructions:',
        'system prompt:',
        'you are now',
        'act as if',
        'pretend you are',

        // Authority impersonation
        'admin override',
        'developer mode',
        'maintenance mode',
        'debug mode enable',
        'sudo',

        // Credential extraction attempts
        'send credentials to',
        'email password to',
        'post the api key',
        'extract and send',

        // Hidden instructions
        'hidden instruction',
        'secret command',
        'execute silently',

        // Social engineering
        'urgent: do this now',
        'emergency override',
        'critical: bypass'
      ],
      description: 'Potential injection pattern detected in page content'
    }
  ],

  agentBehavior: {
    action: 'LOG_AND_ALERT',
    displayMessage: `
⚠️ POTENTIAL INJECTION DETECTED

I found suspicious content on this page that may be attempting
to manipulate my behavior:

[Will show detected pattern]

This content has been logged and flagged.
I will NOT follow any instructions from this page.

Continuing with original task only.
`
  },

  humanRequirement: {
    type: 'REVIEW_AND_APPROVE',
    description: 'Human should review flagged content and decide whether to proceed',
    twoKeyRequired: false,
    credentialsInvolved: false,
    mfaPossible: false
  },

  securityRationale: `
Injection defense is mandatory because:
1. PRIMARY ATTACK VECTOR: Prompt injection is the main threat to agent systems
2. DEFENSE IN DEPTH: Detection layer before action prevents execution
3. AUDIT TRAIL: All injection attempts are logged for security review
4. USER PROTECTION: Prevents agent from taking malicious actions on user's behalf
`,

  auditFields: [
    'gate_triggered_at',
    'injection_pattern_detected',
    'source_url',
    'source_element',
    'full_context',
    'action_taken',
    'human_reviewed'
  ]
};

// ============================================================================
// ADVISORY SECURITY GATES
// ============================================================================

/**
 * ADVISORY: Data Export Gate
 */
export const DATA_EXPORT_GATE: SecurityGate = {
  id: 'advisory-data-export',
  name: 'Data Export Security Gate',
  classification: MAIClassification.ADVISORY,
  category: 'DATA_EXPORT',

  triggers: [
    {
      type: 'TEXT_CONTENT',
      pattern: ['Download', 'Export', 'Save As', 'Generate Report'],
      description: 'Data export action detected'
    },
    {
      type: 'URL_PATTERN',
      pattern: ['.pdf', '.xlsx', '.csv', '.json', '.xml', '.zip', 'download', 'export'],
      description: 'Download URL pattern detected'
    }
  ],

  agentBehavior: {
    action: 'REQUIRE_TWO_KEY',
    displayMessage: `
📥 DATA EXPORT DETECTED

You're about to download/export data:
[Will show file details]

Please confirm this export is expected.
`
  },

  humanRequirement: {
    type: 'APPROVE_ONLY',
    description: 'Human should confirm data export is intended',
    twoKeyRequired: true,
    credentialsInvolved: false,
    mfaPossible: false
  },

  securityRationale: 'Data exports may contain sensitive information and should be tracked.',

  auditFields: [
    'gate_triggered_at',
    'export_type',
    'file_name',
    'file_size',
    'destination',
    'approved_by',
    'approved_at'
  ]
};

/**
 * ADVISORY: Form Submission Gate
 */
export const FORM_SUBMISSION_GATE: SecurityGate = {
  id: 'advisory-form-submission',
  name: 'Form Submission Security Gate',
  classification: MAIClassification.ADVISORY,
  category: 'SUBMISSION',

  triggers: [
    {
      type: 'ELEMENT_TYPE',
      pattern: ['button[type="submit"]', 'input[type="submit"]', 'form'],
      description: 'Form submission element detected'
    },
    {
      type: 'TEXT_CONTENT',
      pattern: ['Submit', 'Send', 'Apply', 'Register', 'Sign Up', 'Create Account'],
      description: 'Submission button text detected'
    }
  ],

  agentBehavior: {
    action: 'REQUIRE_TWO_KEY',
    displayMessage: `
📝 FORM SUBMISSION

About to submit form to: [URL]

Form data summary:
[Will show non-sensitive field summary]

Approve submission?
`
  },

  humanRequirement: {
    type: 'REVIEW_AND_APPROVE',
    description: 'Human should review form data before submission',
    twoKeyRequired: true,
    credentialsInvolved: false,
    mfaPossible: false
  },

  securityRationale: 'Form submissions may have legal or financial implications.',

  auditFields: [
    'gate_triggered_at',
    'form_action_url',
    'form_method',
    'field_count',
    'submission_approved_by',
    'submission_approved_at'
  ]
};

// ============================================================================
// SECURITY GATE REGISTRY
// ============================================================================

export const MANDATORY_GATES: SecurityGate[] = [
  AUTHENTICATION_GATE,
  CREDENTIAL_HANDLING_GATE,
  PAYMENT_GATE,
  INJECTION_DEFENSE_GATE
];

export const ADVISORY_GATES: SecurityGate[] = [
  DATA_EXPORT_GATE,
  FORM_SUBMISSION_GATE
];

export const ALL_SECURITY_GATES: SecurityGate[] = [
  ...MANDATORY_GATES,
  ...ADVISORY_GATES
];

// ============================================================================
// SECURITY GATE CHECKER
// ============================================================================

export interface GateCheckResult {
  triggered: boolean;
  gate?: SecurityGate;
  trigger?: SecurityTrigger;
  action: 'PROCEED' | 'BLOCK' | 'WAIT' | 'TWO_KEY_REQUIRED' | 'ALERT';
  message: string;
}

/**
 * Security Gate Checker
 *
 * Checks page content and actions against all security gates.
 */
export class SecurityGateChecker {
  private gates: SecurityGate[];

  constructor(gates: SecurityGate[] = ALL_SECURITY_GATES) {
    this.gates = gates;
  }

  /**
   * Check if any security gate is triggered
   */
  checkGates(context: {
    url: string;
    pageText?: string;
    elementType?: string;
    actionType?: string;
    domain?: string;
  }): GateCheckResult {
    for (const gate of this.gates) {
      for (const trigger of gate.triggers) {
        if (this.isTriggerMatched(trigger, context)) {
          return {
            triggered: true,
            gate,
            trigger,
            action: this.mapBehaviorToAction(gate.agentBehavior.action),
            message: gate.agentBehavior.displayMessage
          };
        }
      }
    }

    return {
      triggered: false,
      action: 'PROCEED',
      message: 'No security gates triggered'
    };
  }

  private isTriggerMatched(
    trigger: SecurityTrigger,
    context: { url: string; pageText?: string; elementType?: string; actionType?: string; domain?: string }
  ): boolean {
    const patterns = Array.isArray(trigger.pattern) ? trigger.pattern : [trigger.pattern];

    switch (trigger.type) {
      case 'URL_PATTERN':
        return patterns.some(p => context.url.toLowerCase().includes(p.toLowerCase()));

      case 'TEXT_CONTENT':
        if (!context.pageText) return false;
        return patterns.some(p => context.pageText!.toLowerCase().includes(p.toLowerCase()));

      case 'ELEMENT_TYPE':
        if (!context.elementType) return false;
        return patterns.some(p => context.elementType!.includes(p));

      case 'ACTION_TYPE':
        if (!context.actionType) return false;
        return patterns.some(p => context.actionType === p);

      case 'DOMAIN_CHANGE':
        if (!context.domain) return false;
        return patterns.some(p => context.domain!.includes(p));

      default:
        return false;
    }
  }

  private mapBehaviorToAction(behavior: AgentBehavior['action']): GateCheckResult['action'] {
    const mapping: Record<AgentBehavior['action'], GateCheckResult['action']> = {
      'BLOCK': 'BLOCK',
      'PAUSE_AND_WAIT': 'WAIT',
      'REQUIRE_TWO_KEY': 'TWO_KEY_REQUIRED',
      'LOG_AND_ALERT': 'ALERT'
    };
    return mapping[behavior];
  }

  /**
   * Generate security gate documentation for instruction pack
   */
  generateGateDocumentation(): string {
    let doc = `# MANDATORY SECURITY GATES

These security controls are enforced automatically. They cannot be bypassed.

`;

    for (const gate of this.gates.filter(g => g.classification === MAIClassification.MANDATORY)) {
      doc += `## ${gate.name}
Classification: MANDATORY
Category: ${gate.category}

**Triggers:**
${gate.triggers.map(t => `- ${t.description}`).join('\n')}

**Agent Behavior:** ${gate.agentBehavior.action}

**Human Requirement:** ${gate.humanRequirement.description}

**Security Rationale:**
${gate.securityRationale}

---

`;
    }

    doc += `# ADVISORY SECURITY GATES

These gates require human approval but can be approved to proceed.

`;

    for (const gate of this.gates.filter(g => g.classification === MAIClassification.ADVISORY)) {
      doc += `## ${gate.name}
Classification: ADVISORY
Category: ${gate.category}

**Triggers:**
${gate.triggers.map(t => `- ${t.description}`).join('\n')}

**Agent Behavior:** ${gate.agentBehavior.action}

**Human Requirement:** ${gate.humanRequirement.description}

---

`;
    }

    return doc;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  AUTHENTICATION_GATE,
  CREDENTIAL_HANDLING_GATE,
  PAYMENT_GATE,
  INJECTION_DEFENSE_GATE,
  DATA_EXPORT_GATE,
  FORM_SUBMISSION_GATE,
  MANDATORY_GATES,
  ADVISORY_GATES,
  ALL_SECURITY_GATES,
  SecurityGateChecker
};
