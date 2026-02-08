/**
 * Telemetry Worker — Evidence Bundle Sealing
 *
 * Last worker in every pipeline. Collects all artifacts, generates
 * manifest with SHA-256 hashes, and prepares the bundle for sealing.
 *
 * This worker does NOT call Claude — it's purely computational.
 * It inventories, hashes, and packages. No interpretation.
 *
 * Pure function. No spawn authority.
 */

import * as crypto from 'crypto';
import { WorkerInstruction, WorkerContext, WorkerOutput } from '../spawnPlan.schema';
import { WorkerModule } from './registry';

async function execute(
  instruction: WorkerInstruction,
  input: Record<string, unknown>,
  ctx: WorkerContext,
): Promise<Omit<WorkerOutput, 'nodeId' | 'type'>> {
  const startTime = Date.now();

  try {
    // Collect all upstream worker data
    const allResults = input;
    const artifactList: Array<{
      source: string;
      filename: string;
      hash: string;
    }> = [];

    // Hash each upstream output
    for (const [key, value] of Object.entries(allResults)) {
      if (value && typeof value === 'object') {
        const content = JSON.stringify(value);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        artifactList.push({
          source: key,
          filename: `${key}.json`,
          hash,
        });
      }
    }

    // Build the manifest
    const manifest = {
      generatedAt: new Date().toISOString(),
      runId: ctx.runId,
      caseId: ctx.caseId,
      artifactCount: artifactList.length,
      artifacts: artifactList,
    };

    // Compute integrity hash over the entire manifest
    const manifestContent = JSON.stringify(manifest, null, 0);
    const integrityHash = crypto.createHash('sha256').update(manifestContent).digest('hex');

    const bundle = {
      manifest,
      integrityHash,
      policy: {
        piiPolicy: ctx.policy.piiPolicy,
        governanceLevel: ctx.policy.governanceLevel,
        constraints: ctx.policy.constraints,
      },
      summary: `Evidence bundle with ${artifactList.length} artifacts. Integrity hash: ${integrityHash.substring(0, 16)}...`,
    };

    await ctx.writeArtifact('evidence_manifest.json', JSON.stringify(bundle, null, 2));

    return {
      status: 'success',
      data: bundle,
      summary: `Telemetry sealed: ${artifactList.length} artifacts, integrity hash ${integrityHash.substring(0, 16)}...`,
      tokensUsed: 0,  // Telemetry doesn't call Claude
      durationMs: Date.now() - startTime,
      artifactPaths: ['evidence_manifest.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Telemetry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const telemetryWorker: WorkerModule = {
  type: 'telemetry',
  execute,
};
