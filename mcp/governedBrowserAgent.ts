/**
 * Governed Browser Agent - MCP + Chrome Extension Architecture
 *
 * This agent uses Claude's Chrome Extension via MCP tools instead of Playwright.
 *
 * KEY DIFFERENCES FROM PLAYWRIGHT:
 * - Real browser session (your actual Chrome, with your logins)
 * - Visible work (you can watch the agent on screen)
 * - Human-in-the-loop built into Claude's interface
 * - No bot detection issues
 * - Governed by Instruction Packs (MAI classification)
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Claude Chrome Extension (claude.ai in browser)                 │
 * │  - MCP tools: navigate, read_page, form_input, computer        │
 * │  - Real browser session with your credentials                  │
 * └─────────────────────────┬───────────────────────────────────────┘
 *                           │
 * ┌─────────────────────────▼───────────────────────────────────────┐
 * │  Governed Browser Agent (this file)                             │
 * │  - Loads instruction packs for task governance                 │
 * │  - Enforces MAI policies before each action                    │
 * │  - HITL approval for MANDATORY actions                         │
 * │  - Audit trail of all browser actions                          │
 * └─────────────────────────┬───────────────────────────────────────┘
 *                           │
 * ┌─────────────────────────▼───────────────────────────────────────┐
 * │  Multi-Monitor Coordinator                                      │
 * │  - Parallel agents on different monitors                       │
 * │  - Task distribution and load balancing                        │
 * │  - Aggregate results and reporting                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { MAIClassification } from '../types';

/**
 * MCP Tool types - these map to the Claude_in_Chrome MCP tools
 */
export type MCPToolName =
  | 'navigate'
  | 'read_page'
  | 'find'
  | 'form_input'
  | 'computer'
  | 'get_page_text'
  | 'javascript_tool'
  | 'screenshot';

/**
 * Browser action with governance metadata
 */
export interface GovernedBrowserAction {
  id: string;
  tool: MCPToolName;
  params: Record<string, any>;
  classification: MAIClassification;
  requiresApproval: boolean;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Action result with audit data
 */
export interface ActionResult {
  actionId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Date;
  approvedBy?: string;
  auditHash?: string;
}

/**
 * Instruction Pack for browser governance
 */
export interface BrowserInstructionPack {
  id: string;
  name: string;
  version: string;
  description: string;

  // Allowed domains (whitelist)
  allowedDomains: string[];

  // Blocked domains (blacklist)
  blockedDomains: string[];

  // Action policies
  policies: BrowserPolicy[];

  // HITL requirements
  hitlRequirements: HITLRequirement[];
}

/**
 * Browser policy - what actions are allowed/restricted
 */
export interface BrowserPolicy {
  id: string;
  name: string;
  classification: MAIClassification;

  // What this policy governs
  scope: {
    tools?: MCPToolName[];       // Which MCP tools
    domains?: string[];          // Which domains
    urlPatterns?: string[];      // URL patterns (regex)
    elementTypes?: string[];     // Button, input, link, etc.
  };

  // Conditions that trigger this policy
  triggers: {
    textContains?: string[];     // Text on page/element
    urlContains?: string[];      // URL patterns
    actionType?: string[];       // click, type, submit
  };

  // What happens when triggered
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' | 'LOG_ONLY';

  // Message shown to user
  message: string;
}

/**
 * Human-in-the-loop requirement
 */
export interface HITLRequirement {
  id: string;
  description: string;

  // When to require human approval
  trigger: {
    beforeSubmit?: boolean;       // Before any form submit
    beforePayment?: boolean;      // Before payment actions
    onSensitiveData?: boolean;    // When handling PII
    onDomainSwitch?: boolean;     // When navigating to new domain
    onHighRisk?: boolean;         // When risk level is HIGH
  };

  // What information to show human
  showToHuman: {
    currentUrl: boolean;
    actionDescription: boolean;
    affectedData: boolean;
    screenshot: boolean;
  };

  // Approval options
  approvalOptions: ('APPROVE' | 'REJECT' | 'MODIFY' | 'SKIP')[];
}

/**
 * Audit entry for browser actions
 */
export interface BrowserAuditEntry {
  id: string;
  timestamp: Date;
  sessionId: string;
  agentId: string;

  // Action details
  action: GovernedBrowserAction;
  result: ActionResult;

  // Context
  url: string;
  domain: string;
  pageTitle?: string;

