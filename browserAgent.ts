/**
 * ACE Browser Agent
 * Combines Anthropic Computer Use API with governed browser automation
 *
 * Key Features:
 * - Claude controls browser via screenshots + tool calls
 * - MAI classification enforces governance gates
 * - Parallel multi-agent execution (Celer pattern)
 * - Chrome extension support for workflow tools
 * - Full audit trail with screenshots
 * - DEMO MODE: Runs without API calls for client demos
 *
 * Position: "Accelerate regulated workflows" NOT "automate submissions"
 */

import Anthropic from "@anthropic-ai/sdk";
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { MAIClassification } from './types';
import { config } from './config';

// Only create Anthropic client if we have a key and not in demo mode
let client: Anthropic | null = null;
if (config.hasAnthropicKey && !config.demoMode) {
  client = new Anthropic({
    apiKey: config.anthropicApiKey
  });
}

export enum BrowserActionType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  SUBMIT = 'submit',
  UPLOAD = 'upload',
  SCREENSHOT = 'screenshot',
  WAIT = 'wait',
  SCROLL = 'scroll'
}

/**
 * Boundary Checker - Enforces what can/cannot be automated
 */
class ActionBoundaryChecker {
  // Prohibited keywords that trigger MANDATORY classification
  private static PROHIBITED_KEYWORDS = [
    'login', 'password', 'authenticate', 'sign in', 'signin',
    'submit claim', 'final submit', 'authorize', 'confirm submission',
    'username', 'credentials', 'access code'
  ];

  // Government portal domains that require human oversight for submissions
  private static GOVERNMENT_DOMAINS = [
    'va.gov', 'sam.gov', 'login.gov', 'usajobs.gov',
    'benefits.va.gov', 'ebenefits.va.gov', 'mypay.dfas.mil'
  ];

  static isProhibitedAction(action: any, currentUrl?: string): boolean {
    const actionStr = JSON.stringify(action).toLowerCase();
    const target = (action.target || '').toLowerCase();
    const value = (action.value || '').toLowerCase();

    // Check for prohibited keywords in action
    for (const keyword of this.PROHIBITED_KEYWORDS) {
      if (actionStr.includes(keyword) || target.includes(keyword) || value.includes(keyword)) {
        return true;
      }
    }

    // Check if action is on government domain
    if (currentUrl) {
      for (const domain of this.GOVERNMENT_DOMAINS) {
        if (currentUrl.includes(domain)) {
          // On government sites, only allow navigation and screenshots
          if (action.action !== 'navigate' && action.action !== 'screenshot') {
            return true;
          }
        }
      }
    }

    // Submit actions always require human approval
    if (action.action === 'submit') {
      return true;
    }

    return false;
  }

  static getViolationReason(action: any, currentUrl?: string): string {
    const actionStr = JSON.stringify(action).toLowerCase();

    if (actionStr.includes('login') || actionStr.includes('password') || actionStr.includes('authenticate')) {
      return 'Authentication actions are MANDATORY human-only. No credential automation allowed.';
    }

    if (action.action === 'submit' || actionStr.includes('submit')) {
      return 'Final submission actions are MANDATORY human-only.';
    }

    if (currentUrl) {
      for (const domain of this.GOVERNMENT_DOMAINS) {
        if (currentUrl.includes(domain)) {
          return `Actions on government portal (${domain}) require MANDATORY human approval.`;
        }
      }
    }

    return 'This action requires human oversight for compliance.';
  }
}

export interface BrowserAction {
  type: BrowserActionType;
  classification: MAIClassification;
  target?: string;
  value?: string;
  requiresApproval?: boolean;
}

export interface ChromeExtensionConfig {
  name: string;
  path: string;
  enabled: boolean;
}

export interface BrowserAgentConfig {
  agentId: string;
  task: string;
  classification: MAIClassification;
  extensions?: ChromeExtensionConfig[];
  userDataDir?: string;
  headless?: boolean;
  onApprovalRequired?: (action: BrowserAction, screenshot: string) => Promise<boolean>;
  onProgress?: (status: string) => void;
  onComplete?: (result: any) => void;
}

