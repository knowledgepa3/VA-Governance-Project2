#!/usr/bin/env node
/**
 * VALIDATE-PACK CLI v1.0.0
 *
 * Standalone pack validation - no TypeScript required
 *
 * Usage:
 *   node validate-pack.js <pack-file>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Certification levels
const LEVEL_NAMES = {
  0: 'DRAFT',
  1: 'VALIDATED',
  2: 'TESTED',
  3: 'CERTIFIED',
  4: 'PRODUCTION'
};

// Run certification checks
function runCertificationChecks(pack) {
  const results = [];
  const now = new Date().toISOString();

  // V-001: Schema Valid (basic structure check)
  const hasRequiredFields =
    pack.pack_id &&
    pack.pack_version &&
    pack.role &&
    pack.authority &&
    pack.permissions &&
    pack.escalation;
  results.push({
    id: 'V-001',
    name: 'Schema Valid',
    passed: hasRequiredFields,
    evidence: hasRequiredFields ? 'All required fields present' : 'Missing required fields'
  });

  // V-002: Has Pack ID
  const hasPackId = !!pack.pack_id && /^[a-zA-Z0-9_-]+$/i.test(pack.pack_id);
  results.push({
    id: 'V-002',
    name: 'Has Pack ID',
    passed: hasPackId,
    evidence: hasPackId ? `Pack ID: ${pack.pack_id}` : 'Missing or invalid pack_id'
  });

  // V-003: Has Version
  const hasVersion = !!pack.pack_version && /^\d+\.\d+\.\d+/.test(pack.pack_version);
  results.push({
    id: 'V-003',
    name: 'Has Version',
    passed: hasVersion,
    evidence: hasVersion ? `Version: ${pack.pack_version}` : 'Missing or invalid version'
  });

  // V-004: MAI Boundaries Defined
  const info = pack.authority?.informational_actions?.length || 0;
  const advisory = pack.authority?.advisory_actions?.length || 0;
  const mandatory = pack.authority?.mandatory_actions?.length || 0;
  const hasMAI = info > 0 && advisory > 0 && mandatory > 0;
  results.push({
    id: 'V-004',
    name: 'MAI Boundaries Defined',
    passed: hasMAI,
    evidence: `I:${info} A:${advisory} M:${mandatory}`
  });

  // V-005: Forbidden Actions Defined
  const forbiddenCount = pack.permissions?.forbidden?.length || 0;
  const hasForbidden = forbiddenCount >= 3;
  results.push({
    id: 'V-005',
    name: 'Forbidden Actions (≥3)',
    passed: hasForbidden,
    evidence: `${forbiddenCount} forbidden actions defined`
  });

  // V-006: Escalation Triggers (all severities)
  const triggers = pack.escalation?.triggers || [];
  const severities = new Set(triggers.map(t => t.severity));
  const hasAllSeverities =
    severities.has('LOW') &&
    severities.has('MEDIUM') &&
    severities.has('HIGH') &&
    severities.has('CRITICAL');
  results.push({
    id: 'V-006',
    name: 'All Severity Levels',
    passed: hasAllSeverities,
    evidence: `Severities: ${Array.from(severities).join(', ')}`
  });

  // V-007: UI Map Complete
  const anchors = pack.ui_map?.stable_anchors?.length || 0;
  const patterns = pack.ui_map?.url_patterns?.length || 0;
  const hasUIMap = !!pack.ui_map?.domain && anchors >= 3 && patterns >= 2;
  results.push({
    id: 'V-007',
    name: 'UI Map Complete',
    passed: hasUIMap,
    evidence: `Domain: ${pack.ui_map?.domain || 'missing'}, Anchors: ${anchors}, Patterns: ${patterns}`
  });

  // V-008: Procedure Index Exists
  const miniIndex = pack.procedure_index?.mini_index?.length || 0;
  const hasProcedures = miniIndex >= 5;
  results.push({
    id: 'V-008',
    name: 'Procedure Index (≥5)',
    passed: hasProcedures,
    evidence: `${miniIndex} tasks in mini index`
  });

  // V-009: Evidence Requirements
  const lightweight = pack.evidence?.lightweight_capture?.length || 0;
  const milestones = pack.evidence?.milestone_screenshots?.length || 0;
  const hasEvidence = lightweight > 0 && milestones > 0;
  results.push({
    id: 'V-009',
    name: 'Evidence Requirements',
    passed: hasEvidence,
    evidence: `Lightweight: ${lightweight}, Milestones: ${milestones}`
  });

  // V-010: Constraints Reasonable
  const timeout = pack.constraints?.timeout_per_step_ms || 0;
  const retries = pack.constraints?.max_retries_per_step || 0;
  const validConstraints =
    timeout >= 1000 && timeout <= 600000 &&
    retries >= 1 && retries <= 5;
  results.push({
    id: 'V-010',
    name: 'Constraints Valid',
    passed: validConstraints,
    evidence: `Timeout: ${timeout}ms, Retries: ${retries}`
  });

  return results;
}

// Calculate certification level
function calculateLevel(results) {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  // All 10 checks must pass for VALIDATED
  if (passed === total) {
    return 1; // VALIDATED
  }
  return 0; // DRAFT
}

// Main
function main() {
  const packFile = process.argv[2];

  if (!packFile) {
    console.log('Usage: node validate-pack.js <pack-file>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(packFile);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const pack = JSON.parse(content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    PACK VALIDATION                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Pack ID:    ${pack.pack_id}`);
    console.log(`  Version:    ${pack.pack_version}`);
    console.log(`  Hash:       ${hash.substring(0, 32)}...`);
    console.log('');

    const results = runCertificationChecks(pack);
    const level = calculateLevel(results);
    const passed = results.filter(r => r.passed).length;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                       VALIDATION CHECKS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    for (const result of results) {
      const status = result.passed ? '✓' : '✗';
      const mark = result.passed ? '  ' : '  ';
      console.log(`  ${status} ${result.id}: ${result.name}`);
      console.log(`       ${result.evidence}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  Results:     ${passed}/${results.length} passed`);
    console.log(`  Level:       ${LEVEL_NAMES[level]} (${level})`);
    console.log('');

    if (level >= 1) {
      console.log('  ✅ Pack achieves VALIDATED certification level');
    } else {
      console.log('  ⚠️  Pack does not meet VALIDATED requirements');
      console.log('');
      console.log('  Failed checks:');
      for (const result of results.filter(r => !r.passed)) {
        console.log(`    - ${result.id}: ${result.name}`);
      }
    }
    console.log('');

    // Exit with appropriate code
    process.exit(level >= 1 ? 0 : 1);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
