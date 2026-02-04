#!/usr/bin/env node
/**
 * INDUSTRY PROFILES CLI v1.0.0
 *
 * Browse and compare industry risk profile presets.
 *
 * Supported Frameworks:
 * - FedRAMP (Federal Risk and Authorization Management Program)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - SOC 2 (Service Organization Control 2)
 * - PCI DSS (Payment Card Industry Data Security Standard)
 * - GDPR (General Data Protection Regulation)
 *
 * Usage:
 *   npx tsx scripts/industry-profiles.js --list
 *   npx tsx scripts/industry-profiles.js --profile FEDRAMP
 *   npx tsx scripts/industry-profiles.js --compare FEDRAMP,HIPAA,SOC2
 */

import {
  INDUSTRY_PROFILES,
  getIndustryProfile,
  listIndustryProfiles,
  findProfilesByFramework,
  compareProfiles,
  formatProfileSummary
} from '../governance/IndustryProfiles.js';

// =============================================================================
// COMMANDS
// =============================================================================

function listAllProfiles() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              INDUSTRY RISK PROFILE PRESETS                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const profiles = listIndustryProfiles();

  for (const meta of profiles) {
    console.log(`
  ┌────────────────────────────────────────────────────────────┐
  │  ${meta.name.padEnd(56)}│
  ├────────────────────────────────────────────────────────────┤
  │  Key:         ${meta.profile_key.padEnd(44)}│
  │  Industry:    ${meta.industry.padEnd(44)}│
  │  Frameworks:  ${meta.compliance_frameworks.join(', ').substring(0, 44).padEnd(44)}│
  │  Min Pack:    Level ${meta.certification_requirements.min_pack_level}                                      │
  │  Retention:   ${(meta.certification_requirements.audit_retention_days + ' days').padEnd(44)}│
  └────────────────────────────────────────────────────────────┘`);
  }

  console.log(`

  Available profile keys: ${Object.keys(INDUSTRY_PROFILES).join(', ')}

  Usage:
    npx tsx scripts/industry-profiles.js --profile FEDRAMP
    npx tsx scripts/industry-profiles.js --compare FEDRAMP,HIPAA
`);
}

