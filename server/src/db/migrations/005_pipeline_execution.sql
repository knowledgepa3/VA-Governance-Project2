-- ============================================================================
-- 005_pipeline_execution.sql — Pipeline Execution Tables
--
-- Stores pipeline runs (spawn plans, status, worker results, gate state)
-- and uploaded document references for the GIA execution layer.
--
-- Design principles:
-- - Tenant-scoped (all queries include tenant_id)
-- - JSONB for complex nested data (spawn plans, worker results, caps)
-- - Immutable once sealed (status = 'sealed' prevents further writes)
-- - Links to existing case_shells for case correlation
-- ============================================================================

-- Pipeline execution runs
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                  TEXT        PRIMARY KEY,
  case_id             TEXT        REFERENCES case_shells(id) ON DELETE SET NULL,
  tenant_id           TEXT        NOT NULL,

  -- The compiled spawn plan (full DAG + instruction blocks)
  spawn_plan          JSONB       NOT NULL,
  spawn_plan_hash     TEXT        NOT NULL,

  -- State machine: pending → running → paused_at_gate → running → completed → sealed
  --                                                   ↘ failed
  status              TEXT        NOT NULL DEFAULT 'pending',
  current_node        TEXT,                   -- which node is executing now

  -- Gate state (populated when status = 'paused_at_gate')
  gate_state          JSONB,                  -- { gateId, afterNode, waitingSince }

  -- Accumulated worker results (nodeId → WorkerOutput)
  worker_results      JSONB       NOT NULL DEFAULT '{}',

  -- Evidence bundle reference (populated on completion)
  evidence_bundle_id  TEXT,

  -- Resource usage tracking (checked against caps during execution)
  caps_used           JSONB       NOT NULL DEFAULT '{"tokens":0,"costCents":0,"runtimeMs":0,"workersSpawned":0}',

  -- Error info (populated on failure)
  error               TEXT,

  -- Gate resolution history (array of GateResolution objects)
  gate_resolutions    JSONB       NOT NULL DEFAULT '[]',

  -- Timestamps
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents uploaded for a pipeline run
CREATE TABLE IF NOT EXISTS pipeline_documents (
  id                  TEXT        PRIMARY KEY,
  run_id              TEXT        REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  case_id             TEXT        REFERENCES case_shells(id) ON DELETE SET NULL,
  tenant_id           TEXT        NOT NULL,

  -- File metadata
  filename            TEXT        NOT NULL,
  mime_type           TEXT        NOT NULL,
  size_bytes          INTEGER     NOT NULL,
  content_hash        TEXT        NOT NULL,   -- SHA-256 of file contents

  -- Storage location (local path for MVP, S3 key for production)
  storage_key         TEXT        NOT NULL,

  -- Timestamps
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_case     ON pipeline_runs(case_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_tenant   ON pipeline_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status   ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created  ON pipeline_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_docs_run      ON pipeline_documents(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_docs_tenant   ON pipeline_documents(tenant_id);
