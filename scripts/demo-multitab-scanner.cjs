#!/usr/bin/env node
/**
 * MULTI-TAB HOUSEHOLD SCANNER DEMO v1.0.0
 *
 * Demonstrates the power of cross-tab orchestration
 * for household financial awareness.
 */

// ANSI colors
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const BG_BLUE = '\x1b[44m';
const BG_GREEN = '\x1b[42m';
const BG_YELLOW = '\x1b[43m';
const BG_RED = '\x1b[41m';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock data representing what would be extracted from each tab
const mockTabs = {
  bank: {
    name: 'Chase Bank',
    url: 'chase.com/accounts',
    data: {
      balance: 2847.52,
      available: 2647.52,
      pending: [
        { description: 'NETFLIX.COM', amount: -15.99 },
        { description: 'GAS STATION', amount: -42.50 }
      ],
      recent: [
        { date: '01/30', description: 'INSTACART', amount: -67.42 },
        { date: '01/29', description: 'AMAZON.COM', amount: -34.99 },
        { date: '01/28', description: 'SPOTIFY', amount: -10.99 },
        { date: '01/27', description: 'UNKNOWN MERCHANT XYZ', amount: -149.00 },
        { date: '01/26', description: 'PAYROLL DEPOSIT', amount: 2450.00 }
      ]
    }
  },
  instacart: {
    name: 'Instacart Cart',
    url: 'instacart.com/checkout',
    data: {
      items: [
        { name: 'Organic Milk (1 gal)', qty: 1, price: 6.99 },
        { name: 'Whole Wheat Bread', qty: 2, price: 3.99 },
        { name: 'Eggs (dozen)', qty: 1, price: 5.49 },
        { name: 'Chicken Breast (2lb)', qty: 1, price: 12.99 },
        { name: 'Bananas (bunch)', qty: 1, price: 1.99 },
        { name: 'Coffee (12oz)', qty: 1, price: 9.99 }
      ],
      subtotal: 45.43,
      tax: 3.18,
      deliveryFee: 5.99,
      total: 54.60
    }
  },
  amazon: {
    name: 'Amazon Cart',
    url: 'amazon.com/cart',
    data: {
      items: [
        { name: 'USB-C Cable 3-pack', qty: 1, price: 12.99 },
        { name: 'Kitchen Timer', qty: 1, price: 8.99 }
      ],
      subtotal: 21.98,
      tax: 1.54,
      total: 23.52
    }
  },
  electric: {
    name: 'Power Company',
    url: 'powerco.com/mybill',
    data: {
      provider: 'PowerCo Electric',
      amount: 142.87,
      dueDate: '2026-02-05',
      status: 'DUE_SOON',
      daysUntilDue: 4
    }
  },
  internet: {
    name: 'FiberNet',
    url: 'fibernet.com/account',
    data: {
      provider: 'FiberNet Internet',
      amount: 79.99,
      dueDate: '2026-02-10',
      status: 'PENDING',
      daysUntilDue: 9
    }
  },
  water: {
    name: 'City Water',
    url: 'citywater.gov/pay',
    data: {
      provider: 'City Water Dept',
      amount: 45.20,
      dueDate: '2026-02-15',
      status: 'PENDING',
      daysUntilDue: 14
    }
  },
  calendar: {
    name: 'Google Calendar',
    url: 'calendar.google.com',
    data: {
      nextPayday: '2026-02-07',
      daysUntilPayday: 6,
      events: [
        { date: '02/05', title: '⚡ Electric Bill Due' },
        { date: '02/07', title: '💰 Payday!' },
        { date: '02/10', title: '🌐 Internet Bill Due' }
      ]
    }
  }
};

