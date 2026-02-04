#!/usr/bin/env node
/**
 * RUN PACK - Client Package Version
 *
 * Simplified runner for client use.
 */

import * as fs from 'fs';
import * as path from 'path';

// Re-export from main scripts
const mainScript = path.join(process.cwd(), '..', 'scripts', 'run-pack.js');

if (fs.existsSync(mainScript)) {
  // Dynamic import the main script
  import(mainScript).catch(console.error);
} else {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ACE GOVERNANCE PLATFORM - RUN PACK                  ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx run-pack.js --demo                    Run demo mode
  npx tsx run-pack.js <pack.json> --url <url>   Run against real site

Examples:
  npx tsx run-pack.js --demo
  npx tsx run-pack.js packs/GrantsGov.json --url https://grants.gov

For full documentation, see README.md
`);
}
