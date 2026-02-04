#!/usr/bin/env node
/**
 * HOUSEHOLD OPERATIONS DEMO v1.0.0
 *
 * Demonstrates the Household Operations Assistant workflow
 * with mock data and approval flow
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI colors
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

// Mock data
const mockBills = [
  { name: 'Electric', provider: 'Power Co', amount: 142.50, due: '2026-02-05', status: 'DUE_SOON' },
  { name: 'Internet', provider: 'Fiber Net', amount: 79.99, due: '2026-02-10', status: 'PENDING' },
  { name: 'Water', provider: 'City Water', amount: 45.20, due: '2026-02-15', status: 'PENDING' },
  { name: 'Phone', provider: 'Mobile Plus', amount: 85.00, due: '2026-02-08', status: 'DUE_SOON' }
];

const mockGroceryCart = [
  { item: 'Milk (1 gal)', price: 4.99, usual_price: 4.49, change: '+11%' },
  { item: 'Bread (whole wheat)', price: 3.99, usual_price: 3.99, change: '0%' },
  { item: 'Eggs (dozen)', price: 5.29, usual_price: 4.79, change: '+10%' },
  { item: 'Bananas (bunch)', price: 1.99, usual_price: 1.89, change: '+5%' },
  { item: 'Chicken breast (2lb)', price: 12.99, usual_price: 11.99, change: '+8%' },
  { item: 'Rice (5lb bag)', price: 8.49, usual_price: 7.99, change: '+6%' },
  { item: 'Cereal', price: 4.49, usual_price: 4.49, change: '0%' },
  { item: 'Orange juice', price: 6.99, usual_price: 5.99, change: '+17%' }
];

const mockSubscriptions = [
  { name: 'Netflix', amount: 15.99, renewal: '2026-02-18', status: 'ACTIVE' },
  { name: 'Spotify', amount: 10.99, renewal: '2026-02-22', status: 'ACTIVE' },
  { name: 'NYT Digital', amount: 17.00, renewal: '2026-02-12', status: 'ACTIVE' },
  { name: 'Cloud Storage', amount: 2.99, renewal: '2026-02-28', status: 'ACTIVE' },
  { name: 'Gym Membership', amount: 49.99, renewal: '2026-03-01', status: 'LAST_USED_60_DAYS_AGO' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function printHeader() {
  console.log('');
  console.log(`${CYAN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}${BOLD}          HOUSEHOLD OPERATIONS ASSISTANT - DEMO               ${RESET}${CYAN}║${RESET}`);
  console.log(`${CYAN}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║${RESET}  Pack: HouseholdOperationsAssistant v1.0.0                    ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  Trust Level: 1 (Full Supervision)                           ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  All financial actions require approval                      ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
}

async function printMAILegend() {
  console.log(`${DIM}┌─ MAI Authority Levels ─────────────────────────────────────────┐${RESET}`);
  console.log(`${DIM}│${RESET} ${GREEN}● INFORMATIONAL${RESET} - Runs automatically, read-only              ${DIM}│${RESET}`);
  console.log(`${DIM}│${RESET} ${YELLOW}● ADVISORY${RESET} - Prepares for review, presents options          ${DIM}│${RESET}`);
  console.log(`${DIM}│${RESET} ${RED}● MANDATORY${RESET} - ALWAYS requires explicit approval             ${DIM}│${RESET}`);
  console.log(`${DIM}└────────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');
}

async function runInfoAction(action, description, duration = 500) {
  process.stdout.write(`  ${GREEN}●${RESET} [INFORMATIONAL] ${action}... `);
  await sleep(duration);
  console.log(`${GREEN}✓${RESET}`);
  console.log(`    ${DIM}${description}${RESET}`);
}

async function runAdvisoryAction(action, description, data) {
  console.log(`  ${YELLOW}●${RESET} [ADVISORY] ${action}`);
  console.log(`    ${DIM}${description}${RESET}`);
  console.log(`    ${YELLOW}→ Presenting for review...${RESET}`);
  return data;
}

async function runMandatoryAction(action, description, requiresApproval = true) {
  console.log(`  ${RED}●${RESET} [MANDATORY] ${action}`);
  console.log(`    ${DIM}${description}${RESET}`);
  if (requiresApproval) {
    console.log(`    ${RED}⏸  STOPPED - Awaiting human approval${RESET}`);
  }
  return { stopped: true, awaiting_approval: true };
}

async function printBillsSummary(bills) {
  console.log('');
  console.log(`  ${BOLD}📋 BILLS DUE THIS WEEK${RESET}`);
  console.log(`  ┌─────────────────────────────────────────────────────────┐`);

  let total = 0;
  for (const bill of bills) {
    const status = bill.status === 'DUE_SOON' ? `${RED}DUE SOON${RESET}` : `${DIM}${bill.status}${RESET}`;
    console.log(`  │ ${bill.name.padEnd(12)} ${bill.provider.padEnd(12)} $${bill.amount.toFixed(2).padStart(7)} ${bill.due} ${status}`);
    total += bill.amount;
  }

  console.log(`  ├─────────────────────────────────────────────────────────┤`);
  console.log(`  │ ${BOLD}TOTAL DUE:${RESET}                          $${total.toFixed(2).padStart(7)}         │`);
  console.log(`  └─────────────────────────────────────────────────────────┘`);
}

async function printGroceryCart(cart) {
  console.log('');
  console.log(`  ${BOLD}🛒 DRAFT GROCERY CART${RESET}`);
  console.log(`  ┌─────────────────────────────────────────────────────────┐`);

  let total = 0;
  let alerts = [];

  for (const item of cart) {
    const priceChange = parseFloat(item.change);
    let changeIndicator = '';

    if (priceChange > 10) {
      changeIndicator = `${RED}↑${item.change}${RESET}`;
      alerts.push({ item: item.item, change: item.change });
    } else if (priceChange > 0) {
      changeIndicator = `${YELLOW}↑${item.change}${RESET}`;
    } else {
      changeIndicator = `${GREEN}${item.change}${RESET}`;
    }

    console.log(`  │ ${item.item.padEnd(24)} $${item.price.toFixed(2).padStart(6)} ${changeIndicator.padEnd(20)}`);
    total += item.price;
  }

  console.log(`  ├─────────────────────────────────────────────────────────┤`);
  console.log(`  │ ${BOLD}CART TOTAL:${RESET}                         $${total.toFixed(2).padStart(7)}        │`);
  console.log(`  └─────────────────────────────────────────────────────────┘`);

  if (alerts.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}⚠️  PRICE ALERTS (>10% increase):${RESET}`);
    for (const alert of alerts) {
      console.log(`     • ${alert.item}: ${alert.change} above baseline`);
    }
  }

  return { total, alerts };
}

async function printSubscriptions(subs) {
  console.log('');
  console.log(`  ${BOLD}📺 ACTIVE SUBSCRIPTIONS${RESET}`);
  console.log(`  ┌─────────────────────────────────────────────────────────┐`);

  let total = 0;
  let flags = [];

  for (const sub of subs) {
    let statusIndicator = '';

    if (sub.status === 'LAST_USED_60_DAYS_AGO') {
      statusIndicator = `${RED}⚠ Unused 60+ days${RESET}`;
      flags.push(sub);
    } else {
      statusIndicator = `${GREEN}Active${RESET}`;
    }

    console.log(`  │ ${sub.name.padEnd(15)} $${sub.amount.toFixed(2).padStart(6)}/mo  Renews: ${sub.renewal}  ${statusIndicator}`);
    total += sub.amount;
  }

  console.log(`  ├─────────────────────────────────────────────────────────┤`);
  console.log(`  │ ${BOLD}MONTHLY TOTAL:${RESET}                      $${total.toFixed(2).padStart(7)}/mo     │`);
  console.log(`  └─────────────────────────────────────────────────────────┘`);

  if (flags.length > 0) {
    console.log('');
    console.log(`  ${YELLOW}💡 RECOMMENDATION:${RESET}`);
    for (const sub of flags) {
      console.log(`     Consider cancelling ${sub.name} ($${sub.amount.toFixed(2)}/mo) - not used in 60+ days`);
    }
  }

  return { total, flags };
}

async function printEscalation(triggerId, message, severity) {
  const severityColors = {
    LOW: BLUE,
    MEDIUM: YELLOW,
    HIGH: RED,
    CRITICAL: `${RED}${BOLD}`
  };

  const color = severityColors[severity] || YELLOW;

  console.log('');
  console.log(`  ${color}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`  ${color}║${RESET} ${BOLD}ESCALATION TRIGGERED${RESET}                                        ${color}║${RESET}`);
  console.log(`  ${color}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`  ${color}║${RESET} ID: ${triggerId}                                                  ${color}║${RESET}`);
  console.log(`  ${color}║${RESET} Severity: ${severity}                                              ${color}║${RESET}`);
  console.log(`  ${color}║${RESET} Message: ${message.substring(0, 50)}    ${color}║${RESET}`);
  console.log(`  ${color}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
}

async function printApprovalRequest(action, amount, details) {
  console.log('');
  console.log(`  ${RED}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`  ${RED}║${RESET} ${BOLD}⏹  APPROVAL REQUIRED${RESET}                                         ${RED}║${RESET}`);
  console.log(`  ${RED}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`  ${RED}║${RESET} Action: ${action.padEnd(53)}${RED}║${RESET}`);
  console.log(`  ${RED}║${RESET} Amount: $${amount.toFixed(2).padEnd(52)}${RED}║${RESET}`);
  console.log(`  ${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`  ${RED}║${RESET} ${details.padEnd(61)}${RED}║${RESET}`);
  console.log(`  ${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`  ${RED}║${RESET}   ${GREEN}[APPROVE]${RESET}     ${RED}[DENY]${RESET}     ${YELLOW}[MODIFY]${RESET}                        ${RED}║${RESET}`);
  console.log(`  ${RED}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
  console.log(`  ${DIM}In production, you would tap/click to approve or deny.${RESET}`);
  console.log(`  ${DIM}For this demo, simulating APPROVED after 2 seconds...${RESET}`);

  await sleep(2000);

  console.log('');
  console.log(`  ${GREEN}✓ USER APPROVED${RESET} - Proceeding with action`);
}

async function printEvidenceBundle(bundleId, artifacts) {
  console.log('');
  console.log(`  ${CYAN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`  ${CYAN}║${RESET} ${BOLD}📦 EVIDENCE BUNDLE CREATED${RESET}                                   ${CYAN}║${RESET}`);
  console.log(`  ${CYAN}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`  ${CYAN}║${RESET} Bundle ID: ${bundleId.padEnd(50)}${CYAN}║${RESET}`);
  console.log(`  ${CYAN}║${RESET} Status: SEALED                                                ${CYAN}║${RESET}`);
  console.log(`  ${CYAN}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`  ${CYAN}║${RESET} Artifacts:                                                    ${CYAN}║${RESET}`);

  for (const artifact of artifacts) {
    console.log(`  ${CYAN}║${RESET}   • ${artifact.padEnd(56)}${CYAN}║${RESET}`);
  }

  const hash = crypto.createHash('sha256').update(bundleId + Date.now()).digest('hex').substring(0, 32);
  console.log(`  ${CYAN}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`  ${CYAN}║${RESET} Seal: ${hash}...           ${CYAN}║${RESET}`);
  console.log(`  ${CYAN}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
}

async function main() {
  await printHeader();
  await printMAILegend();

  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}                    WEEKLY HOUSEHOLD CHECK                      ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Phase 1: Informational Actions (run automatically)
  console.log(`${BOLD}PHASE 1: INFORMATION GATHERING${RESET} (automatic)`);
  console.log('');

  await runInfoAction('read_bills', 'Checking bill portals for due dates and amounts');
  await sleep(300);
  await runInfoAction('read_subscription_status', 'Reviewing active subscriptions');
  await sleep(300);
  await runInfoAction('check_prices', 'Monitoring prices for regular grocery items');
  await sleep(300);
  await runInfoAction('summarize_spending', 'Calculating week-to-date spending');

  // Show bills summary
  await printBillsSummary(mockBills);

  console.log('');
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}PHASE 2: ADVISORY ACTIONS${RESET} (present for review)`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Phase 2: Advisory Actions (present for review)
  await runAdvisoryAction(
    'draft_grocery_cart',
    'Preparing cart based on your usual items and current needs',
    mockGroceryCart
  );

  const cartResult = await printGroceryCart(mockGroceryCart);

  // Price escalation
  if (cartResult.alerts.length > 0) {
    await printEscalation(
      'ESC-HH-001',
      'Multiple items with >10% price increase',
      'MEDIUM'
    );

    await runAdvisoryAction(
      'suggest_item_substitution',
      'Looking for alternatives to high-priced items',
      null
    );

    console.log('');
    console.log(`  ${YELLOW}💡 SUGGESTED SUBSTITUTIONS:${RESET}`);
    console.log(`     • Orange juice ($6.99): Try store brand ($4.49) - saves $2.50`);
    console.log(`     • Milk ($4.99): Available at Costco ($3.99/gal)`);
  }

  // Subscriptions review
  console.log('');
  await runAdvisoryAction(
    'recommend_subscription_changes',
    'Reviewing subscription usage patterns',
    mockSubscriptions
  );

  await printSubscriptions(mockSubscriptions);

  console.log('');
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}PHASE 3: MANDATORY ACTIONS${RESET} (require approval)`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  // Phase 3: Mandatory Action
  await runMandatoryAction(
    'place_order',
    'Ready to place grocery order',
    true
  );

  await printApprovalRequest(
    'Place Grocery Order',
    cartResult.total,
    'Instacart delivery to 123 Main St - Tomorrow 10am-12pm'
  );

  // Evidence bundle
  const bundleId = `BUNDLE-HH-${Date.now()}`;
  await printEvidenceBundle(bundleId, [
    'cart_contents.json',
    'price_comparison.json',
    'screenshot_checkout.png',
    'approval_log.json',
    'seal.hash'
  ]);

  console.log('');
  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}                    ✓ WEEKLY CHECK COMPLETE                     ${RESET}`);
  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');
  console.log(`  ${DIM}Summary:${RESET}`);
  console.log(`    • Bills tracked: 4 ($352.69 total due this week)`);
  console.log(`    • Grocery order: $49.22 (approved and placed)`);
  console.log(`    • Price alerts: 2 items above threshold`);
  console.log(`    • Subscription flag: 1 unused service identified`);
  console.log(`    • Evidence bundle: SEALED`);
  console.log('');
  console.log(`  ${CYAN}Trust Level: 1 (Full Supervision)${RESET}`);
  console.log(`  ${DIM}Progress: 1/10 successful runs to unlock Routine Groceries${RESET}`);
  console.log('');
}

main().catch(console.error);
