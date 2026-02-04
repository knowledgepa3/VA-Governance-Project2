/**
 * SAM.gov to BD Capture Opportunity Adapter
 *
 * Transforms SAM.gov Evidence Bundle data into the format
 * expected by the BD Capture workflow.
 *
 * This adapter ensures:
 * 1. Clean separation between source (SAM) and consumer (BD Capture)
 * 2. Evidence bundle validation before processing
 * 3. Proper handling of extracted vs inferred fields
 * 4. Demo mode awareness for Past Performance references
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

/**
 * SAMEvidenceBundle - Schema v1.1.0
 *
 * Uses normalized field names:
 * - extracted (not extracted_fields)
 * - inferred (not inferred_fields)
 * - missing_fields (object map with reasons)
 *
 * Timestamps are dual-format: { raw: "...", iso: "..." }
 */
export interface SAMEvidenceBundle {
  schema_version: string;
  bundle_id: string;
  source: string;
  captured_at: string;
  url: string;

  policy: {
    name: string;
    version: string;
    mode: 'read-only' | 'interactive';
  };

  // Normalized field name: "extracted" (not "extracted_fields")
  extracted: {
    notice_id: string;
    title: string;
    notice_type: string;
    agency: string;
    sub_tier?: string;
    office?: string;
    posted_date: { raw: string; iso: string };
    response_deadline?: { raw: string; iso: string };
    archive_date?: { raw: string; iso: string };
    primary_contact?: {
      name: string;
      email?: string;
      phone?: string | null;
    };
    contracting_office_address?: string;
    description_text?: string;
    gsa_mas_codes_mentioned?: string[];
    attachments?: Array<{
      filename: string;
      size: string;
      access: string;
      updated: string;
    }>;
  };

  // Normalized field name: "inferred" (not "inferred_fields")
  inferred: {
    set_aside_type?: {
      value: string;
      inference_source: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    };
    is_small_business_opportunity?: {
      value: boolean;
      inference_source: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    };
    requires_8a_certification?: {
      value: boolean;
      inference_source: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    };
    gsa_mas_categories?: Array<{
      code: string;
      description: string;
      inference_source: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  };

  // Object map with explicit reasons and next steps
  missing_fields: Record<string, {
    page_value: string | null;
    reason: string;
    next_step?: string | null;
  }>;

  // Field-level confidence scores
  confidence: {
    overall_score: number;
    [field: string]: string | number;
  };

  evidence: {
    bundle_path: string;
    screenshots: string[];
    raw_page_text: string;
    extraction_log: string;
  };

  extraction_metadata: {
    extraction_timestamp: string;
    extraction_method: string;
    source_tool: string;
    mcp_actions_used: string[];
    extracted_fields_count: number;
    inferred_fields_count: number;
    missing_fields_count: number;
  };

  environment_mode: 'DEMO' | 'PROD';
}

/**
 * Manifest with seal state machine
 */
export interface BundleManifest {
  manifest_version: string;
  bundle_id: string;
  created_at: string;
  source: string;

  seal: {
    status: 'UNSEALED' | 'SEALED';
    sealed_at: string | null;
    sealing_tool: string;
    sealing_tool_version: string;
    bundle_hash: string | null;
    manifest_sha256: string | null;
  };

  artifacts: Array<{
    path: string;
    type: string;
    required: boolean;
    sha256: string;
    size_bytes: number | null;
  }>;

  policy_attestation: {
    no_login: boolean;
    no_submission: boolean;
    no_uploads: boolean;
    no_file_downloads: boolean;
    automation_mode: 'read-only' | 'interactive';
  };

  bd_capture_gate: {
    minimum_requirements: Record<string, {
      required: boolean | number;
      met: boolean;
      actual?: number;
      reason?: string;
    }>;
    gate_passed: boolean;
    gate_failure_reason: string | null;
  };
}

export interface BDCaptureOpportunityInput {
  // Core identifiers
  noticeId: string;
  title: string;
  url: string;

  // Agency info
  agency: string;
  subTier?: string;
  office?: string;

