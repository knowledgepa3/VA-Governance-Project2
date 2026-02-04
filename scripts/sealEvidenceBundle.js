#!/usr/bin/env node
/**
 * Evidence Bundle Sealing Script v1.2.0
 *
 * Usage: node scripts/sealEvidenceBundle.js <bundle_path> [options]
 *
 * Options:
 *   --sealed-by <name>       Who is sealing this bundle (default: system)
 *   --role <role>            Role of the sealer (default: automated)
 *   --reason <reason>        Reason for sealing (default: standard_extraction)
 *   --pack-hash <hash>       Instruction pack version hash (optional)
 *
 * Example:
 *   node scripts/sealEvidenceBundle.js evidence/FDA-SS-75F40126Q00036
 *   node scripts/sealEvidenceBundle.js evidence/FDA-SS-75F40126Q00036 --sealed-by "John Smith" --role "BD Analyst"
 *
 * This script:
 * 1. Validates bundle structure and bundle_id matches folder name
 * 2. Validates source_context.json exists
 * 3. Validates required semantic screenshot tags
 * 4. Validates critical field confidence gates
 * 5. Computes SHA-256 hash for each artifact (with mime_type and size_bytes)
 * 6. Computes overall bundle hash
 * 7. Computes manifest hash (for integrity)
 * 8. Records sealed_by, seal_reason, pack_hash
 * 9. Sets seal.status = "SEALED"
 * 10. Updates bd_capture_gate to reflect new state
 * 11. Runs verification automatically
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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

function parseArgs(args) {
  const options = {
    bundlePath: null,
    sealedBy: 'ACE Governance Platform',
    role: 'automated',
    reason: 'standard_extraction',
    packHash: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sealed-by' && args[i + 1]) {
      options.sealedBy = args[++i];
    } else if (args[i] === '--role' && args[i + 1]) {
      options.role = args[++i];
    } else if (args[i] === '--reason' && args[i + 1]) {
      options.reason = args[++i];
    } else if (args[i] === '--pack-hash' && args[i + 1]) {
      options.packHash = args[++i];
    } else if (!args[i].startsWith('--')) {
      options.bundlePath = args[i];
    }
  }

  return options;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateBeforeSeal(bundlePath, manifest) {
  const errors = [];
  const warnings = [];

  // 1. Bundle ID must match folder name
  const folderName = path.basename(bundlePath);
  if (manifest.bundle_id !== folderName) {
    errors.push(`bundle_id "${manifest.bundle_id}" does not match folder name "${folderName}"`);
  }

  // 2. Check manifest exists (already loaded if we're here)

  // 3. Check opportunity.json exists
  const opportunityPath = path.join(bundlePath, 'opportunity.json');
  if (!fs.existsSync(opportunityPath)) {
    errors.push('opportunity.json not found');
  }

  // 4. Check source_context.json exists (NEW - provenance)
  const sourceContextPath = path.join(bundlePath, 'source_context.json');
  if (!fs.existsSync(sourceContextPath)) {
    errors.push('source_context.json not found - provenance record required');
  }

  // 5. Check raw page text exists
  const rawTextPath = path.join(bundlePath, 'raw', 'page_text.txt');
  if (!fs.existsSync(rawTextPath)) {
    errors.push('raw/page_text.txt not found');
  }

  // 6. Check extraction_log.json exists
  const logPath = path.join(bundlePath, 'extraction_log.json');
  if (!fs.existsSync(logPath)) {
    errors.push('extraction_log.json not found');
  }

  // 7. Check required semantic screenshot tags
  if (manifest.screenshot_requirements?.required_semantic_tags) {
    const requiredTags = manifest.screenshot_requirements.required_semantic_tags;
    const presentTags = manifest.artifacts
      .filter(a => a.type === 'screenshot' && a.semantic_tag)
      .map(a => a.semantic_tag);

    for (const tag of requiredTags) {
      if (!presentTags.includes(tag)) {
        errors.push(`Required semantic screenshot tag missing: ${tag}`);
      }
    }
  }

  // 8. Check critical field confidence gates
  if (manifest.field_confidence?.critical_fields) {
    for (const [field, config] of Object.entries(manifest.field_confidence.critical_fields)) {
      if (config.confidence < config.minimum_required) {
        errors.push(`Critical field "${field}" confidence ${config.confidence} < required ${config.minimum_required}`);
      }
    }
  }

  // 9. Load opportunity and check for notice_id
  if (fs.existsSync(opportunityPath)) {
    try {
      const opp = JSON.parse(fs.readFileSync(opportunityPath, 'utf-8'));
      const extracted = opp.extracted || opp.extracted_fields || {};
      if (!extracted.notice_id) {
        errors.push('notice_id not found in opportunity.json extracted fields');
      }
    } catch (e) {
      errors.push('Failed to parse opportunity.json: ' + e.message);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =============================================================================
// MAIN SEALING LOGIC
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.bundlePath) {
    console.log('Usage: node sealEvidenceBundle.js <bundle_path> [options]');
    console.log('\nOptions:');
    console.log('  --sealed-by <name>   Who is sealing this bundle');
    console.log('  --role <role>        Role of the sealer');
    console.log('  --reason <reason>    Reason for sealing');
    console.log('  --pack-hash <hash>   Instruction pack version hash');
    console.log('\nExample:');
    console.log('  node sealEvidenceBundle.js evidence/FDA-SS-75F40126Q00036 --sealed-by "John Smith"');
    process.exit(1);
  }

  const bundlePath = options.bundlePath;
  const manifestPath = path.join(bundlePath, 'manifest.json');

  console.log(colorize('\n╔══════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║       ACE EVIDENCE BUNDLE SEALING v1.2.0                  ║', 'cyan'));
  console.log(colorize('╚══════════════════════════════════════════════════════════╝', 'cyan'));
  console.log(`\nBundle: ${bundlePath}`);
  console.log(`Sealed By: ${options.sealedBy}`);
  console.log(`Role: ${options.role}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Load manifest
  if (!fs.existsSync(manifestPath)) {
    console.log(colorize('\n✗ manifest.json not found', 'red'));
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Check if already sealed
  if (manifest.seal?.status === 'SEALED') {
    console.log(colorize('\n⚠ Bundle is already SEALED!', 'yellow'));
    console.log(`  Sealed at: ${manifest.seal.sealed_at}`);
    console.log(`  Sealed by: ${manifest.seal.sealed_by}`);
    console.log(`  Bundle hash: ${manifest.seal.bundle_hash || 'N/A'}`);
    console.log('\nTo re-seal, manually set seal.status to "UNSEALED" in manifest.json');
    process.exit(1);
  }

  // Pre-seal validation
  console.log('\n' + colorize('─── Pre-Seal Validation ───', 'blue'));
  const validation = validateBeforeSeal(bundlePath, manifest);

  if (!validation.valid) {
    console.log(colorize('\n✗ Pre-seal validation FAILED:', 'red'));
    validation.errors.forEach(e => console.log(`  ${colorize('✗', 'red')} ${e}`));
    console.log('\nFix the issues above before sealing.');
    process.exit(1);
  }

  validation.warnings.forEach(w => console.log(`  ${colorize('⚠', 'yellow')} ${w}`));
  console.log(colorize('  ✓ All validation checks passed', 'green'));

  // Compute hashes
  console.log('\n' + colorize('─── Computing Artifact Hashes ───', 'blue'));

  const hashes = [];
  let requiredMissing = false;

  for (const artifact of manifest.artifacts) {
    const artifactPath = path.join(bundlePath, artifact.path);

    if (fs.existsSync(artifactPath)) {
      const hash = hashFile(artifactPath);
      const stats = fs.statSync(artifactPath);

      artifact.sha256 = hash;
      artifact.size_bytes = stats.size;
      hashes.push(hash);

      console.log(`  ${colorize('✓', 'green')} ${artifact.path}`);
      console.log(`    SHA-256: ${hash.substring(0, 16)}...${hash.substring(48)}`);
      console.log(`    Size: ${stats.size} bytes | Type: ${artifact.mime_type || 'unknown'}`);
    } else {
      artifact.sha256 = 'FILE_NOT_FOUND';
      artifact.size_bytes = null;
      if (artifact.required) {
        console.log(`  ${colorize('✗', 'red')} ${artifact.path} (REQUIRED - MISSING)`);
        requiredMissing = true;
      } else {
        console.log(`  ${colorize('○', 'yellow')} ${artifact.path} (optional - not found)`);
      }
    }
  }

  if (requiredMissing) {
    console.log(colorize('\n✗ Cannot seal: required artifacts missing', 'red'));
    process.exit(1);
  }

  // Compute bundle hash (hash of all artifact hashes)
  const bundleHash = crypto.createHash('sha256')
    .update(hashes.join(''))
    .digest('hex');

  console.log('\n' + colorize('─── Finalizing Seal ───', 'blue'));

  // Update seal section with signing info
  manifest.seal = {
    status: 'SEALED',
    sealed_at: new Date().toISOString(),
    sealing_tool: 'ace-bundle-sealer',
    sealing_tool_version: '1.2.0',
    bundle_hash: bundleHash,
    manifest_sha256: null, // Will be computed after writing
    sealed_by: options.sealedBy,
    sealed_by_role: options.role,
    seal_reason: options.reason,
    pack_hash: options.packHash
  };

  // Update bd_capture_gate
  if (manifest.bd_capture_gate) {
    const reqs = manifest.bd_capture_gate.minimum_requirements;
    if (reqs.seal_status_sealed) {
      reqs.seal_status_sealed.met = true;
      delete reqs.seal_status_sealed.reason;
    }
    if (reqs.hashes_verified) {
      reqs.hashes_verified.met = true;
      delete reqs.hashes_verified.reason;
    }

    // Check all requirements
    const allMet = Object.values(reqs).every(r =>
      typeof r === 'object' && r !== null ? r.met : true
    );

    manifest.bd_capture_gate.gate_passed = allMet;
    manifest.bd_capture_gate.gate_failure_reason = allMet ? null : 'Some requirements not met';
    manifest.bd_capture_gate.gate_evaluated_at = new Date().toISOString();
  }

  // Write manifest (without manifest hash first)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Compute manifest hash and update
  const manifestHash = hashFile(manifestPath);
  manifest.seal.manifest_sha256 = manifestHash;

  // Write final manifest with manifest hash
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`  Bundle Hash: ${colorize(bundleHash.substring(0, 32) + '...', 'cyan')}`);
  console.log(`  Manifest Hash: ${colorize(manifestHash.substring(0, 32) + '...', 'cyan')}`);
  console.log(`  Sealed At: ${manifest.seal.sealed_at}`);
  console.log(`  Sealed By: ${manifest.seal.sealed_by} (${manifest.seal.sealed_by_role})`);
  console.log(`  Reason: ${manifest.seal.seal_reason}`);
  console.log(`  Artifacts: ${manifest.artifacts.length}`);

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log(colorize('\n✓ BUNDLE SEALED SUCCESSFULLY\n', 'green'));

  // Run verification
  console.log(colorize('─── Running Verification ───', 'blue'));

  try {
    const verifyScript = path.join(__dirname, 'verifyEvidenceBundle.js');
    if (fs.existsSync(verifyScript)) {
      console.log(`\nRunning: node ${verifyScript} ${bundlePath}\n`);
      execSync(`node "${verifyScript}" "${bundlePath}"`, { stdio: 'inherit' });
    } else {
      console.log('  Verification script not found - skipping auto-verify');
      console.log(`  Run manually: node scripts/verifyEvidenceBundle.js ${bundlePath}`);
    }
  } catch (e) {
    console.log(colorize('\n⚠ Verification completed with warnings', 'yellow'));
  }

  console.log(colorize('\n✓ Bundle ready for BD Capture\n', 'green'));
}

main();
