/**
 * Authentication Gate Demo
 *
 * Demonstrates the audit-proof authentication gate:
 * - 2-of-3 signal verification (tightened validation)
 * - Two-key approval (Human + System)
 * - Pack hash drift detection
 * - SESSION_BINDING
 * - Stable JSON hashing
 * - TIMEOUT as security-relevant event
 */

import {
  AuthenticationGateManager,
  AUTHENTICATION_GATE_SPEC,
  AUDITOR_QA,
  KNOWN_AUTH_DOMAINS,
  LOGIN_PATH_PATTERNS,
  DEFAULT_PROBE_ENDPOINTS
} from './AuthenticationGate';

async function runAuthGateDemo() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     █████╗ ██╗   ██╗████████╗██╗  ██╗     ██████╗  █████╗ ████████╗███████╗  ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║  ██║    ██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝  ║
║    ███████║██║   ██║   ██║   ███████║    ██║  ███╗███████║   ██║   █████╗    ║
║    ██╔══██║██║   ██║   ██║   ██╔══██║    ██║   ██║██╔══██║   ██║   ██╔══╝    ║
║    ██║  ██║╚██████╔╝   ██║   ██║  ██║    ╚██████╔╝██║  ██║   ██║   ███████╗  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝  ║
║                                                                              ║
║           Audit-Proof Authentication Gate Demo                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const gateManager = new AuthenticationGateManager();

  // ============================================================================
  // SPECIFICATION
  // ============================================================================

  console.log('═'.repeat(80));
  console.log('AUTHENTICATION GATE SPECIFICATION');
  console.log('═'.repeat(80));

  console.log(`
Classification: ${AUTHENTICATION_GATE_SPEC.classification}
Action: ${AUTHENTICATION_GATE_SPEC.action}
Control Objective: ${AUTHENTICATION_GATE_SPEC.controlObjective}

SIGNAL SOURCES (for implementers):
  - Domain Redirect: ${AUTHENTICATION_GATE_SPEC.signalSources.domainRedirect}
  - Post-Login UI:   ${AUTHENTICATION_GATE_SPEC.signalSources.postLoginElement}
  - Auth Request:    ${AUTHENTICATION_GATE_SPEC.signalSources.authenticatedRequest}

HUMAN ACTOR IDENTITY:
  - Demo mode:    ${AUTHENTICATION_GATE_SPEC.humanActorIdentity.demoMode}
  - Production:   ${AUTHENTICATION_GATE_SPEC.humanActorIdentity.production}

AUTH_COMPLETE SIGNALS (${AUTHENTICATION_GATE_SPEC.authCompleteSignals.threshold}):
`);

  AUTHENTICATION_GATE_SPEC.authCompleteSignals.signals.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.validation}`);
  });

  console.log(`
TWO-KEY APPROVAL:
  Key A (Human):  ${AUTHENTICATION_GATE_SPEC.twoKeyApproval.keyA}
  Key B (System): ${AUTHENTICATION_GATE_SPEC.twoKeyApproval.keyB}
  Logic:          ${AUTHENTICATION_GATE_SPEC.twoKeyApproval.logic}

PACK HASH DRIFT: ${AUTHENTICATION_GATE_SPEC.packHashDrift}

TIMEOUT: ${AUTHENTICATION_GATE_SPEC.timeout.default}
         Configurable: ${AUTHENTICATION_GATE_SPEC.timeout.configurable}
         Security-relevant: ${AUTHENTICATION_GATE_SPEC.timeout.securityRelevant}
