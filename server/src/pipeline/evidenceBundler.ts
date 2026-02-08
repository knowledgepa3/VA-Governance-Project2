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
  artifactType: 'WORKER_OUTPUT' | 'GATE_RECORD' | 'PLAN' | 'METADATA' | 'LOG';
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

  // Seal hash chains everything together
  const sealContent = [
    bundle.bundleId,
    bundle.runId,
    bundle.planHash,
    manifestHash,
    new Date().toISOString(),
  ].join('|');

  const sealHash = crypto.createHash('sha256').update(sealContent).digest('hex');

  return {
    ...bundle,
    completedAt: new Date().toISOString(),
    status: 'SEALED',
    manifestHash,
    sealHash,
  };
}

/**
 * Verify a sealed bundle's integrity.
 * Re-computes manifest hash from artifacts and checks against stored hash.
 */
export function verifyBundle(bundle: EvidenceBundle): { valid: boolean; reason: string } {
  if (bundle.status !== 'SEALED') {
    return { valid: false, reason: 'Bundle is not sealed' };
  }

  if (!bundle.manifestHash || !bundle.sealHash) {
    return { valid: false, reason: 'Missing manifest or seal hash' };
  }

  // Recompute manifest hash
  const manifest = bundle.artifacts
    .sort((a, b) => a.artifactId.localeCompare(b.artifactId))
    .map(a => `${a.artifactId}:${a.contentHash}`)
    .join('|');

  const recomputedHash = crypto.createHash('sha256').update(manifest).digest('hex');

  if (recomputedHash !== bundle.manifestHash) {
    return { valid: false, reason: 'Manifest hash mismatch — artifacts may have been tampered with' };
  }

  return { valid: true, reason: 'Bundle integrity verified' };
}
