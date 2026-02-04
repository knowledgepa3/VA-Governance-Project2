#!/usr/bin/env node
/**
 * HEALTH CHECK CLI v1.0.0
 *
 * Runs operational health checks on a Job Pack including:
 * - UI Anchor Health
 * - Drift Detection
 * - Execution History Analysis
 *
 * Usage:
 *   npx tsx scripts/health-check.js [pack-path]
 *   npx tsx scripts/health-check.js --demo
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  checkUIHealth,
  detectDrift,
  analyzeExecutionHistory,
  generateHealthDashboard,
  formatUIHealthReport,
  formatDriftReport,
  formatExecutionHistory,
  formatHealthDashboard
} from '../governance/OperationalHealth.js';

// =============================================================================
// DEMO MODE
// =============================================================================

function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             OPERATIONAL HEALTH CHECK - DEMO                   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Demo pack data
  const demoPackId = 'GrantsGovOpportunityFinder';

  // Demo anchors
  const demoAnchors = [
    {
      anchor_id: 'grants_search_input',
      selector: '#search-input',
      expected_text: 'Search grants',
      criticality: 'CRITICAL'
    },
    {
      anchor_id: 'apply_button',
      selector: '.apply-btn',
      expected_text: 'Apply',
      criticality: 'HIGH'
    },
    {
      anchor_id: 'filter_dropdown',
      selector: '#filter-select',
      expected_text: 'Filter by',
      criticality: 'MEDIUM'
    }
  ];

  // Demo current state (simulating some issues)
  const demoCurrentState = [
    {
      anchor_id: 'grants_search_input',
      found: true,
      text_match: true,
      position_stable: true,
      response_time_ms: 45
    },
    {
      anchor_id: 'apply_button',
      found: true,
      text_match: false, // Text changed!
      current_text: 'Submit Application',
      position_stable: true,
      response_time_ms: 38
    },
    {
      anchor_id: 'filter_dropdown',
      found: false, // Missing!
      text_match: false,
      position_stable: false,
      response_time_ms: 5000
    }
  ];

  // 1. UI Health Check
  console.log('\n[1/4] Running UI Anchor Health Check...\n');
  const uiHealth = checkUIHealth(demoPackId, demoAnchors, demoCurrentState);
  console.log(formatUIHealthReport(uiHealth));

  // 2. Drift Detection
  console.log('\n[2/4] Running Drift Detection...\n');
  const demoVersionHistory = [
    { version: '1.0.0', hash: 'abc123', timestamp: '2026-01-01T00:00:00Z', changes: ['Initial release'] },
    { version: '1.0.1', hash: 'def456', timestamp: '2026-01-15T00:00:00Z', changes: ['Fixed timeout'] },
    { version: '1.1.0', hash: 'ghi789', timestamp: '2026-02-01T00:00:00Z', changes: ['Added filters', 'New escalation triggers'] }
  ];
  const driftReport = detectDrift(demoPackId, '1.1.0', 'ghi789', demoVersionHistory);
  console.log(formatDriftReport(driftReport));

  // 3. Execution History
  console.log('\n[3/4] Analyzing Execution History...\n');
  const demoExecutions = [
    { execution_id: 'exec-001', status: 'SUCCESS', duration_ms: 45000, started_at: '2026-01-28T10:00:00Z' },
    { execution_id: 'exec-002', status: 'SUCCESS', duration_ms: 48000, started_at: '2026-01-29T10:00:00Z' },
    { execution_id: 'exec-003', status: 'FAILURE', duration_ms: 62000, started_at: '2026-01-30T10:00:00Z', error: 'Timeout' },
    { execution_id: 'exec-004', status: 'SUCCESS', duration_ms: 43000, started_at: '2026-01-31T10:00:00Z' },
    { execution_id: 'exec-005', status: 'SUCCESS', duration_ms: 47000, started_at: '2026-02-01T10:00:00Z' },
    { execution_id: 'exec-006', status: 'SUCCESS', duration_ms: 44000, started_at: '2026-02-01T14:00:00Z' },
    { execution_id: 'exec-007', status: 'ESCALATED', duration_ms: 55000, started_at: '2026-02-01T16:00:00Z' },
  ];
  const execHistory = analyzeExecutionHistory(demoPackId, demoExecutions);
  console.log(formatExecutionHistory(execHistory));

  // 4. Health Dashboard
  console.log('\n[4/4] Generating Health Dashboard...\n');
  const dashboard = generateHealthDashboard(demoPackId, uiHealth, driftReport, execHistory);
  console.log(formatHealthDashboard(dashboard));

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    DEMO COMPLETE                              ║
╠═══════════════════════════════════════════════════════════════╣
║  This demo showed:                                            ║
║    1. UI Anchor Health - detecting site changes               ║
║    2. Drift Detection - tracking version changes              ║
║    3. Execution History - analyzing run patterns              ║
║    4. Health Dashboard - combined operational view            ║
║                                                               ║
║  In production, this data comes from:                         ║
║    - Live page scraping (UI anchors)                          ║
║    - Pack registry (versions)                                 ║
║    - Evidence bundles (executions)                            ║
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
Health Check CLI v1.0.0

USAGE:
  npx tsx scripts/health-check.js [options]

OPTIONS:
  --demo, -d      Run demo with sample data
  --help, -h      Show this help message

EXAMPLES:
  npx tsx scripts/health-check.js --demo
`);
    return;
  }

  // Default to demo mode
  runDemo();
}

main().catch(console.error);
