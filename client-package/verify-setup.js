#!/usr/bin/env node
/**
 * VERIFY SETUP v1.0.0
 *
 * Verifies the client package is correctly installed and configured.
 */

import * as fs from 'fs';
import * as path from 'path';

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ACE GOVERNANCE PLATFORM - SETUP VERIFICATION        ║
╚═══════════════════════════════════════════════════════════════╝
`);

const checks = [];

// Check 1: Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
checks.push({
  name: 'Node.js Version',
  passed: majorVersion >= 18,
  detail: `${nodeVersion} (requires 18+)`
});

// Check 2: Package files exist
const requiredFiles = [
  'governance/RiskProfileSchema.ts',
  'governance/PackCertificationSchema.ts',
  'executor/JobPackExecutor.ts'
];

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(process.cwd(), '..', file));
  checks.push({
    name: `File: ${file}`,
    passed: exists,
    detail: exists ? 'Found' : 'Missing'
  });
}

// Check 3: Job Packs exist
const packsDir = path.join(process.cwd(), 'packs');
const packsDirExists = fs.existsSync(packsDir);
let packCount = 0;
if (packsDirExists) {
  packCount = fs.readdirSync(packsDir).filter(f => f.endsWith('.json')).length;
}
checks.push({
  name: 'Job Packs Directory',
  passed: packsDirExists && packCount > 0,
  detail: packsDirExists ? `${packCount} packs found` : 'Directory missing'
});

// Check 4: Evidence directory writable
const evidenceDir = path.join(process.cwd(), 'evidence');
if (!fs.existsSync(evidenceDir)) {
  try {
    fs.mkdirSync(evidenceDir, { recursive: true });
  } catch (e) {
    // Ignore
  }
}
const evidenceWritable = fs.existsSync(evidenceDir);
checks.push({
  name: 'Evidence Directory',
  passed: evidenceWritable,
  detail: evidenceWritable ? 'Writable' : 'Cannot create'
});

// Display results
console.log('Running verification checks...\n');

let allPassed = true;
for (const check of checks) {
  const icon = check.passed ? '✓' : '✗';
  const status = check.passed ? 'PASS' : 'FAIL';
  console.log(`  ${icon} ${check.name}`);
  console.log(`    ${status}: ${check.detail}`);
  if (!check.passed) allPassed = false;
}

console.log(`
${'─'.repeat(65)}
`);

if (allPassed) {
  console.log(`
  ✅ ALL CHECKS PASSED

  Your ACE Governance Platform is ready to use.

  Next steps:
    1. Run a demo:     npx tsx run-pack.js --demo
    2. Read the guide: cat README.md
    3. View packs:     ls packs/
`);
} else {
  console.log(`
  ❌ SOME CHECKS FAILED

  Please resolve the issues above before proceeding.

  Common fixes:
    - Ensure Node.js 18+ is installed
    - Run 'npm install' to install dependencies
    - Check that all files were extracted correctly
`);
  process.exit(1);
}
