/**
 * Chrome Agent Workforce Launcher
 *
 * Launches and manages a fleet of Chrome browser agents,
 * each with their own instruction pack, working visibly
 * across multiple monitors like a real workforce.
 */

import { BrowserInstructionPack, BrowserPolicy } from '../mcp/governedBrowserAgent';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkstationConfig {
  id: string;
  name: string;                    // e.g., "BD Researcher", "Accountant"
  monitor: number;                 // Which monitor to display on
  tabGroup: string;                // Tab group name for organization
  instructionPack: BrowserInstructionPack;
  initialUrl?: string;             // Starting URL
  referenceData?: ReferenceData;   // Ledger, lists, codes, etc.
}

export interface ReferenceData {
  name: string;
  type: 'ledger' | 'contact_list' | 'code_table' | 'manual' | 'custom';
  data: Record<string, any>[];
  description: string;
}

export interface WorkforceConfig {
  name: string;                    // e.g., "Federal BD Team"
  workstations: WorkstationConfig[];
  globalPolicies?: BrowserPolicy[];  // Apply to all workstations
  shiftStart?: string;             // Optional scheduling
  shiftEnd?: string;
}

export interface AgentStatus {
  workstationId: string;
  status: 'idle' | 'working' | 'waiting_hitl' | 'paused' | 'error';
  currentTask?: string;
  lastAction?: string;
  lastActionTime?: Date;
  hitlPending?: HITLRequest;
}

export interface HITLRequest {
  id: string;
  workstationId: string;
  action: string;
  reason: string;
  classification: 'MANDATORY' | 'ADVISORY';
  timestamp: Date;
  context?: string;
}

export interface WorkforceState {
  config: WorkforceConfig;
  agents: Map<string, AgentStatus>;
  auditLog: AuditEntry[];
  startTime: Date;
  isRunning: boolean;
}

export interface AuditEntry {
  timestamp: Date;
  workstationId: string;
  agentName: string;
  action: string;
  result: 'success' | 'blocked' | 'hitl_approved' | 'hitl_denied';
  policyApplied?: string;
  details?: string;
  hash: string;
}

// ============================================================================
// INSTRUCTION PACK TEMPLATES
// ============================================================================

export const PACK_TEMPLATES: Record<string, Partial<BrowserInstructionPack>> = {
  'federal-bd': {
    name: 'Federal BD Browser Pack',
    allowedDomains: [
      'sam.gov', 'beta.sam.gov', 'usaspending.gov',
      'fpds.gov', 'gsa.gov', 'acquisition.gov',
      'govwin.com', 'bgov.com'
    ],
    blockedDomains: ['login.gov', '*.bank.com', 'pay.gov'],
  },

  'accounting': {
    name: 'Accounting Software Pack',
    allowedDomains: [
      'quickbooks.intuit.com', 'app.qbo.intuit.com',
      'xero.com', 'my.xero.com',
      'freshbooks.com', 'wave.com'
    ],
    blockedDomains: ['*.bank.com', 'paypal.com'],
  },

  'crm': {
    name: 'CRM Operations Pack',
    allowedDomains: [
      'salesforce.com', '*.salesforce.com',
      'hubspot.com', 'app.hubspot.com',
      'zoho.com', 'crm.zoho.com',
      'pipedrive.com'
    ],
    blockedDomains: [],
  },

  'research': {
    name: 'Web Research Pack',
    allowedDomains: ['*'],  // Open research
    blockedDomains: ['*.bank.com', 'pay.gov', 'login.gov'],
  },

  'ecommerce': {
    name: 'E-Commerce Operations Pack',
    allowedDomains: [
      'amazon.com', 'seller.amazon.com',
      'ebay.com', 'seller.ebay.com',
      'shopify.com', 'admin.shopify.com',
      'doordash.com', 'instacart.com'
    ],
    blockedDomains: [],
  }
};

