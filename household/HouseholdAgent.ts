/**
 * HOUSEHOLD AGENT v1.0.0 - Streamlined for Real Use
 *
 * A practical household operations assistant that:
 * - Uses MCP Chrome tools directly
 * - Follows governance patterns (gate approvals for actions)
 * - Actually completes grocery, bill pay, and household tasks
 * - Maintains session state to handle screenshot limits
 *
 * DESIGN PRINCIPLES:
 * - Simple over complex
 * - Actually works over theoretically correct
 * - User approval for any action that costs money
 * - Read freely, act with permission
 */

// =============================================================================
// TYPES
// =============================================================================

export interface HouseholdProfile {
  profile_id: string;
  household: {
    name: string;
    members: Array<{ name: string; role: string }>;
    size: number;
  };
  accounts: Record<string, AccountConfig>;
  shopping_preferences: ShoppingPreferences;
  current_priorities: Priority[];
}

export interface AccountConfig {
  name: string;
  type?: string;
  portal_url: string;
  login_method?: string;
  stays_logged_in?: boolean;
  payment_card_last4?: string;
  saved_cards?: string[];
  due_day?: number;
  typical_amount?: number;
  workflow_steps?: string;
  notes?: string;
}

export interface ShoppingPreferences {
  grocery: {
    order_frequency: string;
    budget_target: number;
    priorities: string[];
    meal_categories: Record<string, string[]>;
  };
  household: Record<string, any>;
}

export interface Priority {
  priority: number;
  item: string;
  amount: number | string;
  due: string;
  status: string;
  action: string;
}

export interface SessionState {
  id: string;
  startedAt: string;
  screenshotCount: number;
  maxScreenshots: number;
  currentTask: string | null;
  completedSteps: string[];
  pendingSteps: string[];
  tabStates: Map<number, TabState>;
  checkpoints: Checkpoint[];
}

export interface TabState {
  tabId: number;
  url: string;
  name: string;
  lastScreenshot?: string;
  extractedData?: any;
  status: 'active' | 'needs_login' | 'ready' | 'error';
}

export interface Checkpoint {
  timestamp: string;
  task: string;
  step: string;
  state: any;
  canResume: boolean;
}

export interface ActionRequest {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'read' | 'approve_payment';
  target?: string;
  value?: string;
  description: string;
  requiresApproval: boolean;
  costsMoney: boolean;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshotTaken?: boolean;
  checkpoint?: Checkpoint;
}

// =============================================================================
// GOVERNANCE - Household Domain Extensions
// =============================================================================

/**
 * Domains allowed for household operations
 * Extends the base ACE governance for household use
 */
export const HOUSEHOLD_ALLOWED_DOMAINS = [
  // Shopping
  'walmart.com', 'www.walmart.com',
  'amazon.com', 'www.amazon.com',
  'instacart.com', 'www.instacart.com',
  'target.com', 'www.target.com',
  'costco.com', 'www.costco.com',

  // Utilities
  'georgiapower.com', 'www.georgiapower.com',
  'gapower.com', 'www.gapower.com',
  'xfinity.com', 'www.xfinity.com',
  'att.com', 'www.att.com',
  'spectrum.net', 'www.spectrum.net',

  // Housing/Rent
  'securecafenet.com', '*.securecafenet.com',
  'rentcafe.com', '*.rentcafe.com',
  'appfolio.com', '*.appfolio.com',

  // Banks (read-only operations)
  'chase.com', 'www.chase.com',
  'bankofamerica.com', 'www.bankofamerica.com',
  'wellsfargo.com', 'www.wellsfargo.com',
  'capitalone.com', 'www.capitalone.com',
  'privacy.com', 'www.privacy.com',

  // Calendar
  'calendar.google.com',
  'outlook.live.com',

  // SSO Providers (for login flows)
  'accounts.google.com',
  'login.microsoftonline.com'
] as const;

/**
 * Actions that ALWAYS require user approval
 */
export const APPROVAL_REQUIRED_ACTIONS = [
  'click_pay',
  'click_checkout',
  'click_submit',
  'click_order',
  'click_purchase',
  'enter_payment',
  'confirm_transaction',
  'approve_payment'
] as const;

/**
 * Actions that are READ-ONLY and can proceed automatically
 */
export const AUTO_APPROVED_ACTIONS = [
  'navigate',
  'screenshot',
  'read_page',
  'read_balance',
  'read_cart',
  'read_bill',
  'scroll',
  'find_element'
] as const;

// =============================================================================
// HOUSEHOLD AGENT
// =============================================================================

export class HouseholdAgent {
  private profile: HouseholdProfile;
  private session: SessionState;

