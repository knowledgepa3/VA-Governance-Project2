#!/usr/bin/env node
/**
 * CERTIFY-PACK CLI v1.0.0
 *
 * Certification tool for Job Packs
 *
 * Usage:
 *   node certify-pack.js <pack-file> [options]
 *
 * Options:
 *   --target <level>    Target certification level (1-4, default: 1)
 *   --output <file>     Output certification record to file
 *   --record <file>     Load existing certification record
 *   --add-evidence      Interactive mode to add test evidence
 *   --certify           Sign off as certifier (requires --certifier)
 *   --certifier <name>  Name of the certifier
 *   --json              Output as JSON instead of formatted text
 *   --verbose           Show detailed check results
 *
 * Examples:
 *   node certify-pack.js SAMGovOpportunityCapture.json
 *   node certify-pack.js pack.json --target 3 --output cert-record.json
 *   node certify-pack.js pack.json --record cert.json --certify --certifier "John Doe"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import certification schema
const certModule = await import('../governance/PackCertificationSchema.js');
const {
  CertificationLevel,
  CERTIFICATION_LEVEL_NAMES,
  CERTIFICATION_LEVEL_DESCRIPTIONS,
  CERTIFICATION_CRITERIA,
  runAutomatedChecks,
  calculateCertificationLevel,
  getCriteriaForLevel,
  getMissingCriteria,
  createCertificationRecord,
  certificationSummary,
  createPackCertificate,
  formatCertificate
} = certModule;

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

function parseArgs(args) {
  const options = {
    packFile: null,
    target: 1,
    output: null,
    record: null,
    addEvidence: false,
    certify: false,
    certifier: null,
    certifierRole: null,
    emitCertificate: false,
    certificateDir: null,
    json: false,
    verbose: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--target' || arg === '-t') {
      options.target = parseInt(args[++i], 10);
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--record' || arg === '-r') {
      options.record = args[++i];
    } else if (arg === '--add-evidence') {
      options.addEvidence = true;
    } else if (arg === '--certify') {
      options.certify = true;
    } else if (arg === '--certifier') {
      options.certifier = args[++i];
    } else if (arg === '--certifier-role') {
      options.certifierRole = args[++i];
    } else if (arg === '--emit-certificate' || arg === '--emit-cert') {
      options.emitCertificate = true;
    } else if (arg === '--certificate-dir') {
      options.certificateDir = args[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('-')) {
      options.packFile = arg;
    }

    i++;
  }

  return options;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    CERTIFY-PACK CLI v1.0.0                    ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  node certify-pack.js <pack-file> [options]

OPTIONS:
  --target, -t <level>   Target certification level (1-4)
                         1 = VALIDATED (schema valid)
                         2 = TESTED (has test evidence)
                         3 = CERTIFIED (human reviewed)
                         4 = PRODUCTION (deployed, monitored)

  --output, -o <file>    Save certification record to file

  --record, -r <file>    Load existing certification record

  --add-evidence         Add evidence for test criteria (Level 2)

  --certify              Human certification sign-off (Level 3)
  --certifier <name>     Name of the certifier (required with --certify)
  --certifier-role       Role of the certifier (e.g., "Security Reviewer")

  --emit-certificate     Emit portable certification.json artifact
  --certificate-dir      Directory to emit certificate (default: pack directory)

  --json                 Output as JSON

  --verbose, -v          Show all check results

  --help, -h             Show this help

EXAMPLES:
  # Run automated checks on a pack
  node certify-pack.js ../workforce/jobpacks/SAMGovOpportunityCapture.json

  # Target Level 2 and save record
  node certify-pack.js pack.json --target 2 --output cert-record.json

  # Add human certification
  node certify-pack.js pack.json -r cert.json --certify --certifier "Jane Smith"

CERTIFICATION LEVELS:
  0. DRAFT       - Not validated
  1. VALIDATED   - Passes automated schema checks
  2. TESTED      - Has execution evidence, escalations verified
  3. CERTIFIED   - Human reviewed and approved
  4. PRODUCTION  - Deployed, monitored, incident-free
`);
}

// =============================================================================
// MAIN CERTIFICATION LOGIC
// =============================================================================

function loadPack(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const pack = JSON.parse(content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { pack, hash, filePath: resolvedPath };
  } catch (error) {
    console.error(`Error loading pack: ${error.message}`);
    process.exit(1);
  }
}

function loadRecord(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading record: ${error.message}`);
    return null;
  }
}

function saveRecord(record, filePath) {
  const resolvedPath = path.resolve(filePath);
  fs.writeFileSync(resolvedPath, JSON.stringify(record, null, 2));
  console.log(`\n✓ Certification record saved to: ${resolvedPath}`);
}

function addManualCertification(record, certifier) {
  const now = new Date().toISOString();

  // Add manual certification criteria as passed
  const manualCriteria = CERTIFICATION_CRITERIA.filter(c => c.check_type === 'manual');

  for (const criterion of manualCriteria) {
    // Check if already has result
    const existing = record.criteria_results.find(r => r.criterion_id === criterion.criterion_id);

    if (!existing) {
      record.criteria_results.push({
        criterion_id: criterion.criterion_id,
        passed: true,
        evidence: `Certified by ${certifier}`,
        notes: 'Human certification sign-off',
        checked_at: now,
        checked_by: certifier
      });
    } else if (!existing.passed) {
      existing.passed = true;
      existing.evidence = `Certified by ${certifier}`;
      existing.checked_at = now;
      existing.checked_by = certifier;
    }
  }

  // Recalculate level
  const newLevel = calculateCertificationLevel(record);

  if (newLevel > record.current_level) {
    record.certification_history.push({
      level: newLevel,
      achieved_at: now,
      certified_by: certifier,
      notes: 'Human certification complete'
    });
    record.current_level = newLevel;
  }

  record.updated_at = now;

  return record;
}

function printResults(record, options) {
  if (options.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  console.log(certificationSummary(record));

  if (options.verbose) {
    console.log('\n📋 DETAILED RESULTS:\n');

    for (const result of record.criteria_results) {
      const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === result.criterion_id);
      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? '' : '';

      console.log(`${status} ${result.criterion_id}: ${criterion?.name || 'Unknown'}`);
      console.log(`     Level: ${criterion?.required_for_level || '?'} | Type: ${criterion?.check_type || '?'} | Severity: ${criterion?.severity || '?'}`);
      console.log(`     Evidence: ${result.evidence || 'None'}`);
      console.log('');
    }
  }

  // Show level descriptions
  console.log('\n📊 CERTIFICATION LEVELS:');
  for (let level = 0; level <= 4; level++) {
    const current = level === record.current_level ? ' ← CURRENT' : '';
    const target = level === record.target_level ? ' ← TARGET' : '';
    const marker = level <= record.current_level ? '✓' : '○';
    console.log(`   ${marker} ${level}. ${CERTIFICATION_LEVEL_NAMES[level]}${current}${target}`);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || !options.packFile) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    PACK CERTIFICATION                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load pack
  console.log(`Loading pack: ${options.packFile}`);
  const { pack, hash, filePath } = loadPack(options.packFile);
  console.log(`  Pack ID: ${pack.pack_id}`);
  console.log(`  Version: ${pack.pack_version}`);
  console.log(`  Hash: ${hash.substring(0, 16)}...`);

  // Load or create certification record
  let record;
  if (options.record) {
    console.log(`\nLoading existing record: ${options.record}`);
    record = loadRecord(options.record);

    if (!record) {
      console.log('  No existing record found, creating new one...');
      record = createCertificationRecord(pack, hash);
    } else if (record.pack_hash !== hash) {
      console.warn('\n⚠️  WARNING: Pack has changed since last certification!');
      console.warn(`   Previous hash: ${record.pack_hash.substring(0, 16)}...`);
      console.warn(`   Current hash:  ${hash.substring(0, 16)}...`);
      console.warn('   Re-running automated checks...\n');

      // Re-run automated checks
      const newResults = runAutomatedChecks(pack);
      record.criteria_results = [
        ...newResults,
        ...record.criteria_results.filter(r => {
          const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === r.criterion_id);
          return criterion?.check_type !== 'automated';
        })
      ];
      record.pack_hash = hash;
      record.updated_at = new Date().toISOString();
      record.current_level = calculateCertificationLevel(record);
    }
  } else {
    console.log('\nRunning certification checks...');
    record = createCertificationRecord(pack, hash);
  }

  // Set target level
  record.target_level = options.target;

  // Human certification
  if (options.certify) {
    if (!options.certifier) {
      console.error('\nError: --certify requires --certifier <name>');
      process.exit(1);
    }

    console.log(`\nAdding human certification by: ${options.certifier}`);
    record = addManualCertification(record, options.certifier);
  }

  // Print results
  console.log('');
  printResults(record, options);

  // Save if requested
  if (options.output) {
    saveRecord(record, options.output);
  }

  // Emit portable certificate artifact if requested
  if (options.emitCertificate) {
    const certificate = createPackCertificate(record, pack, options.certifierRole);

    // Determine output directory
    const packDir = path.dirname(filePath);
    const certDir = options.certificateDir ? path.resolve(options.certificateDir) : packDir;

    // Ensure directory exists
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const certPath = path.join(certDir, 'certification.json');
    fs.writeFileSync(certPath, JSON.stringify(certificate, null, 2));

    console.log(`\n✓ Portable certificate emitted to: ${certPath}`);
    console.log('');
    console.log(formatCertificate(certificate));
  }

  // Exit code based on target achievement
  const targetMet = record.current_level >= options.target;
  if (!targetMet) {
    console.log(`\n⚠️  Target level ${options.target} (${CERTIFICATION_LEVEL_NAMES[options.target]}) not yet achieved.`);
  } else {
    console.log(`\n✅ Target level ${options.target} (${CERTIFICATION_LEVEL_NAMES[options.target]}) achieved!`);
  }

  process.exit(targetMet ? 0 : 1);
}

main().catch(error => {
  console.error('Certification failed:', error.message);
  process.exit(1);
});
