/**
 * Cyber Incident Response Demo
 *
 * Shows how a SOC/IR team would use ACE to:
 * 1. Triage incoming security incidents
 * 2. Build kill chain timeline from logs
 * 3. Validate IOCs and correlate threat intel
 * 4. Map compliance violations
 * 5. Generate KCV (Kill Chain Validation) report
 *
 * This is the reference implementation showing the full IR workflow.
 *
 * MODES:
 * - DEMO MODE (ACE_DEMO_MODE=true): No API calls, simulated data
 * - PRODUCTION MODE (ACE_DEMO_MODE=false): Live API calls with Anthropic Claude
 */

import { config, printConfigStatus, validateConfig } from '../config';
import { CyberIRWorkforce } from '../cyberWorkforce';
import {
  WorkforceType,
  AgentRole,
  MAIClassification
} from '../types';
import {
  WORKFORCE_TEMPLATES,
  CYBER_IR_MOCK_FILES
} from '../constants';

/**
 * Demo: Complete IR workflow from detection to containment
 */
async function demoCompleteIRWorkflow() {
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ACE CYBER INCIDENT RESPONSE DEMO                                    ║');
  console.log('║   Kill Chain Validation (KCV) Methodology                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  // Print configuration status
  printConfigStatus();

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.log('❌ Configuration Error:');
    validation.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 To run in demo mode: set ACE_DEMO_MODE=true');
    console.log('   To run with API: set ANTHROPIC_API_KEY=sk-ant-...\n');
    return;
  }

  // Show ingested files
  console.log('📥 Evidence Files Ingested:\n');
  CYBER_IR_MOCK_FILES.forEach(file => {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`   • ${file.name} (${sizeMB} MB)`);
  });
  console.log('');

  // Initialize IR workforce - this handles demo vs production mode internally
  const irTeam = new CyberIRWorkforce();

  // Run the IR workflow
  console.log('🚀 Starting Kill Chain Validation Analysis...\n');
  console.log('─────────────────────────────────────────────────────────────────────────\n');

  const report = await irTeam.runIncidentResponse();

  // Display executive dashboard
  irTeam.displayDashboard();

  // Show timeline
  irTeam.displayKillChainTimeline();

  // Export IOCs
  console.log('💾 IOC Export (for firewall/EDR blocking):\n');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log(irTeam.exportIOCsForBlocking());

  // ROI Analysis
  console.log('💰 ROI ANALYSIS');
  console.log('─────────────────────────────────────────────────────────────────────────');
  const manualHours = 40; // Typical manual IR for this complexity
  const aceHours = 4;
  const hourlyRate = 200; // Senior IR analyst rate
  console.log(`  Manual IR Time: ${manualHours} hours`);
  console.log(`  ACE Analysis Time: ${aceHours} hours`);
  console.log(`  Time Saved: ${manualHours - aceHours} hours`);
  console.log(`  Cost Savings: $${(manualHours - aceHours) * hourlyRate} @ $${hourlyRate}/hr`);
  console.log(`  Faster Containment: Critical for reducing breach impact\n`);

  console.log('✅ Demo complete!\n');
}

/**
 * Demo: Show the agent workflow
 */
function demoAgentWorkflow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CYBER IR AGENT WORKFLOW                                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  const template = WORKFORCE_TEMPLATES[WorkforceType.CYBER_IR];

  console.log(`Workforce: ${template.name}\n`);
  console.log('Agent Pipeline:\n');

  template.roles.forEach((role, index) => {
    const agentConfig = template.configs[role];
    if (agentConfig) {
      const classIcon = agentConfig.classification === MAIClassification.MANDATORY ? '🔴 MANDATORY' :
                        agentConfig.classification === MAIClassification.ADVISORY ? '🟡 ADVISORY' : '🟢 INFORMATIONAL';
      console.log(`  ${index + 1}. ${role}`);
      console.log(`     ${agentConfig.description}`);
      console.log(`     Classification: ${classIcon}\n`);
    }
  });

  console.log('ECV → KCV METHODOLOGY TRANSLATION:');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('  VA ECV Concept              →  Cyber IR KCV Concept');
  console.log('  ─────────────────────────────────────────────────────────────────────');
  console.log('  Evidence Chain Timeline     →  Kill Chain Timeline (MITRE ATT&CK)');
  console.log('  38 CFR Regulatory Pathway   →  NIST 800-53, CMMC, FedRAMP');
  console.log('  Secondary → Primary Link    →  Lateral Movement / Pivot Chain');
  console.log('  Strength Rating             →  Confidence Level + Severity');
  console.log('  Documentary Support         →  IOC Evidence (logs, hashes, IPs)');
  console.log('  MANDATORY Gate              →  Containment Actions Requiring Approval\n');
}

/**
 * Main demo runner
 */
async function main() {
  const demos: Record<string, () => Promise<void> | void> = {
    'complete': demoCompleteIRWorkflow,
    'workflow': demoAgentWorkflow
  };

  const demoType = process.argv[2] || 'complete';

  if (demos[demoType]) {
    await demos[demoType]();
  } else {
    console.log('Available demos:');
    console.log('  npm run demo:cyber complete  - Full IR workflow');
    console.log('  npm run demo:cyber workflow  - Agent workflow explanation');
  }
}

// Run the demo
main().catch(console.error);

export { demoCompleteIRWorkflow, demoAgentWorkflow };
