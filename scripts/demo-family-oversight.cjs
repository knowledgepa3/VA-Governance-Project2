#!/usr/bin/env node
/**
 * FAMILY OVERSIGHT SYSTEM DEMO v1.0.0
 *
 * Demonstrates the family oversight notification capabilities
 * with mock scenarios
 */

// ANSI colors
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock family members
const mockFamilyMembers = [
  {
    id: 'FAM-001',
    name: 'Sarah (Daughter)',
    relationship: 'daughter',
    role: 'CAREGIVER',
    email: 'sarah@example.com',
    phone: '+1-555-0101',
    permissions: {
      canViewSummaries: true,
      canViewTransactionDetails: true,
      canViewEvidenceBundles: true,
      canReceiveEscalations: true,
      canApproveOnBehalf: true,
      canEmergencyStop: true
    }
  },
  {
    id: 'FAM-002',
    name: 'Mike (Son)',
    relationship: 'son',
    role: 'FAMILY_MONITOR',
    email: 'mike@example.com',
    phone: '+1-555-0102',
    permissions: {
      canViewSummaries: true,
      canViewTransactionDetails: false,
      canViewEvidenceBundles: false,
      canReceiveEscalations: true,
      canApproveOnBehalf: false,
      canEmergencyStop: false
    }
  },
  {
    id: 'FAM-003',
    name: 'Dr. Smith',
    relationship: 'physician',
    role: 'EMERGENCY_CONTACT',
    email: 'dr.smith@clinic.com',
    phone: '+1-555-0199',
    permissions: {
      canViewSummaries: false,
      canViewTransactionDetails: false,
      canViewEvidenceBundles: false,
      canReceiveEscalations: false,
      canApproveOnBehalf: false,
      canEmergencyStop: true
    }
  }
];

async function printHeader() {
  console.log('');
  console.log(`${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${MAGENTA}║${RESET}${BOLD}            FAMILY OVERSIGHT SYSTEM - DEMO                    ${RESET}${MAGENTA}║${RESET}`);
  console.log(`${MAGENTA}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${MAGENTA}║${RESET}  Privacy-first oversight for caregivers and family           ${MAGENTA}║${RESET}`);
  console.log(`${MAGENTA}║${RESET}  User controls everything • All activity logged              ${MAGENTA}║${RESET}`);
  console.log(`${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
}

async function printFamilyMembers() {
  console.log(`${BOLD}CONFIGURED FAMILY OVERSIGHT${RESET}`);
  console.log('');
  console.log(`┌────────────────────────────────────────────────────────────────┐`);

  for (const member of mockFamilyMembers) {
    const roleColors = {
      'CAREGIVER': GREEN,
      'FAMILY_MONITOR': BLUE,
      'EMERGENCY_CONTACT': RED
    };

    const color = roleColors[member.role] || RESET;
    const permissions = [];

    if (member.permissions.canViewSummaries) permissions.push('📊 Summaries');
    if (member.permissions.canViewTransactionDetails) permissions.push('💳 Details');
    if (member.permissions.canReceiveEscalations) permissions.push('⚠️ Alerts');
    if (member.permissions.canApproveOnBehalf) permissions.push('✓ Approve');
    if (member.permissions.canEmergencyStop) permissions.push('🛑 E-Stop');

    console.log(`│`);
    console.log(`│  ${BOLD}${member.name}${RESET}`);
    console.log(`│  Role: ${color}${member.role}${RESET}`);
    console.log(`│  Contact: ${member.email} | ${member.phone}`);
    console.log(`│  Permissions: ${permissions.join(' • ')}`);
  }

  console.log(`│`);
  console.log(`└────────────────────────────────────────────────────────────────┘`);
  console.log('');
}

async function printNotificationScenario(title, notifications) {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SCENARIO: ${title}${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  for (const notif of notifications) {
    await sleep(500);

    const urgencyColors = {
      'LOW': BLUE,
      'MEDIUM': YELLOW,
      'HIGH': RED,
      'CRITICAL': `${RED}${BOLD}`
    };

    const color = urgencyColors[notif.urgency] || RESET;
    const channelIcons = {
      'EMAIL': '📧',
      'SMS': '💬',
      'PUSH': '📱',
      'IN_APP': '🔔'
    };

    console.log(`${color}┌─────────────────────────────────────────────────────────────┐${RESET}`);
    console.log(`${color}│${RESET} ${BOLD}${notif.title}${RESET}`);
    console.log(`${color}│${RESET} To: ${notif.recipient} (${notif.role})`);
    console.log(`${color}│${RESET} Urgency: ${color}${notif.urgency}${RESET}`);
    console.log(`${color}│${RESET} Channels: ${notif.channels.map(c => channelIcons[c]).join(' ')}`);
    console.log(`${color}│${RESET}`);
    console.log(`${color}│${RESET} ${notif.message}`);

    if (notif.actions && notif.actions.length > 0) {
      console.log(`${color}│${RESET}`);
      console.log(`${color}│${RESET} Actions: ${notif.actions.map(a => `[${a}]`).join('  ')}`);
    }

    console.log(`${color}└─────────────────────────────────────────────────────────────┘${RESET}`);
    console.log('');
  }
}

async function demoRoutineNotifications() {
  await printNotificationScenario('Daily Summary', [
    {
      title: '📊 Daily Household Summary',
      recipient: 'Sarah (Daughter)',
      role: 'CAREGIVER',
      urgency: 'LOW',
      channels: ['EMAIL'],
      message: `Today's activity:\n  • 1 grocery order placed ($47.50 - approved)\n  • Electric bill due in 3 days ($142.50)\n  • Budget status: 65% used this month\n  • No unusual activity detected`,
      actions: ['View Details', 'Call Mom']
    },
    {
      title: '📊 Daily Household Summary',
      recipient: 'Mike (Son)',
      role: 'FAMILY_MONITOR',
      urgency: 'LOW',
      channels: ['EMAIL'],
      message: `Today's activity:\n  • 1 grocery order placed [amount hidden]\n  • 1 bill due soon\n  • Budget status: Within limits\n  • No unusual activity detected`,
      actions: []  // Mike can't take actions
    }
  ]);
}