  constructor(profile: HouseholdProfile) {
    this.profile = profile;
    this.session = this.initSession();
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  private initSession(): SessionState {
    return {
      id: `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      screenshotCount: 0,
      maxScreenshots: 95, // Leave buffer before 100 limit
      currentTask: null,
      completedSteps: [],
      pendingSteps: [],
      tabStates: new Map(),
      checkpoints: []
    };
  }

  /**
   * Check if we're approaching screenshot limit
   */
  canTakeScreenshot(): boolean {
    return this.session.screenshotCount < this.session.maxScreenshots;
  }

  /**
   * Record a screenshot was taken
   */
  recordScreenshot(): void {
    this.session.screenshotCount++;
    console.log(`[HouseholdAgent] Screenshot ${this.session.screenshotCount}/${this.session.maxScreenshots}`);
  }

  /**
   * Create a checkpoint for resuming later
   */
  createCheckpoint(task: string, step: string, state: any): Checkpoint {
    const checkpoint: Checkpoint = {
      timestamp: new Date().toISOString(),
      task,
      step,
      state,
      canResume: true
    };
    this.session.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Get session status for user visibility
   */
  getSessionStatus(): {
    screenshotsRemaining: number;
    currentTask: string | null;
    completedSteps: string[];
    canContinue: boolean;
  } {
    return {
      screenshotsRemaining: this.session.maxScreenshots - this.session.screenshotCount,
      currentTask: this.session.currentTask,
      completedSteps: this.session.completedSteps,
      canContinue: this.canTakeScreenshot()
    };
  }

  /**
   * Export session state for persistence
   */
  exportSession(): string {
    return JSON.stringify({
      ...this.session,
      tabStates: Array.from(this.session.tabStates.entries())
    }, null, 2);
  }

  /**
   * Import session state to resume
   */
  importSession(sessionJson: string): void {
    const data = JSON.parse(sessionJson);
    this.session = {
      ...data,
      tabStates: new Map(data.tabStates)
    };
  }

  // ===========================================================================
  // GOVERNANCE CHECKS
  // ===========================================================================

  /**
   * Check if URL is allowed for household operations
   */
  isUrlAllowed(url: string): { allowed: boolean; reason?: string } {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Check exact match or subdomain match
      const isAllowed = HOUSEHOLD_ALLOWED_DOMAINS.some(domain => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return hostname.endsWith(baseDomain);
        }
        return hostname === domain || hostname.endsWith('.' + domain);
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Domain "${hostname}" is not in the household allowlist`
        };
      }

      return { allowed: true };
    } catch (e) {
      return { allowed: false, reason: `Invalid URL: ${url}` };
    }
  }

  /**
   * Check if an action requires user approval
   */
  requiresApproval(action: string): boolean {
    const lowerAction = action.toLowerCase();
    return APPROVAL_REQUIRED_ACTIONS.some(a => lowerAction.includes(a));
  }

  /**
   * Check if action is auto-approved (read-only)
   */
  isAutoApproved(action: string): boolean {
    const lowerAction = action.toLowerCase();
    return AUTO_APPROVED_ACTIONS.some(a => lowerAction.includes(a));
  }

  // ===========================================================================
  // TASK WORKFLOWS
  // ===========================================================================

  /**
   * Get workflow steps for a task type
   */
  getWorkflowSteps(taskType: 'rent' | 'electric' | 'groceries' | 'scan'): string[] {
    const workflows: Record<string, string[]> = {
      rent: [
        'Navigate to rent portal',
        'Check if logged in (may use SSO)',
        'Read current balance',
        'Navigate to payments',
        'Read payment options',
        'CHECKPOINT: Show balance and ask for approval',
        'Select payment card (user approved)',
        'Review payment details',
        'GATE: Confirm submission (requires explicit approval)',
        'Capture confirmation screenshot'
      ],
      electric: [
        'Navigate to Georgia Power',
        'Check login status',
        'If locked, STOP and report',
        'Read current balance and due date',
        'Navigate to payment',
        'CHECKPOINT: Show amount and ask approval',
        'Complete payment (user approved)',
        'Capture confirmation'
      ],
      groceries: [
        'Navigate to Walmart',
        'Check login status',
        'Navigate to cart or start new list',
        'Add items from shopping list',
        'Review cart total',
        'CHECKPOINT: Show cart and ask approval',
        'Select pickup/delivery time',
        'GATE: Checkout (requires approval)',
        'Capture confirmation'
      ],
      scan: [
        'Check bank balance',
        'Check shopping carts',
        'Check utility bills',
        'Check calendar for due dates',
        'Synthesize dashboard',
        'Report findings'
      ]
    };

    return workflows[taskType] || [];
  }

  /**
   * Get account config for a task
   */
  getAccountForTask(taskType: string): AccountConfig | null {
    const mapping: Record<string, string> = {
      rent: 'housing',
      electric: 'electric',
      groceries: 'groceries'
    };

    const accountKey = mapping[taskType];
    return accountKey ? this.profile.accounts[accountKey] : null;
  }

  // ===========================================================================
  // ACTION HELPERS
  // ===========================================================================

  /**
   * Format an action request with governance info
   */
  formatActionRequest(
    type: ActionRequest['type'],
    description: string,
    options: Partial<ActionRequest> = {}
  ): ActionRequest {
    const costsMoney = ['approve_payment', 'click'].includes(type) &&
      (description.toLowerCase().includes('pay') ||
       description.toLowerCase().includes('checkout') ||
       description.toLowerCase().includes('submit'));

    return {
      type,
      description,
      requiresApproval: this.requiresApproval(description) || costsMoney,
      costsMoney,
      ...options
    };
  }

  /**
   * Get current priorities from profile
   */
  getPriorities(): Priority[] {
    return this.profile.current_priorities || [];
  }

  /**
   * Get shopping preferences
   */
  getShoppingPreferences(): ShoppingPreferences {
    return this.profile.shopping_preferences;
  }

  /**
   * Generate grocery list based on preferences
   */
  generateGroceryList(): { category: string; items: string[] }[] {
    const prefs = this.profile.shopping_preferences.grocery;
    const categories = prefs.meal_categories;

    // Simple list generation based on categories
    return Object.entries(categories).map(([category, items]) => ({
      category,
      items: items.slice(0, 3) // Pick first 3 from each category
    }));
  }
}

