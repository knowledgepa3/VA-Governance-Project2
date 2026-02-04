/**
 * Control Catalog Demo
 *
 * Demonstrates the FedRAMP/NIST-style control documentation
 * ready for SSP (System Security Plan) integration
 */

import {
  CONTROL_CATALOG,
  CONTROL_SUMMARY_TABLE,
  ARCHITECTURAL_ENFORCEMENT_STATEMENT,
  NIST_MAPPING,
  exportControlCatalogMarkdown,
  exportControlCatalogJSON,
  ACE_AUTH_001,
  ACE_CONFIG_001
} from './ControlCatalog.js';

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ██████╗ ██████╗ ███╗   ██╗████████╗██████╗  ██████╗ ██╗                  ║
║    ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔═══██╗██║                  ║
║    ██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝██║   ██║██║                  ║
║    ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗██║   ██║██║                  ║
║    ╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████╗             ║
║     ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝             ║
║                                                                              ║
║     ██████╗ █████╗ ████████╗ █████╗ ██╗      ██████╗  ██████╗                ║
║    ██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║     ██╔═══██╗██╔════╝                ║
║    ██║     ███████║   ██║   ███████║██║     ██║   ██║██║  ███╗               ║
║    ██║     ██╔══██║   ██║   ██╔══██║██║     ██║   ██║██║   ██║               ║
║    ╚██████╗██║  ██║   ██║   ██║  ██║███████╗╚██████╔╝╚██████╔╝               ║
║     ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝               ║
║                                                                              ║
║           FedRAMP/NIST 800-53 Style Control Documentation                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// ARCHITECTURAL ENFORCEMENT STATEMENT
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('ARCHITECTURAL ENFORCEMENT STATEMENT');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log(ARCHITECTURAL_ENFORCEMENT_STATEMENT);

// ============================================================================
// AUDIT-READY SUMMARY TABLE
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('AUDIT-READY SUMMARY TABLE');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│ Tighten-Up                    │ What Changed                                         │ Why Auditors Care                       │');
console.log('├───────────────────────────────┼──────────────────────────────────────────────────────┼─────────────────────────────────────────┤');

for (const row of CONTROL_SUMMARY_TABLE) {
  const title = row.title.substring(0, 28).padEnd(28);
  const changed = row.whatChanged.substring(0, 50).padEnd(50);
  const why = row.whyAuditorsCare.substring(0, 38).padEnd(38);
  console.log(`│ ${title} │ ${changed} │ ${why} │`);
}

console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

// ============================================================================
// CONTROL DETAIL: ACE-AUTH-001
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('CONTROL DETAIL: ACE-AUTH-001');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log(`Control ID:     ${ACE_AUTH_001.controlId}`);
console.log(`Control Family: ${ACE_AUTH_001.controlFamily}`);
console.log(`Control Title:  ${ACE_AUTH_001.controlTitle}\n`);

console.log('OBJECTIVE:');
console.log(`  ${ACE_AUTH_001.objective}\n`);

console.log('IMPLEMENTATION:');
console.log(`  Description:  ${ACE_AUTH_001.implementation.description}`);
console.log(`  Mechanism:    ${ACE_AUTH_001.implementation.mechanism}`);
console.log(`  Enforcement:  ${ACE_AUTH_001.implementation.enforcement}\n`);

console.log('EVIDENCE ARTIFACTS:');
for (const artifact of ACE_AUTH_001.evidence.artifacts) {
  console.log(`  • ${artifact}`);
}
console.log(`  Retention:    ${ACE_AUTH_001.evidence.retention}`);
console.log(`  Integrity:    ${ACE_AUTH_001.evidence.integrity}\n`);

console.log('TEST PROCEDURE:');
console.log(`  Method: ${ACE_AUTH_001.testProcedure.method}`);
console.log('  Steps:');
for (const step of ACE_AUTH_001.testProcedure.steps) {
  console.log(`    ${step}`);
}
console.log(`  Expected Result: ${ACE_AUTH_001.testProcedure.expectedResult}`);
console.log(`  Automatable: ${ACE_AUTH_001.testProcedure.automatable ? 'Yes' : 'No'}\n`);