function showProfile(key) {
  const profile = getIndustryProfile(key);
  if (!profile) {
    console.error(`Profile not found: ${key}`);
    console.error(`Available profiles: ${Object.keys(INDUSTRY_PROFILES).join(', ')}`);
    process.exit(1);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              INDUSTRY PROFILE DETAILS                         ║
╚═══════════════════════════════════════════════════════════════╝
`);

  console.log(formatProfileSummary(key));

  // Show appetite details
  const appetite = profile.appetite;
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  RISK APPETITE (Policy Layer)                                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Max Autonomous MAI:    ${appetite.job_pack_policy.max_autonomous_mai_level.padEnd(37)}║
║  Mandatory Auto-Exec:   ${(appetite.job_pack_policy.allow_mandatory_auto_execution ? 'Allowed' : 'Forbidden').padEnd(37)}║
║  Min Cert Level:        ${appetite.job_pack_policy.min_pack_certification_level.toString().padEnd(37)}║
╠═══════════════════════════════════════════════════════════════╣
║  FORBIDDEN ACTIONS                                            ║
${appetite.action_policy.globally_forbidden_actions.slice(0, 8).map(a => `║    ✗ ${a.padEnd(55)}║`).join('\n')}
${appetite.action_policy.globally_forbidden_actions.length > 8 ? `║    ... and ${appetite.action_policy.globally_forbidden_actions.length - 8} more                                        ║\n` : ''}╠═══════════════════════════════════════════════════════════════╣
║  REQUIRE APPROVAL                                             ║
${appetite.action_policy.always_require_approval.map(a => `║    ⚠ ${a.padEnd(55)}║`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  AUTO-APPROVED                                                ║
${appetite.action_policy.auto_approved_actions.map(a => `║    ✓ ${a.padEnd(55)}║`).join('\n')}
╠═══════════════════════════════════════════════════════════════╣
║  EVIDENCE REQUIREMENTS                                        ║
║    Level:       ${appetite.evidence_policy.minimum_evidence_level.padEnd(45)}║
║    Sealed:      ${(appetite.evidence_policy.require_sealed_bundles ? 'Required' : 'Optional').padEnd(45)}║
║    Screenshots: ${(appetite.evidence_policy.require_milestone_screenshots ? 'Required' : 'Optional').padEnd(45)}║
║    Provenance:  ${(appetite.evidence_policy.require_source_provenance ? 'Required' : 'Optional').padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Show tolerance details
  const tolerance = profile.tolerance;
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  RISK TOLERANCE (Control Layer)                               ║
╠═══════════════════════════════════════════════════════════════╣
║  CONFIDENCE THRESHOLDS                                        ║
║    Critical Fields:     ${(tolerance.confidence_thresholds.critical_field_minimum * 100).toFixed(0)}%                                   ║
║    Standard Fields:     ${(tolerance.confidence_thresholds.standard_field_minimum * 100).toFixed(0)}%                                   ║
║    Escalation:          ${(tolerance.confidence_thresholds.escalation_threshold * 100).toFixed(0)}%                                   ║
╠═══════════════════════════════════════════════════════════════╣
║  RETRY LIMITS                                                 ║
║    Max per Step:        ${tolerance.retry_limits.max_retries_per_step.toString().padEnd(37)}║
║    Max per Job:         ${tolerance.retry_limits.max_retries_per_job.toString().padEnd(37)}║
║    Max Consecutive:     ${tolerance.retry_limits.max_consecutive_failures.toString().padEnd(37)}║
╠═══════════════════════════════════════════════════════════════╣
║  TIMEOUTS                                                     ║
║    Step:                ${(tolerance.timeouts.step_timeout_ms / 1000).toFixed(0)}s                                     ║
║    Job:                 ${(tolerance.timeouts.job_timeout_ms / 1000).toFixed(0)}s                                    ║
║    Idle Escalation:     ${(tolerance.timeouts.idle_escalation_ms / 1000).toFixed(0)}s                                     ║
╠═══════════════════════════════════════════════════════════════╣
║  ANOMALY DETECTION                                            ║
║    Enabled:             ${(tolerance.anomaly_detection.enabled ? 'Yes' : 'No').padEnd(37)}║
║    Action Threshold:    ${tolerance.anomaly_detection.unusual_action_count_threshold.toString().padEnd(37)}║
║    Duration Multiplier: ${tolerance.anomaly_detection.unusual_duration_multiplier.toString().padEnd(37)}║
║    Auto-Stop:           ${(tolerance.anomaly_detection.auto_stop_on_anomaly ? 'Yes' : 'No').padEnd(37)}║
╚═══════════════════════════════════════════════════════════════╝
`);
}