async function printHeader() {
  console.log('');
  console.log(`${CYAN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}${BOLD}           MULTI-TAB HOUSEHOLD SCANNER - DEMO                 ${RESET}${CYAN}║${RESET}`);
  console.log(`${CYAN}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║${RESET}  See everything at once. Understand before you spend.         ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  Cross-tab analysis for household financial awareness.        ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
}

async function simulateTabOpening() {
  console.log(`${BOLD}PHASE 1: OPENING TABS${RESET}`);
  console.log(`${DIM}Opening all configured tabs simultaneously...${RESET}`);
  console.log('');

  const tabs = [
    { icon: '🏦', name: 'Chase Bank', status: 'opening' },
    { icon: '🛒', name: 'Instacart', status: 'opening' },
    { icon: '📦', name: 'Amazon', status: 'opening' },
    { icon: '⚡', name: 'Electric', status: 'opening' },
    { icon: '🌐', name: 'Internet', status: 'opening' },
    { icon: '💧', name: 'Water', status: 'opening' },
    { icon: '📅', name: 'Calendar', status: 'opening' }
  ];

  // Show opening
  console.log(`  ┌─────────────────────────────────────────────────────────────┐`);
  for (const tab of tabs) {
    console.log(`  │ ${tab.icon} ${tab.name.padEnd(15)} ${YELLOW}○ Opening...${RESET}                        │`);
  }
  console.log(`  └─────────────────────────────────────────────────────────────┘`);

  await sleep(1500);

  // Clear and show ready
  console.log('');
  console.log(`  ┌─────────────────────────────────────────────────────────────┐`);
  for (const tab of tabs) {
    console.log(`  │ ${tab.icon} ${tab.name.padEnd(15)} ${GREEN}● Ready${RESET}                              │`);
  }
  console.log(`  └─────────────────────────────────────────────────────────────┘`);
  console.log('');
  console.log(`  ${GREEN}✓ All 7 tabs open and ready${RESET}`);
  console.log('');
}

async function simulateDataExtraction() {
  console.log(`${BOLD}PHASE 2: EXTRACTING DATA${RESET}`);
  console.log(`${DIM}Reading data from each tab...${RESET}`);
  console.log('');

  // Bank
  await sleep(300);
  console.log(`  ${BOLD}🏦 CHASE BANK${RESET}`);
  console.log(`     Balance: $${mockTabs.bank.data.balance.toFixed(2)}`);
  console.log(`     Available: $${mockTabs.bank.data.available.toFixed(2)}`);
  console.log(`     Pending: ${mockTabs.bank.data.pending.length} transactions ($${Math.abs(mockTabs.bank.data.pending.reduce((s, t) => s + t.amount, 0)).toFixed(2)})`);
  console.log('');

  // Shopping carts
  await sleep(300);
  console.log(`  ${BOLD}🛒 SHOPPING CARTS${RESET}`);
  console.log(`     Instacart: $${mockTabs.instacart.data.total.toFixed(2)} (${mockTabs.instacart.data.items.length} items)`);
  console.log(`     Amazon: $${mockTabs.amazon.data.total.toFixed(2)} (${mockTabs.amazon.data.items.length} items)`);
  console.log('');

  // Bills
  await sleep(300);
  console.log(`  ${BOLD}📋 BILLS DUE${RESET}`);
  const bills = [mockTabs.electric.data, mockTabs.internet.data, mockTabs.water.data];
  for (const bill of bills) {
    const statusColor = bill.daysUntilDue <= 5 ? RED : bill.daysUntilDue <= 10 ? YELLOW : GREEN;
    console.log(`     ${bill.provider}: $${bill.amount.toFixed(2)} ${statusColor}(due in ${bill.daysUntilDue} days)${RESET}`);
  }
  console.log('');

  // Calendar
  await sleep(300);
  console.log(`  ${BOLD}📅 CALENDAR${RESET}`);
  console.log(`     Next payday: ${mockTabs.calendar.data.nextPayday} (${mockTabs.calendar.data.daysUntilPayday} days)`);
  console.log('');
}

async function printDashboard() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                    HOUSEHOLD DASHBOARD                         ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Financial snapshot
  const available = mockTabs.bank.data.available;
  const pendingCharges = Math.abs(mockTabs.bank.data.pending.reduce((s, t) => s + t.amount, 0));
  const cartTotal = mockTabs.instacart.data.total + mockTabs.amazon.data.total;
  const billsThisWeek = mockTabs.electric.data.amount; // Only electric is due within a week
  const totalPending = cartTotal + billsThisWeek + pendingCharges;
  const projectedBalance = available - totalPending;

  console.log(`  ${BG_BLUE}${WHITE}${BOLD} 💰 FINANCIAL POSITION ${RESET}`);
  console.log('');
  console.log(`  ┌────────────────────────────────────────────────────────────┐`);
  console.log(`  │  Current Balance:     $${mockTabs.bank.data.balance.toFixed(2).padStart(10)}                    │`);
  console.log(`  │  Available:           $${available.toFixed(2).padStart(10)}                    │`);
  console.log(`  │  Pending Charges:    -$${pendingCharges.toFixed(2).padStart(10)}                    │`);
  console.log(`  ├────────────────────────────────────────────────────────────┤`);
  console.log(`  │  ${BOLD}Effective Available:  $${(available - pendingCharges).toFixed(2).padStart(10)}${RESET}                    │`);
  console.log(`  └────────────────────────────────────────────────────────────┘`);
  console.log('');

  // Pending obligations
  console.log(`  ${BG_YELLOW}${WHITE}${BOLD} 📋 PENDING OBLIGATIONS ${RESET}`);
  console.log('');
  console.log(`  ┌────────────────────────────────────────────────────────────┐`);
  console.log(`  │  🛒 Instacart Cart:    $${mockTabs.instacart.data.total.toFixed(2).padStart(10)}  (pending checkout)  │`);
  console.log(`  │  📦 Amazon Cart:       $${mockTabs.amazon.data.total.toFixed(2).padStart(10)}  (pending checkout)  │`);
  console.log(`  │  ⚡ Electric Bill:     $${mockTabs.electric.data.amount.toFixed(2).padStart(10)}  (due in 4 days)    │`);
  console.log(`  │  🌐 Internet Bill:     $${mockTabs.internet.data.amount.toFixed(2).padStart(10)}  (due in 9 days)    │`);
  console.log(`  │  💧 Water Bill:        $${mockTabs.water.data.amount.toFixed(2).padStart(10)}  (due in 14 days)   │`);
  console.log(`  ├────────────────────────────────────────────────────────────┤`);
  const totalObligations = cartTotal + mockTabs.electric.data.amount + mockTabs.internet.data.amount + mockTabs.water.data.amount;
  console.log(`  │  ${BOLD}Total Obligations:    $${totalObligations.toFixed(2).padStart(10)}${RESET}                    │`);
  console.log(`  └────────────────────────────────────────────────────────────┘`);
  console.log('');

  // Affordability analysis
  const canAfford = projectedBalance > 0;
  const statusColor = canAfford ? BG_GREEN : BG_RED;
  const statusText = canAfford ? ' ✓ CAN AFFORD ALL ' : ' ✗ SHORTFALL ';

  console.log(`  ${statusColor}${WHITE}${BOLD}${statusText}${RESET}`);
  console.log('');
  console.log(`  ┌────────────────────────────────────────────────────────────┐`);
  console.log(`  │  Available Now:       $${available.toFixed(2).padStart(10)}                    │`);
  console.log(`  │  Carts + Bills:      -$${totalPending.toFixed(2).padStart(10)}                    │`);
  console.log(`  ├────────────────────────────────────────────────────────────┤`);
  if (canAfford) {
    console.log(`  │  ${GREEN}Projected Balance:    $${projectedBalance.toFixed(2).padStart(10)}${RESET}                    │`);
    console.log(`  │  ${GREEN}Buffer Remaining:     $${projectedBalance.toFixed(2).padStart(10)}${RESET}                    │`);
  } else {
    console.log(`  │  ${RED}Projected Balance:   -$${Math.abs(projectedBalance).toFixed(2).padStart(10)}${RESET}                    │`);
    console.log(`  │  ${RED}SHORTFALL:            $${Math.abs(projectedBalance).toFixed(2).padStart(10)}${RESET}                    │`);
  }
  console.log(`  └────────────────────────────────────────────────────────────┘`);
  console.log('');

  // Timeline
  console.log(`  ${BG_BLUE}${WHITE}${BOLD} 📅 TIMING ANALYSIS ${RESET}`);
  console.log('');
  console.log(`  ┌────────────────────────────────────────────────────────────┐`);
  console.log(`  │  TODAY                                                     │`);
  console.log(`  │    └─ Available: $${available.toFixed(2)}                                │`);
  console.log(`  │                                                            │`);
  console.log(`  │  Feb 5 (4 days) ⚡ Electric Due: $142.87                   │`);
  console.log(`  │    └─ After: $${(available - 142.87).toFixed(2)}                                  │`);
  console.log(`  │                                                            │`);
  console.log(`  │  Feb 7 (6 days) 💰 PAYDAY (+$2,450.00)                     │`);
  console.log(`  │    └─ After: $${(available - 142.87 + 2450).toFixed(2)}                                │`);
  console.log(`  │                                                            │`);
  console.log(`  │  Feb 10 (9 days) 🌐 Internet Due: $79.99                   │`);
  console.log(`  │  Feb 15 (14 days) 💧 Water Due: $45.20                     │`);
  console.log(`  └────────────────────────────────────────────────────────────┘`);
  console.log('');
}

async function printAnomalies() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                    CROSS-TAB ANOMALIES                         ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Unmatched charge
  console.log(`  ${RED}┌─────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`  ${RED}│${RESET} ${BOLD}⚠️  UNMATCHED CHARGE DETECTED${RESET}                               ${RED}│${RESET}`);
  console.log(`  ${RED}├─────────────────────────────────────────────────────────────┤${RESET}`);
  console.log(`  ${RED}│${RESET}                                                             ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}  Bank shows: ${BOLD}UNKNOWN MERCHANT XYZ${RESET} - $149.00 (Jan 27)        ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}                                                             ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}  Cross-referenced against:                                  ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}    ✗ Amazon order history - ${DIM}No match${RESET}                       ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}    ✗ Instacart order history - ${DIM}No match${RESET}                    ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}    ✗ Known subscriptions - ${DIM}No match${RESET}                        ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}                                                             ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}  ${YELLOW}Suggested Action: Verify this charge is legitimate${RESET}        ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}                                                             ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}    ${GREEN}[I RECOGNIZE THIS]${RESET}    ${RED}[DISPUTE CHARGE]${RESET}              ${RED}│${RESET}`);
  console.log(`  ${RED}│${RESET}                                                             ${RED}│${RESET}`);
  console.log(`  ${RED}└─────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');

  // Bill timing warning
  console.log(`  ${YELLOW}┌─────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`  ${YELLOW}│${RESET} ${BOLD}⏰ TIMING ALERT${RESET}                                            ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}├─────────────────────────────────────────────────────────────┤${RESET}`);
  console.log(`  ${YELLOW}│${RESET}                                                             ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}  Electric bill ($142.87) is due ${BOLD}Feb 5${RESET}                      ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}  Payday is ${BOLD}Feb 7${RESET}                                           ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}                                                             ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}  ${CYAN}Recommendation: Pay electric now to avoid late fee${RESET}        ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}  ${CYAN}Wait on shopping carts until after payday${RESET}                 ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}│${RESET}                                                             ${YELLOW}│${RESET}`);
  console.log(`  ${YELLOW}└─────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');
}

async function printRecommendations() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                    RECOMMENDATIONS                            ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  console.log(`  ${GREEN}┌─────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`  ${GREEN}│${RESET} ${BOLD}PRIORITY ORDER${RESET}                                              ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}├─────────────────────────────────────────────────────────────┤${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${RED}1. IMMEDIATE${RESET} ⚡ Electric Bill        $142.87               ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}     └─ Due in 4 days, before payday                         ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${YELLOW}2. AFTER PAYDAY${RESET} 🛒 Instacart Cart     $54.60               ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}     └─ Not urgent, wait for payday buffer                   ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${YELLOW}3. AFTER PAYDAY${RESET} 📦 Amazon Cart        $23.52               ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}     └─ Not urgent, wait for payday buffer                   ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${BLUE}4. NEXT WEEK${RESET} 🌐 Internet Bill         $79.99               ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}     └─ Due after payday, no rush                            ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}  ${DIM}5. CAN WAIT${RESET} 💧 Water Bill             $45.20               ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}     └─ Due in 14 days                                       ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}│${RESET}                                                             ${GREEN}│${RESET}`);
  console.log(`  ${GREEN}└─────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');

  console.log(`  ${CYAN}┌─────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`  ${CYAN}│${RESET} ${BOLD}💡 OPTIMAL PLAN${RESET}                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}├─────────────────────────────────────────────────────────────┤${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}  TODAY: Pay electric bill ($142.87)                         ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}          Balance after: $2,504.65                           ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}  FEB 7:  Payday arrives (+$2,450)                           ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}          Balance: $4,954.65                                 ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}  FEB 8:  Approve grocery cart ($54.60)                      ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}          Approve Amazon cart ($23.52)                       ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}          Balance: $4,876.53                                 ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}  FEB 10: Pay internet bill ($79.99)                         ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}          Balance: $4,796.54                                 ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}  ${GREEN}✓ All obligations met with $4,751.34 buffer${RESET}               ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}│${RESET}                                                             ${CYAN}│${RESET}`);
  console.log(`  ${CYAN}└─────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');
}

async function printSummary() {
  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}                    SCAN COMPLETE                              ${RESET}`);
  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');
  console.log(`  ${BOLD}What the Multi-Tab Scanner Did:${RESET}`);
  console.log(`    ✓ Opened 7 tabs simultaneously`);
  console.log(`    ✓ Extracted financial data from bank`);
  console.log(`    ✓ Read shopping cart totals from 2 merchants`);
  console.log(`    ✓ Pulled bill amounts and due dates from 3 utilities`);
  console.log(`    ✓ Checked calendar for payday timing`);
  console.log(`    ✓ Cross-referenced charges against order history`);
  console.log(`    ✓ Detected 1 suspicious unmatched charge`);
  console.log(`    ✓ Analyzed affordability with timing`);
  console.log(`    ✓ Generated prioritized action plan`);
  console.log('');
  console.log(`  ${CYAN}Key Insight:${RESET}`);
  console.log(`    "You can afford everything, but pay the electric bill`);
  console.log(`     TODAY and wait until after payday for the shopping carts."`);
  console.log('');
  console.log(`  ${YELLOW}Action Required:${RESET}`);
  console.log(`    → Investigate the $149 "UNKNOWN MERCHANT XYZ" charge`);
  console.log('');
  console.log(`  ${DIM}All tabs closed. No data persisted. Session complete.${RESET}`);
  console.log('');
}

async function main() {
  await printHeader();

  await simulateTabOpening();
  await sleep(500);

  await simulateDataExtraction();
  await sleep(500);

  await printDashboard();
  await sleep(500);

  await printAnomalies();
  await sleep(500);

  await printRecommendations();

  await printSummary();
}

main().catch(console.error);
