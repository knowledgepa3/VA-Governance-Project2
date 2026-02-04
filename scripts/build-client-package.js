#!/usr/bin/env node
/**
 * BUILD CLIENT PACKAGE v1.0.0
 *
 * Generates a deployable client package with selected components.
 *
 * Usage:
 *   npx tsx scripts/build-client-package.js --output ./client-delivery
 *   npx tsx scripts/build-client-package.js --packs GrantsGov,SAMGov --profile FEDRAMP
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = process.cwd();

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           BUILD CLIENT DELIVERY PACKAGE                       ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Parse arguments
const args = process.argv.slice(2);
const outputIdx = args.findIndex(a => a === '--output' || a === '-o');
const outputDir = outputIdx !== -1 ? args[outputIdx + 1] : path.join(BASE_DIR, 'client-delivery');

console.log(`Output directory: ${outputDir}\n`);

// Create directory structure
const dirs = [
  '',
  'governance',
  'executor',
  'packs',
  'profiles',
  'evidence',
  'compliance',
  'docs',
  'scripts'
];

console.log('[1/5] Creating directory structure...');
for (const dir of dirs) {
  const fullPath = path.join(outputDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ Created ${dir || '/'}`);
  }
}

// Copy governance files
console.log('\n[2/5] Copying governance layer...');
const governanceFiles = [
  'RiskProfileSchema.ts',
  'PackCertificationSchema.ts',
  'FrameworkControlMapping.ts',
  'EvidenceBundleSchema.ts',
  'ReportTemplates.ts',
  'IndustryProfiles.ts',
  'PackEconomics.ts',
  'OperationalHealth.ts'
];

for (const file of governanceFiles) {
  const src = path.join(BASE_DIR, 'governance', file);
  const dst = path.join(outputDir, 'governance', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ ${file}`);
  }
}

// Copy executor
console.log('\n[3/5] Copying executor...');
const executorFiles = ['JobPackExecutor.ts', 'MCPBrowserAdapter.ts'];
for (const file of executorFiles) {
  const src = path.join(BASE_DIR, 'executor', file);
  const dst = path.join(outputDir, 'executor', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ ${file}`);
  }
}

// Copy job packs
console.log('\n[4/5] Copying job packs...');
const packsDir = path.join(BASE_DIR, 'workforce', 'jobpacks');
if (fs.existsSync(packsDir)) {
  const packs = fs.readdirSync(packsDir).filter(f => f.endsWith('.json'));
  for (const pack of packs) {
    fs.copyFileSync(
      path.join(packsDir, pack),
      path.join(outputDir, 'packs', pack)
    );
    console.log(`  ✓ ${pack}`);
  }
}

// Copy scripts
console.log('\n[5/5] Copying tools and scripts...');
const scripts = ['run-pack.js', 'certify-pack.js', 'generate-report.js', 'golden-path-demo.js'];
for (const script of scripts) {
  const src = path.join(BASE_DIR, 'scripts', script);
  const dst = path.join(outputDir, 'scripts', script);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ ${script}`);
  }
}

// Copy documentation
const docs = ['OPERATOR_GUIDE.md', 'CLIENT_DELIVERY.md'];
for (const doc of docs) {
  const src = path.join(BASE_DIR, doc);
  const dst = path.join(outputDir, 'docs', doc);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`  ✓ ${doc}`);
  }
}

// Create README
const readme = `# ACE Governance Platform - Client Delivery

## Quick Start

\`\`\`bash
npm install
npx tsx scripts/run-pack.js --demo
\`\`\`

## Contents

- \`governance/\` - Governance schemas and controls
- \`executor/\` - Job Pack executor
- \`packs/\` - Certified Job Packs
- \`profiles/\` - Risk Profiles
- \`scripts/\` - CLI tools
- \`docs/\` - Documentation

## Documentation

See \`docs/OPERATOR_GUIDE.md\` for full documentation.

## Support

Contact: support@your-company.com
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readme);

// Create package.json
const packageJson = {
  name: "ace-governance-client",
  version: "2.0.0",
  description: "ACE Governance Platform - Client Delivery",
  type: "module",
  scripts: {
    "demo": "npx tsx scripts/run-pack.js --demo",
    "verify": "npx tsx verify-setup.js"
  },
  dependencies: {
    "tsx": "^4.0.0"
  }
};

fs.writeFileSync(
  path.join(outputDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    BUILD COMPLETE                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Output: ${outputDir.padEnd(51)}║
║                                                               ║
║  To test:                                                     ║
║    cd ${outputDir.substring(0, 49).padEnd(49)}   ║
║    npm install                                                ║
║    npx tsx scripts/run-pack.js --demo                         ║
╚═══════════════════════════════════════════════════════════════╝
`);