function compareProfilesCLI(keys) {
  const keyList = keys.split(',').map(k => k.trim().toUpperCase());

  if (keyList.length < 2) {
    console.error('Please provide at least 2 profiles to compare (comma-separated)');
    console.error('Example: --compare FEDRAMP,HIPAA,SOC2');
    process.exit(1);
  }

  // Validate all keys exist
  for (const key of keyList) {
    if (!INDUSTRY_PROFILES[key]) {
      console.error(`Profile not found: ${key}`);
      console.error(`Available profiles: ${Object.keys(INDUSTRY_PROFILES).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              INDUSTRY PROFILE COMPARISON                      ║
╚═══════════════════════════════════════════════════════════════╝
`);

  console.log(compareProfiles(keyList));

  // Detailed comparison table
  const profiles = keyList.map(k => INDUSTRY_PROFILES[k]);

  console.log(`

╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           DETAILED COMPARISON                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════╣`);

  // Header row
  let header = '║  Attribute              ';
  for (const profile of profiles) {
    header += profile.metadata.profile_key.padEnd(12);
  }
  console.log(header.padEnd(83) + '║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');

  // Metadata
  console.log('║  METADATA'.padEnd(83) + '║');
  let row = '║    Industry             ';
  for (const profile of profiles) {
    row += profile.metadata.industry.substring(0, 10).padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Retention (days)     ';
  for (const profile of profiles) {
    row += profile.metadata.certification_requirements.audit_retention_days.toString().padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  // Appetite
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  RISK APPETITE'.padEnd(83) + '║');

  row = '║    MAI Level            ';
  for (const profile of profiles) {
    row += profile.appetite.job_pack_policy.max_autonomous_mai_level.substring(0, 10).padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Min Cert             ';
  for (const profile of profiles) {
    row += ('Level ' + profile.appetite.job_pack_policy.min_pack_certification_level).padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Forbidden Actions    ';
  for (const profile of profiles) {
    row += profile.appetite.action_policy.globally_forbidden_actions.length.toString().padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Sealed Bundles       ';
  for (const profile of profiles) {
    row += (profile.appetite.evidence_policy.require_sealed_bundles ? 'Required' : 'Optional').padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  // Tolerance
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  RISK TOLERANCE'.padEnd(83) + '║');

  row = '║    Critical Confidence  ';
  for (const profile of profiles) {
    row += ((profile.tolerance.confidence_thresholds.critical_field_minimum * 100).toFixed(0) + '%').padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Max Retries/Step     ';
  for (const profile of profiles) {
    row += profile.tolerance.retry_limits.max_retries_per_step.toString().padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Step Timeout         ';
  for (const profile of profiles) {
    row += ((profile.tolerance.timeouts.step_timeout_ms / 1000) + 's').padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Anomaly Detection    ';
  for (const profile of profiles) {
    row += (profile.tolerance.anomaly_detection.enabled ? 'Enabled' : 'Disabled').padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  row = '║    Auto-Stop            ';
  for (const profile of profiles) {
    row += (profile.tolerance.anomaly_detection.auto_stop_on_anomaly ? 'Yes' : 'No').padEnd(12);
  }
  console.log(row.padEnd(83) + '║');

  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝');
}

function searchByFramework(framework) {
  const matches = findProfilesByFramework(framework);

  if (matches.length === 0) {
    console.log(`No profiles found matching framework: ${framework}`);
    console.log(`Available profiles: ${Object.keys(INDUSTRY_PROFILES).join(', ')}`);
    return;
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  PROFILES FOR: ${framework.toUpperCase().padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
`);

  for (const profile of matches) {
    console.log(`  • ${profile.metadata.name} (${profile.metadata.profile_key})`);
    console.log(`    Frameworks: ${profile.metadata.compliance_frameworks.join(', ')}`);
    console.log('');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Industry Profiles CLI v1.0.0

USAGE:
  npx tsx scripts/industry-profiles.js [options]

OPTIONS:
  --list, -l              List all available industry profiles
  --profile, -p <KEY>     Show detailed profile (FEDRAMP, HIPAA, SOC2, PCI_DSS, GDPR)
  --compare, -c <KEYS>    Compare profiles (comma-separated)
  --framework, -f <NAME>  Search profiles by compliance framework
  --help, -h              Show this help message

EXAMPLES:
  npx tsx scripts/industry-profiles.js --list
  npx tsx scripts/industry-profiles.js --profile FEDRAMP
  npx tsx scripts/industry-profiles.js --compare FEDRAMP,HIPAA,SOC2
  npx tsx scripts/industry-profiles.js --framework NIST
`);
    return;
  }

  // --list or -l
  if (args.includes('--list') || args.includes('-l')) {
    listAllProfiles();
    return;
  }

  // --profile or -p
  const profileIdx = args.findIndex(a => a === '--profile' || a === '-p');
  if (profileIdx !== -1 && args[profileIdx + 1]) {
    showProfile(args[profileIdx + 1]);
    return;
  }

  // --compare or -c
  const compareIdx = args.findIndex(a => a === '--compare' || a === '-c');
  if (compareIdx !== -1 && args[compareIdx + 1]) {
    compareProfilesCLI(args[compareIdx + 1]);
    return;
  }

  // --framework or -f
  const frameworkIdx = args.findIndex(a => a === '--framework' || a === '-f');
  if (frameworkIdx !== -1 && args[frameworkIdx + 1]) {
    searchByFramework(args[frameworkIdx + 1]);
    return;
  }

  // Default: show list
  listAllProfiles();
}

main().catch(console.error);