console.log('ACCEPTANCE CRITERIA:');
for (const criteria of ACE_AUTH_001.acceptanceCriteria) {
  console.log(`  ☐ ${criteria}`);
}

console.log(`\nNIST 800-53 MAPPING: ${ACE_AUTH_001.nisMapping?.join(', ')}\n`);

// ============================================================================
// CONTROL DETAIL: ACE-CONFIG-001 (Pack Hash Drift)
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('CONTROL DETAIL: ACE-CONFIG-001');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log(`Control ID:     ${ACE_CONFIG_001.controlId}`);
console.log(`Control Family: ${ACE_CONFIG_001.controlFamily}`);
console.log(`Control Title:  ${ACE_CONFIG_001.controlTitle}\n`);

console.log('OBJECTIVE:');
console.log(`  ${ACE_CONFIG_001.objective}\n`);

console.log('ACCEPTANCE CRITERIA:');
for (const criteria of ACE_CONFIG_001.acceptanceCriteria) {
  console.log(`  ☐ ${criteria}`);
}

console.log(`\nNIST 800-53 MAPPING: ${ACE_CONFIG_001.nisMapping?.join(', ')}\n`);

// ============================================================================
// NIST 800-53 MAPPING SUMMARY
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('NIST 800-53 CONTROL MAPPING');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

for (const [nistId, mapping] of Object.entries(NIST_MAPPING)) {
  console.log(`${nistId}: ${mapping.control}`);
  console.log(`  ACE Controls: ${mapping.aceControls.join(', ')}\n`);
}

// ============================================================================
// CATALOG STATISTICS
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('CATALOG STATISTICS');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log(`Total Controls:           ${CONTROL_CATALOG.length}`);
console.log(`NIST Controls Mapped:     ${Object.keys(NIST_MAPPING).length}`);
console.log(`Automatable Tests:        ${CONTROL_CATALOG.filter(c => c.testProcedure.automatable).length}`);
console.log(`Architectural Enforcement: ${CONTROL_CATALOG.filter(c => c.implementation.enforcement === 'ARCHITECTURAL').length}`);

// Count acceptance criteria
const totalCriteria = CONTROL_CATALOG.reduce((sum, c) => sum + c.acceptanceCriteria.length, 0);
console.log(`Total Acceptance Criteria: ${totalCriteria}\n`);

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('EXPORT OPTIONS');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log('Available export formats:');
console.log('  • exportControlCatalogMarkdown() → SSP-ready markdown');
console.log('  • exportControlCatalogJSON()     → Compliance tool JSON\n');

console.log('Sample Markdown Export (first 50 lines):');
console.log('──────────────────────────────────────────────────────────────────────');
const markdown = exportControlCatalogMarkdown();
const markdownLines = markdown.split('\n').slice(0, 50);
for (const line of markdownLines) {
  console.log(line);
}
console.log('... (truncated)\n');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT MAKES THIS SSP-READY:                                                 │
│                                                                             │
│  1. CONTROL STATEMENT FORMAT                                                │
│     - Control ID + Family + Title                                           │
│     - Clear Objective                                                       │
│     - Implementation with mechanism and enforcement type                    │
│     - Evidence artifacts with retention and integrity                       │
│     - Test procedure with steps and expected results                        │
│     - Testable acceptance criteria (checkbox format)                        │
│                                                                             │
│  2. ARCHITECTURAL ENFORCEMENT                                               │
│     - NOT "we told the agent to behave"                                     │
│     - Enforced by system state machine                                      │
│     - Cannot be bypassed through prompt manipulation                        │
│                                                                             │
│  3. NIST 800-53 MAPPING                                                     │
│     - Direct mapping to IA, AC, AU, CM, SC, SI families                     │
│     - Ready for FedRAMP authorization package                               │
│                                                                             │
│  4. AUDITOR-FRIENDLY LANGUAGE                                               │
│     - "Why Auditors Care" column                                            │
│     - Clear acceptance criteria                                             │
│     - Evidence artifacts specified                                          │
│     - Hash-chained integrity verification                                   │
│                                                                             │
│  5. EXPORT OPTIONS                                                          │
│     - Markdown for SSP documents                                            │
│     - JSON for automated compliance tools                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`);
