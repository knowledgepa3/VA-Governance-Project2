#!/usr/bin/env node
/**
 * JOB PACK CLI v1.0.0
 *
 * Command-line interface for Job Pack management.
 *
 * Usage:
 *   node scripts/jobpack-cli.js <command> [options]
 *
 * Commands:
 *   scan              Scan jobpacks directory and build registry
 *   list              List all registered packs
 *   info <pack_id>    Show detailed pack information
 *   search <query>    Search packs by keyword
 *   validate <file>   Validate a Job Pack file
 *   hash <file>       Compute pack hash
 *   compare <f1> <f2> Compare two pack files
 *
 * Examples:
 *   node scripts/jobpack-cli.js scan
 *   node scripts/jobpack-cli.js list
 *   node scripts/jobpack-cli.js info SAMGov-OpportunityCapture-v1
 *   node scripts/jobpack-cli.js search "opportunity"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const JOBPACKS_DIR = path.join(__dirname, '..', 'workforce', 'jobpacks');
const REGISTRY_FILE = path.join(JOBPACKS_DIR, '_registry_index.json');

// =============================================================================
// UTILITIES
// =============================================================================

function colorize(text, color) {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadPack(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function validateJobPack(pack) {
  const errors = [];

  // Required fields
  if (!pack.pack_id) errors.push('pack_id is required');
  if (!pack.pack_version) errors.push('pack_version is required');
  if (!pack.role?.name) errors.push('role.name is required');
  if (!pack.role?.mission) errors.push('role.mission is required');

  // MAI boundaries
  if (!pack.authority) errors.push('authority (MAI boundaries) is required');

  // Procedure index
  if (!pack.procedure_index?.mini_index?.length) {
    errors.push('procedure_index.mini_index must have at least one entry');
  }

  // Forbidden actions
  if (!pack.permissions?.forbidden?.length) {
    errors.push('permissions.forbidden must define at least one forbidden action');
  }

  // Escalation triggers
  if (!pack.escalation?.triggers?.length) {
    errors.push('escalation.triggers must define at least one trigger');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// COMMANDS
// =============================================================================

function cmdScan() {
  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║           JOB PACK REGISTRY SCANNER v1.0.0               ║', 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

  console.log(`Scanning: ${JOBPACKS_DIR}\n`);

  const registry = {
    registry_version: '1.0.0',
    updated_at: new Date().toISOString(),
    packs: [],
    by_domain: {},
    by_category: {},
    by_capability: {}
  };

  const files = fs.readdirSync(JOBPACKS_DIR);
  let registered = 0;
  let failed = 0;

  for (const file of files) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue;

    const filePath = path.join(JOBPACKS_DIR, file);

    try {
      const pack = loadPack(filePath);

      // Validate
      const validation = validateJobPack(pack);
      if (!validation.valid) {
        console.log(`  ${colorize('✗', 'red')} ${file}`);
        console.log(`    ${colorize(validation.errors.join(', '), 'yellow')}`);
        failed++;
        continue;
      }

      // Compute hash
      const packHash = hashFile(filePath);

      // Infer category
      const domain = pack.ui_map?.domain?.toLowerCase() || '';
      const mission = pack.role?.mission?.toLowerCase() || '';
      let category = 'general';
      if (domain.includes('sam.gov') || mission.includes('procurement')) category = 'procurement';
      else if (domain.includes('grants.gov') || mission.includes('grant')) category = 'grants';
      else if (domain.includes('usajobs') || mission.includes('hiring')) category = 'hiring';

      // Build entry
      const entry = {
        pack_id: pack.pack_id,
        pack_version: pack.pack_version,
        pack_hash: packHash,
        name: pack.role.name,
        description: pack.role.description,
        domain: pack.ui_map?.domain || 'unknown',
        category: category,
        capabilities: pack.procedure_index.mini_index.map(e => e.task),
        outputs: pack.role.outputs || [],
        required_permissions: pack.permissions.allowed.map(p => p.action),
        mai_profile: {
          informational_count: pack.authority.informational_actions?.length || 0,
          advisory_count: pack.authority.advisory_actions?.length || 0,
          mandatory_count: pack.authority.mandatory_actions?.length || 0
        },
        file_path: filePath,
        loaded_at: new Date().toISOString(),
        min_executor_version: '1.0.0'
      };

      registry.packs.push(entry);

      // Index by domain
      if (!registry.by_domain[entry.domain]) registry.by_domain[entry.domain] = [];
      registry.by_domain[entry.domain].push(entry.pack_id);

      // Index by category
      if (!registry.by_category[entry.category]) registry.by_category[entry.category] = [];
      registry.by_category[entry.category].push(entry.pack_id);

      // Index by capability
      for (const cap of entry.capabilities) {
        const capKey = cap.toLowerCase().replace(/\s+/g, '_');
        if (!registry.by_capability[capKey]) registry.by_capability[capKey] = [];
        registry.by_capability[capKey].push(entry.pack_id);
      }

      console.log(`  ${colorize('✓', 'green')} ${file}`);
      console.log(`    ${colorize(entry.pack_id, 'cyan')} - ${entry.name}`);
      console.log(`    Hash: ${packHash.substring(0, 16)}...`);
      registered++;

    } catch (error) {
      console.log(`  ${colorize('✗', 'red')} ${file}`);
      console.log(`    ${colorize(error.message, 'yellow')}`);
      failed++;
    }
  }

  // Save registry
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));

  console.log('\n' + '─'.repeat(60));
  console.log(`\n${colorize('Registry Summary:', 'bold')}`);
  console.log(`  Registered: ${colorize(registered, 'green')}`);
  console.log(`  Failed:     ${colorize(failed, failed > 0 ? 'red' : 'green')}`);
  console.log(`  Domains:    ${Object.keys(registry.by_domain).join(', ') || 'none'}`);
  console.log(`  Categories: ${Object.keys(registry.by_category).join(', ') || 'none'}`);
  console.log(`\nRegistry saved: ${REGISTRY_FILE}\n`);
}

function cmdList() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.log(colorize('\nRegistry not found. Run "scan" first.\n', 'yellow'));
    return;
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║              REGISTERED JOB PACKS                        ║', 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

  if (registry.packs.length === 0) {
    console.log('  No packs registered.\n');
    return;
  }

  for (const pack of registry.packs) {
    console.log(`${colorize('●', 'cyan')} ${colorize(pack.pack_id, 'bold')}`);
    console.log(`  ${pack.name}`);
    console.log(`  ${colorize('Domain:', 'blue')} ${pack.domain}  ${colorize('Category:', 'blue')} ${pack.category}`);
    console.log(`  ${colorize('MAI:', 'blue')} I:${pack.mai_profile.informational_count} A:${pack.mai_profile.advisory_count} M:${pack.mai_profile.mandatory_count}`);
    console.log(`  ${colorize('Capabilities:', 'blue')} ${pack.capabilities.length}`);
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`Total: ${registry.packs.length} pack(s)\n`);
}

function cmdInfo(packId) {
  if (!packId) {
    console.log(colorize('\nUsage: jobpack-cli info <pack_id>\n', 'yellow'));
    return;
  }

  if (!fs.existsSync(REGISTRY_FILE)) {
    console.log(colorize('\nRegistry not found. Run "scan" first.\n', 'yellow'));
    return;
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const pack = registry.packs.find(p => p.pack_id === packId);

  if (!pack) {
    console.log(colorize(`\nPack not found: ${packId}\n`, 'red'));
    return;
  }

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize(`║  ${pack.name.padEnd(54)} ║`, 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

  console.log(`${colorize('Pack ID:', 'bold')}     ${pack.pack_id}`);
  console.log(`${colorize('Version:', 'bold')}     ${pack.pack_version}`);
  console.log(`${colorize('Hash:', 'bold')}        ${pack.pack_hash.substring(0, 32)}...`);
  console.log(`${colorize('Domain:', 'bold')}      ${pack.domain}`);
  console.log(`${colorize('Category:', 'bold')}    ${pack.category}`);

  console.log(`\n${colorize('Description:', 'bold')}`);
  console.log(`  ${pack.description}`);

  console.log(`\n${colorize('MAI Profile:', 'bold')}`);
  console.log(`  ${colorize('Informational:', 'green')} ${pack.mai_profile.informational_count} (auto-execute)`);
  console.log(`  ${colorize('Advisory:', 'yellow')}      ${pack.mai_profile.advisory_count} (suggest/draft)`);
  console.log(`  ${colorize('Mandatory:', 'red')}     ${pack.mai_profile.mandatory_count} (human approval)`);

  console.log(`\n${colorize('Capabilities:', 'bold')} (${pack.capabilities.length})`);
  for (const cap of pack.capabilities) {
    console.log(`  • ${cap}`);
  }

  console.log(`\n${colorize('Outputs:', 'bold')}`);
  for (const out of pack.outputs) {
    console.log(`  → ${out}`);
  }

  console.log(`\n${colorize('File:', 'bold')} ${pack.file_path}`);
  console.log(`${colorize('Loaded:', 'bold')} ${pack.loaded_at}\n`);
}

function cmdSearch(query) {
  if (!query) {
    console.log(colorize('\nUsage: jobpack-cli search <query>\n', 'yellow'));
    return;
  }

  if (!fs.existsSync(REGISTRY_FILE)) {
    console.log(colorize('\nRegistry not found. Run "scan" first.\n', 'yellow'));
    return;
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const queryLower = query.toLowerCase();

  const results = registry.packs.filter(p =>
    p.name.toLowerCase().includes(queryLower) ||
    p.description.toLowerCase().includes(queryLower) ||
    p.capabilities.some(c => c.toLowerCase().includes(queryLower)) ||
    p.domain.toLowerCase().includes(queryLower)
  );

  console.log(colorize(`\nSearch: "${query}"`, 'bold'));
  console.log('─'.repeat(60));

  if (results.length === 0) {
    console.log('\nNo matching packs found.\n');
    return;
  }

  for (const pack of results) {
    console.log(`\n${colorize('●', 'cyan')} ${colorize(pack.pack_id, 'bold')}`);
    console.log(`  ${pack.name}`);

    // Highlight matching capabilities
    const matchingCaps = pack.capabilities.filter(c =>
      c.toLowerCase().includes(queryLower)
    );
    if (matchingCaps.length > 0) {
      console.log(`  ${colorize('Matching:', 'green')} ${matchingCaps.join(', ')}`);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Found: ${results.length} pack(s)\n`);
}

function cmdValidate(filePath) {
  if (!filePath) {
    console.log(colorize('\nUsage: jobpack-cli validate <file>\n', 'yellow'));
    return;
  }

  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.log(colorize(`\nFile not found: ${resolvedPath}\n`, 'red'));
    return;
  }

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║              JOB PACK VALIDATOR                          ║', 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

  console.log(`File: ${resolvedPath}\n`);

  try {
    const pack = loadPack(resolvedPath);
    const validation = validateJobPack(pack);

    if (validation.valid) {
      console.log(colorize('✓ VALID JOB PACK', 'green'));
      console.log(`\n  Pack ID: ${pack.pack_id}`);
      console.log(`  Version: ${pack.pack_version}`);
      console.log(`  Name:    ${pack.role.name}`);

      const hash = hashFile(resolvedPath);
      console.log(`  Hash:    ${hash.substring(0, 32)}...`);

    } else {
      console.log(colorize('✗ INVALID JOB PACK', 'red'));
      console.log('\nErrors:');
      for (const err of validation.errors) {
        console.log(`  ${colorize('•', 'red')} ${err}`);
      }
    }

  } catch (error) {
    console.log(colorize('✗ PARSE ERROR', 'red'));
    console.log(`\n  ${error.message}`);
  }

  console.log('');
}

function cmdHash(filePath) {
  if (!filePath) {
    console.log(colorize('\nUsage: jobpack-cli hash <file>\n', 'yellow'));
    return;
  }

  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.log(colorize(`\nFile not found: ${resolvedPath}\n`, 'red'));
    return;
  }

  const hash = hashFile(resolvedPath);
  console.log(`\nSHA-256: ${hash}\n`);
}

function cmdCompare(file1, file2) {
  if (!file1 || !file2) {
    console.log(colorize('\nUsage: jobpack-cli compare <file1> <file2>\n', 'yellow'));
    return;
  }

  const path1 = path.resolve(file1);
  const path2 = path.resolve(file2);

  if (!fs.existsSync(path1)) {
    console.log(colorize(`\nFile not found: ${path1}\n`, 'red'));
    return;
  }
  if (!fs.existsSync(path2)) {
    console.log(colorize(`\nFile not found: ${path2}\n`, 'red'));
    return;
  }

  const pack1 = loadPack(path1);
  const pack2 = loadPack(path2);

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║              JOB PACK COMPARISON                         ║', 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝\n', 'cyan'));

  console.log(`Pack 1: ${pack1.pack_id} v${pack1.pack_version}`);
  console.log(`Pack 2: ${pack2.pack_id} v${pack2.pack_version}`);
  console.log('');

  const differences = [];

  // Compare versions
  if (pack1.pack_version !== pack2.pack_version) {
    differences.push(`Version: ${pack1.pack_version} → ${pack2.pack_version}`);
  }

  // Compare hashes
  const hash1 = hashFile(path1);
  const hash2 = hashFile(path2);
  if (hash1 !== hash2) {
    differences.push('Content hash differs');
  }

  // Compare MAI profile
  const mai1 = {
    i: pack1.authority.informational_actions?.length || 0,
    a: pack1.authority.advisory_actions?.length || 0,
    m: pack1.authority.mandatory_actions?.length || 0
  };
  const mai2 = {
    i: pack2.authority.informational_actions?.length || 0,
    a: pack2.authority.advisory_actions?.length || 0,
    m: pack2.authority.mandatory_actions?.length || 0
  };

  if (mai1.i !== mai2.i) differences.push(`Informational actions: ${mai1.i} → ${mai2.i}`);
  if (mai1.a !== mai2.a) differences.push(`Advisory actions: ${mai1.a} → ${mai2.a}`);
  if (mai1.m !== mai2.m) differences.push(`Mandatory actions: ${mai1.m} → ${mai2.m}`);

  // Compare capabilities
  const caps1 = new Set(pack1.procedure_index.mini_index.map(e => e.task));
  const caps2 = new Set(pack2.procedure_index.mini_index.map(e => e.task));

  const added = [...caps2].filter(c => !caps1.has(c));
  const removed = [...caps1].filter(c => !caps2.has(c));

  if (added.length > 0) differences.push(`Added capabilities: ${added.join(', ')}`);
  if (removed.length > 0) differences.push(`Removed capabilities: ${removed.join(', ')}`);

  if (differences.length === 0) {
    console.log(colorize('✓ Packs are identical', 'green'));
  } else {
    console.log(colorize('Differences found:', 'yellow'));
    for (const diff of differences) {
      console.log(`  • ${diff}`);
    }
  }

  console.log('');
}

function cmdHelp() {
  console.log(`
${colorize('JOB PACK CLI v1.0.0', 'bold')}

Usage: node scripts/jobpack-cli.js <command> [options]

${colorize('Commands:', 'cyan')}
  scan              Scan jobpacks directory and build registry
  list              List all registered packs
  info <pack_id>    Show detailed pack information
  search <query>    Search packs by keyword
  validate <file>   Validate a Job Pack file
  hash <file>       Compute pack hash
  compare <f1> <f2> Compare two pack files
  help              Show this help

${colorize('Examples:', 'cyan')}
  node scripts/jobpack-cli.js scan
  node scripts/jobpack-cli.js list
  node scripts/jobpack-cli.js info SAMGov-OpportunityCapture-v1
  node scripts/jobpack-cli.js search "opportunity"
  node scripts/jobpack-cli.js validate workforce/jobpacks/SAMGovOpportunityCapture.json
`);
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'scan':
    cmdScan();
    break;
  case 'list':
    cmdList();
    break;
  case 'info':
    cmdInfo(args[1]);
    break;
  case 'search':
    cmdSearch(args[1]);
    break;
  case 'validate':
    cmdValidate(args[1]);
    break;
  case 'hash':
    cmdHash(args[1]);
    break;
  case 'compare':
    cmdCompare(args[1], args[2]);
    break;
  case 'help':
  case '--help':
  case '-h':
    cmdHelp();
    break;
  default:
    if (command) {
      console.log(colorize(`\nUnknown command: ${command}\n`, 'red'));
    }
    cmdHelp();
}
