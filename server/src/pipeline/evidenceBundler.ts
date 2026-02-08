/**
 * Evidence Bundler — Manifest + Hashes + Audit Log
 *
 * Adapted from executor/JobPackExecutor.ts evidence functions.
 * Produces an immutable, sealed evidence bundle that proves:
 * - What plan was executed (spawn plan hash)
 * - What each worker produced (per-worker output hashes)
 * - Who approved at gates (gate resolution records)
 * - When everything happened (timestamps)
 *
 * Once sealed, the bundle cannot be modified.
 * The seal hash chains: bundle_id + manifest_hash + timestamp.
 */

import * as crypto from 'crypto';
import { GateResolution, WorkerOutput, SpawnPlan } from './spawnPlan.schema';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface EvidenceArtifact {
  artifactId: string;
  artifactType: 'WORKER_OUTPUT' | 'GATE_RECORD' | 'PLAN' | 'METADATA' | 'LOG' | 'POLICY_COMPLIANCE';
  filename: string;
  contentHash: string;
  capturedAt: string;
  description: string;
  sourceNode?: string;
}

export interface EvidenceBundle {
  bundleId: string;
  runId: string;
  planHash: string;
  startedAt: string;
  completedAt?: string;
  sealedAt?: string;       // Persisted so sealHash can be independently recomputed
  status: 'COLLECTING' | 'COMPLETE' | 'SEALED';
  artifacts: EvidenceArtifact[];
  gateRecords: GateResolution[];
  manifestHash?: string;
  sealHash?: string;
  summary: BundleSummary;
}

export interface BundleSummary {
  totalArtifacts: number;
  totalWorkers: number;
  totalGates: number;
  gatesApproved: number;
  gatesRejected: number;
  totalTokens: number;
  totalRuntimeMs: number;
  domain: string;
  policiesChecked?: number;
  policiesCompliant?: number;
}

// Policy compliance record per worker node
export interface PolicyComplianceRecord {
  policyId: string;
  title: string;
  controlFamily: string;
  requirements: Array<{ requirementId: string; passed: boolean; reason: string }>;
  overallPass: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// BUNDLE LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new evidence bundle for a pipeline run.
 */
export function createBundle(runId: string, planHash: string): EvidenceBundle {
  return {
    bundleId: `BUNDLE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    runId,
    planHash,
    startedAt: new Date().toISOString(),
    status: 'COLLECTING',
    artifacts: [],
    gateRecords: [],
    summary: {
      totalArtifacts: 0,
      totalWorkers: 0,
      totalGates: 0,
      gatesApproved: 0,
      gatesRejected: 0,
      totalTokens: 0,
      totalRuntimeMs: 0,
      domain: '',
    },
  };
}

/**
 * Add the spawn plan itself as an artifact (proves "this plan produced this output").
 */
export function addPlanArtifact(bundle: EvidenceBundle, plan: SpawnPlan): EvidenceBundle {
  const content = JSON.stringify(plan);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return {
    ...bundle,
    artifacts: [
      ...bundle.artifacts,
      {
        artifactId: `ART-plan-${Date.now()}`,
        artifactType: 'PLAN',
        filename: 'spawn_plan.json',
        contentHash: hash,
        capturedAt: new Date().toISOString(),
        description: `Spawn plan (${plan.nodes.length} nodes, ${plan.gates.length} gates)`,
      },
    ],
    summary: {
      ...bundle.summary,
      totalArtifacts: bundle.summary.totalArtifacts + 1,
      domain: plan.domain,
    },
  };
}

/**
 * Add a worker output as an artifact (proves each step's contribution).
 */
export function addWorkerArtifact(
  bundle: EvidenceBundle,
  nodeId: string,
  output: WorkerOutput,
): EvidenceBundle {
  const content = JSON.stringify(output.data);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return {
    ...bundle,
    artifacts: [
      ...bundle.artifacts,
      {
        artifactId: `ART-${nodeId}-${Date.now()}`,
        artifactType: 'WORKER_OUTPUT',
        filename: `worker_${nodeId}.json`,
        contentHash: hash,
        capturedAt: new Date().toISOString(),
        description: `Output from ${output.type} worker: ${output.summary.substring(0, 100)}`,
        sourceNode: nodeId,
      },
    ],
    summary: {
      ...bundle.summary,
      totalArtifacts: bundle.summary.totalArtifacts + 1,
      totalWorkers: bundle.summary.totalWorkers + 1,
      totalTokens: bundle.summary.totalTokens + output.tokensUsed,
      totalRuntimeMs: bundle.summary.totalRuntimeMs + output.durationMs,
    },
  };
}

/**
 * Add gate resolution records (proves human reviewed at checkpoints).
 */
export function addGateRecords(
  bundle: EvidenceBundle,
  resolutions: GateResolution[],
): EvidenceBundle {
  const content = JSON.stringify(resolutions);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  const approved = resolutions.filter(r => r.approved).length;
  const rejected = resolutions.filter(r => !r.approved).length;

  return {
    ...bundle,
    artifacts: [
      ...bundle.artifacts,
      {
        artifactId: `ART-gates-${Date.now()}`,
        artifactType: 'GATE_RECORD',
        filename: 'gate_resolutions.json',
        contentHash: hash,
        capturedAt: new Date().toISOString(),
        description: `${resolutions.length} gate(s): ${approved} approved, ${rejected} rejected`,
      },
    ],
    gateRecords: resolutions,
    summary: {
      ...bundle.summary,
      totalArtifacts: bundle.summary.totalArtifacts + 1,
      totalGates: resolutions.length,
      gatesApproved: approved,
      gatesRejected: rejected,
    },
  };
}

/**
 * Add arbitrary metadata artifact.
 */
export function addMetadataArtifact(
  bundle: EvidenceBundle,
  filename: string,
  description: string,
  data: unknown,
): EvidenceBundle {
  const content = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  return {
    ...bundle,
    artifacts: [
      ...bundle.artifacts,
      {
        artifactId: `ART-meta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        artifactType: 'METADATA',
        filename,
        contentHash: hash,
        capturedAt: new Date().toISOString(),
        description,
      },
    ],
    summary: {
      ...bundle.summary,
      totalArtifacts: bundle.summary.totalArtifacts + 1,
    },
  };
}