  // Governance
  packId: string;
  policiesApplied: string[];
  hitlApproval?: {
    required: boolean;
    approved: boolean;
    approver?: string;
    approvalTime?: Date;
    notes?: string;
  };

  // Integrity
  previousHash?: string;
  hash: string;
}

/**
 * Federal BD Browser Pack - Example instruction pack
 */
export const FEDERAL_BD_BROWSER_PACK: BrowserInstructionPack = {
  id: 'federal-bd-browser',
  name: 'Federal BD Browser Pack',
  version: '1.0.0',
  description: 'Governed browser automation for federal BD research on SAM.gov, USASpending.gov, and related sites.',

  allowedDomains: [
    'sam.gov',
    'beta.sam.gov',
    'usaspending.gov',
    'fpds.gov',
    'gsa.gov',
    'acquisition.gov',
    'govwin.com',
    'bgov.com'
  ],

  blockedDomains: [
    'login.gov',           // Never automate auth
    'idp.int.identitysandbox.gov',
    '*.bank.com',
    'pay.gov'
  ],

  policies: [
    // MANDATORY: No authentication automation
    {
      id: 'no-auth-automation',
      name: 'No Authentication Automation',
      classification: MAIClassification.MANDATORY,
      scope: {
        tools: ['form_input', 'computer'],
        elementTypes: ['password', 'login', 'signin']
      },
      triggers: {
        textContains: ['password', 'login', 'sign in', 'authenticate'],
        urlContains: ['login', 'auth', 'signin', 'sso']
      },
      action: 'BLOCK',
      message: 'Authentication must be performed by human. Agent will wait for login completion.'
    },

    // MANDATORY: No form submission without approval
    {
      id: 'no-auto-submit',
      name: 'No Automatic Form Submission',
      classification: MAIClassification.MANDATORY,
      scope: {
        tools: ['computer', 'form_input'],
        elementTypes: ['submit', 'button']
      },
      triggers: {
        textContains: ['submit', 'send', 'apply', 'register'],
        actionType: ['click', 'submit']
      },
      action: 'REQUIRE_APPROVAL',
      message: 'Form submission requires human approval before proceeding.'
    },

    // ADVISORY: Review before downloading
    {
      id: 'download-review',
      name: 'Download Review',
      classification: MAIClassification.ADVISORY,
      scope: {
        tools: ['computer'],
        elementTypes: ['a', 'button']
      },
      triggers: {
        textContains: ['download', 'export', 'save'],
        urlContains: ['.pdf', '.xlsx', '.zip', '.doc']
      },
      action: 'REQUIRE_APPROVAL',
      message: 'File download detected. Please review before proceeding.'
    },

    // INFORMATIONAL: Log all navigation
    {
      id: 'log-navigation',
      name: 'Log All Navigation',
      classification: MAIClassification.INFORMATIONAL,
      scope: {
        tools: ['navigate']
      },
      triggers: {},
      action: 'LOG_ONLY',
      message: 'Navigation logged for audit trail.'
    },

    // INFORMATIONAL: Log data extraction
    {
      id: 'log-data-extraction',
      name: 'Log Data Extraction',
      classification: MAIClassification.INFORMATIONAL,
      scope: {
        tools: ['read_page', 'get_page_text', 'find']
      },
      triggers: {},
      action: 'LOG_ONLY',
      message: 'Data extraction logged for audit trail.'
    }
  ],

  hitlRequirements: [
    {
      id: 'hitl-submit',
      description: 'Human approval required before any form submission',
      trigger: {
        beforeSubmit: true
      },
      showToHuman: {
        currentUrl: true,
        actionDescription: true,
        affectedData: true,
        screenshot: true
      },
      approvalOptions: ['APPROVE', 'REJECT', 'MODIFY']
    },
    {
      id: 'hitl-domain-switch',
      description: 'Human approval when navigating to new domain',
      trigger: {
        onDomainSwitch: true
      },
      showToHuman: {
        currentUrl: true,
        actionDescription: true,
        affectedData: false,
        screenshot: false
      },
      approvalOptions: ['APPROVE', 'REJECT', 'SKIP']
    }
  ]
};

/**
 * Governed Browser Agent
 *
 * Uses MCP tools with instruction pack governance
 */
export class GovernedBrowserAgent {
  private sessionId: string;
  private agentId: string;
  private tabId: number | null = null;
  private pack: BrowserInstructionPack;
  private auditLog: BrowserAuditEntry[] = [];
  private currentUrl: string = '';
  private currentDomain: string = '';

