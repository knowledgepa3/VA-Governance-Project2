#!/usr/bin/env node
/**
 * GENERATE-REPORT CLI v1.0.0
 *
 * Generate compliance and governance reports from templates.
 *
 * Usage:
 *   node generate-report.js <preset> [options]
 *
 * Presets:
 *   exec-summary     Quick executive briefing
 *   full-assessment  Full control assessment
 *   gap-analysis     Gap analysis for remediation
 *   audit-package    Audit evidence package
 *   fedramp          FedRAMP-focused NIST report
 *   erm              Enterprise risk management
 *   certification    Pack certification summary
 *   risk-profile     Risk profile documentation
 *
 * Options:
 *   --output, -o     Output file path
 *   --author         Report author name
 *   --org            Organization name
 *   --format         Output format (markdown, json)
 *   --list           List available presets
 *   --help           Show help
 *
 * Examples:
 *   node generate-report.js exec-summary --author "Security Team"
 *   node generate-report.js full-assessment -o compliance/report.md
 *   node generate-report.js --list
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

function parseArgs(args) {
  const options = {
    preset: null,
    output: null,
    author: 'ACE Governance Platform',
    org: null,
    format: 'markdown',
    list: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--author' || arg === '-a') {
      options.author = args[++i];
    } else if (arg === '--org') {
      options.org = args[++i];
    } else if (arg === '--format' || arg === '-f') {
      options.format = args[++i];
    } else if (!arg.startsWith('-')) {
      options.preset = arg;
    }

    i++;
  }

  return options;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  GENERATE-REPORT CLI v1.0.0                   ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  node generate-report.js <preset> [options]

PRESETS:
  exec-summary     Quick executive briefing on risk posture
  full-assessment  Full control assessment for compliance teams
  gap-analysis     Gap analysis for remediation planning
  audit-package    Audit evidence package with artifact links
  fedramp          FedRAMP-focused NIST SP 800-53 report
  erm              Enterprise Risk Management (COSO) focus
  certification    Pack certification summary
  risk-profile     Risk profile documentation

OPTIONS:
  --output, -o <file>   Save report to file (default: stdout)
  --author <name>       Report author (default: ACE Governance Platform)
  --org <name>          Organization name
  --format <type>       Output format: markdown, json (default: markdown)
  --list, -l            List available presets with descriptions
  --help, -h            Show this help

EXAMPLES:
  # Generate executive summary to stdout
  node generate-report.js exec-summary

  # Generate full assessment with author and save to file
  node generate-report.js full-assessment --author "Security Team" -o report.md

  # Generate FedRAMP report for specific org
  node generate-report.js fedramp --org "Agency XYZ" -o fedramp-report.md

  # List all available presets
  node generate-report.js --list
`);
}

async function listPresets() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    AVAILABLE REPORT PRESETS                   ║
╚═══════════════════════════════════════════════════════════════╝

┌──────────────────┬──────────────────────────────────────────────┐
│ Preset Name      │ Description                                  │
├──────────────────┼──────────────────────────────────────────────┤
│ exec-summary     │ Quick executive briefing on risk posture     │
│ full-assessment  │ Full control assessment for compliance teams │
│ gap-analysis     │ Gap analysis for remediation planning        │
│ audit-package    │ Audit evidence package with artifact links   │
│ fedramp          │ FedRAMP-focused NIST SP 800-53 report        │
│ erm              │ Enterprise Risk Management (COSO) focus      │
│ certification    │ Pack certification summary                   │
│ risk-profile     │ Risk profile documentation                   │
└──────────────────┴──────────────────────────────────────────────┘

Usage: node generate-report.js <preset-name> [options]
`);
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

  if (options.list) {
    listPresets();
    process.exit(0);
  }

  if (!options.preset) {
    console.error('Error: No preset specified. Use --help for usage.');
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    REPORT GENERATION                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Preset:  ${options.preset}`);
  console.log(`Author:  ${options.author}`);
  if (options.org) {
    console.log(`Org:     ${options.org}`);
  }
  console.log(`Format:  ${options.format}`);
  console.log('');

  try {
    // Import report templates
    const reportModule = await import('../governance/ReportTemplates.js');
    const { generateFromPreset, REPORT_PRESETS } = reportModule;

    // Check if preset exists
    if (!REPORT_PRESETS[options.preset]) {
      console.error(`Error: Unknown preset '${options.preset}'`);
      console.error(`Available presets: ${Object.keys(REPORT_PRESETS).join(', ')}`);
      process.exit(1);
    }

    // Generate report
    console.log('Generating report...\n');
    const report = generateFromPreset(
      options.preset,
      options.author,
      options.org
    );

    // Output
    let output;
    if (options.format === 'json') {
      output = JSON.stringify(report, null, 2);
    } else {
      output = report.content;
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, output);
      console.log(`✓ Report saved to: ${outputPath}`);
      console.log(`  Controls: ${report.metadata.total_controls}`);
      console.log(`  Enforced: ${report.metadata.enforced}`);
      console.log(`  Evidenced: ${report.metadata.evidenced}`);
      console.log(`  Configurable: ${report.metadata.configurable}`);
    } else {
      console.log('─'.repeat(65));
      console.log(output);
      console.log('─'.repeat(65));
    }

    console.log(`\n✅ Report generated successfully!`);

  } catch (error) {
    console.error(`Error generating report: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Report generation failed:', error.message);
  process.exit(1);
});
