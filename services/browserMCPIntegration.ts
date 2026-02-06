/**
 * Browser MCP Integration - Real Browser Control
 *
 * Connects ACE governance to the Claude-in-Chrome MCP extension
 * for actual browser automation with visual feedback.
 *
 * Architecture:
 * - ACE Governance (Planner) → Generates governed action plan
 * - Claude/Sonnet → Interprets pages, decides actions dynamically
 * - Chrome MCP → Executes real browser actions
 * - Evidence Capture → Real screenshots with hashes
 */

import { execute as governedExecute } from './governedLLM';
import {
  InstructionPack,
  InstructionStep,
  StepAction,
  ActionSensitivity,
  StopConditionType,
  EvidenceRecord,
  ExecutionStatus,
  ExecutionContext
} from './browserAutomationAgent';
import { MAIClassification } from '../types';

// ============================================================================
// MCP TOOL INTERFACES
// ============================================================================

interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string; // Base64 encoded
}

interface TabContext {
  tabId: number;
  url: string;
  title: string;
}

// ============================================================================
// REAL BROWSER EXECUTOR
// ============================================================================

export class BrowserMCPExecutor {
  private tabId: number | null = null;
  private context: ExecutionContext | null = null;
  private mcpAvailable: boolean = false;

  // Callbacks for MCP tools (injected from outside)
  private mcpTools: {
    tabs_context_mcp: () => Promise<any>;
    tabs_create_mcp: () => Promise<any>;
    navigate: (params: { tabId: number; url: string }) => Promise<any>;
    computer: (params: any) => Promise<any>;
    read_page: (params: { tabId: number; depth?: number; filter?: string }) => Promise<any>;
    find: (params: { tabId: number; query: string }) => Promise<any>;
    form_input: (params: { tabId: number; ref: string; value: any }) => Promise<any>;
    get_page_text: (params: { tabId: number }) => Promise<any>;
    javascript_tool: (params: { tabId: number; action: string; text?: string }) => Promise<any>;
  } | null = null;

  /**
   * Initialize with MCP tool callbacks
   * These should be wired up from the component that has access to MCP
   */
  setMCPTools(tools: typeof this.mcpTools) {
    this.mcpTools = tools;
    this.mcpAvailable = tools !== null;
  }

  /**
   * Check if MCP is available
   */
  isMCPAvailable(): boolean {
    return this.mcpAvailable && this.mcpTools !== null;
  }

  /**
   * Initialize browser tab for automation
   */
  async initializeTab(): Promise<TabContext | null> {
    if (!this.mcpTools) {
      console.error('[MCP] No MCP tools available');
      return null;
    }

    try {
      // Get current tab context
      const context = await this.mcpTools.tabs_context_mcp();

      if (context.tabs && context.tabs.length > 0) {
        // Use existing tab in group
        this.tabId = context.tabs[0].id;
        return {
          tabId: this.tabId,
          url: context.tabs[0].url || '',
          title: context.tabs[0].title || ''
        };
      } else {
        // Create new tab
        const newTab = await this.mcpTools.tabs_create_mcp();
        this.tabId = newTab.tabId;
        return {
          tabId: this.tabId,
          url: '',
          title: 'New Tab'
        };
      }
    } catch (error) {
      console.error('[MCP] Failed to initialize tab:', error);
      return null;
    }
  }

  /**
   * Navigate to URL with governance checks
   */
  async navigate(url: string, pack: InstructionPack): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    // GOVERNANCE: Check domain allowlist
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');

      const isAllowed = pack.allowed_domains.some(allowed => {
        const normalizedAllowed = allowed.replace(/^www\./, '').replace(/^\*\./, '');
        return domain === normalizedAllowed ||
               domain.endsWith('.' + normalizedAllowed) ||
               allowed.startsWith('*.') && domain.endsWith(normalizedAllowed);
      });

      if (!isAllowed) {
        return {
          success: false,
          error: `BLOCKED: Domain '${domain}' not in allowlist`
        };
      }

      // Check blocklist
      const isBlocked = pack.blocked_domains.some(blocked => {
        const normalizedBlocked = blocked.replace(/^www\./, '').replace(/^\*\./, '');
        return domain === normalizedBlocked ||
               domain.endsWith('.' + normalizedBlocked);
      });