// Standard governance policies by risk level
export const STANDARD_POLICIES: Record<string, BrowserPolicy[]> = {
  'strict': [
    {
      name: 'No Authentication Automation',
      classification: 'MANDATORY',
      action: 'BLOCK',
      appliesTo: ['login', 'signin', 'authenticate', 'password'],
      description: 'All authentication must be performed by human.'
    },
    {
      name: 'No Payment Processing',
      classification: 'MANDATORY',
      action: 'BLOCK',
      appliesTo: ['pay', 'checkout', 'purchase', 'credit card'],
      description: 'Payment actions require human completion.'
    },
    {
      name: 'No Form Submission',
      classification: 'MANDATORY',
      action: 'REQUIRE_APPROVAL',
      appliesTo: ['submit', 'send', 'post', 'publish'],
      description: 'Form submissions require HITL approval.'
    },
    {
      name: 'No Delete Operations',
      classification: 'MANDATORY',
      action: 'REQUIRE_APPROVAL',
      appliesTo: ['delete', 'remove', 'trash', 'archive'],
      description: 'Destructive actions require HITL approval.'
    }
  ],

  'moderate': [
    {
      name: 'No Authentication Automation',
      classification: 'MANDATORY',
      action: 'BLOCK',
      appliesTo: ['login', 'signin', 'authenticate', 'password'],
      description: 'All authentication must be performed by human.'
    },
    {
      name: 'Payment Approval',
      classification: 'MANDATORY',
      action: 'REQUIRE_APPROVAL',
      appliesTo: ['pay', 'checkout', 'purchase'],
      description: 'Payment actions require HITL approval.'
    },
    {
      name: 'Log Form Submissions',
      classification: 'ADVISORY',
      action: 'REQUIRE_APPROVAL',
      appliesTo: ['submit', 'send'],
      description: 'Form submissions logged and may require approval.'
    }
  ],

  'permissive': [
    {
      name: 'No Authentication Automation',
      classification: 'MANDATORY',
      action: 'BLOCK',
      appliesTo: ['login', 'signin', 'authenticate', 'password'],
      description: 'All authentication must be performed by human.'
    },
    {
      name: 'Log All Actions',
      classification: 'INFORMATIONAL',
      action: 'LOG_ONLY',
      appliesTo: ['*'],
      description: 'All actions logged for audit trail.'
    }
  ]
};

// ============================================================================
// WORKFORCE LAUNCHER
// ============================================================================

export class WorkforceLauncher {
  private state: WorkforceState | null = null;

  /**
   * Generate instruction pack injection prompt for Chrome sidepanel
   */
  generateInjectionPrompt(config: WorkstationConfig): string {
    const pack = config.instructionPack;
    const ref = config.referenceData;

    let prompt = `# AGENT WORKSTATION: ${config.name}
## Instruction Pack: ${pack.name}

You are a governed browser agent operating under strict policies.
Your workstation ID is: ${config.id}

---

## ALLOWED DOMAINS
You may ONLY navigate to these domains:
${pack.allowedDomains.map(d => `- ${d}`).join('\n')}

## BLOCKED DOMAINS
You must NEVER navigate to:
${pack.blockedDomains.map(d => `- ${d}`).join('\n')}

---

## GOVERNANCE POLICIES

${pack.policies.map(p => `### ${p.name} [${p.classification}]
- Action: ${p.action}
- Applies to: ${p.appliesTo.join(', ')}
- ${p.description}
`).join('\n')}

---

## HITL (Human-in-the-Loop) REQUIREMENTS

When you encounter a MANDATORY policy with REQUIRE_APPROVAL:
1. STOP immediately
2. Describe the action you want to take
3. Wait for explicit human approval
4. Only proceed after "yes", "approved", or "proceed"

When you encounter a BLOCK policy:
1. Do NOT attempt the action
2. Inform the human that this action requires them to do it manually
3. Wait for them to complete it before continuing

---

## AUDIT REQUIREMENTS

For EVERY action you take, state:
- [ACTION] What you're doing
- [DOMAIN] Which domain
- [POLICY] Which policy applies (if any)
- [STATUS] Success/Blocked/Waiting HITL

`;

    // Add reference data if provided
    if (ref) {
      prompt += `---

## REFERENCE DATA: ${ref.name}
Type: ${ref.type}
${ref.description}

\`\`\`json
${JSON.stringify(ref.data, null, 2)}
\`\`\`

Use this reference data to complete your tasks. Do not deviate from these values.

`;
    }

    // Add software manual if it's in the pack
    if (pack.metadata?.manual) {
      prompt += `---

## SOFTWARE MANUAL

${pack.metadata.manual}

`;
    }

    prompt += `---

## YOUR TASK

${config.instructionPack.metadata?.task || 'Await instructions from the human supervisor.'}

Begin by navigating to: ${config.initialUrl || pack.allowedDomains[0]}

Remember: You are being monitored. All actions are logged. Follow your policies.
`;

    return prompt;
  }

