#!/usr/bin/env node
/**
 * RUN-PACK CLI v1.0.0
 *
 * Execute a Job Pack against a real site via MCP browser tools.
 *
 * Usage:
 *   npx tsx scripts/run-pack.js <pack-path> --url <target-url> [--profile <profile>]
 *   npx tsx scripts/run-pack.js --demo
 *
 * Examples:
 *   npx tsx scripts/run-pack.js workforce/jobpacks/GrantsGovOpportunityFinder.json --url https://www.grants.gov
 *   npx tsx scripts/run-pack.js --demo
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Import executor and governance
import {
  JobPackExecutor,
  runPreExecutionGates,
  enforceMAI,
  createEvidenceBundle,
  sealEvidenceBundle
} from '../executor/JobPackExecutor.js';

import { PRESET_PROFILES, CERTIFICATION_LEVELS } from '../governance/RiskProfileSchema.js';
import { CertificationLevel } from '../governance/PackCertificationSchema.js';

// =============================================================================
// MOCK MCP TOOLS (for demo/testing without real browser)
// =============================================================================

function createMockMCPTools() {
  return {
    navigate: async (url, tabId) => {
      console.log(`    [MCP] navigate(${url})`);
      await sleep(500);
      return { success: true };
    },

    screenshot: async (tabId) => {
      console.log(`    [MCP] screenshot()`);
      await sleep(200);
      return { imageData: 'base64-mock-image-data' };
    },

    readPage: async (tabId, options) => {
      console.log(`    [MCP] readPage()`);
      await sleep(300);
      return {
        elements: [
          { ref: 'el-1', role: 'textbox', name: 'Search grants' },
          { ref: 'el-2', role: 'button', name: 'Search' },
          { ref: 'el-3', role: 'link', name: 'Advanced Search' }
        ]
      };
    },

    find: async (query, tabId) => {
      console.log(`    [MCP] find("${query}")`);
      await sleep(300);
      return {
        matches: [
          { ref: 'match-1', text: query, context: 'Found in page header' }
        ]
      };
    },

    click: async (ref, tabId) => {
      console.log(`    [MCP] click(${ref})`);
      await sleep(200);
      return { success: true };
    },

    type: async (ref, text, tabId) => {
      console.log(`    [MCP] type(${ref}, "${text}")`);
      await sleep(100);
      return { success: true };
    },

    getPageText: async (tabId) => {
      console.log(`    [MCP] getPageText()`);
      await sleep(300);
      return `
        Grants.gov - Find and Apply for Federal Grants

        Search for grants by keyword, opportunity number, or CFDA number.

        Featured Opportunities:
        - Research Innovation Grant (HHS-2024-001)
        - Small Business Technology Transfer (DOD-SBIR-2024)
        - Environmental Conservation Fund (EPA-ECF-2024)

        Total Active Opportunities: 2,847
      `;
    }
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// APPROVAL HANDLER
// =============================================================================

async function promptForApproval(action) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   APPROVAL REQUIRED                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Action: ${action.action_type.padEnd(51)}║
║  Level:  ${action.mai_level.padEnd(51)}║
║  Desc:   ${action.description.substring(0, 51).padEnd(51)}║
╚═══════════════════════════════════════════════════════════════╝
`);

    rl.question('  Approve this action? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Auto-approve for demo mode
function autoApprove(action) {
  console.log(`    [AUTO-APPROVE] ${action.action_type} - ${action.description}`);
  return Promise.resolve(true);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function runPack(packPath, targetUrl, profileName, demoMode) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             JOB PACK EXECUTOR v1.0.0                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Load the Job Pack
  console.log(`[1/5] Loading Job Pack: ${packPath}`);
  let pack;
  try {
    const packContent = fs.readFileSync(packPath, 'utf-8');
    pack = JSON.parse(packContent);
    console.log(`  ✓ Loaded: ${pack.pack_id} v${pack.pack_version}`);
    console.log(`  ✓ Role: ${pack.role.name}`);
    console.log(`  ✓ Mission: ${pack.role.mission}`);
  } catch (error) {
    console.error(`  ✗ Failed to load pack: ${error.message}`);
    process.exit(1);
  }

  // Load Risk Profile
  console.log(`\n[2/5] Loading Risk Profile: ${profileName}`);
  const profile = PRESET_PROFILES[profileName + '_PROFILE'];
  if (!profile) {
    console.error(`  ✗ Profile not found: ${profileName}`);
    console.error(`  Available: CONSERVATIVE, BALANCED, AGGRESSIVE`);
    process.exit(1);
  }
  console.log(`  ✓ Profile: ${profile.appetite.name}`);
  console.log(`  ✓ Max MAI: ${profile.appetite.job_pack_policy.max_autonomous_mai_level}`);
  console.log(`  ✓ Min Cert: Level ${profile.appetite.job_pack_policy.min_pack_certification_level}`);

  // Pre-execution gate check
  console.log(`\n[3/5] Running Pre-Execution Gates...`);
  const domain = new URL(targetUrl).hostname;
  const gateResults = runPreExecutionGates(pack, profile, domain);

  for (const gate of gateResults.gates) {
    const icon = gate.passed ? '✓' : '✗';
    console.log(`  ${icon} ${gate.gate}: ${gate.reason}`);
  }

  if (!gateResults.canExecute) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    EXECUTION BLOCKED                          ║
╠═══════════════════════════════════════════════════════════════╣
║  One or more gates failed. Pack cannot execute.               ║
╚═══════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  console.log(`  ✓ All gates passed - execution permitted`);

  // Create executor
  console.log(`\n[4/5] Initializing Executor...`);
  const mcpTools = createMockMCPTools();
  const approvalFn = demoMode ? autoApprove : promptForApproval;
  const executor = new JobPackExecutor(mcpTools, approvalFn, 1);
  console.log(`  ✓ MCP tools initialized`);
  console.log(`  ✓ Approval mode: ${demoMode ? 'AUTO' : 'INTERACTIVE'}`);

  // Execute
  console.log(`\n[5/5] Executing Pack...`);
  console.log(`  Target: ${targetUrl}`);
  console.log(`  ─────────────────────────────────────────────────────────`);

  const result = await executor.execute(pack, profile, targetUrl);

  // Display results
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    EXECUTION COMPLETE                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:         ${result.status.padEnd(43)}║
║  Duration:       ${(result.duration_ms + 'ms').padEnd(43)}║
║  Actions Run:    ${result.actions_executed.toString().padEnd(43)}║
║  Actions Blocked:${result.actions_blocked.toString().padEnd(43)}║
║  Escalations:    ${result.actions_escalated.toString().padEnd(43)}║
╠═══════════════════════════════════════════════════════════════╣
║  EVIDENCE BUNDLE                                              ║
║  Bundle ID:      ${result.evidence_bundle.bundle_id.padEnd(43)}║
║  Status:         ${result.evidence_bundle.status.padEnd(43)}║
║  Artifacts:      ${result.evidence_bundle.artifacts.length.toString().padEnd(43)}║
${result.evidence_bundle.seal_hash ? `║  Seal Hash:      ${result.evidence_bundle.seal_hash.substring(0, 43)}║\n` : ''}╚═══════════════════════════════════════════════════════════════╝
`);

  // Show artifacts
  if (result.evidence_bundle.artifacts.length > 0) {
    console.log('Evidence Artifacts:');
    for (const artifact of result.evidence_bundle.artifacts) {
      console.log(`  • ${artifact.filename} (${artifact.artifact_type})`);
      console.log(`    ${artifact.description}`);
    }
  }

  // Show error if any
  if (result.error) {
    console.log(`\n[ERROR] ${result.error}`);
  }

  // Save evidence bundle
  const evidenceDir = path.join(process.cwd(), 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const bundlePath = path.join(evidenceDir, `${result.evidence_bundle.bundle_id}.json`);
  fs.writeFileSync(bundlePath, JSON.stringify(result.evidence_bundle, null, 2));
  console.log(`\nEvidence saved to: ${bundlePath}`);

  return result;
}

// =============================================================================
// DEMO MODE
// =============================================================================

async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           JOB PACK EXECUTOR - DEMO MODE                       ║
╠═══════════════════════════════════════════════════════════════╣
║  This demo shows the executor running a Job Pack with:        ║
║    • MAI boundary enforcement                                 ║
║    • Risk Profile gate checks                                 ║
║    • Evidence bundle generation                               ║
║    • Approval workflow (auto-approved in demo)                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Check if GrantsGov pack exists
  const packPath = path.join(process.cwd(), 'workforce', 'jobpacks', 'GrantsGovOpportunityFinder.json');

  if (!fs.existsSync(packPath)) {
    console.log('Creating demo pack...');
    // Create a minimal demo pack
    const demoPack = {
      pack_id: 'DemoGrantsSearch',
      pack_version: '1.0.0',
      role: {
        name: 'Grants.gov Researcher',
        mission: 'Search and extract grant opportunity information',
        success_criteria: ['Find grant listings', 'Extract opportunity details']
      },
      authority: {
        informational_actions: ['navigate', 'read_page', 'screenshot', 'scroll', 'search'],
        advisory_actions: ['download_document', 'save_search'],
        mandatory_actions: ['submit_application', 'create_account']
      },
      permissions: {
        allowed_domains: ['grants.gov', 'www.grants.gov'],
        forbidden_actions: [
          { action: 'submit_application', reason: 'Human-only action' },
          { action: 'create_account', reason: 'Requires human verification' }
        ]
      },
      escalation: {
        triggers: [
          { trigger_id: 'ESC-001', condition: 'error_rate > 0.3', action: 'STOP', severity: 'HIGH' }
        ]
      },
      procedure_index: [
        { step_id: 'step-1', action: 'navigate', mai_level: 'INFORMATIONAL', description: 'Navigate to Grants.gov' },
        { step_id: 'step-2', action: 'read_page', mai_level: 'INFORMATIONAL', description: 'Read page structure' },
        { step_id: 'step-3', action: 'search', mai_level: 'INFORMATIONAL', description: 'Search for opportunities' },
        { step_id: 'step-4', action: 'screenshot', mai_level: 'INFORMATIONAL', description: 'Capture results' }
      ],
      certification_level: 1 // VALIDATED
    };

    const demoPackDir = path.join(process.cwd(), 'workforce', 'jobpacks');
    if (!fs.existsSync(demoPackDir)) {
      fs.mkdirSync(demoPackDir, { recursive: true });
    }
    fs.writeFileSync(packPath, JSON.stringify(demoPack, null, 2));
    console.log(`  Created demo pack at: ${packPath}`);
  }

  // Run with different profiles to show gates
  console.log('\n' + '═'.repeat(65));
  console.log('  SCENARIO 1: BALANCED Profile (should work)');
  console.log('═'.repeat(65));

  await runPack(
    packPath,
    'https://www.grants.gov',
    'BALANCED',
    true // demo mode = auto-approve
  );

  console.log('\n' + '═'.repeat(65));
  console.log('  SCENARIO 2: CONSERVATIVE Profile (may block due to cert level)');
  console.log('═'.repeat(65));

  // Load pack and check cert
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const conservativeProfile = PRESET_PROFILES.CONSERVATIVE_PROFILE;

  console.log(`
  Pack Certification: Level ${pack.certification_level || 0}
  Profile Requires:   Level ${conservativeProfile.appetite.job_pack_policy.min_pack_certification_level}
  `);

  if ((pack.certification_level || 0) < conservativeProfile.appetite.job_pack_policy.min_pack_certification_level) {
    console.log('  [EXPECTED] Pack will be blocked - certification too low for CONSERVATIVE profile');
  }

  try {
    await runPack(
      packPath,
      'https://www.grants.gov',
      'CONSERVATIVE',
      true
    );
  } catch (e) {
    // Expected to fail
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    DEMO COMPLETE                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Key Concepts Demonstrated:                                   ║
║    1. Pre-execution gate checks                               ║
║    2. MAI level enforcement                                   ║
║    3. Risk profile integration                                ║
║    4. Evidence bundle generation                              ║
║    5. Certification level gates                               ║
║                                                               ║
║  In production, replace mock MCP tools with real browser      ║
║  automation via Claude Desktop or Chrome Extension.           ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Job Pack Executor CLI v1.0.0

USAGE:
  npx tsx scripts/run-pack.js <pack-path> --url <url> [options]
  npx tsx scripts/run-pack.js --demo

OPTIONS:
  --url, -u <url>       Target URL to execute against (required unless --demo)
  --profile, -p <name>  Risk profile: CONSERVATIVE, BALANCED, AGGRESSIVE (default: BALANCED)
  --auto-approve        Auto-approve all actions (no prompts)
  --demo, -d            Run demo with mock browser

EXAMPLES:
  npx tsx scripts/run-pack.js workforce/jobpacks/GrantsGov.json --url https://grants.gov
  npx tsx scripts/run-pack.js pack.json -u https://sam.gov -p CONSERVATIVE
  npx tsx scripts/run-pack.js --demo
`);
    return;
  }

  if (args.includes('--demo') || args.includes('-d')) {
    await runDemo();
    return;
  }

  // Parse arguments
  const packPath = args.find(a => !a.startsWith('-') && (a.endsWith('.json') || a.includes('jobpacks')));
  const urlIdx = args.findIndex(a => a === '--url' || a === '-u');
  const targetUrl = urlIdx !== -1 ? args[urlIdx + 1] : null;
  const profileIdx = args.findIndex(a => a === '--profile' || a === '-p');
  const profileName = profileIdx !== -1 ? args[profileIdx + 1].toUpperCase() : 'BALANCED';
  const autoApprove = args.includes('--auto-approve');

  if (!packPath) {
    console.error('Error: Pack path required');
    console.error('Run with --help for usage');
    process.exit(1);
  }

  if (!targetUrl) {
    console.error('Error: Target URL required (--url)');
    console.error('Run with --help for usage');
    process.exit(1);
  }

  await runPack(packPath, targetUrl, profileName, autoApprove);
}

main().catch(console.error);