/**
 * Add policy compliance record for a worker node.
 * Proves which governance policies were checked and whether they passed.
 */
export function addPolicyComplianceArtifact(
  bundle: EvidenceBundle,
  nodeId: string,
  compliance: PolicyComplianceRecord[],
): EvidenceBundle {
  const content = JSON.stringify(compliance);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const passed = compliance.filter(c => c.overallPass).length;

  return {
    ...bundle,
    artifacts: [
      ...bundle.artifacts,
      {
        artifactId: `ART-policy-${nodeId}-${Date.now()}`,
        artifactType: 'POLICY_COMPLIANCE',
        filename: `policy_compliance_${nodeId}.json`,
        contentHash: hash,
        capturedAt: new Date().toISOString(),
        description: `Policy compliance for ${nodeId}: ${compliance.length} checked, ${passed} passed`,
        sourceNode: nodeId,
      },
    ],
    summary: {
      ...bundle.summary,
      totalArtifacts: bundle.summary.totalArtifacts + 1,
      policiesChecked: (bundle.summary.policiesChecked || 0) + compliance.length,
      policiesCompliant: (bundle.summary.policiesCompliant || 0) + passed,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SEAL — Makes the bundle immutable
// ═══════════════════════════════════════════════════════════════════

/**
 * Seal the evidence bundle.
 *
 * Creates a manifest hash from all artifacts,
 * then a seal hash chaining: bundleId + runId + planHash + manifestHash + timestamp.
 *
 * Once sealed, the bundle is immutable and tamper-evident.
 */
export function sealBundle(bundle: EvidenceBundle): EvidenceBundle {
  // Build manifest: ordered list of artifact IDs + their content hashes
  const manifest = bundle.artifacts
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId))
    .map(a => `${a.artifactId}:${a.contentHash}`)
    .join('|');

  const manifestHash = crypto.createHash('sha256').update(manifest).digest('hex');

  // Seal timestamp — persisted in bundle so sealHash can be independently recomputed
  const sealedAt = new Date().toISOString();

  // Seal hash chains everything together
  const sealContent = [
    bundle.bundleId,
    bundle.runId,
    bundle.planHash,
    manifestHash,
    sealedAt,
  ].join('|');

  const sealHash = crypto.createHash('sha256').update(sealContent).digest('hex');

  return {
    ...bundle,
    completedAt: sealedAt,
    sealedAt,
    status: 'SEALED',
    manifestHash,
    sealHash,
  };
}

/**
 * Verify a sealed bundle's integrity.
 *
 * Two-level verification:
 * 1. Manifest hash: recomputed from artifact IDs + content hashes
 * 2. Seal hash: recomputed from bundleId + runId + planHash + manifestHash + sealedAt
 *
 * An auditor can independently verify this bundle without trusting the system.
 * All inputs to the hash are stored in the bundle itself.
 */
export function verifyBundle(bundle: EvidenceBundle): { valid: boolean; reason: string; checks: Record<string, boolean> } {
  const checks: Record<string, boolean> = {
    isSealed: false,
    hasRequiredFields: false,
    manifestIntegrity: false,
    sealIntegrity: false,
  };

  if (bundle.status !== 'SEALED') {
    return { valid: false, reason: 'Bundle is not sealed', checks };
  }
  checks.isSealed = true;

  if (!bundle.manifestHash || !bundle.sealHash || !bundle.sealedAt) {
    return { valid: false, reason: 'Missing manifest hash, seal hash, or sealedAt timestamp', checks };
  }
  checks.hasRequiredFields = true;

  // Step 1: Recompute manifest hash from artifacts
  const manifest = bundle.artifacts
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId))
    .map(a => `${a.artifactId}:${a.contentHash}`)
    .join('|');

  const recomputedManifest = crypto.createHash('sha256').update(manifest).digest('hex');

  if (recomputedManifest !== bundle.manifestHash) {
    return { valid: false, reason: 'Manifest hash mismatch — artifacts may have been tampered with', checks };
  }
  checks.manifestIntegrity = true;

  // Step 2: Recompute seal hash from stored components
  const sealContent = [
    bundle.bundleId,
    bundle.runId,
    bundle.planHash,
    recomputedManifest,
    bundle.sealedAt,
  ].join('|');

  const recomputedSeal = crypto.createHash('sha256').update(sealContent).digest('hex');

  if (recomputedSeal !== bundle.sealHash) {
    return { valid: false, reason: 'Seal hash mismatch — bundle metadata may have been tampered with', checks };
  }
  checks.sealIntegrity = true;

  return { valid: true, reason: 'Bundle integrity verified (manifest + seal)', checks };
}