  /**
   * Create a complete workforce configuration
   */
  createWorkforce(name: string, workstations: WorkstationConfig[]): WorkforceConfig {
    return {
      name,
      workstations,
      globalPolicies: STANDARD_POLICIES.strict
    };
  }

  /**
   * Generate launch instructions for the human operator
   */
  generateLaunchInstructions(config: WorkforceConfig): string {
    let instructions = `
╔══════════════════════════════════════════════════════════════════╗
║           WORKFORCE LAUNCH INSTRUCTIONS                          ║
║           ${config.name.padEnd(40)}            ║
╚══════════════════════════════════════════════════════════════════╝

SETUP STEPS:

`;

    config.workstations.forEach((ws, i) => {
      instructions += `
─────────────────────────────────────────────────────────────────────
WORKSTATION ${i + 1}: ${ws.name}
Monitor: ${ws.monitor} | Tab Group: ${ws.tabGroup}
─────────────────────────────────────────────────────────────────────

1. Open Chrome window on Monitor ${ws.monitor}
2. Create tab group named "${ws.tabGroup}"
3. Navigate to: ${ws.initialUrl || ws.instructionPack.allowedDomains[0]}
4. Open Claude sidepanel (click extension icon)
5. Paste the following instruction pack:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.generateInjectionPrompt(ws)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. Complete any login/authentication yourself
7. Tell the agent to begin its task

`;
    });

    instructions += `
═══════════════════════════════════════════════════════════════════════
SUPERVISION GUIDELINES
═══════════════════════════════════════════════════════════════════════

• Watch all monitors - agents work visibly like employees
• Respond to HITL requests promptly - agents will wait
• Authentication is ALWAYS your responsibility
• Payment approval is ALWAYS your responsibility
• Review audit statements from each agent periodically

═══════════════════════════════════════════════════════════════════════
`;

    return instructions;
  }
}

// ============================================================================
// PRESET WORKFORCES
// ============================================================================

