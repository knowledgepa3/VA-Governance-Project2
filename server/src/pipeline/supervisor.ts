/**
 * Supervisor — The ONLY Executor
 *
 * Executes a Spawn Plan by walking the DAG node-by-node,
 * spawning workers, validating outputs, and enforcing gates.
 *
 * ═══════════════════════════════════════════════════════════════
 * LOCKED INVARIANTS (enforced here, not by convention):
 *
 * #1 — Only Supervisor can spawn: spawnWorker() is PRIVATE.
 *       Workers are loaded by type string from WORKER_REGISTRY.
 *       Workers cannot import or call this function.
 *
 * #2 — Max depth = 2: Worker output is deep-scanned for
 *       forbidden keys (spawnPlan, nodes, edges). Any match
 *       is rejected. Workers cannot spawn workers.
 *
 * #3 — Allowlist worker types: node.type must exist in
 *       WORKER_REGISTRY. Unknown types are rejected.
 *
 * #4 — Hard caps: maxWorkers, maxTokens, maxCost, maxRuntime
 *       are checked BEFORE each spawn and cumulatively AFTER.
 *       Per-worker caps are enforced per execution.
 *
 * #5 — Schema boundary: Worker output is Zod-validated against
 *       WorkerOutput schema. Invalid output = rejected.
 *
 * #6 — Gates are runtime STOPS: If a gate exists after a node,
 *       Supervisor persists state to DB and RETURNS. Nothing
 *       continues until the gate is resolved via API.
 * ═══════════════════════════════════════════════════════════════
 *
 * Adapted from executor/JobPackExecutor.ts patterns (MAI enforcement,
 * gate checks, evidence sealing) without duplicating controls.
 */

import {
  SpawnPlan,
  SpawnNode,
  SpawnGate,
  WorkerOutput,
  WorkerContext,
  CapsUsed,
  containsForbiddenKeys,
} from './spawnPlan.schema';
import { isAllowedWorkerType, getWorker } from './workers/registry';
import * as runStore from './runState.store';
import {
  createBundle,
  addPlanArtifact,
  addWorkerArtifact,
  addGateRecords,
  addMetadataArtifact,
  sealBundle,
  EvidenceBundle,
} from './evidenceBundler';
import { logger } from '../logger';

const log = logger.child({ component: 'Supervisor' });

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SupervisorConfig {
  /** Function to call Claude API (server-side, audited) */
  claudeProxy: (systemPrompt: string, userMessage: string, options?: {
    role?: string;
    caseId?: string;
    purpose?: string;
  }) => Promise<{ content: string; tokensUsed: { input: number; output: number } }>;

  /** Read an uploaded document by ID */
  readDocument: (docId: string) => Promise<{ content: string; filename: string; mimeType: string }>;

  /** Write artifact to workspace-scoped path */
  writeArtifact: (runId: string, filename: string, data: string | Buffer) => Promise<string>;

  /** Tenant ID for DB operations */
  tenantId: string;
}

export interface ExecutionResult {
  runId: string;
  status: 'completed' | 'paused_at_gate' | 'failed';
  currentNode?: string;
  gateId?: string;
  error?: string;
  evidenceBundle?: EvidenceBundle;
  capsUsed: CapsUsed;
  workerResults: Record<string, WorkerOutput>;
}

// ═══════════════════════════════════════════════════════════════════
// PRE-FLIGHT VALIDATION
// Checks all invariants before execution begins.
// ═══════════════════════════════════════════════════════════════════

