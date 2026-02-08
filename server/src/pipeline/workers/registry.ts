/**
 * Worker Registry — Allowlisted worker types mapped to their modules
 *
 * INVARIANT #3: Only worker types in this registry can be spawned.
 * The Supervisor loads workers by type string from this map.
 * Workers CANNOT register themselves or modify this registry.
 *
 * Each worker exports:
 * - type: WorkerType (must match registry key)
 * - execute(instruction, input, ctx): Promise<WorkerOutput>
 */

import { WorkerType, WorkerInstruction, WorkerContext, WorkerOutput } from '../spawnPlan.schema';

// Worker module interface — what every worker must implement
export interface WorkerModule {
  readonly type: WorkerType;
  execute(
    instruction: WorkerInstruction,
    input: Record<string, unknown>,
    ctx: WorkerContext,
  ): Promise<Omit<WorkerOutput, 'nodeId' | 'type'>>;
}

// Import all worker modules
import { gatewayWorker } from './gateway';
import { extractorWorker } from './extractor';
import { validatorWorker } from './validator';
import { complianceWorker } from './compliance';
import { writerWorker } from './writer';
import { telemetryWorker } from './telemetry';

/**
 * THE REGISTRY — closed map of allowed worker types.
 * If it's not in here, it cannot be spawned. Period.
 */
export const WORKER_REGISTRY: ReadonlyMap<WorkerType, WorkerModule> = new Map([
  ['gateway', gatewayWorker],
  ['extractor', extractorWorker],
  ['validator', validatorWorker],
  ['compliance', complianceWorker],
  ['writer', writerWorker],
  ['telemetry', telemetryWorker],
]);

/**
 * Check if a worker type is in the registry (Invariant #3).
 */
export function isAllowedWorkerType(type: string): type is WorkerType {
  return WORKER_REGISTRY.has(type as WorkerType);
}

/**
 * Get a worker module by type. Returns null if not in registry.
 */
export function getWorker(type: WorkerType): WorkerModule | null {
  return WORKER_REGISTRY.get(type) ?? null;
}