export const PRESET_WORKFORCES: Record<string, () => WorkforceConfig> = {

  'federal-bd-team': () => ({
    name: 'Federal BD Research Team',
    workstations: [
      {
        id: 'bd-sam',
        name: 'SAM.gov Researcher',
        monitor: 1,
        tabGroup: 'BD-SAM',
        initialUrl: 'https://sam.gov',
        instructionPack: {
          id: 'sam-research',
          name: 'SAM.gov Research Pack',
          version: '1.0.0',
          allowedDomains: ['sam.gov', 'beta.sam.gov'],
          blockedDomains: ['login.gov'],
          policies: [
            ...STANDARD_POLICIES.strict,
            {
              name: 'Log All Searches',
              classification: 'INFORMATIONAL',
              action: 'LOG_ONLY',
              appliesTo: ['search', 'filter', 'navigate'],
              description: 'Log all search activities for analysis.'
            }
          ],
          metadata: {
            task: `Search SAM.gov for active opportunities matching our capabilities:
- NAICS: 541512, 541519, 541611
- Set-asides: SDVOSB, 8(a), HUBZone
- Keywords: IT support, cybersecurity, cloud migration
Extract opportunity details and save to audit log.`
          }
        }
      },
      {
        id: 'bd-usaspending',
        name: 'USASpending Analyst',
        monitor: 2,
        tabGroup: 'BD-Spending',
        initialUrl: 'https://usaspending.gov',
        instructionPack: {
          id: 'usaspending-research',
          name: 'USASpending Research Pack',
          version: '1.0.0',
          allowedDomains: ['usaspending.gov'],
          blockedDomains: [],
          policies: STANDARD_POLICIES.strict,
          metadata: {
            task: `Research competitor awards and agency spending patterns:
- Find awards to competitors in our space
- Identify agencies with budget for our services
- Track spending trends by NAICS code
Report findings to audit log.`
          }
        }
      },
      {
        id: 'bd-govwin',
        name: 'GovWin Intelligence',
        monitor: 3,
        tabGroup: 'BD-Intel',
        initialUrl: 'https://govwin.com',
        instructionPack: {
          id: 'govwin-research',
          name: 'GovWin Research Pack',
          version: '1.0.0',
          allowedDomains: ['govwin.com', 'iq.govwin.com'],
          blockedDomains: [],
          policies: STANDARD_POLICIES.moderate,
          metadata: {
            task: `Monitor GovWin for pipeline opportunities:
- Check saved searches for new matches
- Review opportunity updates
- Track competitor activities
Summarize findings to audit log.`
          }
        }
      }
    ]
  }),

  'accounting-team': () => ({
    name: 'Accounting Operations Team',
    workstations: [
      {
        id: 'acct-qb',
        name: 'QuickBooks Operator',
        monitor: 1,
        tabGroup: 'Accounting',
        initialUrl: 'https://app.qbo.intuit.com',
        instructionPack: {
          id: 'quickbooks-ops',
          name: 'QuickBooks Operations Pack',
          version: '1.0.0',
          allowedDomains: ['quickbooks.intuit.com', 'app.qbo.intuit.com'],
          blockedDomains: ['*.bank.com', 'paypal.com'],
          policies: STANDARD_POLICIES.strict,
          metadata: {
            manual: `QuickBooks Navigation:
- Dashboard: Shows key metrics
- Sales > Invoices: Create/manage invoices
- Expenses > Vendors: Manage vendor bills
- Reports > Standard: Run financial reports

Data Entry Rules:
- Always use correct account codes
- Attach documentation to transactions
- Never modify locked periods`,
            task: 'Await accounting task instructions.'
          }
        },
        referenceData: {
          name: 'Chart of Accounts',
          type: 'code_table',
          description: 'Standard account codes for transactions',
          data: [
            { code: '1000', name: 'Cash', type: 'Asset' },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
            { code: '2000', name: 'Accounts Payable', type: 'Liability' },
            { code: '3000', name: 'Retained Earnings', type: 'Equity' },
            { code: '4000', name: 'Service Revenue', type: 'Revenue' },
            { code: '5000', name: 'Cost of Services', type: 'Expense' },
            { code: '6000', name: 'Operating Expenses', type: 'Expense' }
          ]
        }
      }
    ]
  }),

  'crm-team': () => ({
    name: 'CRM Operations Team',
    workstations: [
      {
        id: 'crm-sf',
        name: 'Salesforce Operator',
        monitor: 1,
        tabGroup: 'CRM',
        initialUrl: 'https://login.salesforce.com',
        instructionPack: {
          id: 'salesforce-ops',
          name: 'Salesforce Operations Pack',
          version: '1.0.0',
          allowedDomains: ['salesforce.com', '*.salesforce.com', '*.force.com'],
          blockedDomains: [],
          policies: STANDARD_POLICIES.moderate,
          metadata: {
            manual: `Salesforce Navigation:
- Leads: New prospects to qualify
- Contacts: Qualified contacts
- Opportunities: Active deals
- Reports: Pipeline analytics

Data Entry Rules:
- All leads must have source
- Opportunities need close date
- Log all activities`,
            task: 'Await CRM task instructions.'
          }
        }
      }
    ]
  })
};

// ============================================================================
// DEMO / EXPORT
// ============================================================================

export function demonstrateWorkforce() {
  const launcher = new WorkforceLauncher();

  // Get Federal BD Team preset
  const bdTeam = PRESET_WORKFORCES['federal-bd-team']();

  // Generate launch instructions
  const instructions = launcher.generateLaunchInstructions(bdTeam);

  console.log(instructions);

  return instructions;
}
