/**
 * Enterprise Governance Demo
 *
 * Demonstrates all four enterprise-grade capabilities:
 * 1. Pack Attestation
 * 2. Two-Key HITL Gates
 * 3. Domain Drift Enforcement
 * 4. Evidence Pack Export
 */

import {
  PackAttestationManager,
  HITLGateManager,
  DomainDriftMonitor,
  EvidencePackExporter,
  GovernanceConsole,
  AttestedInstructionPack,
  TwoKeyHITLGate
} from './EnterpriseGovernance';

// ============================================================================
// DEMO
// ============================================================================

async function runEnterpriseDemo() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗   ║
║    ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝   ║
║    █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝██║███████╗   ║
║    ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██║╚════██║   ║
║    ███████╗██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║██║███████║   ║
║    ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝   ║
║                                                                              ║
║     ██████╗  ██████╗ ██╗   ██╗███████╗██████╗ ███╗   ██╗ █████╗ ███╗   ██╗  ║
║    ██╔════╝ ██╔═══██╗██║   ██║██╔════╝██╔══██╗████╗  ██║██╔══██╗████╗  ██║  ║
║    ██║  ███╗██║   ██║██║   ██║█████╗  ██████╔╝██╔██╗ ██║███████║██╔██╗ ██║  ║
║    ██║   ██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██║╚██╗██║██╔══██║██║╚██╗██║  ║
║    ╚██████╔╝╚██████╔╝ ╚████╔╝ ███████╗██║  ██║██║ ╚████║██║  ██║██║ ╚████║  ║
║     ╚═════╝  ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝  ║
║                                                                              ║
║               Chrome Agent Workforce - Enterprise Demo                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // ============================================================================
  // 1. PACK ATTESTATION DEMO
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('1. PACK ATTESTATION');
  console.log('═'.repeat(80) + '\n');

  const packManager = new PackAttestationManager();

  // Create a pack without attestation
  const packWithoutAttestation = {
    id: 'federal-bd-v1',
    name: 'Federal BD Research Pack',
    version: '1.0.0',
    description: 'Governed browser automation for federal BD research',
    allowedDomains: ['sam.gov', 'beta.sam.gov', 'usaspending.gov'],
    blockedDomains: ['login.gov', '*.bank.com'],
    policies: [
      {
        id: 'no-auth',
        name: 'No Authentication Automation',
        classification: 'MANDATORY' as const,
        action: 'BLOCK' as const,
        appliesTo: ['login', 'password', 'signin'],
        description: 'Authentication must be performed by human'
      },
      {
        id: 'no-submit',
        name: 'No Auto Form Submission',
        classification: 'MANDATORY' as const,
        action: 'REQUIRE_APPROVAL' as const,
        appliesTo: ['submit', 'send', 'apply'],
        description: 'Form submissions require HITL approval'
      }
    ],
    hitlRequirements: [
      {
        id: 'hitl-submit',
        description: 'Approval required for form submission',
        trigger: { beforeSubmit: true },
        gateType: 'TWO_KEY' as const
      }
    ],
    metadata: {
      task: 'Search for federal contract opportunities'
    }
  };

  // Create attestation
  console.log('Creating pack attestation...\n');

  const attestation = packManager.attestPack(
    packWithoutAttestation,
    {
      name: 'John Smith',
      role: 'ISSO',
      organizationId: 'ACME-001'
    },
    365
  );

  console.log('ATTESTATION CREATED:');
  console.log('─'.repeat(60));
  console.log(`  Pack ID:      ${attestation.packId}`);
  console.log(`  Version:      ${attestation.version}`);
  console.log(`  SHA-256:      ${attestation.sha256.substring(0, 32)}...`);
  console.log(`  Approved By:  ${attestation.approvedBy} (${attestation.approverRole})`);
  console.log(`  Approved At:  ${attestation.approvedAt.toISOString()}`);
  console.log(`  Expires At:   ${attestation.expiresAt.toISOString()}`);
  console.log(`  Org ID:       ${attestation.organizationId}`);
  console.log('─'.repeat(60));

  // Create attested pack
  const attestedPack: AttestedInstructionPack = {
    ...packWithoutAttestation,
    attestation
  };

  // Verify attestation
  console.log('\nVerifying attestation...\n');
  const verification = packManager.verifyAttestation(attestedPack);

  console.log('VERIFICATION RESULT:');
  console.log('─'.repeat(60));
  console.log(`  Valid:    ${verification.valid ? '✓ YES' : '✗ NO'}`);
  if (verification.errors.length > 0) {
    console.log(`  Errors:   ${verification.errors.join(', ')}`);
  }
  if (verification.warnings.length > 0) {
    console.log(`  Warnings: ${verification.warnings.join(', ')}`);
  }
  console.log('─'.repeat(60));

  // Generate attestation statement
  const statement = packManager.generateAttestationStatement(attestedPack);
  console.log('\nATTESTATION STATEMENT (for audit logs):');
  console.log('─'.repeat(60));
  console.log(`  "${statement}"`);
  console.log('─'.repeat(60));

  // ============================================================================
  // 2. TWO-KEY HITL GATES DEMO
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('2. TWO-KEY HITL GATES');
  console.log('═'.repeat(80) + '\n');

  const gateManager = new HITLGateManager();

  // Create a two-key gate
  console.log('Creating TWO-KEY HITL gate for form submission...\n');

  const gate = gateManager.createGate(
    'ws-sam-gov',
    'agent-bd-1',
    'SUBMISSION',
    {
      tool: 'computer',
      description: 'Click "Submit Application" button on SAM.gov',
      targetUrl: 'https://sam.gov/opportunity/123456/apply',
      riskLevel: 'HIGH'
    },
    true // requireTwoKey
  );

  console.log('GATE CREATED:');
  console.log('─'.repeat(60));
  console.log(`  Gate ID:      ${gate.id}`);
  console.log(`  Type:         ${gate.gateType}`);
  console.log(`  Status:       ${gate.status}`);
  console.log(`  Action:       ${gate.action.description}`);
  console.log(`  Risk Level:   ${gate.action.riskLevel}`);
  console.log(`  Key 1 (Claude):    Required=${gate.key1.required}, Approved=${gate.key1.approved}`);
  console.log(`  Key 2 (Console):   Required=${gate.key2.required}, Approved=${gate.key2.approved}`);
  console.log(`  Expires At:   ${gate.expiresAt.toISOString()}`);
  console.log('─'.repeat(60));

  // Simulate Key 1 approval (Claude sidepanel)
  console.log('\nSimulating KEY 1 approval (Claude sidepanel)...');
  console.log('  User says: "Yes, submit the application"');
  gateManager.approveKey1(gate.id, 'Yes, submit the application');

  console.log(`  Status: ${gate.status}`);
  console.log(`  Key 1: Approved=${gate.key1.approved}`);

  // Simulate Key 2 approval (Governance Console)
  console.log('\nSimulating KEY 2 approval (Governance Console)...');
  console.log('  Operator clicks "Approve" button');
  gateManager.approveKey2(gate.id, 'operator-001', 'Verified submission is appropriate');

  console.log(`  Status: ${gate.status}`);
  console.log(`  Key 2: Approved=${gate.key2.approved}, ApprovedBy=${gate.key2.approverId}`);

  // Check if fully approved
  const isApproved = gateManager.isApproved(gate.id);
  console.log('\nGATE FINAL STATUS:');
  console.log('─'.repeat(60));
  console.log(`  Fully Approved: ${isApproved ? '✓ YES - Agent may proceed' : '✗ NO - Agent blocked'}`);
  console.log(`  Key 1 (Claude):  ${gate.key1.approved ? '✓' : '✗'} Approved at ${gate.key1.approvedAt?.toISOString()}`);
  console.log(`  Key 2 (Console): ${gate.key2.approved ? '✓' : '✗'} Approved at ${gate.key2.approvedAt?.toISOString()}`);
  console.log('─'.repeat(60));

  // ============================================================================
  // 3. DOMAIN DRIFT ENFORCEMENT DEMO
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('3. DOMAIN DRIFT ENFORCEMENT');
  console.log('═'.repeat(80) + '\n');

  const driftMonitor = new DomainDriftMonitor();

  const allowedDomains = ['sam.gov', 'beta.sam.gov', 'usaspending.gov'];

  console.log('Allowed domains for workstation:');
  allowedDomains.forEach(d => console.log(`  - ${d}`));
  console.log('');

  // Test in-scope navigation
  console.log('Test 1: Navigate to https://sam.gov/search');
  const check1 = driftMonitor.checkDomain('ws-1', 'agent-1', 'https://sam.gov/search', allowedDomains);
  console.log(`  Result: ${check1.inScope ? '✓ IN SCOPE' : '✗ DRIFT DETECTED'}`);
  console.log(`  Status: ${driftMonitor.getStatus('ws-1')}`);

  // Test drift
  console.log('\nTest 2: Navigate to https://google.com (unauthorized)');
  const check2 = driftMonitor.checkDomain('ws-1', 'agent-1', 'https://google.com', allowedDomains);
  console.log(`  Result: ${check2.inScope ? '✓ IN SCOPE' : '✗ DRIFT DETECTED'}`);
  console.log(`  Status: ${driftMonitor.getStatus('ws-1')}`);
  if (check2.driftEvent) {
    console.log(`  Drift Event ID: ${check2.driftEvent.id}`);
    console.log(`  Expected: ${check2.driftEvent.expectedDomains.join(', ')}`);
    console.log(`  Actual: ${check2.driftEvent.actualDomain}`);
  }

  // Approve drift
  console.log('\nApproving drift (operator determined it was necessary)...');
  if (check2.driftEvent) {
    driftMonitor.approveDrift(check2.driftEvent.id, 'operator-001', 'Needed to verify competitor info');
    const events = driftMonitor.getDriftEvents('ws-1');
    const lastEvent = events[events.length - 1];
    console.log(`  Status: ${lastEvent.status}`);
    console.log(`  Resolved By: ${lastEvent.resolution?.resolvedBy}`);
    console.log(`  Notes: ${lastEvent.resolution?.notes}`);
  }

  // Return to scope
  console.log('\nTest 3: Return to https://usaspending.gov');
  const check3 = driftMonitor.checkDomain('ws-1', 'agent-1', 'https://usaspending.gov/award/123', allowedDomains);
  console.log(`  Result: ${check3.inScope ? '✓ IN SCOPE' : '✗ DRIFT DETECTED'}`);
  console.log(`  Status: ${driftMonitor.getStatus('ws-1')}`);

  // ============================================================================
  // 4. EVIDENCE PACK EXPORT DEMO
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('4. EVIDENCE PACK EXPORT');
  console.log('═'.repeat(80) + '\n');

  const evidenceExporter = new EvidencePackExporter();

  // Log some events
  console.log('Logging audit events...\n');

  evidenceExporter.logEvent({
    id: 'event-001',
    timestamp: new Date(),
    eventType: 'SESSION_START',
    workstationId: 'ws-sam-gov',
    agentId: 'agent-bd-1',
    details: { action: 'Session started' },
    packContext: {
      packId: attestedPack.id,
      packName: attestedPack.name,
      packVersion: attestedPack.version,
      packHash: attestedPack.attestation.sha256
    }
  });

  evidenceExporter.logEvent({
    id: 'event-002',
    timestamp: new Date(),
    eventType: 'ACTION',
    workstationId: 'ws-sam-gov',
    agentId: 'agent-bd-1',
    details: {
      action: 'Navigate',
      tool: 'navigate',
      url: 'https://sam.gov/search',
      result: 'SUCCESS'
    },
    packContext: {
      packId: attestedPack.id,
      packName: attestedPack.name,
      packVersion: attestedPack.version,
      packHash: attestedPack.attestation.sha256
    }
  });

  evidenceExporter.logEvent({
    id: 'event-003',
    timestamp: new Date(),
    eventType: 'HITL_GATE',
    workstationId: 'ws-sam-gov',
    agentId: 'agent-bd-1',
    details: {
      action: 'Form submission gate',
      hitlGateId: gate.id,
      result: 'APPROVED'
    },
    packContext: {
      packId: attestedPack.id,
      packName: attestedPack.name,
      packVersion: attestedPack.version,
      packHash: attestedPack.attestation.sha256
    }
  });

  // Generate evidence pack
  console.log('Generating evidence pack...\n');

  const evidencePack = evidenceExporter.exportEvidencePack(
    'Federal BD Research Team',
    { id: 'operator-001', name: 'Jane Doe' },
    [{
      id: 'ws-sam-gov',
      name: 'SAM.gov Researcher',
      pack: attestedPack,
      initialUrl: 'https://sam.gov'
    }],
    gateManager.getAllGates(),
    driftMonitor.getDriftEvents()
  );

  console.log('EVIDENCE PACK METADATA:');
  console.log('─'.repeat(60));
  console.log(`  Pack ID:           ${evidencePack.metadata.packId}`);
  console.log(`  Workforce:         ${evidencePack.metadata.workforceName}`);
  console.log(`  Operator:          ${evidencePack.metadata.operatorName} (${evidencePack.metadata.operatorId})`);
  console.log(`  Session Start:     ${evidencePack.metadata.sessionStart.toISOString()}`);
  console.log(`  Session End:       ${evidencePack.metadata.sessionEnd.toISOString()}`);
  console.log(`  Total Workstations: ${evidencePack.metadata.totalWorkstations}`);
  console.log(`  Total Actions:     ${evidencePack.metadata.totalActions}`);
  console.log(`  Total HITL Gates:  ${evidencePack.metadata.totalHITLGates}`);
  console.log(`  Total Drift Events: ${evidencePack.metadata.totalDriftEvents}`);
  console.log('─'.repeat(60));

  console.log('\nEVIDENCE PACK FILES:');
  console.log('─'.repeat(60));
  console.log('  evidence-pack/');
  console.log('  ├── metadata.json');
  console.log('  ├── run.json');
  console.log('  ├── audit.jsonl');
  console.log('  ├── hitl_gates.json');
  console.log('  ├── drift_events.json');
  console.log('  ├── hashchain.txt');
  console.log('  ├── attestations.json');
  console.log('  ├── outputs/');
  console.log('  └── screenshots/');
  console.log('─'.repeat(60));

  console.log('\nAUDIT.JSONL SAMPLE:');
  console.log('─'.repeat(60));
  const auditLines = evidencePack.files['audit.jsonl'].split('\n').slice(0, 2);
  auditLines.forEach((line, i) => {
    const event = JSON.parse(line);
    console.log(`  Event ${i + 1}: ${event.eventType} - ${event.details.action}`);
    console.log(`    Hash: ${event.hash.substring(0, 32)}...`);
  });
  console.log('─'.repeat(60));

  console.log('\nHASHCHAIN.TXT SAMPLE:');
  console.log('─'.repeat(60));
  const hashLines = evidencePack.files['hashchain.txt'].split('\n').slice(0, 3);
  hashLines.forEach(line => console.log(`  ${line}`));
  console.log('─'.repeat(60));

  // Verify integrity
  console.log('\nVerifying evidence pack integrity...');
  const integrityCheck = evidenceExporter.verifyIntegrity(evidencePack);
  console.log(`  Result: ${integrityCheck.valid ? '✓ INTEGRITY VERIFIED' : '✗ INTEGRITY FAILED'}`);
  if (integrityCheck.errors.length > 0) {
    integrityCheck.errors.forEach(e => console.log(`  Error: ${e}`));
  }

  // ============================================================================
  // 5. GOVERNANCE CONSOLE DEMO
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('5. GOVERNANCE CONSOLE (All Together)');
  console.log('═'.repeat(80) + '\n');

  const console_ = new GovernanceConsole();

  // Register workstation
  console.log('Registering workstation with attested pack...');
  const regResult = console_.registerWorkstation('ws-sam-gov', 'SAM.gov Researcher', attestedPack);
  console.log(`  Result: ${regResult.success ? '✓ Registered' : '✗ Failed: ' + regResult.errors.join(', ')}`);

  // Get dashboard
  console.log('\nDashboard status:');
  const dashboard = console_.getDashboard();
  dashboard.workstations.forEach(ws => {
    console.log(`  [${ws.status.padEnd(12)}] ${ws.name} - Pack: ${ws.packName}`);
  });

  // Request HITL approval
  console.log('\nRequesting HITL approval for payment action...');
  const paymentGate = console_.requestApproval(
    'ws-sam-gov',
    'agent-bd-1',
    'PAYMENT',
    {
      tool: 'computer',
      description: 'Click "Pay Now" button',
      targetUrl: 'https://sam.gov/payment',
      riskLevel: 'CRITICAL'
    }
  );
  console.log(`  Gate created: ${paymentGate.id}`);
  console.log(`  Status: ${paymentGate.status}`);

  // Check domain
  console.log('\nChecking domain compliance...');
  const domainCheck = console_.checkDomain('ws-sam-gov', 'agent-bd-1', 'https://sam.gov/search');
  console.log(`  In scope: ${domainCheck.inScope ? '✓' : '✗'}`);

  // Export final evidence
  console.log('\nExporting final evidence pack...');
  const finalEvidence = console_.exportEvidence(
    { id: 'operator-001', name: 'Jane Doe' },
    'Federal BD Research Team'
  );
  console.log(`  Evidence pack created: ${finalEvidence.metadata.packId}`);

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('ENTERPRISE GOVERNANCE SUMMARY');
  console.log('═'.repeat(80));
  console.log(`
WHAT WE DEMONSTRATED:

1. PACK ATTESTATION
   - Cryptographic hash of pack content (SHA-256)
   - Approver identity and role
   - Expiration and versioning
   - Statement generation for audit logs

2. TWO-KEY HITL GATES
   - Key 1: Claude sidepanel approval (tool UX)
   - Key 2: Governance Console approval (policy UX)
   - Both required before agent proceeds
   - Separation of duties enforced

3. DOMAIN DRIFT ENFORCEMENT
   - Monitor current domain vs allowed domains
   - Log drift events automatically
   - Allow drift approval with justification
   - Track return to scope

4. EVIDENCE PACK EXPORT
   - run.json (session metadata)
   - audit.jsonl (append-only event log)
   - hashchain.txt (integrity verification)
   - hitl_gates.json (approval records)
   - drift_events.json (drift history)
   - attestations.json (pack approvals)

THE DEMO STORY (3-minute pitch):

1. Click "Launch Workforce"
2. Four monitors pop with tab groups
3. Paste attested pack prompts
4. Agent hits gate → approve in Claude + approve in Console
5. Export Evidence Pack → show JSON + log + hash chain

"Holy sh*t" moment: The hash chain proves no events were modified.
`);
}

// Run the demo
runEnterpriseDemo().catch(console.error);
