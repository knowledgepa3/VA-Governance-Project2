/**
 * Run State Store — Pipeline Execution Persistence
 *
 * Persists pipeline execution state to PostgreSQL.
 * Makes gates REAL stops (Invariant #6): state is persisted to DB,
 * not held in memory. Server can restart and resume at the gate.
 *
 * Follows caseRepository.ts patterns:
 * - Parameterized queries (SQL injection safe)
 * - Tenant-scoped (all reads/writes filtered by tenant_id)
 * - Transactions for multi-step operations
 * - JSONB for complex nested data
 *
 * State machine:
 *   pending → running → paused_at_gate → running → completed → sealed
 *                                       ↘ failed
 */

import { query, withTransaction } from '../db/connection';
import { SpawnPlan, RunStatus, GateResolution, CapsUsed, WorkerOutput } from './spawnPlan.schema';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface PipelineRun {
  id: string;
  caseId: string | null;
  tenantId: string;
  spawnPlan: SpawnPlan;
  spawnPlanHash: string;
  status: RunStatus;
  currentNode: string | null;
  gateState: { gateId: string; afterNode: string; waitingSince: string } | null;
  workerResults: Record<string, WorkerOutput>;
  evidenceBundleId: string | null;
  capsUsed: CapsUsed;
  error: string | null;
  gateResolutions: GateResolution[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRef {
  id: string;
  runId: string;
  caseId: string | null;
  tenantId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageKey: string;
  uploadedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// ROW → MODEL MAPPING
// ═══════════════════════════════════════════════════════════════════

function rowToRun(row: any): PipelineRun {
  return {
    id: row.id,
    caseId: row.case_id,
    tenantId: row.tenant_id,
    spawnPlan: row.spawn_plan,
    spawnPlanHash: row.spawn_plan_hash,
    status: row.status,
    currentNode: row.current_node,
    gateState: row.gate_state,
    workerResults: row.worker_results || {},
    evidenceBundleId: row.evidence_bundle_id,
    capsUsed: row.caps_used || { tokens: 0, costCents: 0, runtimeMs: 0, workersSpawned: 0 },
    error: row.error,
    gateResolutions: row.gate_resolutions || [],
    startedAt: row.started_at?.toISOString?.() ?? row.started_at,
    completedAt: row.completed_at?.toISOString?.() ?? row.completed_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function rowToDoc(row: any): DocumentRef {
  return {
    id: row.id,
    runId: row.run_id,
    caseId: row.case_id,
    tenantId: row.tenant_id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash,
    storageKey: row.storage_key,
    uploadedAt: row.uploaded_at?.toISOString?.() ?? row.uploaded_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new pipeline run in pending state.
 */
export async function createRun(
  id: string,
  spawnPlan: SpawnPlan,
  spawnPlanHash: string,
  tenantId: string,
  caseId?: string,
): Promise<PipelineRun> {
  const result = await query(
    `INSERT INTO pipeline_runs (id, case_id, tenant_id, spawn_plan, spawn_plan_hash, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [id, caseId || null, tenantId, JSON.stringify(spawnPlan), spawnPlanHash]
  );
  return rowToRun(result.rows[0]);
}

// ═══════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Start execution of a pending run.
 */
export async function startRun(runId: string, tenantId: string): Promise<PipelineRun | null> {
  const result = await query(
    `UPDATE pipeline_runs
     SET status = 'running', started_at = now(), updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
     RETURNING *`,
    [runId, tenantId]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * Update progress during execution (current node + cumulative caps + worker results).
 */
export async function updateProgress(
  runId: string,
  tenantId: string,
  currentNode: string,
  capsUsed: CapsUsed,
  workerResults: Record<string, unknown>,
): Promise<PipelineRun | null> {
  const result = await query(
    `UPDATE pipeline_runs
     SET current_node = $3,
         caps_used = $4,
         worker_results = $5,
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'running'
     RETURNING *`,
    [runId, tenantId, currentNode, JSON.stringify(capsUsed), JSON.stringify(workerResults)]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * GATE STOP — Invariant #6: This is a REAL stop, not a banner.
 * Persists state to DB. Server can crash and resume at this gate.
 */
export async function pauseAtGate(
  runId: string,
  tenantId: string,
  gateId: string,
  afterNode: string,
  workerResults: Record<string, unknown>,
  capsUsed: CapsUsed,
): Promise<PipelineRun | null> {
  const gateState = {
    gateId,
    afterNode,
    waitingSince: new Date().toISOString(),
  };

  const result = await query(
    `UPDATE pipeline_runs
     SET status = 'paused_at_gate',
         gate_state = $3,
         current_node = $4,
         worker_results = $5,
         caps_used = $6,
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'running'
     RETURNING *`,
    [runId, tenantId, JSON.stringify(gateState), afterNode, JSON.stringify(workerResults), JSON.stringify(capsUsed)]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * Resolve a gate — approve or reject.
 * If approved: status → running, gate cleared.
 * If rejected: status → failed.
 */
export async function resolveGate(
  runId: string,
  tenantId: string,
  gateId: string,
  approved: boolean,
  resolvedBy: string,
  rationale?: string,
): Promise<PipelineRun | null> {
  const resolution: GateResolution = {
    gateId,
    approved,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    rationale,
  };

  const newStatus = approved ? 'running' : 'failed';
  const errorMsg = approved ? null : `Gate "${gateId}" rejected by ${resolvedBy}: ${rationale || 'no reason given'}`;

  const result = await query(
    `UPDATE pipeline_runs
     SET status = $3,
         gate_state = NULL,
         gate_resolutions = gate_resolutions || $4::jsonb,
         error = COALESCE($5, error),
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'paused_at_gate'
     RETURNING *`,
    [runId, tenantId, newStatus, JSON.stringify(resolution), errorMsg]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * Complete a run successfully.
 */
export async function completeRun(
  runId: string,
  tenantId: string,
  evidenceBundleId: string,
  workerResults: Record<string, unknown>,
  capsUsed: CapsUsed,
): Promise<PipelineRun | null> {
  const result = await query(
    `UPDATE pipeline_runs
     SET status = 'completed',
         evidence_bundle_id = $3,
         worker_results = $4,
         caps_used = $5,
         completed_at = now(),
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'running'
     RETURNING *`,
    [runId, tenantId, evidenceBundleId, JSON.stringify(workerResults), JSON.stringify(capsUsed)]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * Seal a completed run — makes it immutable.
 * Once sealed, no further writes are allowed.
 */
export async function sealRun(
  runId: string,
  tenantId: string,
): Promise<PipelineRun | null> {
  const result = await query(
    `UPDATE pipeline_runs
     SET status = 'sealed', updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'completed'
     RETURNING *`,
    [runId, tenantId]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * Fail a run with an error message.
 */
export async function failRun(
  runId: string,
  tenantId: string,
  error: string,
): Promise<PipelineRun | null> {
  const result = await query(
    `UPDATE pipeline_runs
     SET status = 'failed',
         error = $3,
         completed_at = now(),
         updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'running', 'paused_at_gate')
     RETURNING *`,
    [runId, tenantId, error]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

// ═══════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════

/**
 * Get a single run by ID (tenant-scoped).
 */
export async function getRun(runId: string, tenantId: string): Promise<PipelineRun | null> {
  const result = await query(
    `SELECT * FROM pipeline_runs WHERE id = $1 AND tenant_id = $2`,
    [runId, tenantId]
  );
  return result.rows[0] ? rowToRun(result.rows[0]) : null;
}

/**
 * List runs for a tenant, optionally filtered by case ID.
 */
export async function listRuns(
  tenantId: string,
  options?: { caseId?: string; status?: string; limit?: number; offset?: number },
): Promise<PipelineRun[]> {
  const conditions = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let paramIdx = 2;

  if (options?.caseId) {
    conditions.push(`case_id = $${paramIdx}`);
    params.push(options.caseId);
    paramIdx++;
  }

  if (options?.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const result = await query(
    `SELECT * FROM pipeline_runs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return result.rows.map(rowToRun);
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Store a document reference for a pipeline run.
 */
export async function addDocument(
  id: string,
  runId: string,
  tenantId: string,
  doc: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    storageKey: string;
  },
  caseId?: string,
): Promise<DocumentRef> {
  const result = await query(
    `INSERT INTO pipeline_documents (id, run_id, case_id, tenant_id, filename, mime_type, size_bytes, content_hash, storage_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, runId, caseId || null, tenantId, doc.filename, doc.mimeType, doc.sizeBytes, doc.contentHash, doc.storageKey]
  );
  return rowToDoc(result.rows[0]);
}

/**
 * List documents for a pipeline run.
 */
export async function listDocuments(runId: string, tenantId: string): Promise<DocumentRef[]> {
  const result = await query(
    `SELECT * FROM pipeline_documents
     WHERE run_id = $1 AND tenant_id = $2
     ORDER BY uploaded_at ASC`,
    [runId, tenantId]
  );
  return result.rows.map(rowToDoc);
}

/**
 * Get a single document by ID.
 */
export async function getDocument(docId: string, tenantId: string): Promise<DocumentRef | null> {
  const result = await query(
    `SELECT * FROM pipeline_documents WHERE id = $1 AND tenant_id = $2`,
    [docId, tenantId]
  );
  return result.rows[0] ? rowToDoc(result.rows[0]) : null;
}
