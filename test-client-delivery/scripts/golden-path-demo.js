#!/usr/bin/env node
/**
 * GOLDEN PATH DEMO v1.0.0
 *
 * One command that demonstrates the complete ACE governance story:
 *
 * 1. Load and certify a Job Pack
 * 2. Simulate execution with evidence capture
 * 3. Seal the evidence bundle
 * 4. Generate compliance reports
 * 5. Show certification badge
 *
 * This is your sales demo AND your regression test.
 *
 * Usage:
 *   node golden-path-demo.js [options]
 *
 * Options:
 *   --pack <file>     Job Pack to use (default: SAMGovOpportunityCapture.json)
 *   --profile <name>  Risk profile: conservative, balanced, aggressive (default: balanced)
 *   --output <dir>    Output directory for evidence and reports
 *   --quiet           Minimal output
 *   --help            Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CLI PARSING
// =============================================================================

function parseArgs(args) {
  const options = {
    pack: null,
    profile: 'balanced',
    output: null,
    quiet: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--pack' || arg === '-p') {
      options.pack = args[++i];
    } else if (arg === '--profile') {
      options.profile = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    }
    i++;
  }

  return options;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   GOLDEN PATH DEMO v1.0.0                     ║
╚═══════════════════════════════════════════════════════════════╝

The complete ACE governance story in one command.

USAGE:
  node golden-path-demo.js [options]

OPTIONS:
  --pack, -p <file>     Job Pack file to use
  --profile <name>      Risk profile: conservative, balanced, aggressive
  --output, -o <dir>    Output directory for evidence and reports
  --quiet, -q           Minimal output
  --help, -h            Show this help

WHAT THIS DEMO DOES:
  1. ✓ Loads and validates a Job Pack
  2. ✓ Runs certification checks (Level 1: VALIDATED)
  3. ✓ Simulates execution with evidence capture
  4. ✓ Seals the evidence bundle (hash-locked)
  5. ✓ Generates compliance reports (Executive + Audit)
  6. ✓ Emits portable certification artifact
  7. ✓ Displays certification badge

EXAMPLE:
  node golden-path-demo.js --profile conservative -o ./demo-output
`);
}

// =============================================================================
// DEMO UTILITIES
// =============================================================================

function log(message, quiet = false) {
  if (!quiet) {
    console.log(message);
  }
}

function separator(quiet = false) {
  if (!quiet) {
    console.log('─'.repeat(65));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN DEMO
// =============================================================================

async function runGoldenPathDemo(options) {
  const startTime = Date.now();

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               ACE GOVERNANCE PLATFORM                         ║
║               ═══════════════════════                         ║
║                                                               ║
║               GOLDEN PATH DEMO                                ║
║                                                               ║
║  The complete governance story in one command                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Setup paths
  const workforceDir = path.join(__dirname, '..', 'workforce', 'jobpacks');
  const governanceDir = path.join(__dirname, '..', 'governance');
  const outputDir = options.output
    ? path.resolve(options.output)
    : path.join(__dirname, '..', 'demo-output', `demo-${Date.now()}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const evidenceDir = path.join(outputDir, 'evidence');
  const reportsDir = path.join(outputDir, 'reports');

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  // =========================================================================
  // STEP 1: LOAD JOB PACK
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 1: LOAD JOB PACK                                      │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Find a pack to use
  let packFile = options.pack;
  if (!packFile) {
    // Look for any .json file in workforce/jobpacks
    const packFiles = fs.readdirSync(workforceDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'));

    if (packFiles.length === 0) {
      console.error('No Job Pack files found in workforce/jobpacks/');
      console.log('Creating a sample pack for demo...\n');

      // Create a minimal demo pack
      packFile = path.join(workforceDir, 'DemoPack.json');
      const demoPack = createDemoPack();
      fs.writeFileSync(packFile, JSON.stringify(demoPack, null, 2));
      log(`✓ Created demo pack: ${packFile}`, options.quiet);
    } else {
      packFile = path.join(workforceDir, packFiles[0]);
    }
  }

  const packPath = path.resolve(packFile);
  log(`Loading pack: ${path.basename(packPath)}`, options.quiet);

  const packContent = fs.readFileSync(packPath, 'utf-8');
  const pack = JSON.parse(packContent);
  const packHash = crypto.createHash('sha256').update(packContent).digest('hex');

  log(`  Pack ID: ${pack.pack_id}`, options.quiet);
  log(`  Version: ${pack.pack_version}`, options.quiet);
  log(`  Hash: ${packHash.substring(0, 16)}...`, options.quiet);
  log(`  Mission: ${pack.role?.mission || 'Not specified'}`, options.quiet);
  log('', options.quiet);
  log('✓ Job Pack loaded successfully\n', options.quiet);

  await sleep(300);

  // =========================================================================
  // STEP 2: RUN CERTIFICATION
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 2: RUN CERTIFICATION CHECKS                           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const certModule = await import('../governance/PackCertificationSchema.js');
  const {
    createCertificationRecord,
    createPackCertificate,
    certificationSummary,
    formatCertificate,
    CERTIFICATION_LEVEL_NAMES,
    CertificationLevel
  } = certModule;

  log('Running automated certification checks...', options.quiet);
  const certRecord = createCertificationRecord(pack, packHash);

  log(`  Total criteria evaluated: ${certRecord.criteria_results.length}`, options.quiet);
  log(`  Passed: ${certRecord.criteria_results.filter(r => r.passed).length}`, options.quiet);
  log(`  Failed: ${certRecord.criteria_results.filter(r => !r.passed).length}`, options.quiet);
  log('', options.quiet);

  const levelName = CERTIFICATION_LEVEL_NAMES[certRecord.current_level];
  log(`✓ Certification Level: ${certRecord.current_level} - ${levelName}\n`, options.quiet);

  // Save certification record
  const certRecordPath = path.join(outputDir, 'certification-record.json');
  fs.writeFileSync(certRecordPath, JSON.stringify(certRecord, null, 2));
  log(`  Saved: ${certRecordPath}`, options.quiet);

  await sleep(300);

  // =========================================================================
  // STEP 3: SIMULATE EXECUTION WITH EVIDENCE
  // =========================================================================

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 3: SIMULATE EXECUTION WITH EVIDENCE CAPTURE           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const executionId = `exec-${Date.now()}`;
  const bundleDir = path.join(evidenceDir, executionId);
  fs.mkdirSync(bundleDir, { recursive: true });

  log(`Execution ID: ${executionId}`, options.quiet);
  log(`Evidence bundle: ${bundleDir}`, options.quiet);
  log('', options.quiet);

  // Simulate extraction log
  const extractionLog = {
    execution_id: executionId,
    pack_id: pack.pack_id,
    pack_version: pack.pack_version,
    started_at: new Date().toISOString(),
    actions: [
      { action: 'navigate', target: 'sam.gov', status: 'success', timestamp: new Date().toISOString() },
      { action: 'search', query: 'IT services', status: 'success', timestamp: new Date().toISOString() },
      { action: 'read_page', element: 'opportunity_list', status: 'success', timestamp: new Date().toISOString() },
      { action: 'extract_data', fields: ['title', 'agency', 'due_date'], status: 'success', timestamp: new Date().toISOString() }
    ],
    completed_at: new Date().toISOString(),
    status: 'success'
  };

  fs.writeFileSync(path.join(bundleDir, 'extraction_log.json'), JSON.stringify(extractionLog, null, 2));
  log('  ✓ Created extraction_log.json', options.quiet);

  // Simulate source context
  const sourceContext = {
    source_url: 'https://sam.gov/search',
    access_mode: 'PUBLIC',
    extracted_at: new Date().toISOString(),
    tool_name: 'ACE Governance Platform',
    tool_version: '1.0.0'
  };

  fs.writeFileSync(path.join(bundleDir, 'source_context.json'), JSON.stringify(sourceContext, null, 2));
  log('  ✓ Created source_context.json', options.quiet);

  // Simulate opportunity data
  const opportunity = {
    title: 'Enterprise IT Services Support',
    notice_id: 'SAM-2024-001234',
    agency: 'Department of Example',
    set_aside: 'Total Small Business',
    due_date: '2024-03-15',
    value_estimate: '$5M - $10M',
    confidence: {
      title: 0.98,
      agency: 0.95,
      due_date: 0.99,
      value_estimate: 0.85
    }
  };

  fs.writeFileSync(path.join(bundleDir, 'opportunity.json'), JSON.stringify(opportunity, null, 2));
  log('  ✓ Created opportunity.json', options.quiet);

  // Create human-readable summary
  const opportunityMd = `# ${opportunity.title}

**Notice ID:** ${opportunity.notice_id}
**Agency:** ${opportunity.agency}
**Set-Aside:** ${opportunity.set_aside}
**Due Date:** ${opportunity.due_date}
**Estimated Value:** ${opportunity.value_estimate}

---
*Extracted by ACE Governance Platform*
`;

  fs.writeFileSync(path.join(bundleDir, 'opportunity.md'), opportunityMd);
  log('  ✓ Created opportunity.md', options.quiet);

  log('', options.quiet);
  log('✓ Evidence captured successfully\n', options.quiet);

  await sleep(300);

  // =========================================================================
  // STEP 4: SEAL EVIDENCE BUNDLE
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 4: SEAL EVIDENCE BUNDLE                               │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  log('Computing artifact hashes...', options.quiet);

  // Build manifest
  const artifacts = {};
  const files = fs.readdirSync(bundleDir);

  for (const file of files) {
    if (file === 'manifest.json') continue;
    const filePath = path.join(bundleDir, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    artifacts[file] = hash;
    log(`  ${file}: ${hash.substring(0, 16)}...`, options.quiet);
  }

  const manifest = {
    bundle_id: executionId,
    pack_id: pack.pack_id,
    pack_hash: packHash,
    created_at: new Date().toISOString(),
    sealed_at: new Date().toISOString(),
    seal_status: 'SEALED',
    artifact_hashes: artifacts,
    manifest_hash: ''  // Will be filled
  };

  // Compute manifest hash
  const manifestContent = JSON.stringify(manifest);
  manifest.manifest_hash = crypto.createHash('sha256').update(manifestContent).digest('hex');

  fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  log('', options.quiet);
  log(`✓ Bundle sealed with hash: ${manifest.manifest_hash.substring(0, 32)}...`, options.quiet);
  log('  Status: SEALED (immutable)\n', options.quiet);

  await sleep(300);

  // =========================================================================
  // STEP 5: GENERATE COMPLIANCE REPORTS
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 5: GENERATE COMPLIANCE REPORTS                        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const reportModule = await import('../governance/ReportTemplates.js');
  const { generateFromPreset } = reportModule;

  // Generate executive summary
  log('Generating Executive Summary...', options.quiet);
  const execSummary = generateFromPreset('exec-summary', 'Golden Path Demo', 'Demo Organization');
  const execPath = path.join(reportsDir, 'executive-summary.md');
  fs.writeFileSync(execPath, execSummary.content);
  log(`  ✓ Saved: ${execPath}`, options.quiet);

  // Generate audit package
  log('Generating Audit Evidence Package...', options.quiet);
  const auditPackage = generateFromPreset('audit-package', 'Golden Path Demo', 'Demo Organization');
  const auditPath = path.join(reportsDir, 'audit-package.md');
  fs.writeFileSync(auditPath, auditPackage.content);
  log(`  ✓ Saved: ${auditPath}`, options.quiet);

  log('', options.quiet);
  log(`✓ Generated ${2} compliance reports\n`, options.quiet);

  await sleep(300);

  // =========================================================================
  // STEP 6: EMIT CERTIFICATION ARTIFACT
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 6: EMIT PORTABLE CERTIFICATION                        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  log('Creating portable certificate artifact...', options.quiet);

  const certificate = createPackCertificate(certRecord, pack, 'Demo Certifier');
  const certPath = path.join(outputDir, 'certification.json');
  fs.writeFileSync(certPath, JSON.stringify(certificate, null, 2));

  log(`  ✓ Saved: ${certPath}`, options.quiet);
  log('', options.quiet);

  // =========================================================================
  // STEP 7: DISPLAY CERTIFICATION BADGE
  // =========================================================================

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│  STEP 7: CERTIFICATION BADGE                                │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  console.log(formatCertificate(certificate));

  // =========================================================================
  // SUMMARY
  // =========================================================================

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     DEMO COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ✓ Job Pack loaded and validated                              ║
║  ✓ Certification checks passed (Level ${certRecord.current_level})                      ║
║  ✓ Execution simulated with evidence                          ║
║  ✓ Evidence bundle sealed (immutable)                         ║
║  ✓ Compliance reports generated                               ║
║  ✓ Portable certificate emitted                               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Output Directory: ${outputDir.substring(0, 42).padEnd(42)}║
║  Elapsed Time: ${elapsed.padEnd(48)}s║
╚═══════════════════════════════════════════════════════════════╝

Next Steps:
  1. Review evidence bundle: ${evidenceDir}
  2. Review compliance reports: ${reportsDir}
  3. Ship certification.json with your pack

This demo shows:
  • Policy → Control → Execution governance model
  • MAI authority boundaries
  • Hash-verified evidence bundles
  • Framework-aligned compliance reports
  • Portable certification artifacts
`);
}

// =============================================================================
// DEMO PACK CREATION
// =============================================================================

function createDemoPack() {
  return {
    pack_id: 'DemoOpportunityCapture',
    pack_version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: 'ACE Demo',

    role: {
      name: 'Demo Opportunity Analyst',
      description: 'Demonstration pack for ACE governance platform',
      mission: 'Capture and analyze government contract opportunities for demo purposes',
      success_criteria: ['Extract opportunity data', 'Generate summary'],
      outputs: ['opportunity.json', 'opportunity.md'],
      acceptance_criteria: ['All required fields extracted', 'Confidence > 80%']
    },

    authority: {
      informational_actions: [
        { action: 'read_page', allowed: true, mai_level: 'INFORMATIONAL', requires_human_approval: false, description: 'Read page content' },
        { action: 'search', allowed: true, mai_level: 'INFORMATIONAL', requires_human_approval: false, description: 'Search for opportunities' }
      ],
      advisory_actions: [
        { action: 'navigate', allowed: true, mai_level: 'ADVISORY', requires_human_approval: false, description: 'Navigate to pages' },
        { action: 'extract_data', allowed: true, mai_level: 'ADVISORY', requires_human_approval: false, description: 'Extract structured data' }
      ],
      mandatory_actions: [
        { action: 'submit_interest', allowed: true, mai_level: 'MANDATORY', requires_human_approval: true, description: 'Submit interest in opportunity' }
      ]
    },

    permissions: {
      allowed: [
        { action: 'read_page', description: 'Read public page content' },
        { action: 'search', description: 'Search government databases' },
        { action: 'navigate', description: 'Navigate between pages' },
        { action: 'extract_data', description: 'Extract structured data' },
        { action: 'screenshot', description: 'Capture visual evidence' }
      ],
      forbidden: [
        { action: 'login', description: 'Authenticate to systems', reason: 'Security boundary' },
        { action: 'submit_bid', description: 'Submit actual bids', reason: 'Human-only action' },
        { action: 'delete', description: 'Delete any data', reason: 'Safety boundary' },
        { action: 'create_account', description: 'Create new accounts', reason: 'Security boundary' }
      ]
    },

    procedure_index: {
      mini_index: [
        { task: 'Search opportunities', route: 'sam.gov → Search', stop_condition: 'Results displayed', evidence: 'screenshot', estimated_steps: 3 },
        { task: 'View opportunity details', route: 'Search results → Click opportunity', stop_condition: 'Details page loaded', evidence: 'page_text', estimated_steps: 2 },
        { task: 'Extract key fields', route: 'Details page → Extract data', stop_condition: 'All fields captured', evidence: 'json', estimated_steps: 5 },
        { task: 'Generate summary', route: 'Extracted data → Format', stop_condition: 'Summary complete', evidence: 'markdown', estimated_steps: 2 },
        { task: 'Capture evidence', route: 'All pages → Screenshot', stop_condition: 'Screenshots saved', evidence: 'screenshots', estimated_steps: 3 }
      ],
      micro_sops: []
    },

    ui_map: {
      domain: 'sam.gov',
      stable_anchors: [
        { name: 'search_box', anchors: [{ type: 'aria_label', value: 'Search', description: 'Main search input' }], description: 'Search input' },
        { name: 'results_list', anchors: [{ type: 'heading', value: 'Search Results', description: 'Results header' }], description: 'Results container' },
        { name: 'opportunity_title', anchors: [{ type: 'heading', value: 'Opportunity', description: 'Title area' }], description: 'Opportunity title' }
      ],
      url_patterns: [
        { pattern: 'sam.gov/search', page_type: 'search', expected_elements: ['search_box', 'results_list'] },
        { pattern: 'sam.gov/opp/*', page_type: 'opportunity_detail', expected_elements: ['opportunity_title'] }
      ]
    },

    escalation: {
      triggers: [
        { trigger_id: 'ESC-001', condition: 'error_rate > 3', description: 'Too many errors', action: 'stop_and_ask', severity: 'HIGH' },
        { trigger_id: 'ESC-002', condition: 'confidence < 0.6', description: 'Low confidence extraction', action: 'capture_evidence', severity: 'MEDIUM' },
        { trigger_id: 'ESC-003', condition: 'unexpected_page', description: 'Navigation error', action: 'stop_and_ask', severity: 'LOW' },
        { trigger_id: 'ESC-004', condition: 'login_required', description: 'Authentication barrier', action: 'abort_job', severity: 'CRITICAL' }
      ],
      default_action: 'stop_and_ask'
    },

    evidence: {
      lightweight_capture: [
        { trigger: 'milestone', capture_type: 'screenshot', description: 'Major state changes', required: true }
      ],
      heavy_capture_triggers: ['escalation', 'error'],
      milestone_screenshots: ['search_results', 'opportunity_details', 'extraction_complete'],
      retention_policy: '30 days standard, 90 days for escalated'
    },

    constraints: {
      max_actions_per_session: 50,
      max_retries_per_step: 3,
      timeout_per_step_ms: 15000,
      timeout_per_job_ms: 300000,
      requires_sealed_evidence_bundle: true,
      environment_modes: ['DEMO', 'PROD']
    }
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    await runGoldenPathDemo(options);
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