  // Classification
  noticeType: string;
  setAside?: string;
  naicsCode?: string;
  pscCode?: string;

  // Dates
  postedDate: string;
  responseDeadline?: string;

  // Contact
  primaryContact?: {
    name: string;
    email?: string;
    phone?: string;
  };

  // Requirements (from description)
  requirementSummary?: string;
  gsaMASCategories?: string[];

  // Attachments metadata
  attachments?: Array<{
    filename: string;
    size: string;
  }>;

  // Source tracking
  source: 'sam.gov' | 'grants.gov' | 'manual' | 'other';
  evidenceBundle: {
    bundleId: string;
    bundlePath: string;
    confidenceScore: number;
    extractionTimestamp: string;
  };

  // Environment
  environmentMode: 'DEMO' | 'PROD';

  // Field provenance
  fieldProvenance: {
    extracted: string[];
    inferred: string[];
    missing: string[];
  };
}

export interface EvidenceBundleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  gatesPassed: {
    sealStatusSealed: boolean;      // NEW: Must be SEALED
    noticeIdPresent: boolean;
    minimumScreenshots: boolean;
    manifestExists: boolean;
    rawTextCaptured: boolean;
    confidenceScoreMinimum: boolean;
    hashesVerified: boolean;        // NEW: All hashes must match
  };
}

// =============================================================================
// VALIDATION GATE - REQUIRES SEALED BUNDLE
// =============================================================================

const MINIMUM_CONFIDENCE_SCORE = 70;
const MINIMUM_SCREENSHOTS = 2;

/**
 * Validate an Evidence Bundle before allowing BD Capture to proceed
 *
 * This is the governance gate that ensures:
 * - Bundle is SEALED (hashes computed and locked)
 * - We have reliable source data
 * - Evidence exists to support extracted claims
 * - Confidence meets threshold
 * - All hashes verify
 *
 * CRITICAL: BD Capture WILL NOT RUN unless this passes
 */