async function demoEscalationNotifications() {
  await printNotificationScenario('Price Escalation Alert', [
    {
      title: '⚠️ Price Alert - Approval Needed',
      recipient: 'Sarah (Daughter)',
      role: 'CAREGIVER',
      urgency: 'MEDIUM',
      channels: ['PUSH', 'EMAIL'],
      message: `Orange juice price increased 17% ($6.99, was $5.99).\nMom's grocery cart is waiting for review.\n\nCart Total: $52.40`,
      actions: ['APPROVE', 'MODIFY CART', 'DENY']
    },
    {
      title: '⚠️ Price Alert Triggered',
      recipient: 'Mike (Son)',
      role: 'FAMILY_MONITOR',
      urgency: 'MEDIUM',
      channels: ['PUSH'],
      message: `A price alert was triggered for Mom's grocery order.\nSarah has been notified and can handle this.`,
      actions: []  // Mike is informed but can't act
    }
  ]);
}

async function demoCriticalNotifications() {
  await printNotificationScenario('🚨 SCAM DETECTION', [
    {
      title: '🚨 CRITICAL: Potential Scam Detected',
      recipient: 'Sarah (Daughter)',
      role: 'CAREGIVER',
      urgency: 'CRITICAL',
      channels: ['SMS', 'PUSH', 'EMAIL'],
      message: `⚠️ SYSTEM HALTED\n\nSuspicious request detected:\n  • Gift card purchase attempted\n  • Unusual recipient\n  • Urgent language in request\n\nAll operations paused. Please call Mom immediately.`,
      actions: ['CALL NOW', 'VIEW DETAILS', 'RESUME SYSTEM']
    },
    {
      title: '🚨 CRITICAL: Potential Scam Detected',
      recipient: 'Mike (Son)',
      role: 'FAMILY_MONITOR',
      urgency: 'CRITICAL',
      channels: ['SMS', 'PUSH', 'EMAIL'],
      message: `⚠️ SYSTEM HALTED\n\nSuspicious activity detected for Mom.\nSarah has been notified and has override access.\n\nPlease coordinate with Sarah.`,
      actions: []
    },
    {
      title: '🚨 EMERGENCY: Scam Alert',
      recipient: 'Dr. Smith',
      role: 'EMERGENCY_CONTACT',
      urgency: 'CRITICAL',
      channels: ['SMS'],
      message: `Your patient Eleanor may be target of a scam.\nFamily has been notified. No action needed unless contacted.`,
      actions: []
    }
  ]);
}