  constructor(
    agentId: string,
    pack: BrowserInstructionPack = FEDERAL_BD_BROWSER_PACK
  ) {
    this.sessionId = `session-${Date.now()}`;
    this.agentId = agentId;
    this.pack = pack;
  }

  /**
   * Initialize the agent with a browser tab
   */
  async initialize(): Promise<{ success: boolean; tabId?: number; error?: string }> {
    // In real implementation, this would call:
    // mcp__Claude_in_Chrome__tabs_context_mcp({ createIfEmpty: true })
    // mcp__Claude_in_Chrome__tabs_create_mcp()

    console.log(`[GovernedAgent ${this.agentId}] Initializing with pack: ${this.pack.name}`);
    console.log(`[GovernedAgent ${this.agentId}] Allowed domains: ${this.pack.allowedDomains.join(', ')}`);

    // Return placeholder - real implementation uses MCP tools
    return {
      success: true,
      tabId: 1
    };
  }

  /**
   * Check if an action is allowed by the instruction pack
   */
  checkPolicy(action: GovernedBrowserAction): {
    allowed: boolean;
    requiresApproval: boolean;
    blockingPolicy?: BrowserPolicy;
    applicablePolicies: BrowserPolicy[];
  } {
    const applicablePolicies: BrowserPolicy[] = [];
    let requiresApproval = false;
    let blockingPolicy: BrowserPolicy | undefined;

    for (const policy of this.pack.policies) {
      // Check if policy applies to this tool
      if (policy.scope.tools && !policy.scope.tools.includes(action.tool)) {
        continue;
      }

      // Check domain restrictions
      if (policy.scope.domains) {
        const domainMatch = policy.scope.domains.some(d =>
          this.currentDomain.includes(d) || d.includes(this.currentDomain)
        );
        if (!domainMatch) continue;
      }

      // Check triggers
      let triggered = false;

      if (policy.triggers.urlContains) {
        triggered = policy.triggers.urlContains.some(pattern =>
          this.currentUrl.toLowerCase().includes(pattern.toLowerCase())
        );
      }

      if (policy.triggers.textContains && action.description) {
        triggered = triggered || policy.triggers.textContains.some(text =>
          action.description.toLowerCase().includes(text.toLowerCase())
        );
      }

      if (triggered || Object.keys(policy.triggers).length === 0) {
        applicablePolicies.push(policy);

        if (policy.action === 'BLOCK') {
          blockingPolicy = policy;
        }

        if (policy.action === 'REQUIRE_APPROVAL') {
          requiresApproval = true;
        }
      }
    }

    return {
      allowed: !blockingPolicy,
      requiresApproval,
      blockingPolicy,
      applicablePolicies
    };
  }

  /**
   * Check if domain is allowed
   */
  isDomainAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Check blocklist first
      for (const blocked of this.pack.blockedDomains) {
        if (blocked.startsWith('*.')) {
          const suffix = blocked.slice(2);
          if (domain.endsWith(suffix)) return false;
        } else if (domain.includes(blocked)) {
          return false;
        }
      }

      // Check allowlist
      for (const allowed of this.pack.allowedDomains) {
        if (domain.includes(allowed) || allowed.includes(domain)) {
          return true;
        }
      }

      // Default: not allowed if not in allowlist
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Execute a governed browser action
   *
   * This method:
   * 1. Checks policies before execution
   * 2. Requests HITL approval if needed
   * 3. Executes via MCP tool
   * 4. Logs to audit trail
   */
  async executeAction(action: GovernedBrowserAction): Promise<ActionResult> {
    const startTime = new Date();

    // Check policies
    const policyCheck = this.checkPolicy(action);

    // If blocked, return error
    if (!policyCheck.allowed) {
      const result: ActionResult = {
        actionId: action.id,
        success: false,
        error: `Blocked by policy: ${policyCheck.blockingPolicy?.name} - ${policyCheck.blockingPolicy?.message}`,
        timestamp: startTime
      };

      await this.logAction(action, result, policyCheck.applicablePolicies);
      return result;
    }

    // If requires approval, request HITL
    if (policyCheck.requiresApproval || action.requiresApproval) {
      console.log(`[GovernedAgent ${this.agentId}] HITL Required: ${action.description}`);
      console.log(`[GovernedAgent ${this.agentId}] Waiting for human approval...`);

      // In real implementation, this would pause and wait for approval
      // through Claude's interface or a custom approval UI
    }

    // Execute the action via MCP
    // In real implementation, this would call the appropriate MCP tool:
    // - mcp__Claude_in_Chrome__navigate for 'navigate'
    // - mcp__Claude_in_Chrome__read_page for 'read_page'
    // - mcp__Claude_in_Chrome__form_input for 'form_input'
    // - mcp__Claude_in_Chrome__computer for 'computer'
    // etc.

    console.log(`[GovernedAgent ${this.agentId}] Executing: ${action.tool} - ${action.description}`);

    const result: ActionResult = {
      actionId: action.id,
      success: true,
      timestamp: new Date()
    };

    await this.logAction(action, result, policyCheck.applicablePolicies);
    return result;
  }