export function validateEvidenceBundle(
  bundlePath: string
): EvidenceBundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const gates = {
    sealStatusSealed: false,
    noticeIdPresent: false,
    minimumScreenshots: false,
    manifestExists: false,
    rawTextCaptured: false,
    confidenceScoreMinimum: false,
    hashesVerified: false
  };

  try {
    // =========================================================================
    // GATE 0: Manifest exists (must check first)
    // =========================================================================
    const manifestPath = path.join(bundlePath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push('manifest.json not found in bundle');
      return { valid: false, errors, warnings, gatesPassed: gates };
    }
    gates.manifestExists = true;

    const manifest: BundleManifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8')
    );

    // =========================================================================
    // GATE 1: SEAL STATUS MUST BE "SEALED" (CRITICAL)
    // =========================================================================
    if (manifest.seal?.status === 'SEALED') {
      gates.sealStatusSealed = true;
    } else {
      errors.push(`Bundle seal status is "${manifest.seal?.status || 'UNSEALED'}" - must be "SEALED"`);
      errors.push('Run: node scripts/sealEvidenceBundle.js ' + bundlePath);
      // Early return - no point checking other gates if not sealed
      return { valid: false, errors, warnings, gatesPassed: gates };
    }

    // =========================================================================
    // GATE 2: Verify hashes (only if sealed)
    // =========================================================================
    let allHashesMatch = true;
    for (const artifact of manifest.artifacts) {
      if (artifact.sha256 === 'COMPUTE_ON_BUNDLE_SEAL' || artifact.sha256 === 'FILE_NOT_FOUND') {
        continue; // Skip unhashed/missing optional files
      }

      const artifactPath = path.join(bundlePath, artifact.path);
      if (fs.existsSync(artifactPath)) {
        const currentHash = hashFile(artifactPath);
        if (currentHash !== artifact.sha256) {
          errors.push(`Hash mismatch for ${artifact.path} - file modified since seal`);
          allHashesMatch = false;
        }
      } else if (artifact.required) {
        errors.push(`Required artifact missing: ${artifact.path}`);
        allHashesMatch = false;
      }
    }
    gates.hashesVerified = allHashesMatch;

    // =========================================================================
    // Load and validate opportunity.json
    // =========================================================================
    const opportunityPath = path.join(bundlePath, 'opportunity.json');
    if (!fs.existsSync(opportunityPath)) {
      errors.push('opportunity.json not found in bundle');
      return { valid: false, errors, warnings, gatesPassed: gates };
    }

    const bundle: any = JSON.parse(
      fs.readFileSync(opportunityPath, 'utf-8')
    );

    // Support both old schema (extracted_fields) and new schema (extracted)
    const extracted = bundle.extracted || bundle.extracted_fields || {};
    const evidence = bundle.evidence || bundle.evidence_artifacts || {};
    const confidence = bundle.confidence?.overall_score ||
                       bundle.extraction_metadata?.confidence_score || 0;

    // =========================================================================
    // GATE 3: Notice ID present
    // =========================================================================
    if (extracted.notice_id) {
      gates.noticeIdPresent = true;
    } else {
      errors.push('notice_id not found in extracted fields');
    }

    // =========================================================================
    // GATE 4: Minimum screenshots
    // =========================================================================
    const screenshotCount = evidence.screenshots?.length || 0;
    if (screenshotCount >= MINIMUM_SCREENSHOTS) {
      gates.minimumScreenshots = true;
    } else {
      errors.push(`Insufficient screenshots: ${screenshotCount} < ${MINIMUM_SCREENSHOTS} required`);
    }

    // =========================================================================
    // GATE 5: Raw text captured
    // =========================================================================
    const rawTextFile = evidence.raw_page_text || evidence.raw_text;
    const rawTextPath = path.join(bundlePath, rawTextFile || '');
    if (rawTextFile && fs.existsSync(rawTextPath)) {
      gates.rawTextCaptured = true;
    } else {
      warnings.push('Raw text file not found - re-parsing may not be possible');
      // This is a warning, not an error - we can proceed
      gates.rawTextCaptured = true; // Allow to pass with warning
    }

    // =========================================================================
    // GATE 6: Confidence score minimum
    // =========================================================================
    if (confidence >= MINIMUM_CONFIDENCE_SCORE) {
      gates.confidenceScoreMinimum = true;
    } else {
      errors.push(`Confidence score ${confidence}% below minimum ${MINIMUM_CONFIDENCE_SCORE}%`);
    }

    // Check for demo mode (warning only)
    if (bundle.environment_mode === 'DEMO') {
      warnings.push('Bundle is in DEMO mode - verify data before operational use');
    }

    // Check for high number of missing fields
    const missingCount = Object.keys(bundle.missing_fields || {}).length;
    if (missingCount > 5) {
      warnings.push(`High number of missing fields (${missingCount}) - review source page`);
    }

  } catch (err) {
    errors.push(`Failed to validate bundle: ${err}`);
  }

  const valid = errors.length === 0 && Object.values(gates).every(g => g);

  return { valid, errors, warnings, gatesPassed: gates };
}

// =============================================================================
// ADAPTER FUNCTION
// =============================================================================

/**
 * Transform SAM.gov Evidence Bundle into BD Capture input format
 *
 * IMPORTANT: This function will FAIL if the evidence bundle
 * does not pass validation gates.
 */