async function demoEmergencyStop() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SCENARIO: Family-Initiated Emergency Stop${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  console.log(`${DIM}Sarah notices something concerning and initiates emergency stop...${RESET}`);
  console.log('');
  await sleep(1000);

  console.log(`${RED}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${RED}║${RESET}${BOLD}                    🛑 EMERGENCY STOP                         ${RESET}${RED}║${RESET}`);
  console.log(`${RED}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${RED}║${RESET} Initiated by: Sarah (Caregiver)                               ${RED}║${RESET}`);
  console.log(`${RED}║${RESET} Time: ${new Date().toISOString().replace('T', ' ').slice(0, 19).padEnd(44)}${RED}║${RESET}`);
  console.log(`${RED}║${RESET} Reason: "Received strange phone call asking about Mom"       ${RED}║${RESET}`);
  console.log(`${RED}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  ${BOLD}ALL HOUSEHOLD OPERATIONS HALTED${RESET}                            ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  • Pending orders: CANCELLED                                  ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  • Scheduled payments: PAUSED                                 ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  • New transactions: BLOCKED                                  ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  Virtual card freeze recommended.                             ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}  Manual review required to resume.                            ${RED}║${RESET}`);
  console.log(`${RED}║${RESET}                                                               ${RED}║${RESET}`);
  console.log(`${RED}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');

  await sleep(500);

  console.log(`${CYAN}Activity logged and visible to primary user (Mom):${RESET}`);
  console.log(`${DIM}┌────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`${DIM}│ [${new Date().toISOString().slice(0, 19)}] Sarah (Caregiver) - EMERGENCY_STOP_INITIATED ${RESET}`);
  console.log(`${DIM}│ Reason: "Received strange phone call asking about Mom"    ${RESET}`);
  console.log(`${DIM}└────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');
}

async function demoConsentFlow() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}CONSENT FLOW: Adding a New Caregiver${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  console.log(`${CYAN}┌────────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`${CYAN}│${RESET} ${BOLD}CAREGIVER OVERSIGHT CONSENT${RESET}                                   ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                                                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} I consent to have ${BOLD}Sarah${RESET} added as a Caregiver on my            ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} Household Operations account.                                  ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                                                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} I understand that as a Caregiver, they will be able to:       ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${GREEN}✓${RESET} View all summary reports and transaction details         ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${GREEN}✓${RESET} Receive all alerts and escalations                       ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${GREEN}✓${RESET} Approve transactions on my behalf (if I enable this)     ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${GREEN}✓${RESET} Activate emergency stop (if I enable this)               ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                                                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} I understand they will NOT be able to:                        ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${RED}✗${RESET} See my payment method details (card numbers, etc.)        ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${RED}✗${RESET} See my full address (only city/state visible)             ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${RED}✗${RESET} Change my account settings                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}   ${RED}✗${RESET} Add or remove other family members                        ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                                                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} I can revoke this access at any time through the app.         ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET} All caregiver activity is logged and I can review it anytime. ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                                                                ${CYAN}│${RESET}`);
  console.log(`${CYAN}│${RESET}                     ${GREEN}[ I CONSENT ]${RESET}    ${DIM}[ CANCEL ]${RESET}              ${CYAN}│${RESET}`);
  console.log(`${CYAN}└────────────────────────────────────────────────────────────────┘${RESET}`);
  console.log('');
}

async function demoPrivacyProtections() {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}PRIVACY PROTECTIONS: Content Filtering by Permission${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');

  console.log(`${BOLD}Same notification, different visibility:${RESET}`);
  console.log('');

  // Caregiver view
  console.log(`${GREEN}Sarah (Caregiver) sees:${RESET}`);
  console.log(`┌────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🛒 Grocery Order Placed                                    │`);
  console.log(`│                                                            │`);
  console.log(`│ Order from Instacart: $52.40                               │`);
  console.log(`│ Items: Milk, bread, eggs, chicken, produce                 │`);
  console.log(`│ Delivery: Tomorrow 10am-12pm                               │`);
  console.log(`│                                                            │`);
  console.log(`│ [View Receipt]  [View Evidence Bundle]                     │`);
  console.log(`└────────────────────────────────────────────────────────────┘`);
  console.log('');

  // Monitor view
  console.log(`${BLUE}Mike (Family Monitor) sees:${RESET}`);
  console.log(`┌────────────────────────────────────────────────────────────┐`);
  console.log(`│ 🛒 Grocery Order Placed                                    │`);
  console.log(`│                                                            │`);
  console.log(`│ Order from [merchant hidden]: [amount hidden]              │`);
  console.log(`│ Status: Approved and placed                                │`);
  console.log(`│ Delivery: Tomorrow                                         │`);
  console.log(`│                                                            │`);
  console.log(`│ ${DIM}[Details not available with your access level]${RESET}           │`);
  console.log(`└────────────────────────────────────────────────────────────┘`);
  console.log('');

  // Emergency contact view
  console.log(`${RED}Dr. Smith (Emergency Contact) sees:${RESET}`);
  console.log(`┌────────────────────────────────────────────────────────────┐`);
  console.log(`│ ${DIM}[Routine activity - not shown to emergency contacts]${RESET}       │`);
  console.log(`└────────────────────────────────────────────────────────────┘`);
  console.log('');
}

async function main() {
  await printHeader();
  await printFamilyMembers();

  await demoRoutineNotifications();
  await sleep(1000);

  await demoEscalationNotifications();
  await sleep(1000);

  await demoCriticalNotifications();
  await sleep(1000);

  await demoEmergencyStop();
  await sleep(1000);

  await demoConsentFlow();
  await sleep(500);

  await demoPrivacyProtections();

  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}                    DEMO COMPLETE                               ${RESET}`);
  console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');
  console.log(`  ${BOLD}Key Features Demonstrated:${RESET}`);
  console.log(`    ✓ Role-based permissions (Caregiver, Monitor, Emergency)`);
  console.log(`    ✓ Notification filtering by access level`);
  console.log(`    ✓ Privacy protections (amounts, merchants filtered)`);
  console.log(`    ✓ Emergency stop by authorized family members`);
  console.log(`    ✓ Consent flow with clear permissions`);
  console.log(`    ✓ Activity logging visible to primary user`);
  console.log('');
  console.log(`  ${CYAN}Philosophy:${RESET}`);
  console.log(`    "Family oversight without family intrusion."`);
  console.log(`    The user controls everything. Family helps, but never owns.`);
  console.log('');
}

main().catch(console.error);