// =============================================================================
// FACTORY & HELPERS
// =============================================================================

/**
 * Load household profile from JSON
 */
export function loadProfile(profileJson: string): HouseholdProfile {
  return JSON.parse(profileJson) as HouseholdProfile;
}

/**
 * Create agent with profile
 */
export function createHouseholdAgent(profile: HouseholdProfile): HouseholdAgent {
  return new HouseholdAgent(profile);
}

// =============================================================================
// PROMPT TEMPLATES FOR CLAUDE CODE
// =============================================================================

/**
 * These are the prompts that work with Claude Code + Chrome MCP
 * to actually execute household tasks
 */
export const HOUSEHOLD_PROMPTS = {

  // Quick status check
  STATUS: `
Check my household status:
1. Read the profile at household/profiles/knowl_household.json
2. Show me current priorities
3. Show me what's due soon
4. Show screenshots remaining in this session
`,

  // Pay rent workflow
  PAY_RENT: `
Help me pay rent. Follow these steps:

1. Load my profile from household/profiles/knowl_household.json
2. Get the rent portal URL from accounts.housing.portal_url
3. Navigate to the portal
4. Check if I'm logged in (should stay logged in via Google SSO)
5. Find and read the current balance
6. Navigate to the payment section
7. STOP and show me: balance, due date, payment card options
8. WAIT for my approval before clicking any Pay buttons

Remember:
- Take screenshots at key steps for evidence
- If you see a login page, STOP and tell me
- Never click Pay/Submit without my explicit approval
`,

  // Grocery order workflow
  ORDER_GROCERIES: `
Help me order groceries. Follow these steps:

1. Load my profile from household/profiles/knowl_household.json
2. Check shopping_preferences for budget and preferences
3. Navigate to walmart.com
4. Build a cart with:
   - 1-2 proteins (rotate from last order)
   - Easy meal items
   - Breakfast items
   - Snacks for dad and son
   - Household essentials if needed
5. Target: around $100-150
6. STOP and show me: cart contents, total, pickup times
7. WAIT for my approval before checkout

Remember:
- Check meal_history to avoid repetition
- Take screenshots of cart
- Never complete checkout without approval
`,

  // Weekly scan
  WEEKLY_SCAN: `
Do my weekly household scan:

1. Load my profile
2. Check these in order:
   a. Rent portal - what's the balance?
   b. Georgia Power - what's due? Still locked?
   c. Walmart - anything in cart?
   d. Calendar - when's payday?

3. Give me a dashboard:
   - Bills due this week
   - Total obligations
   - Any alerts or issues
   - Recommended actions

4. Save a summary to household/evidence/[date]_weekly_scan.json

Just READ - no clicking payment buttons.
`,

  // Resume from checkpoint
  RESUME: `
Resume my household session:

1. Check household/evidence/ for the latest session file
2. Load the checkpoint state
3. Show me where we left off
4. Continue from that point

If there's no checkpoint, start fresh and ask what I want to do.
`
};

export default {
  HouseholdAgent,
  createHouseholdAgent,
  loadProfile,
  HOUSEHOLD_ALLOWED_DOMAINS,
  HOUSEHOLD_PROMPTS
};