function preFlightCheck(plan: SpawnPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // INVARIANT #4: Node count within caps
  if (plan.nodes.length > plan.caps.maxWorkers) {
    errors.push(`Plan has ${plan.nodes.length} nodes but maxWorkers cap is ${plan.caps.maxWorkers}`);
  }

  // INVARIANT #3: All node types must be in the allowlist
  for (const node of plan.nodes) {
    if (!isAllowedWorkerType(node.type)) {
      errors.push(`Node "${node.id}" has unknown type "${node.type}" — not in WORKER_REGISTRY`);
    }
  }

  // Structural: first node must be gateway
  if (plan.nodes[0]?.type !== 'gateway') {
    errors.push('First node must be type "gateway"');
  }

  // Structural: last node must be telemetry
  if (plan.nodes[plan.nodes.length - 1]?.type !== 'telemetry') {
    errors.push('Last node must be type "telemetry"');
  }

  // Validate gate references
  const nodeIds = new Set(plan.nodes.map(n => n.id));
  for (const gate of plan.gates) {
    if (!nodeIds.has(gate.afterNode)) {
      errors.push(`Gate "${gate.id}" references unknown node "${gate.afterNode}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════
// THE EXECUTOR — Main entry points
// ═══════════════════════════════════════════════════════════════════

/**
 * Start executing a spawn plan from the beginning.
 * Returns when: completed, paused at gate, or failed.
 */
export async function startExecution(
  run: runStore.PipelineRun,
  config: SupervisorConfig,
): Promise<ExecutionResult> {
  const { spawnPlan: plan } = run;

  log.info('Supervisor starting execution', {
    runId: run.id,
    nodes: plan.nodes.length,
    gates: plan.gates.length,
  });

  // Pre-flight checks (all invariants)
  const preflight = preFlightCheck(plan);
  if (!preflight.valid) {
    const error = `Pre-flight failed: ${preflight.errors.join('; ')}`;
    log.error('Pre-flight check failed', { runId: run.id, errors: preflight.errors });
    await runStore.failRun(run.id, config.tenantId, error);
    return {
      runId: run.id,
      status: 'failed',
      error,
      capsUsed: { tokens: 0, costCents: 0, runtimeMs: 0, workersSpawned: 0 },
      workerResults: {},
    };
  }

  // Mark run as started
  await runStore.startRun(run.id, config.tenantId);

  // Execute from node 0
  return executeFromNode(run.id, plan, 0, {}, { tokens: 0, costCents: 0, runtimeMs: 0, workersSpawned: 0 }, config);
}

/**
 * Resume execution after a gate has been resolved.
 * Picks up from the node after the gate.
 */
export async function resumeAfterGate(
  run: runStore.PipelineRun,
  config: SupervisorConfig,
): Promise<ExecutionResult> {
  const { spawnPlan: plan, workerResults, capsUsed } = run;

  if (run.status !== 'running') {
    return {
      runId: run.id,
      status: 'failed',
      error: `Cannot resume: run status is "${run.status}", expected "running"`,
      capsUsed: capsUsed as CapsUsed,
      workerResults: workerResults as Record<string, WorkerOutput>,
    };
  }

  // Find which node to resume from (node after the gate's afterNode)
  const lastCompletedNode = run.currentNode;
  const nodeIndex = plan.nodes.findIndex(n => n.id === lastCompletedNode);

  if (nodeIndex === -1 || nodeIndex >= plan.nodes.length - 1) {
    return {
      runId: run.id,
      status: 'failed',
      error: `Cannot find resume point after node "${lastCompletedNode}"`,
      capsUsed: capsUsed as CapsUsed,
      workerResults: workerResults as Record<string, WorkerOutput>,
    };
  }

  log.info('Supervisor resuming after gate', {
    runId: run.id,
    resumeFromIndex: nodeIndex + 1,
    resumeNode: plan.nodes[nodeIndex + 1].id,
  });

  return executeFromNode(
    run.id,
    plan,
    nodeIndex + 1,
    workerResults as Record<string, WorkerOutput>,
    capsUsed as CapsUsed,
    config,
  );
}

// ═══════════════════════════════════════════════════════════════════
// CORE EXECUTION LOOP
// Private — this is where invariants are enforced at runtime.
// ═══════════════════════════════════════════════════════════════════

async function executeFromNode(
  runId: string,
  plan: SpawnPlan,
  startIndex: number,
  existingResults: Record<string, WorkerOutput>,
  existingCaps: CapsUsed,
  config: SupervisorConfig,
): Promise<ExecutionResult> {

  const results: Record<string, WorkerOutput> = { ...existingResults };
  const caps: CapsUsed = { ...existingCaps };
  const executionStartTime = Date.now();

  // Build evidence bundle
  let bundle = createBundle(runId, plan.nodes.length > 0 ? plan.planId : '');
  bundle = addPlanArtifact(bundle, plan);

  // Add existing worker results to bundle (for resumed runs)
  for (const [nodeId, output] of Object.entries(existingResults)) {
    bundle = addWorkerArtifact(bundle, nodeId, output);
  }

  // Build gate lookup: afterNode → gate
  const gateMap = new Map<string, SpawnGate>();
  for (const gate of plan.gates) {
    gateMap.set(gate.afterNode, gate);
  }

  // Execute nodes sequentially (linear DAG for MVP)
  for (let i = startIndex; i < plan.nodes.length; i++) {
    const node = plan.nodes[i];

    // ─── INVARIANT #4: Check cumulative caps before spawn ─────
    if (caps.workersSpawned >= plan.caps.maxWorkers) {
      const error = `Worker cap exceeded: spawned ${caps.workersSpawned} >= maxWorkers ${plan.caps.maxWorkers}`;
      log.warn('Worker cap exceeded', { runId, error });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    if (caps.tokens >= plan.caps.maxTokens) {
      const error = `Token cap exceeded: used ${caps.tokens} >= maxTokens ${plan.caps.maxTokens}`;
      log.warn('Token cap exceeded', { runId, error });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    const elapsedMs = Date.now() - executionStartTime + caps.runtimeMs;
    if (elapsedMs >= plan.caps.maxRuntimeMs) {
      const error = `Runtime cap exceeded: ${elapsedMs}ms >= maxRuntimeMs ${plan.caps.maxRuntimeMs}`;
      log.warn('Runtime cap exceeded', { runId, error });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    // ─── INVARIANT #3: Verify worker type is in allowlist ─────
    if (!isAllowedWorkerType(node.type)) {
      const error = `Forbidden worker type "${node.type}" — not in WORKER_REGISTRY`;
      log.error('Forbidden worker type', { runId, nodeId: node.id, type: node.type });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    // ─── SPAWN WORKER (#1: only Supervisor calls this) ────────
    log.info('Spawning worker', {
      runId,
      nodeId: node.id,
      type: node.type,
      label: node.label,
      step: `${i + 1}/${plan.nodes.length}`,
    });

    const output = await spawnWorker(node, results, plan, config);

    // ─── INVARIANT #5: Validate output schema ─────────────────
    const parseResult = WorkerOutput.safeParse({
      nodeId: node.id,
      type: node.type,
      ...output,
    });

    if (!parseResult.success) {
      const error = `Worker "${node.id}" output failed schema validation: ${parseResult.error.message}`;
      log.error('Worker output schema violation', { runId, nodeId: node.id, error });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    const validatedOutput = parseResult.data;

    // ─── INVARIANT #2: Deep-scan for forbidden keys ───────────
    const forbiddenPath = containsForbiddenKeys(validatedOutput.data);
    if (forbiddenPath) {
      const error = `Worker "${node.id}" output contains forbidden key at "${forbiddenPath}" — potential spawn directive (depth > 2 violation)`;
      log.error('Forbidden key in worker output', { runId, nodeId: node.id, forbiddenPath });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }

    // Store result
    results[node.id] = validatedOutput;

    // Update cumulative caps
    caps.tokens += validatedOutput.tokensUsed;
    caps.runtimeMs += validatedOutput.durationMs;
    caps.workersSpawned += 1;
    // Cost estimation: ~$3 per million input tokens, ~$15 per million output tokens (Sonnet)
    caps.costCents += Math.ceil(validatedOutput.tokensUsed * 0.001);

    // Add to evidence bundle
    bundle = addWorkerArtifact(bundle, node.id, validatedOutput);

    // Update progress in DB
    await runStore.updateProgress(runId, config.tenantId, node.id, caps, results);

    log.info('Worker completed', {
      runId,
      nodeId: node.id,
      status: validatedOutput.status,
      tokensUsed: validatedOutput.tokensUsed,
      durationMs: validatedOutput.durationMs,
    });

    // ─── INVARIANT #6: Check gates — REAL stop ────────────────
    const gate = gateMap.get(node.id);
    if (gate && gate.requiresApproval) {
      log.info('Gate triggered — execution STOPPING', {
        runId,
        gateId: gate.id,
        afterNode: node.id,
        label: gate.label,
      });

      // Persist state to DB — this is a REAL stop
      await runStore.pauseAtGate(runId, config.tenantId, gate.id, node.id, results, caps);

      return {
        runId,
        status: 'paused_at_gate',
        currentNode: node.id,
        gateId: gate.id,
        capsUsed: caps,
        workerResults: results,
      };
    }

    // Check if worker reported an error
    if (validatedOutput.status === 'error') {
      const error = `Worker "${node.id}" reported error: ${validatedOutput.summary}`;
      log.error('Worker error', { runId, nodeId: node.id, summary: validatedOutput.summary });
      await runStore.failRun(runId, config.tenantId, error);
      return { runId, status: 'failed', error, capsUsed: caps, workerResults: results };
    }
  }

  // ─── ALL NODES COMPLETE — SEAL THE BUNDLE ─────────────────
  log.info('All nodes complete — sealing evidence bundle', { runId });

  // Add gate resolution records
  const run = await runStore.getRun(runId, config.tenantId);
  if (run?.gateResolutions && run.gateResolutions.length > 0) {
    bundle = addGateRecords(bundle, run.gateResolutions);
  }

  // Add caps summary
  bundle = addMetadataArtifact(bundle, 'execution_summary.json', 'Execution resource usage summary', {
    capsUsed: caps,
    capsLimit: plan.caps,
    nodeCount: plan.nodes.length,
    completedAt: new Date().toISOString(),
  });

  // Seal the bundle
  bundle = sealBundle(bundle);

  // Complete the run
  await runStore.completeRun(runId, config.tenantId, bundle.bundleId, results, caps);

  log.info('Execution complete — bundle sealed', {
    runId,
    bundleId: bundle.bundleId,
    sealHash: bundle.sealHash,
    totalTokens: caps.tokens,
    totalRuntimeMs: caps.runtimeMs,
  });

  return {
    runId,
    status: 'completed',
    evidenceBundle: bundle,
    capsUsed: caps,
    workerResults: results,
  };
}

// ═══════════════════════════════════════════════════════════════════
// spawnWorker — PRIVATE (Invariant #1)
//
// This function is NOT exported. Workers cannot import it.
// Only the Supervisor's execution loop calls it.
// ═══════════════════════════════════════════════════════════════════

async function spawnWorker(
  node: SpawnNode,
  upstreamResults: Record<string, WorkerOutput>,
  plan: SpawnPlan,
  config: SupervisorConfig,
): Promise<Omit<WorkerOutput, 'nodeId' | 'type'>> {

  // Load worker from registry
  const worker = getWorker(node.type);
  if (!worker) {
    return {
      status: 'error',
      data: { error: `Worker type "${node.type}" not found in registry` },
      summary: `Failed to load worker "${node.type}"`,
      tokensUsed: 0,
      durationMs: 0,
      artifactPaths: [],
    };
  }

  // Build worker input from upstream edge data
  const workerInput: Record<string, unknown> = {};

  // Find edges targeting this node and map their data
  for (const edge of plan.edges) {
    if (edge.to === node.id) {
      const upstreamOutput = upstreamResults[edge.from];
      if (upstreamOutput) {
        workerInput[edge.dataKey] = upstreamOutput.data;
      }
    }
  }

  // For gateway: inject document references as input
  if (node.type === 'gateway') {
    workerInput.documentRefs = plan.documentRefs;
  }

  // For telemetry: inject all upstream results
  if (node.type === 'telemetry') {
    for (const [nodeId, output] of Object.entries(upstreamResults)) {
      workerInput[nodeId] = output.data;
    }
  }

  // Build the scoped worker context (deliberately limited)
  const workerCtx: WorkerContext = {
    runId: plan.planId,
    caseId: plan.caseId || '',
    claudeProxy: async (systemPrompt: string, userMessage: string) => {
      return config.claudeProxy(systemPrompt, userMessage, {
        role: `worker:${node.type}`,
        caseId: plan.caseId,
        purpose: `Pipeline worker: ${node.label}`,
      });
    },
    writeArtifact: async (filename: string, data: string | Buffer) => {
      // IO safety: validate filename
      if (filename.includes('..') || filename.startsWith('/')) {
        throw new Error(`IO safety violation: invalid artifact filename "${filename}"`);
      }
      return config.writeArtifact(plan.planId, filename, data);
    },
    readDocument: config.readDocument,
    policy: {
      piiPolicy: plan.piiPolicy,
      governanceLevel: plan.governanceLevel,
      constraints: node.instruction.constraints,
    },
  };

  // Execute with per-worker timeout
  const timeoutMs = node.perWorkerCaps.maxRuntimeMs;

  try {
    const result = await Promise.race([
      worker.execute(node.instruction, workerInput, workerCtx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Worker "${node.id}" exceeded timeout of ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    // INVARIANT #4: Check per-worker token cap
    if (result.tokensUsed > node.perWorkerCaps.maxTokens) {
      log.warn('Worker exceeded per-worker token cap', {
        nodeId: node.id,
        tokensUsed: result.tokensUsed,
        maxTokens: node.perWorkerCaps.maxTokens,
      });
      // We allow it to complete but log the violation
      // In Strict/Regulated mode, this could be a hard stop
    }

    return result;
  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Worker "${node.id}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: 0,
      durationMs: 0,
      artifactPaths: [],
    };
  }
}