  /**
   * Log action to audit trail
   */
  private async logAction(
    action: GovernedBrowserAction,
    result: ActionResult,
    policiesApplied: BrowserPolicy[]
  ): Promise<void> {
    const previousEntry = this.auditLog[this.auditLog.length - 1];

    const entry: BrowserAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
      agentId: this.agentId,
      action,
      result,
      url: this.currentUrl,
      domain: this.currentDomain,
      packId: this.pack.id,
      policiesApplied: policiesApplied.map(p => p.id),
      previousHash: previousEntry?.hash,
      hash: '' // Would be computed in real implementation
    };

    // Compute hash for chain integrity
    entry.hash = this.computeHash(entry);

    this.auditLog.push(entry);
  }

  /**
   * Compute hash for audit entry
   */
  private computeHash(entry: BrowserAuditEntry): string {
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      result: entry.result,
      previousHash: entry.previousHash
    });

    // Simple hash for demo - real implementation would use crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Get audit log
   */
  getAuditLog(): BrowserAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Export audit log as JSON
   */
  exportAuditLog(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      agentId: this.agentId,
      pack: {
        id: this.pack.id,
        name: this.pack.name,
        version: this.pack.version
      },
      entries: this.auditLog,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

/**
 * Multi-Monitor Agent Coordinator
 *
 * Manages multiple governed browser agents across monitors
 */
export class MultiMonitorCoordinator {
  private agents: Map<string, GovernedBrowserAgent> = new Map();
  private taskQueue: Array<{
    id: string;
    task: string;
    assignedAgent?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }> = [];

  /**
   * Create a new agent on a specific monitor
   */
  async createAgent(
    agentId: string,
    monitorIndex: number,
    pack: BrowserInstructionPack = FEDERAL_BD_BROWSER_PACK
  ): Promise<GovernedBrowserAgent> {
    const agent = new GovernedBrowserAgent(agentId, pack);
    await agent.initialize();

    this.agents.set(agentId, agent);

    console.log(`[Coordinator] Created agent ${agentId} on monitor ${monitorIndex}`);
    console.log(`[Coordinator] Total agents: ${this.agents.size}`);

    return agent;
  }

  /**
   * Distribute tasks across agents
   */
  async distributeTasks(tasks: string[]): Promise<void> {
    const agentIds = Array.from(this.agents.keys());

    if (agentIds.length === 0) {
      throw new Error('No agents available');
    }

    // Round-robin distribution
    tasks.forEach((task, index) => {
      const agentId = agentIds[index % agentIds.length];

      this.taskQueue.push({
        id: `task-${Date.now()}-${index}`,
        task,
        assignedAgent: agentId,
        status: 'pending'
      });
    });

    console.log(`[Coordinator] Distributed ${tasks.length} tasks across ${agentIds.length} agents`);
  }

  /**
   * Get status of all agents
   */
  getStatus(): {
    agents: Array<{ id: string; status: string }>;
    tasks: typeof this.taskQueue;
  } {
    return {
      agents: Array.from(this.agents.keys()).map(id => ({
        id,
        status: 'ready'
      })),
      tasks: this.taskQueue
    };
  }

  /**
   * Aggregate audit logs from all agents
   */
  aggregateAuditLogs(): BrowserAuditEntry[] {
    const allEntries: BrowserAuditEntry[] = [];

    for (const agent of this.agents.values()) {
      allEntries.push(...agent.getAuditLog());
    }

    // Sort by timestamp
    return allEntries.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

// Export for use
export default GovernedBrowserAgent;