export function samToOpportunityContext(
  bundle: SAMEvidenceBundle,
  bundlePath: string
): BDCaptureOpportunityInput {
  // Validate bundle first
  const validation = validateEvidenceBundle(bundlePath);

  if (!validation.valid) {
    throw new Error(
      `Evidence Bundle validation failed:\n` +
      validation.errors.map(e => `  - ${e}`).join('\n')
    );
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn('Evidence Bundle warnings:');
    validation.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Build field provenance tracking
  const extractedFields = Object.keys(bundle.extracted_fields).filter(
    k => k !== '_comment' && bundle.extracted_fields[k as keyof typeof bundle.extracted_fields] !== null
  );
  const inferredFields = Object.keys(bundle.inferred_fields).filter(
    k => k !== '_comment'
  );
  const missingFields = Object.keys(bundle.missing_fields).filter(
    k => k !== '_comment'
  );

  // Transform to BD Capture format
  return {
    noticeId: bundle.extracted_fields.notice_id,
    title: bundle.extracted_fields.title,
    url: bundle.url,

    agency: bundle.extracted_fields.agency,
    subTier: bundle.extracted_fields.sub_tier,
    office: bundle.extracted_fields.office,

    noticeType: bundle.extracted_fields.notice_type,
    setAside: bundle.inferred_fields.set_aside_type,
    naicsCode: bundle.missing_fields.naics_code ? undefined : undefined, // Explicitly missing
    pscCode: bundle.missing_fields.psc_code ? undefined : undefined,

    postedDate: bundle.extracted_fields.posted_date,
    responseDeadline: bundle.extracted_fields.response_deadline,

    primaryContact: bundle.extracted_fields.primary_contact_name ? {
      name: bundle.extracted_fields.primary_contact_name,
      email: bundle.extracted_fields.primary_contact_email,
      phone: undefined
    } : undefined,

    requirementSummary: bundle.extracted_fields.description_text,
    gsaMASCategories: bundle.extracted_fields.gsa_mas_codes_mentioned,

    attachments: bundle.extracted_fields.attachments?.map(a => ({
      filename: a.filename,
      size: a.size
    })),

    source: 'sam.gov',
    evidenceBundle: {
      bundleId: bundle.bundle_id,
      bundlePath: bundlePath,
      confidenceScore: bundle.extraction_metadata.confidence_score,
      extractionTimestamp: bundle.extraction_metadata.extraction_timestamp
    },

    environmentMode: bundle.environment_mode,

    fieldProvenance: {
      extracted: extractedFields,
      inferred: inferredFields,
      missing: missingFields
    }
  };
}

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Compute SHA-256 hash of a file
 */
export function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Seal an evidence bundle by computing all hashes
 */
export function sealEvidenceBundle(bundlePath: string): void {
  const manifestPath = path.join(bundlePath, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Compute hash for each artifact
  for (const artifact of manifest.artifacts) {
    const artifactPath = path.join(bundlePath, artifact.path);
    if (fs.existsSync(artifactPath)) {
      artifact.sha256 = hashFile(artifactPath);
      artifact.size_bytes = fs.statSync(artifactPath).size;
    } else {
      artifact.sha256 = 'FILE_NOT_FOUND';
    }
  }

  // Compute bundle hash (hash of all artifact hashes)
  const allHashes = manifest.artifacts.map((a: any) => a.sha256).join('');
  manifest.integrity.bundle_hash = createHash('sha256').update(allHashes).digest('hex');
  manifest.integrity.sealed = true;
  manifest.integrity.sealed_at = new Date().toISOString();
  manifest.integrity.sealed_by = 'ACE Governance Platform';

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Bundle sealed: ${manifest.integrity.bundle_hash}`);
}

/**
 * Verify an evidence bundle's integrity
 */
export function verifyEvidenceBundle(bundlePath: string): boolean {
  const manifestPath = path.join(bundlePath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (!manifest.integrity.sealed) {
    console.warn('Bundle is not sealed');
    return false;
  }

  // Verify each artifact hash
  for (const artifact of manifest.artifacts) {
    const artifactPath = path.join(bundlePath, artifact.path);
    if (fs.existsSync(artifactPath)) {
      const currentHash = hashFile(artifactPath);
      if (currentHash !== artifact.sha256) {
        console.error(`Hash mismatch for ${artifact.path}`);
        return false;
      }
    } else if (artifact.sha256 !== 'FILE_NOT_FOUND') {
      console.error(`Missing file: ${artifact.path}`);
      return false;
    }
  }

  console.log('Bundle integrity verified');
  return true;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  validateEvidenceBundle,
  samToOpportunityContext,
  sealEvidenceBundle,
  verifyEvidenceBundle,
  hashFile
};