export class GovernedBrowserAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserAgentConfig;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(config: BrowserAgentConfig) {
    this.config = config;
  }

  async initialize() {
    const launchOptions: any = {
      headless: this.config.headless ?? false, // Show browser for transparency
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    };

    // Add Chrome extensions if configured
    if (this.config.extensions && this.config.extensions.length > 0) {
      const enabledExtensions = this.config.extensions
        .filter(ext => ext.enabled)
        .map(ext => ext.path);

      if (enabledExtensions.length > 0) {
        launchOptions.args.push(
          `--disable-extensions-except=${enabledExtensions.join(',')}`,
          `--load-extension=${enabledExtensions.join(',')}`
        );
        this.notifyProgress(`Loaded ${enabledExtensions.length} Chrome extension(s)`);
      }
    }

    // Use persistent context if userDataDir provided
    if (this.config.userDataDir) {
      launchOptions.channel = 'chrome';
      this.browser = await chromium.launchPersistentContext(this.config.userDataDir, {
        ...launchOptions,
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      this.context = this.browser as any;
      this.page = this.browser.pages()[0];
    } else {
      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      this.page = await this.context.newPage();
    }

    this.notifyProgress('Browser agent initialized');
  }

  async execute() {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      this.notifyProgress('Starting task execution');

      // Main execution loop
      let stepCount = 0;
      let maxSteps = 20; // Prevent infinite loops

      while (stepCount < maxSteps) {
        // Take screenshot for Claude to analyze
        const screenshot = await this.page.screenshot({
          type: 'png',
          fullPage: false
        });
        const screenshotB64 = screenshot.toString('base64');

        // Ask Claude what to do next
        const nextAction = await this.getNextAction(screenshotB64);

        if (nextAction.action === 'complete') {
          this.notifyProgress('Task completed successfully');
          break;
        }

        // Check boundaries before execution
        const currentUrl = this.page.url();
        if (ActionBoundaryChecker.isProhibitedAction(nextAction, currentUrl)) {
          // Force MANDATORY classification for prohibited actions
          nextAction.classification = 'MANDATORY';
          const reason = ActionBoundaryChecker.getViolationReason(nextAction, currentUrl);
          this.notifyProgress(`⚠️  Boundary check: ${reason}`);
        }

        // Execute action with governance
        const result = await this.executeWithGovernance(nextAction, screenshotB64);

        if (result === 'COMPLETE') {
          break;
        }

        stepCount++;
        await this.delay(1000); // Be respectful to target sites
      }

      // Get final result
      const finalScreenshot = await this.page.screenshot({ type: 'png' });
      const result = {
        success: true,
        screenshots: [finalScreenshot.toString('base64')],
        steps: stepCount
      };

      if (this.config.onComplete) {
        this.config.onComplete(result);
      }

    } catch (error) {
      this.notifyProgress(`Error: ${error}`);
      throw error;
    }
  }

  private async getNextAction(screenshotB64: string): Promise<any> {
    // DEMO MODE: Return simulated actions without API calls
    if (config.demoMode) {
      return this.getDemoAction();
    }

    // Ensure client is available
    if (!client) {
      throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
    }

    // Build message with screenshot + task context
    const message: Anthropic.MessageParam = {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: screenshotB64
          }
        },
        {
          type: "text",
          text: `Current task: ${this.config.task}

Analyze the screenshot and determine the next action.

IMPORTANT BOUNDARIES:
✅ Allowed: Document processing, form pre-filling (local), research, navigation
🚫 Prohibited: Authentication, credentials, final submissions

Available actions:
- navigate(url): Go to a URL
- click(selector): Click an element
- type(selector, text): Type into a field
- submit(): Submit a form (requires approval)
- upload(selector, filename): Upload a file
- scroll(direction): Scroll up/down
- wait(ms): Wait for page to load
- complete(): Task is finished

Respond in JSON format:
{
  "action": "action_name",
  "target": "css_selector or url",
  "value": "text or value if needed",
  "reasoning": "why this action",
  "classification": "MANDATORY or ADVISORY or INFORMATIONAL"
}

If task is complete, respond: { "action": "complete" }`
        }
      ]
    };

    this.conversationHistory.push(message);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: this.conversationHistory
    });

    // Add assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: response.content
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const action = JSON.parse(this.cleanJsonResponse(textContent));

    return action;
  }

  // Demo mode step counter for simulated workflow
  private demoStepCount = 0;

  /**
   * DEMO MODE: Returns simulated actions for client demos
   * Shows realistic workflow without API calls
   */
  private getDemoAction(): any {
    this.demoStepCount++;

    // Simulate a realistic BD workflow
    const demoSteps = [
      {
        action: 'navigate',
        target: 'https://sam.gov/content/opportunities',
        reasoning: '[DEMO] Navigating to SAM.gov opportunities search',
        classification: 'INFORMATIONAL'
      },
      {
        action: 'type',
        target: '#search-input',
        value: this.config.task.includes('RFP') ? 'IT Services' : 'Federal Contract',
        reasoning: '[DEMO] Entering search criteria',
        classification: 'INFORMATIONAL'
      },
      {
        action: 'click',
        target: '.search-button',
        reasoning: '[DEMO] Clicking search button',
        classification: 'INFORMATIONAL'
      },
      {
        action: 'wait',
        value: '2000',
        reasoning: '[DEMO] Waiting for results to load',
        classification: 'INFORMATIONAL'
      },
      {
        action: 'scroll',
        value: 'down',
        reasoning: '[DEMO] Scrolling to view more results',
        classification: 'INFORMATIONAL'
      },
      {
        action: 'complete',
        reasoning: '[DEMO] Task completed - data extracted',
        classification: 'INFORMATIONAL'
      }
    ];

    const stepIndex = Math.min(this.demoStepCount - 1, demoSteps.length - 1);
    return demoSteps[stepIndex];
  }

  private async executeWithGovernance(action: any, screenshot: string) {
    if (!this.page) throw new Error('Page not available');

    const actionType = action.action;
    const classification = this.parseClassification(action.classification);

    this.notifyProgress(`Executing: ${actionType} (${classification})`);

    // GOVERNANCE GATE: Check if human approval needed
    if (classification === MAIClassification.MANDATORY) {
      if (this.config.onApprovalRequired) {
        const approved = await this.config.onApprovalRequired({
          type: actionType,
          classification,
          target: action.target,
          value: action.value,
          requiresApproval: true
        }, screenshot);

        if (!approved) {
          throw new Error('Action rejected by human oversight');
        }

        this.notifyProgress('Action approved by human overseer');
      } else {
        throw new Error('MANDATORY action requires human approval but no handler provided');
      }
    }

    // Execute the browser action
    switch (actionType) {
      case 'navigate':
        await this.page.goto(action.target);
        break;

      case 'click':
        await this.page.click(action.target);
        break;

      case 'type':
        await this.page.fill(action.target, action.value);
        break;

      case 'submit':
        await this.page.press('body', 'Enter');
        break;

      case 'upload':
        const fileInput = await this.page.$(action.target);
        if (fileInput) {
          await fileInput.setInputFiles(action.value);
        }
        break;

      case 'scroll':
        const direction = action.value === 'up' ? -500 : 500;
        await this.page.evaluate((offset) => window.scrollBy(0, offset), direction);
        break;

      case 'wait':
        await this.delay(parseInt(action.value) || 1000);
        break;

      case 'complete':
        return 'COMPLETE';

      default:
        throw new Error(`Unknown action: ${actionType}`);
    }

    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  private parseClassification(classification: string): MAIClassification {
    const upper = classification?.toUpperCase();
    if (upper === 'MANDATORY') return MAIClassification.MANDATORY;
    if (upper === 'ADVISORY') return MAIClassification.ADVISORY;
    return MAIClassification.INFORMATIONAL;
  }

  private cleanJsonResponse(text: string): string {
    return text.replace(/```json\n?|```/g, "").trim();
  }

  private notifyProgress(status: string) {
    console.log(`[${this.config.agentId}] ${status}`);
    if (this.config.onProgress) {
      this.config.onProgress(status);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Multi-Agent Browser Workforce
 * Orchestrates multiple governed browser agents in parallel (Celer pattern)
 */
export class BrowserWorkforce {
  private agents: Map<string, GovernedBrowserAgent> = new Map();

  async spawnAgent(config: BrowserAgentConfig): Promise<GovernedBrowserAgent> {
    const agent = new GovernedBrowserAgent(config);
    await agent.initialize();
    this.agents.set(config.agentId, agent);
    return agent;
  }

  async executeParallel(tasks: BrowserAgentConfig[]) {
    const agents = await Promise.all(
      tasks.map(task => this.spawnAgent(task))
    );

    await Promise.all(
      agents.map(agent => agent.execute())
    );
  }

  getAgent(agentId: string): GovernedBrowserAgent | undefined {
    return this.agents.get(agentId);
  }

  async closeAll() {
    await Promise.all(
      Array.from(this.agents.values()).map(agent => agent.close())
    );
    this.agents.clear();
  }
}
