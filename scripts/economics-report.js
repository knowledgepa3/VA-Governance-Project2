#!/usr/bin/env node
/**
 * ECONOMICS REPORT CLI v1.0.0
 *
 * Generate economic analysis reports for Job Packs including:
 * - ROI calculations
 * - Time savings analysis
 * - License management
 * - Cost projections
 *
 * Usage:
 *   npx tsx scripts/economics-report.js [pack-path]
 *   npx tsx scripts/economics-report.js --demo
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  calculateExecutionEconomics,
  calculatePackEconomics,
  checkLicense,
  recordUsage,
  generateEconomicsReport,
  generateLicenseSummary,
  createLicense,
  LICENSE_TIERS
} from '../governance/PackEconomics.js';

// =============================================================================
// DEMO MODE
// =============================================================================

function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              PACK ECONOMICS REPORT - DEMO                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Demo pack baseline
  const demoBaseline = {
    manual_time_minutes: 45,           // How long it takes manually
    manual_hourly_rate: 75,            // Loaded cost of human worker
    manual_error_rate: 0.12,           // 12% error rate manually
    automated_time_minutes: 3,         // Pack execution time
    per_execution_cost: 0.50,          // Platform cost per execution
    setup_cost: 500,                   // One-time setup cost
    monthly_subscription: 99           // Monthly platform fee
  };

  // Demo executions this month
  const demoExecutions = [
    { execution_id: 'exec-001', duration_ms: 180000, status: 'SUCCESS', timestamp: '2026-01-15T10:00:00Z' },
    { execution_id: 'exec-002', duration_ms: 185000, status: 'SUCCESS', timestamp: '2026-01-16T10:00:00Z' },
    { execution_id: 'exec-003', duration_ms: 175000, status: 'SUCCESS', timestamp: '2026-01-17T10:00:00Z' },
    { execution_id: 'exec-004', duration_ms: 190000, status: 'SUCCESS', timestamp: '2026-01-18T10:00:00Z' },
    { execution_id: 'exec-005', duration_ms: 200000, status: 'ESCALATED', timestamp: '2026-01-19T10:00:00Z' },
    { execution_id: 'exec-006', duration_ms: 178000, status: 'SUCCESS', timestamp: '2026-01-20T10:00:00Z' },
    { execution_id: 'exec-007', duration_ms: 182000, status: 'SUCCESS', timestamp: '2026-01-21T10:00:00Z' },
    { execution_id: 'exec-008', duration_ms: 176000, status: 'SUCCESS', timestamp: '2026-01-22T10:00:00Z' },
    { execution_id: 'exec-009', duration_ms: 195000, status: 'SUCCESS', timestamp: '2026-01-23T10:00:00Z' },
    { execution_id: 'exec-010', duration_ms: 188000, status: 'SUCCESS', timestamp: '2026-01-24T10:00:00Z' },
    { execution_id: 'exec-011', duration_ms: 181000, status: 'SUCCESS', timestamp: '2026-01-25T10:00:00Z' },
    { execution_id: 'exec-012', duration_ms: 183000, status: 'SUCCESS', timestamp: '2026-01-26T10:00:00Z' },
    { execution_id: 'exec-013', duration_ms: 179000, status: 'SUCCESS', timestamp: '2026-01-27T10:00:00Z' },
    { execution_id: 'exec-014', duration_ms: 186000, status: 'SUCCESS', timestamp: '2026-01-28T10:00:00Z' },
    { execution_id: 'exec-015', duration_ms: 184000, status: 'SUCCESS', timestamp: '2026-01-29T10:00:00Z' },
    { execution_id: 'exec-016', duration_ms: 177000, status: 'SUCCESS', timestamp: '2026-01-30T10:00:00Z' },
    { execution_id: 'exec-017', duration_ms: 191000, status: 'SUCCESS', timestamp: '2026-01-31T10:00:00Z' },
    { execution_id: 'exec-018', duration_ms: 185000, status: 'SUCCESS', timestamp: '2026-02-01T10:00:00Z' },
  ];

  // 1. Single Execution Economics
  console.log('\n[1/4] Single Execution Economics...\n');
  const singleExec = calculateExecutionEconomics(demoBaseline, demoExecutions[0]);
  console.log(`
  ┌──────────────────────────────────────────┐
  │  SINGLE EXECUTION ANALYSIS               │
  ├──────────────────────────────────────────┤
  │  Manual Time:       ${(singleExec.manual_time_minutes).toString().padStart(6)} minutes    │
  │  Automated Time:    ${(singleExec.automated_time_minutes).toString().padStart(6)} minutes    │
  │  Time Saved:        ${(singleExec.time_saved_minutes).toString().padStart(6)} minutes    │
  │                                          │
  │  Manual Cost:       $${(singleExec.manual_cost).toFixed(2).padStart(7)}          │
  │  Automated Cost:    $${(singleExec.automated_cost).toFixed(2).padStart(7)}          │
  │  Savings:           $${(singleExec.savings).toFixed(2).padStart(7)}          │
  │  ROI:               ${(singleExec.roi_percentage).toFixed(0).padStart(7)}%          │
  └──────────────────────────────────────────┘
`);

  // 2. Monthly Pack Economics
  console.log('\n[2/4] Monthly Pack Economics...\n');
  const packEcon = calculatePackEconomics(demoBaseline, demoExecutions);
  console.log(generateEconomicsReport('GrantsGovOpportunityFinder', packEcon));

  // 3. License Management
  console.log('\n[3/4] License Management...\n');

  // Create a demo license
  let license = createLicense(
    'GrantsGovOpportunityFinder',
    'Demo Organization',
    'PROFESSIONAL'
  );

  // Simulate some usage
  for (let i = 0; i < 18; i++) {
    license = recordUsage(license);
  }

  console.log(generateLicenseSummary(license));

  // 4. License Tiers Comparison
  console.log('\n[4/4] License Tiers Available...\n');
  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║                    LICENSE TIERS                              ║
  ╠═══════════════════════════════════════════════════════════════╣`);

  for (const tier of LICENSE_TIERS) {
    const execLimit = tier.max_executions === -1 ? 'Unlimited' : tier.max_executions.toString();
    console.log(`  ║                                                               ║
  ║  ${tier.name.toUpperCase().padEnd(59)}║
  ║  $${tier.monthly_price}/month                                              ║
  ║  Executions: ${execLimit.padEnd(48)}║
  ║  Features:                                                    ║`);
    for (const feature of tier.features) {
      console.log(`  ║    ✓ ${feature.padEnd(55)}║`);
    }
    console.log(`  ╠═══════════════════════════════════════════════════════════════╣`);
  }
  console.log(`  ╚═══════════════════════════════════════════════════════════════╝`);

  console.log(`

╔═══════════════════════════════════════════════════════════════╗
║                    DEMO COMPLETE                              ║
╠═══════════════════════════════════════════════════════════════╣
║  Key Metrics Demonstrated:                                    ║
║    • ROI: ${((packEcon.total_savings / (packEcon.total_automated_cost + 500)) * 100).toFixed(0)}% return on investment                        ║
║    • Time Saved: ${packEcon.total_time_saved_hours.toFixed(1)} hours this month                      ║
║    • Cost Savings: $${packEcon.total_savings.toFixed(2)} vs manual process                ║
║    • Break-even: ~${Math.ceil(500 / (packEcon.total_savings / 18))} executions to recoup setup cost      ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--demo') || args.includes('-d')) {
    runDemo();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Economics Report CLI v1.0.0

USAGE:
  npx tsx scripts/economics-report.js [options]

OPTIONS:
  --demo, -d      Run demo with sample data
  --help, -h      Show this help message

EXAMPLES:
  npx tsx scripts/economics-report.js --demo
`);
    return;
  }

  // Default to demo mode
  runDemo();
}

main().catch(console.error);