`);

  // ============================================================================
  // DEMO: PACK HASH DRIFT
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('DEMO: Pack Hash Change Auto-Invalidation');
  console.log('═'.repeat(80) + '\n');

  const gate1 = gateManager.createGate(
    'ws-sam-gov', 'BD-SAM', 'agent-bd-1', 'login.gov', 'sam.gov',
    {
      packId: 'federal-bd-v1',
      packVersion: '1.0.0',
      packHash: 'abc123def456',
      allowedDomains: ['sam.gov'],
      approvedProbeEndpoints: DEFAULT_PROBE_ENDPOINTS,
      approvedUISelectors: ['[data-testid="user-avatar"]', 'a[href*="logout"]']
    }
  );

  console.log(`  Gate created with pack_hash: ${gate1.packContext.packHashAtCreation}`);
  console.log(`  Status: ${gate1.status}`);

  console.log(`\n  [Simulating pack configuration change...]`);
  const wasInvalidated = gateManager.checkPackHashChange(gate1.id, 'xyz789changed');

  console.log(`  Pack hash change detected: ${wasInvalidated}`);
  console.log(`  Result: INVALIDATED_PACK_CHANGE`);
  console.log(`  Action: Re-initiate authentication with current pack`);

  // ============================================================================
  // DEMO: FULL APPROVAL FLOW
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('DEMO: Full Two-Key Approval Flow');
  console.log('═'.repeat(80) + '\n');

  const gate2 = gateManager.createGate(
    'ws-sam-gov', 'BD-SAM', 'agent-bd-2', 'login.gov', 'sam.gov',
    {
      packId: 'federal-bd-v1',
      packVersion: '1.0.0',
      packHash: 'stable-hash-123',
      allowedDomains: ['sam.gov'],
      approvedProbeEndpoints: DEFAULT_PROBE_ENDPOINTS,
      approvedUISelectors: ['[data-testid="user-avatar"]', 'a[href*="logout"]']
    }
  );

  console.log('Step 1: Gate created');
  console.log(`  ID: ${gate2.id}`);
  console.log(`  Status: ${gate2.status}`);
  console.log(`  Key A (Human): PENDING`);
  console.log(`  Key B (System): 0/${gate2.keyB.signalThreshold} signals`);

  // Signal 1: Domain redirect
  console.log('\nStep 2: System detects domain redirect');
  gateManager.updateSystemSignals(gate2.id, {
    domainRedirect: {
      fromDomain: 'login.gov',
      toDomain: 'sam.gov',
      toPath: '/dashboard'
    }
  });

  let currentGate = gateManager.getGate(gate2.id)!;
  console.log(`  Signal: login.gov → sam.gov/dashboard`);
  console.log(`  Validation:`);
  console.log(`    hostInAllowedScope: ${currentGate.keyB.signals.domainRedirect.hostInAllowedScope}`);
  console.log(`    hostNotInLoginDomains: ${currentGate.keyB.signals.domainRedirect.hostNotInLoginDomains}`);
  console.log(`    pathNotLoginPattern: ${currentGate.keyB.signals.domainRedirect.pathNotLoginPattern}`);
  console.log(`  isValidRedirect: ${currentGate.keyB.signals.domainRedirect.isValidRedirect}`);
  console.log(`  Status: ${currentGate.keyB.signalCount}/${currentGate.keyB.signalThreshold} signals`);

  // Signal 2: Post-login UI element
  console.log('\nStep 3: System detects post-login UI element');
  gateManager.updateSystemSignals(gate2.id, {
    postLoginElement: {
      elementType: 'AVATAR',
      selector: '[data-testid="user-avatar"]',
      elementText: 'JS'
    }
  });

  currentGate = gateManager.getGate(gate2.id)!;
  console.log(`  Signal: [data-testid="user-avatar"] found`);
  console.log(`  selectorFromApprovedList: ${currentGate.keyB.signals.postLoginElement.selectorFromApprovedList}`);
  console.log(`  Status: ${currentGate.keyB.signalCount}/${currentGate.keyB.signalThreshold} signals → KEY_B APPROVED`);
  console.log(`  Gate status: ${currentGate.status}`);

  // Human approval
  console.log('\nStep 4: Human confirms login completion');
  const approvalResult = gateManager.approveKeyA(gate2.id, {
    operatorId: 'operator-jsmith',
    localUsername: 'jsmith',
    chromeProfileId: 'Profile-1'
  });

  if (approvalResult.gate) {
    currentGate = approvalResult.gate;
    console.log(`  Operator: operator-jsmith`);
    console.log(`  Method: GOVERNANCE_CONSOLE`);
    console.log(`  Gate status: ${currentGate.status}`);

    if (currentGate.sessionBinding) {
      console.log(`\n  SESSION BINDING created:`);
      console.log(`    id: ${currentGate.sessionBinding.id}`);
      console.log(`    humanActor.operatorId: ${currentGate.sessionBinding.humanActor.operatorId}`);
      console.log(`    sessionEstablishedVia: ${currentGate.sessionBinding.sessionEstablishedVia}`);
      console.log(`    linkedAuthGateId: ${currentGate.sessionBinding.linkedAuthGateId}`);
    }
  }

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('AUDIT LOG');
  console.log('═'.repeat(80) + '\n');

  const auditLog = gateManager.getAuditLog();

  auditLog.forEach((entry, i) => {
    const securityFlag = entry.securityRelevant ? ' ⚠️ SECURITY-RELEVANT' : '';
    console.log(`Entry ${i + 1}: ${entry.eventSubtype}${securityFlag}`);
    console.log('─'.repeat(70));
    console.log(`  packHash: ${entry.packHash}`);
    console.log(`  packHashMismatch: ${entry.packHashMismatch}`);
    console.log(`  workstationId: ${entry.workstationId}`);
    console.log(`  humanActor: ${entry.humanActor.operatorId || entry.humanActor.localUsername || 'N/A'}`);
    console.log(`  signalCount: ${entry.systemSignals.signalCount}/${entry.systemSignals.threshold}`);
    console.log(`  sessionBinding: ${entry.sessionBinding?.established ? entry.sessionBinding.bindingId : 'N/A'}`);
    console.log(`  hash: ${entry.hash.substring(0, 40)}...`);
    console.log('');
  });

  // ============================================================================
  // AUDITOR Q&A
  // ============================================================================

  console.log('═'.repeat(80));
  console.log('AUDITOR Q&A');
  console.log('═'.repeat(80) + '\n');

  Object.entries(AUDITOR_QA).forEach(([key, qa]) => {
    console.log(`${key}: ${qa.question}`);
    console.log('─'.repeat(70));
    console.log(`${qa.answer}\n`);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT MAKES THIS AUDIT-PROOF:                                               │
│                                                                             │
│  1. SIGNAL VALIDATION                                                       │
│     - Domain redirect: host ∈ allowed AND ∉ login_domains AND path ∉ login  │
│     - Post-login UI: selector from pack-approved list                       │
│     - Auth request: pre-approved read-only probe, status code only          │
│                                                                             │
│  2. TWO-KEY SEPARATION                                                      │
│     - Key A (Human): "I completed login" in Governance Console              │
│     - Key B (System): 2-of-3 validated signals                              │
│     - Both required → no single point of bypass                             │
│                                                                             │
│  3. PACK HASH DRIFT                                                         │
│     - pack_hash changes → gate auto-invalidates                             │
│     - Proves config drift is controlled                                     │
│                                                                             │
│  4. STABLE HASHING                                                          │
│     - Deterministic JSON serialization (sorted keys)                        │
│     - Hash chain for tamper-evident integrity                               │
│                                                                             │
│  5. SESSION BINDING                                                         │
│     - Links session to human identity                                       │
│     - Records establishment signals                                         │
│     - Supports audit narrative                                              │
│                                                                             │
│  6. SECURITY-RELEVANT EVENTS                                                │
│     - TIMEOUT, DENIED, INVALIDATED flagged for review                       │
│     - Pack-configurable timeout with safe default                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`);
}

// Run demo
runAuthGateDemo().catch(console.error);