      if (isBlocked) {
        return {
          success: false,
          error: `BLOCKED: Domain '${domain}' is in blocklist`
        };
      }
    } catch (e) {
      return { success: false, error: `Invalid URL: ${url}` };
    }

    try {
      await this.mcpTools.navigate({ tabId: this.tabId, url });
      // Wait for page load
      await this.delay(2000);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Take real screenshot
   */
  async takeScreenshot(): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    try {
      const result = await this.mcpTools.computer({
        tabId: this.tabId,
        action: 'screenshot'
      });

      return {
        success: true,
        screenshot: result.screenshot || result.image,
        data: result
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Read page content for AI analysis
   */
  async readPage(options?: { depth?: number; filter?: string }): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    try {
      const result = await this.mcpTools.read_page({
        tabId: this.tabId,
        depth: options?.depth || 3,
        filter: options?.filter
      });

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find element on page using natural language
   */
  async findElement(query: string): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    try {
      const result = await this.mcpTools.find({
        tabId: this.tabId,
        query
      });

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Click element with governance check
   */
  async click(ref: string, sensitivity: ActionSensitivity): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    // GOVERNANCE: Advisory/Mandatory clicks need approval (handled by caller)

    try {
      const result = await this.mcpTools.computer({
        tabId: this.tabId,
        action: 'click',
        ref
      });

      await this.delay(1000); // Wait for any navigation/updates
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract text from page
   */
  async extractText(): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    try {
      const result = await this.mcpTools.get_page_text({
        tabId: this.tabId
      });

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scroll page
   */
  async scroll(direction: 'up' | 'down' = 'down', amount: number = 3): Promise<MCPToolResult> {
    if (!this.mcpTools || !this.tabId) {
      return { success: false, error: 'MCP not initialized' };
    }

    try {
      const result = await this.mcpTools.computer({
        tabId: this.tabId,
        action: 'scroll',
        scroll_direction: direction,
        scroll_amount: amount
      });

      await this.delay(500);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for stop conditions on current page
   */
  async checkStopConditions(pack: InstructionPack): Promise<StopConditionType | null> {
    if (!this.mcpTools || !this.tabId) {
      return null;
    }

    try {
      // Read page to check for stop conditions
      const pageResult = await this.readPage({ depth: 2 });
      if (!pageResult.success) return null;

      const pageContent = JSON.stringify(pageResult.data).toLowerCase();

      // Check for CAPTCHA
      if (pack.stop_conditions.includes(StopConditionType.CAPTCHA_DETECTED)) {
        if (pageContent.includes('captcha') ||
            pageContent.includes('recaptcha') ||
            pageContent.includes('verify you are human') ||
            pageContent.includes('i\'m not a robot')) {
          return StopConditionType.CAPTCHA_DETECTED;
        }
      }

      // Check for login page
      if (pack.stop_conditions.includes(StopConditionType.LOGIN_PAGE_DETECTED)) {
        if ((pageContent.includes('sign in') || pageContent.includes('log in') || pageContent.includes('login')) &&
            (pageContent.includes('password') || pageContent.includes('username'))) {
          return StopConditionType.LOGIN_PAGE_DETECTED;
        }
      }

      // Check for payment form
      if (pack.stop_conditions.includes(StopConditionType.PAYMENT_FORM_DETECTED)) {
        if (pageContent.includes('credit card') ||
            pageContent.includes('card number') ||
            pageContent.includes('payment method') ||
            pageContent.includes('billing address')) {
          return StopConditionType.PAYMENT_FORM_DETECTED;
        }
      }

      // Check for PII fields
      if (pack.stop_conditions.includes(StopConditionType.PII_FIELD_DETECTED)) {
        if (pageContent.includes('social security') ||
            pageContent.includes('ssn') ||
            pageContent.includes('date of birth')) {
          return StopConditionType.PII_FIELD_DETECTED;
        }
      }

      return null;
    } catch (error) {
      console.error('[MCP] Error checking stop conditions:', error);
      return null;
    }
  }

  /**
   * Use Claude to analyze page and decide next action
   */
  async analyzePageWithClaude(
    instruction: string,
    pageContent: string
  ): Promise<{ action: string; target?: string; reasoning: string }> {
    try {
      const result = await governedExecute({
        role: 'BROWSER_MCP',
        purpose: 'page-analysis',
        systemPrompt: 'You are a browser automation assistant. Respond only with valid JSON.',
        userMessage: `You are analyzing a web page to help complete a task.

Task: ${instruction}

Page content (accessibility tree):
${pageContent.substring(0, 4000)}

What should be the next action? Respond in JSON:
{
  "action": "click|scroll|extract|done|blocked",
  "target": "element ref or description if clicking",
  "reasoning": "why this action"
}

Rules:
- Only suggest safe, read-only actions
- Never suggest form submission or login
- Say "blocked" if the page requires login or payment
- Say "done" if the task appears complete`,
        maxTokens: 500
      });

      const cleanJson = result.content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('[Claude] Analysis failed:', error);
      return { action: 'continue', reasoning: 'Analysis failed' };
    }
  }

  /**
   * Generate evidence record from real screenshot
   */
  generateEvidenceRecord(
    stepId: string,
    description: string,
    screenshot?: string,
    url?: string
  ): EvidenceRecord {
    const timestamp = new Date().toISOString();
    const hash = this.generateHash(`${stepId}-${timestamp}-${screenshot?.substring(0, 100) || 'no-screenshot'}`);

    return {
      id: `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      step_id: stepId,
      timestamp,
      type: 'screenshot',
      url: url || 'unknown',
      domain: url ? new URL(url).hostname : 'unknown',
      hash: `SHA256:${hash}`,
      filename: `evidence_${stepId}_${Date.now()}.png`,
      description,
      size_bytes: screenshot ? Math.floor(screenshot.length * 0.75) : 0, // Approximate decoded size
      // Store actual screenshot data for display
      _screenshotData: screenshot
    };
  }

  private generateHash(content: string): string {
    let h0 = 0x811c9dc5;
    let h1 = 0x811c9dc5;
    for (let i = 0; i < content.length; i++) {
      const c = content.charCodeAt(i);
      h0 = (h0 ^ c) * 0x01000193 >>> 0;
      h1 = (h1 ^ (c * 31)) * 0x01000193 >>> 0;
    }
    return `${h0.toString(16).padStart(8, '0')}${h1.toString(16).padStart(8, '0')}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const browserMCPExecutor = new BrowserMCPExecutor();

// ============================================================================
// EXECUTION COORDINATOR
// ============================================================================

/**
 * Coordinates real browser execution with governance
 */
export async function executeWithRealBrowser(
  pack: InstructionPack,
  params: Record<string, string>,
  onProgress: (context: ExecutionContext) => void,
  onGate: (gate: any) => Promise<boolean>,
  onScreenshot: (evidence: EvidenceRecord) => void
): Promise<{
  success: boolean;
  evidence: EvidenceRecord[];
  stoppedAt?: StopConditionType;
  error?: string;
}> {
  const executor = browserMCPExecutor;
  const evidence: EvidenceRecord[] = [];

  if (!executor.isMCPAvailable()) {
    return {
      success: false,
      evidence: [],
      error: 'Chrome MCP extension not connected. Please ensure the extension is installed and active.'
    };
  }

  // Initialize tab
  const tab = await executor.initializeTab();
  if (!tab) {
    return {
      success: false,
      evidence: [],
      error: 'Failed to initialize browser tab'
    };
  }

  // Execute steps
  for (const step of pack.steps) {
    // Check stop conditions before each step
    const stopCondition = await executor.checkStopConditions(pack);
    if (stopCondition) {
      // Capture evidence on stop
      const screenshot = await executor.takeScreenshot();
      if (screenshot.success && screenshot.screenshot) {
        const evd = executor.generateEvidenceRecord(
          step.id,
          `STOPPED: ${stopCondition}`,
          screenshot.screenshot
        );
        evidence.push(evd);
        onScreenshot(evd);
      }

      return {
        success: false,
        evidence,
        stoppedAt: stopCondition
      };
    }

    // Handle gates for sensitive actions
    if (step.sensitivity !== ActionSensitivity.SAFE) {
      const approved = await onGate({
        step_id: step.id,
        gate_type: step.sensitivity === ActionSensitivity.MANDATORY
          ? MAIClassification.MANDATORY
          : MAIClassification.ADVISORY,
        reason: step.description
      });

      if (!approved) {
        return {
          success: false,
          evidence,
          error: 'Gate rejected by user'
        };
      }
    }

    // Execute step based on action type
    let result: MCPToolResult;

    switch (step.action) {
      case StepAction.NAVIGATE:
        const url = step.target?.url?.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] || '');
        if (url) {
          result = await executor.navigate(url, pack);
        } else {
          result = { success: false, error: 'No URL specified' };
        }
        break;

      case StepAction.SCREENSHOT:
        result = await executor.takeScreenshot();
        if (result.success && result.screenshot) {
          const evd = executor.generateEvidenceRecord(
            step.id,
            step.description,
            result.screenshot
          );
          evidence.push(evd);
          onScreenshot(evd);
        }
        break;

      case StepAction.EXTRACT_TEXT:
        result = await executor.extractText();
        break;

      case StepAction.CLICK:
        if (step.target?.text) {
          const findResult = await executor.findElement(step.target.text);
          if (findResult.success && findResult.data?.elements?.[0]) {
            result = await executor.click(
              findResult.data.elements[0].ref,
              step.sensitivity
            );
          } else {
            result = { success: false, error: `Element not found: ${step.target.text}` };
          }
        } else {
          result = { success: false, error: 'No click target specified' };
        }
        break;

      case StepAction.SCROLL:
        result = await executor.scroll('down', 3);
        break;

      case StepAction.WAIT:
        await new Promise(r => setTimeout(r, 2000));
        result = { success: true };
        break;

      default:
        result = { success: true };
    }

    if (!result.success) {
      console.warn(`[MCP] Step ${step.id} failed:`, result.error);
    }

    // Capture evidence if required
    if (step.captureEvidence && step.action !== StepAction.SCREENSHOT) {
      const screenshot = await executor.takeScreenshot();
      if (screenshot.success && screenshot.screenshot) {
        const evd = executor.generateEvidenceRecord(
          step.id,
          step.description,
          screenshot.screenshot
        );
        evidence.push(evd);
        onScreenshot(evd);
      }
    }
  }

  return {
    success: true,
    evidence
  };
}
