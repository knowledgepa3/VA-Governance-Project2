/**
 * MULTI-TAB ORCHESTRATOR v1.0.0
 *
 * Coordinates multiple browser tabs to build a unified household dashboard.
 * Uses MCP Chrome tools for tab management and data extraction.
 *
 * KEY CAPABILITIES:
 * - Open and manage multiple tabs simultaneously
 * - Extract structured data from each tab
 * - Cross-reference data across tabs
 * - Synthesize unified dashboard
 * - Detect anomalies through cross-tab analysis
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TabConfig {
  id: string;
  name: string;
  url: string;
  category: 'financial' | 'shopping' | 'utility' | 'calendar' | 'subscription';
  dataPoints: string[];
  selectors?: Record<string, string>;
}

export interface TabData {
  tabId: number;
  config: TabConfig;
  status: 'pending' | 'loading' | 'ready' | 'error' | 'closed';
  data: Record<string, any>;
  screenshot?: string;
  extractedAt?: string;
  error?: string;
}

export interface FinancialData {
  balance: number;
  availableBalance: number;
  pendingTransactions: Transaction[];
  recentTransactions: Transaction[];
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit' | 'pending';
  merchant?: string;
  category?: string;
}

export interface CartData {
  merchant: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee?: number;
}

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

export interface BillData {
  provider: string;
  type: string;
  amountDue: number;
  dueDate: string;
  accountNumber?: string;
  status: 'current' | 'due_soon' | 'overdue';
}

export interface CalendarData {
  events: CalendarEvent[];
  nextPayday?: string;
  upcomingBillReminders: string[];
}

export interface CalendarEvent {
  title: string;
  date: string;
  type?: string;
}

export interface HouseholdDashboard {
  generatedAt: string;

  financial: {
    totalBalance: number;
    totalAvailable: number;
    pendingCharges: number;
    accounts: FinancialData[];
  };

  pendingPurchases: {
    carts: CartData[];
    totalCartValue: number;
  };

  bills: {
    upcoming: BillData[];
    totalDueThisWeek: number;
    totalDueThisMonth: number;
  };

  calendar: {
    nextPayday?: string;
    daysUntilPayday?: number;
    upcomingEvents: CalendarEvent[];
  };

  analysis: {
    affordability: AffordabilityAnalysis;
    anomalies: Anomaly[];
    recommendations: Recommendation[];
  };
}

export interface AffordabilityAnalysis {
  currentBalance: number;
  totalPending: number;
  projectedBalance: number;
  canAffordAll: boolean;
  shortfall?: number;
  bufferRemaining?: number;
  paymentPriority: PaymentPriority[];
}

export interface PaymentPriority {
  item: string;
  amount: number;
  dueDate?: string;
  priority: 'immediate' | 'before_payday' | 'can_wait' | 'optional';
  reason: string;
}

export interface Anomaly {
  id: string;
  type: 'unmatched_charge' | 'duplicate_subscription' | 'price_increase' | 'unknown_merchant' | 'unusual_amount';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  suggestedAction: string;
}

export interface Recommendation {
  id: string;
  type: 'timing' | 'savings' | 'warning' | 'action_needed';
  title: string;
  description: string;
  impact?: string;
  action?: string;
}

// =============================================================================
// MULTI-TAB ORCHESTRATOR
// =============================================================================

export class MultiTabOrchestrator {
  private tabs: Map<string, TabData> = new Map();
  private mcpClient: any; // MCP Chrome client
  private tabGroupId?: number;

  constructor(mcpClient: any) {
    this.mcpClient = mcpClient;
  }

  // ==========================================================================
  // TAB MANAGEMENT
  // ==========================================================================

  /**
   * Initialize tab group for this session
   */
  async initializeSession(): Promise<void> {
    // Get or create MCP tab group
    const context = await this.mcpClient.tabs_context_mcp({ createIfEmpty: true });
    this.tabGroupId = context.groupId;
    console.log(`[Orchestrator] Session initialized with group ${this.tabGroupId}`);
  }

  /**
   * Open a new tab with given configuration
   */
  async openTab(config: TabConfig): Promise<TabData> {
    console.log(`[Orchestrator] Opening tab: ${config.name} -> ${config.url}`);

    // Create tab via MCP
    const newTab = await this.mcpClient.tabs_create_mcp({});

    const tabData: TabData = {
      tabId: newTab.tabId,
      config,
      status: 'loading',
      data: {}
    };

    this.tabs.set(config.id, tabData);

    // Navigate to URL
    await this.mcpClient.navigate({
      tabId: newTab.tabId,
      url: config.url
    });

    // Wait for page to load
    await this.waitForPageLoad(newTab.tabId);

    tabData.status = 'ready';
    console.log(`[Orchestrator] Tab ready: ${config.name}`);

    return tabData;
  }

  /**
   * Wait for page to finish loading
   */
  private async waitForPageLoad(tabId: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Take a screenshot to verify page loaded
        await this.mcpClient.computer({
          tabId,
          action: 'screenshot'
        });
        return;
      } catch (e) {
        await this.sleep(500);
      }
    }

    throw new Error(`Page load timeout for tab ${tabId}`);
  }

  /**
   * Extract data from a tab based on its configuration
   */
  async extractTabData(configId: string): Promise<Record<string, any>> {
    const tabData = this.tabs.get(configId);
    if (!tabData || tabData.status !== 'ready') {
      throw new Error(`Tab ${configId} not ready for extraction`);
    }

    console.log(`[Orchestrator] Extracting data from: ${tabData.config.name}`);

    // Read page content
    const pageContent = await this.mcpClient.read_page({
      tabId: tabData.tabId,
      depth: 5
    });

    // Take screenshot for evidence
    const screenshot = await this.mcpClient.computer({
      tabId: tabData.tabId,
      action: 'screenshot'
    });

    // Extract based on category
    let extractedData: Record<string, any> = {};

    switch (tabData.config.category) {
      case 'financial':
        extractedData = this.parseFinancialPage(pageContent);
        break;
      case 'shopping':
        extractedData = this.parseShoppingCart(pageContent);
        break;
      case 'utility':
        extractedData = this.parseBillPage(pageContent);
        break;
      case 'calendar':
        extractedData = this.parseCalendar(pageContent);
        break;
      case 'subscription':
        extractedData = this.parseSubscriptionPage(pageContent);
        break;
    }

    tabData.data = extractedData;
    tabData.extractedAt = new Date().toISOString();
    tabData.screenshot = screenshot?.imageId;

    console.log(`[Orchestrator] Extracted from ${tabData.config.name}:`, Object.keys(extractedData));

    return extractedData;
  }

  /**
   * Close a specific tab
   */
  async closeTab(configId: string): Promise<void> {
    const tabData = this.tabs.get(configId);
    if (!tabData) return;

    // MCP doesn't have explicit tab close, but we can navigate away
    // or just remove from our tracking
    tabData.status = 'closed';
    console.log(`[Orchestrator] Tab closed: ${tabData.config.name}`);
  }

  /**
   * Close all tabs in session
   */
  async closeAllTabs(): Promise<void> {
    for (const [configId] of this.tabs) {
      await this.closeTab(configId);
    }
    this.tabs.clear();
    console.log(`[Orchestrator] All tabs closed`);
  }

  // ==========================================================================
  // PAGE PARSERS
  // ==========================================================================

  private parseFinancialPage(pageContent: any): FinancialData {
    // In production, use actual page parsing
    // This is a structured placeholder showing what we'd extract
    return {
      balance: 0,
      availableBalance: 0,
      pendingTransactions: [],
      recentTransactions: []
    };
  }

  private parseShoppingCart(pageContent: any): CartData {
    return {
      merchant: '',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0
    };
  }

  private parseBillPage(pageContent: any): BillData {
    return {
      provider: '',
      type: '',
      amountDue: 0,
      dueDate: '',
      status: 'current'
    };
  }

  private parseCalendar(pageContent: any): CalendarData {
    return {
      events: [],
      upcomingBillReminders: []
    };
  }

  private parseSubscriptionPage(pageContent: any): any {
    return {
      name: '',
      price: 0,
      renewalDate: '',
      status: 'active'
    };
  }

  // ==========================================================================
  // ORCHESTRATION WORKFLOWS
  // ==========================================================================

  /**
   * Run a full household scan across all configured tabs
   */
  async runFullHouseholdScan(tabConfigs: TabConfig[]): Promise<HouseholdDashboard> {
    console.log(`[Orchestrator] Starting full household scan with ${tabConfigs.length} tabs`);

    await this.initializeSession();

    // Group tabs by category
    const grouped = this.groupByCategory(tabConfigs);

    // Open and extract in order: financial first (need balance), then others
    const financialData: FinancialData[] = [];
    const cartData: CartData[] = [];
    const billData: BillData[] = [];
    let calendarData: CalendarData | null = null;

    // 1. Financial tabs first
    for (const config of grouped.financial || []) {
      try {
        await this.openTab(config);
        const data = await this.extractTabData(config.id) as FinancialData;
        financialData.push(data);
      } catch (e: any) {
        console.error(`[Orchestrator] Error with ${config.name}: ${e.message}`);
      }
    }

    // 2. Shopping carts
    for (const config of grouped.shopping || []) {
      try {
        await this.openTab(config);
        const data = await this.extractTabData(config.id) as CartData;
        cartData.push(data);
      } catch (e: any) {
        console.error(`[Orchestrator] Error with ${config.name}: ${e.message}`);
      }
    }

    // 3. Utility bills
    for (const config of grouped.utility || []) {
      try {
        await this.openTab(config);
        const data = await this.extractTabData(config.id) as BillData;
        billData.push(data);
      } catch (e: any) {
        console.error(`[Orchestrator] Error with ${config.name}: ${e.message}`);
      }
    }

    // 4. Calendar (just one)
    const calendarConfig = (grouped.calendar || [])[0];
    if (calendarConfig) {
      try {
        await this.openTab(calendarConfig);
        calendarData = await this.extractTabData(calendarConfig.id) as CalendarData;
      } catch (e: any) {
        console.error(`[Orchestrator] Error with calendar: ${e.message}`);
      }
    }

    // Synthesize dashboard
    const dashboard = this.synthesizeDashboard(financialData, cartData, billData, calendarData);

    // Close all tabs
    await this.closeAllTabs();

    return dashboard;
  }

  /**
   * Quick affordability check for a specific cart
   */
  async checkCartAffordability(
    bankConfig: TabConfig,
    cartConfig: TabConfig
  ): Promise<{ canAfford: boolean; balance: number; cartTotal: number; remaining: number }> {
    await this.initializeSession();

    // Open bank tab
    await this.openTab(bankConfig);
    const bankData = await this.extractTabData(bankConfig.id) as FinancialData;

    // Open cart tab
    await this.openTab(cartConfig);
    const cartData = await this.extractTabData(cartConfig.id) as CartData;

    await this.closeAllTabs();

    const canAfford = bankData.availableBalance >= cartData.total;

    return {
      canAfford,
      balance: bankData.availableBalance,
      cartTotal: cartData.total,
      remaining: bankData.availableBalance - cartData.total
    };
  }

  /**
   * Reconcile charges against order history
   */
  async reconcileCharges(
    bankConfig: TabConfig,
    orderHistoryConfigs: TabConfig[]
  ): Promise<{ matched: Transaction[]; unmatched: Transaction[]; anomalies: Anomaly[] }> {
    await this.initializeSession();

    // Open bank tab and extract transactions
    await this.openTab(bankConfig);
    const bankData = await this.extractTabData(bankConfig.id) as FinancialData;

    // Open all order history tabs
    const orders: any[] = [];
    for (const config of orderHistoryConfigs) {
      await this.openTab(config);
      const orderData = await this.extractTabData(config.id);
      orders.push(orderData);
    }

    await this.closeAllTabs();

    // Match transactions to orders
    const matched: Transaction[] = [];
    const unmatched: Transaction[] = [];
    const anomalies: Anomaly[] = [];

    for (const txn of bankData.recentTransactions) {
      const match = this.findMatchingOrder(txn, orders);

      if (match) {
        matched.push(txn);
      } else {
        unmatched.push(txn);

        // Create anomaly for unmatched charge
        anomalies.push({
          id: `ANOMALY-${Date.now()}`,
          type: 'unmatched_charge',
          severity: txn.amount > 100 ? 'high' : 'medium',
          description: `Charge of $${txn.amount} from "${txn.description}" has no matching order`,
          details: { transaction: txn },
          suggestedAction: 'Verify this charge is legitimate'
        });
      }
    }

    return { matched, unmatched, anomalies };
  }

  // ==========================================================================
  // ANALYSIS & SYNTHESIS
  // ==========================================================================

  private synthesizeDashboard(
    financialData: FinancialData[],
    cartData: CartData[],
    billData: BillData[],
    calendarData: CalendarData | null
  ): HouseholdDashboard {
    const now = new Date();

    // Aggregate financial data
    const totalBalance = financialData.reduce((sum, f) => sum + f.balance, 0);
    const totalAvailable = financialData.reduce((sum, f) => sum + f.availableBalance, 0);
    const pendingCharges = financialData.reduce(
      (sum, f) => sum + f.pendingTransactions.reduce((s, t) => s + Math.abs(t.amount), 0),
      0
    );

    // Aggregate cart data
    const totalCartValue = cartData.reduce((sum, c) => sum + c.total, 0);

    // Aggregate bills
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const totalDueThisWeek = billData
      .filter(b => new Date(b.dueDate) <= weekFromNow)
      .reduce((sum, b) => sum + b.amountDue, 0);

    const totalDueThisMonth = billData
      .filter(b => new Date(b.dueDate) <= monthFromNow)
      .reduce((sum, b) => sum + b.amountDue, 0);

    // Calculate affordability
    const totalPending = totalCartValue + totalDueThisWeek + pendingCharges;
    const projectedBalance = totalAvailable - totalPending;

    const affordability: AffordabilityAnalysis = {
      currentBalance: totalAvailable,
      totalPending,
      projectedBalance,
      canAffordAll: projectedBalance > 0,
      shortfall: projectedBalance < 0 ? Math.abs(projectedBalance) : undefined,
      bufferRemaining: projectedBalance > 0 ? projectedBalance : undefined,
      paymentPriority: this.calculatePaymentPriority(billData, cartData, totalAvailable)
    };

    // Detect anomalies
    const anomalies = this.detectAnomalies(financialData, billData, cartData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      affordability,
      billData,
      calendarData
    );

    return {
      generatedAt: now.toISOString(),

      financial: {
        totalBalance,
        totalAvailable,
        pendingCharges,
        accounts: financialData
      },

      pendingPurchases: {
        carts: cartData,
        totalCartValue
      },

      bills: {
        upcoming: billData,
        totalDueThisWeek,
        totalDueThisMonth
      },

      calendar: {
        nextPayday: calendarData?.nextPayday,
        daysUntilPayday: calendarData?.nextPayday
          ? Math.ceil((new Date(calendarData.nextPayday).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : undefined,
        upcomingEvents: calendarData?.events || []
      },

      analysis: {
        affordability,
        anomalies,
        recommendations
      }
    };
  }

  private calculatePaymentPriority(
    bills: BillData[],
    carts: CartData[],
    available: number
  ): PaymentPriority[] {
    const priorities: PaymentPriority[] = [];

    // Bills first, sorted by due date
    const sortedBills = [...bills].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    for (const bill of sortedBills) {
      const daysUntilDue = Math.ceil(
        (new Date(bill.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      priorities.push({
        item: `${bill.provider} ${bill.type}`,
        amount: bill.amountDue,
        dueDate: bill.dueDate,
        priority: daysUntilDue <= 1 ? 'immediate' : daysUntilDue <= 7 ? 'before_payday' : 'can_wait',
        reason: daysUntilDue <= 1 ? 'Due immediately' : `Due in ${daysUntilDue} days`
      });
    }

    // Carts are optional
    for (const cart of carts) {
      priorities.push({
        item: `${cart.merchant} cart`,
        amount: cart.total,
        priority: 'optional',
        reason: 'Shopping cart - not time-sensitive'
      });
    }

    return priorities;
  }

  private detectAnomalies(
    financial: FinancialData[],
    bills: BillData[],
    carts: CartData[]
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for unusually high bills
    for (const bill of bills) {
      // In production, compare to historical average
      if (bill.amountDue > 500) {
        anomalies.push({
          id: `ANOMALY-BILL-${Date.now()}`,
          type: 'unusual_amount',
          severity: 'medium',
          description: `${bill.provider} bill of $${bill.amountDue} seems higher than usual`,
          details: { bill },
          suggestedAction: 'Review bill details for unexpected charges'
        });
      }
    }

    return anomalies;
  }

  private generateRecommendations(
    affordability: AffordabilityAnalysis,
    bills: BillData[],
    calendar: CalendarData | null
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Affordability warning
    if (!affordability.canAffordAll) {
      recommendations.push({
        id: 'REC-AFFORD',
        type: 'warning',
        title: 'Insufficient Funds Warning',
        description: `You're short $${affordability.shortfall?.toFixed(2)} to cover all pending obligations`,
        impact: 'Some bills may need to wait until payday',
        action: 'Prioritize essential bills and delay optional purchases'
      });
    }

    // Timing recommendation
    if (calendar?.nextPayday) {
      const daysUntilPayday = Math.ceil(
        (new Date(calendar.nextPayday).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      if (daysUntilPayday <= 3 && affordability.bufferRemaining && affordability.bufferRemaining < 100) {
        recommendations.push({
          id: 'REC-TIMING',
          type: 'timing',
          title: 'Wait for Payday',
          description: `Payday is in ${daysUntilPayday} days. Consider waiting for non-urgent purchases.`,
          impact: 'Avoid low balance before payday'
        });
      }
    }

    return recommendations;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private groupByCategory(configs: TabConfig[]): Record<string, TabConfig[]> {
    return configs.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    }, {} as Record<string, TabConfig[]>);
  }

  private findMatchingOrder(transaction: Transaction, orders: any[]): any | null {
    // Simple matching by amount - in production would be more sophisticated
    for (const orderSet of orders) {
      // Check if any order matches the transaction amount
      // This is placeholder logic
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createMultiTabOrchestrator(mcpClient: any): MultiTabOrchestrator {
  return new MultiTabOrchestrator(mcpClient);
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const COMMON_TAB_CONFIGS: Record<string, Partial<TabConfig>> = {
  // Banks
  'chase': {
    name: 'Chase Bank',
    category: 'financial',
    dataPoints: ['balance', 'pending', 'recent_transactions']
  },
  'bofa': {
    name: 'Bank of America',
    category: 'financial',
    dataPoints: ['balance', 'pending', 'recent_transactions']
  },
  'privacy': {
    name: 'Privacy.com',
    category: 'financial',
    dataPoints: ['balance', 'card_transactions']
  },

  // Shopping
  'instacart': {
    name: 'Instacart',
    url: 'https://www.instacart.com/store/checkout',
    category: 'shopping',
    dataPoints: ['cart_items', 'total', 'delivery_fee']
  },
  'amazon_cart': {
    name: 'Amazon Cart',
    url: 'https://www.amazon.com/gp/cart/view.html',
    category: 'shopping',
    dataPoints: ['cart_items', 'total']
  },
  'walmart': {
    name: 'Walmart',
    url: 'https://www.walmart.com/cart',
    category: 'shopping',
    dataPoints: ['cart_items', 'total']
  },

  // Utilities
  'electric': {
    name: 'Electric Company',
    category: 'utility',
    dataPoints: ['amount_due', 'due_date', 'usage']
  },
  'gas': {
    name: 'Gas Company',
    category: 'utility',
    dataPoints: ['amount_due', 'due_date']
  },
  'water': {
    name: 'Water Utility',
    category: 'utility',
    dataPoints: ['amount_due', 'due_date']
  },
  'internet': {
    name: 'Internet Provider',
    category: 'utility',
    dataPoints: ['amount_due', 'due_date']
  },

  // Calendar
  'google_calendar': {
    name: 'Google Calendar',
    url: 'https://calendar.google.com',
    category: 'calendar',
    dataPoints: ['events', 'reminders']
  }
};

export default {
  MultiTabOrchestrator,
  createMultiTabOrchestrator,
  COMMON_TAB_CONFIGS
};
