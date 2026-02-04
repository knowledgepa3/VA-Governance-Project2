#!/usr/bin/env node
/**
 * Evidence Bundle Verification Script
 *
 * Usage: node scripts/verifyEvidenceBundle.js <bundle_path> [--allow-unsealed]
 *
 * Example: node scripts/verifyEvidenceBundle.js evidence/FDA-SS-75F40126Q00036
 *
 * This script:
 * 1. Validates the evidence bundle structure
 * 2. REQUIRES seal.status === "SEALED" (unless --allow-unsealed)
 * 3. Verifies SHA-256 hashes match
 * 4. Checks governance gate requirements
 * 5. Reports readiness for BD Capture
 *
 * Exit codes:
 *   0 = Verified and ready for BD Capture
 *   1 = Verification failed
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============================================================================
// CONFIGURATION
// =============================================================================

const MINIMUM_CONFIDENCE_SCORE = 70;
const MINIMUM_SCREENSHOTS = 2;
const REQUIRED_FILES = ['opportunity.json', 'manifest.json', 'extraction_log.json'];
const RECOMMENDED_FILES = ['opportunity.md'];

// =============================================================================
// UTILITIES
// =============================================================================

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function colorize(text, color) {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log('\n' + colorize('═'.repeat(60), 'blue'));
  console.log(colorize(`  ${text}`, 'blue'));
  console.log(colorize('═'.repeat(60), 'blue'));
}

function printResult(label, passed, details = '') {
  const icon = passed ? colorize('✓', 'green') : colorize('✗', 'red');
  const status = passed ? colorize('PASS', 'green') : colorize('FAIL', 'red');
  console.log(`  ${icon} ${label}: ${status}${details ? ` - ${details}` : ''}`);
}

function printWarning(message) {
  console.log(`  ${colorize('⚠', 'yellow')} ${colorize(message, 'yellow')}`);
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateSealStatus(bundlePath, allowUnsealed) {
  printHeader('SEAL STATUS CHECK');

  const manifestPath = path.join(bundlePath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    printResult('Manifest exists', false);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const sealStatus = manifest.seal?.status;

  if (sealStatus === 'SEALED') {
    printResult('Seal status', true, 'SEALED');
    console.log(`    Sealed at: ${manifest.seal.sealed_at}`);
    console.log(`    Sealing tool: ${manifest.seal.sealing_tool} v${manifest.seal.sealing_tool_version}`);
    return true;
  } else {
    if (allowUnsealed) {
      printWarning(`Seal status: ${sealStatus || 'UNSEALED'} (--allow-unsealed flag set)`);
      return true;
    } else {
      printResult('Seal status', false, `${sealStatus || 'UNSEALED'} - must be SEALED`);
      console.log('\n    Bundle must be sealed before BD Capture can proceed.');
      console.log('    Run: node scripts/sealEvidenceBundle.js ' + bundlePath);
      return false;
    }
  }
}

function validateStructure(bundlePath) {
  printHeader('STRUCTURE VALIDATION');

  let allPassed = true;

  // Check required files
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(bundlePath, file);
    const exists = fs.existsSync(filePath);
    printResult(`Required: ${file}`, exists);
    if (!exists) allPassed = false;
  }

  // Check recommended files
  for (const file of RECOMMENDED_FILES) {
    const filePath = path.join(bundlePath, file);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      printWarning(`Recommended file missing: ${file}`);
    } else {
      console.log(`  ${colorize('○', 'cyan')} Recommended: ${file} - present`);
    }
  }

  // Check raw text
  const rawPath = path.join(bundlePath, 'raw', 'page_text.txt');
  const rawExists = fs.existsSync(rawPath);
  printResult('Raw text snapshot', rawExists);
  if (!rawExists) allPassed = false;

  return allPassed;
}

function validateOpportunityData(bundlePath) {
  printHeader('OPPORTUNITY DATA VALIDATION');

  const opportunityPath = path.join(bundlePath, 'opportunity.json');
  if (!fs.existsSync(opportunityPath)) {
    printResult('Load opportunity.json', false, 'File not found');
    return false;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(opportunityPath, 'utf-8'));
    printResult('Parse opportunity.json', true);
  } catch (err) {
    printResult('Parse opportunity.json', false, err.message);
    return false;
  }

  let allPassed = true;

  // Check schema version
  const hasSchemaVersion = !!data.schema_version;
  console.log(`  ${colorize('○', 'cyan')} Schema version: ${data.schema_version || 'not specified'}`);

  // Check notice_id (now in extracted section)
  const hasNoticeId = !!(data.extracted?.notice_id || data.extracted_fields?.notice_id);
  const noticeId = data.extracted?.notice_id || data.extracted_fields?.notice_id;
  printResult('Notice ID present', hasNoticeId, noticeId || 'MISSING');
  if (!hasNoticeId) allPassed = false;

  // Check confidence score
  const confidence = data.confidence?.overall_score || data.extraction_metadata?.confidence_score || 0;
  const confidencePassed = confidence >= MINIMUM_CONFIDENCE_SCORE;
  printResult(
    `Confidence score ≥ ${MINIMUM_CONFIDENCE_SCORE}%`,
    confidencePassed,
    `${confidence}%`
  );
  if (!confidencePassed) allPassed = false;

  // Check field separation (new schema uses 'extracted', old uses 'extracted_fields')
  const hasExtracted = !!(data.extracted || data.extracted_fields);
  const hasInferred = !!(data.inferred || data.inferred_fields);
  const hasMissing = !!data.missing_fields;
  printResult('Extracted fields section', hasExtracted);
  printResult('Inferred fields section', hasInferred);
  printResult('Missing fields section', hasMissing);

  // Report field counts
  const extractedSection = data.extracted || data.extracted_fields || {};
  const inferredSection = data.inferred || data.inferred_fields || {};

  const extractedCount = Object.keys(extractedSection).filter(k => k !== '_comment').length;
  const inferredCount = Object.keys(inferredSection).filter(k => k !== '_comment').length;
  const missingCount = Object.keys(data.missing_fields || {}).filter(k => k !== '_comment').length;

  console.log(`    → Extracted fields: ${extractedCount}`);
  console.log(`    → Inferred fields: ${inferredCount}`);
  console.log(`    → Missing fields: ${missingCount}`);

  if (missingCount > 5) {
    printWarning(`High number of missing fields (${missingCount})`);
  }

  // Check environment mode
  if (data.environment_mode === 'DEMO') {
    printWarning('Bundle is in DEMO mode - verify data before operational use');
  }

  // Check for normalized timestamps
  const hasNormalizedDates = !!(
    data.extracted?.response_deadline?.iso ||
    data.extracted?.posted_date?.iso
  );
  if (hasNormalizedDates) {
    console.log(`  ${colorize('○', 'cyan')} Timestamps: normalized (raw + ISO)`);
  }

  return allPassed;
}

function validateEvidence(bundlePath) {
  printHeader('EVIDENCE VALIDATION');

  const opportunityPath = path.join(bundlePath, 'opportunity.json');
  const data = JSON.parse(fs.readFileSync(opportunityPath, 'utf-8'));

  let allPassed = true;

  // Check screenshots
  const evidenceSection = data.evidence || data.evidence_artifacts || {};
  const screenshots = evidenceSection.screenshots || [];
  const screenshotCount = screenshots.length;
  const screenshotsPassed = screenshotCount >= MINIMUM_SCREENSHOTS;

  printResult(
    `Minimum screenshots (${MINIMUM_SCREENSHOTS})`,
    screenshotsPassed,
    `Found ${screenshotCount} references`
  );
  if (!screenshotsPassed) allPassed = false;

  // List screenshot references
  for (const ss of screenshots) {
    const ssPath = path.join(bundlePath, ss);
    const exists = fs.existsSync(ssPath);
    if (exists) {
      console.log(`    → ${colorize('✓', 'green')} ${ss} (file exists)`);
    } else {
      console.log(`    → ${colorize('○', 'yellow')} ${ss} (reference only)`);
    }
  }

  // Check extraction log
  const logPath = path.join(bundlePath, 'extraction_log.json');
  const logExists = fs.existsSync(logPath);
  printResult('Extraction log', logExists);

  if (logExists) {
    const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const actionCount = log.extraction_log?.length || 0;
    console.log(`    → Actions logged: ${actionCount}`);

    const failures = log.extraction_log?.filter(a => a.result === 'failure') || [];
    if (failures.length > 0) {
      printWarning(`${failures.length} failed actions in log`);
    }
  }

  return allPassed;
}

function validateHashes(bundlePath) {
  printHeader('HASH INTEGRITY VERIFICATION');

  const manifestPath = path.join(bundlePath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Check if sealed
  if (manifest.seal?.status !== 'SEALED') {
    printWarning('Bundle not sealed - hash verification skipped');
    return true; // Not a failure if we got here with --allow-unsealed
  }

  let hashesValid = true;
  let verifiedCount = 0;
  let skippedCount = 0;

  for (const artifact of manifest.artifacts) {
    const artifactPath = path.join(bundlePath, artifact.path);

    if (artifact.sha256 === 'COMPUTE_ON_BUNDLE_SEAL' || artifact.sha256 === 'FILE_NOT_FOUND') {
      skippedCount++;
      continue;
    }

    if (fs.existsSync(artifactPath)) {
      const currentHash = hashFile(artifactPath);
      const matches = currentHash === artifact.sha256;

      if (!matches) {
        printResult(`Hash: ${artifact.path}`, false, 'MODIFIED SINCE SEAL');
        hashesValid = false;
      } else {
        console.log(`    → ${colorize('✓', 'green')} ${artifact.path}`);
        verifiedCount++;
      }
    } else if (!artifact.required) {
      console.log(`    → ${colorize('○', 'yellow')} ${artifact.path} (optional, not present)`);
      skippedCount++;
    } else {
      printResult(`Hash: ${artifact.path}`, false, 'REQUIRED FILE MISSING');
      hashesValid = false;
    }
  }

  console.log(`\n    Verified: ${verifiedCount} | Skipped: ${skippedCount}`);
  printResult('Hash integrity', hashesValid);

  return hashesValid;
}

function validateGovernance(bundlePath) {
  printHeader('GOVERNANCE & POLICY ATTESTATION');

  const manifestPath = path.join(bundlePath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  let allPassed = true;

  // Check policy attestation
  const attestation = manifest.policy_attestation;
  if (attestation) {
    console.log('  Policy attestation present:');
    console.log(`    → no_login: ${attestation.no_login}`);
    console.log(`    → no_submission: ${attestation.no_submission}`);
    console.log(`    → no_uploads: ${attestation.no_uploads}`);
    console.log(`    → automation_mode: ${attestation.automation_mode}`);

    if (attestation.automation_mode !== 'read-only') {
      printWarning('automation_mode is not "read-only"');
    }
  } else {
    printWarning('No policy_attestation section found');
  }

  // Check BD capture gate
  const gate = manifest.bd_capture_gate;
  if (gate) {
    console.log('\n  BD Capture Gate:');
    const reqs = gate.minimum_requirements || {};
    for (const [key, val] of Object.entries(reqs)) {
      if (typeof val === 'object' && val !== null) {
        const met = val.met ? colorize('✓', 'green') : colorize('✗', 'red');
        console.log(`    ${met} ${key}: ${val.met ? 'met' : val.reason || 'not met'}`);
        if (val.required && !val.met) allPassed = false;
      }
    }

    const gateStatus = gate.gate_passed;
    printResult('BD Capture Gate', gateStatus);
    if (!gateStatus) {
      console.log(`    Reason: ${gate.gate_failure_reason || 'Unknown'}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const allowUnsealed = args.includes('--allow-unsealed');
  const bundlePath = args.find(a => !a.startsWith('--'));

  if (!bundlePath) {
    console.log('Usage: node verifyEvidenceBundle.js <bundle_path> [--allow-unsealed]');
    console.log('Example: node verifyEvidenceBundle.js evidence/FDA-SS-75F40126Q00036');
    console.log('\nFlags:');
    console.log('  --allow-unsealed  Skip seal status requirement (for testing)');
    process.exit(1);
  }

  if (!fs.existsSync(bundlePath)) {
    console.error(colorize(`Bundle path not found: ${bundlePath}`, 'red'));
    process.exit(1);
  }

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'blue'));
  console.log(colorize('║       ACE EVIDENCE BUNDLE VERIFICATION REPORT            ║', 'blue'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝', 'blue'));
  console.log(`\nBundle: ${bundlePath}`);
  console.log(`Verified: ${new Date().toISOString()}`);
  if (allowUnsealed) {
    console.log(colorize('Flag: --allow-unsealed (seal requirement bypassed)', 'yellow'));
  }

  const results = {
    sealStatus: validateSealStatus(bundlePath, allowUnsealed),
    structure: validateStructure(bundlePath),
    opportunityData: validateOpportunityData(bundlePath),
    evidence: validateEvidence(bundlePath),
    hashes: validateHashes(bundlePath),
    governance: validateGovernance(bundlePath)
  };

  // Final summary
  printHeader('VERIFICATION SUMMARY');

  const allPassed = Object.values(results).every(r => r);

  for (const [check, passed] of Object.entries(results)) {
    const label = check.replace(/([A-Z])/g, ' $1').trim();
    printResult(label.charAt(0).toUpperCase() + label.slice(1), passed);
  }

  console.log('\n' + '─'.repeat(60));

  if (allPassed) {
    console.log(colorize('\n  ✓ BUNDLE VERIFIED - Ready for BD Capture\n', 'green'));
    process.exit(0);
  } else {
    console.log(colorize('\n  ✗ BUNDLE VERIFICATION FAILED\n', 'red'));
    console.log('  Fix the issues above before proceeding to BD Capture.');
    if (!results.sealStatus) {
      console.log(`\n  To seal: node scripts/sealEvidenceBundle.js ${bundlePath}`);
    }
    console.log('');
    process.exit(1);
  }
}

main();
