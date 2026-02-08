-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 008: Compliance Metrics — ML Feedback Loop
--
-- Accumulates per-requirement compliance signals from sealed pipeline runs.
-- One row per requirement check per worker per run.
-- Feeds: rolling averages, anomaly detection, Bayesian risk prediction,
--        policy effectiveness scoring.
--
-- Invariant: This table references pipeline_runs by ID but has NO foreign key.
-- Sealed runs have a DB trigger preventing modification — FK would break inserts
-- if the run is already sealed. Instead we reference by convention.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compliance_metrics (
  id              TEXT        PRIMARY KEY,
  run_id          TEXT        NOT NULL,
  tenant_id       TEXT        NOT NULL,
  policy_id       TEXT        NOT NULL,
  control_family  TEXT        NOT NULL,
  requirement_id  TEXT        NOT NULL,

  -- Worker context
  worker_type     TEXT        NOT NULL,
  worker_node_id  TEXT        NOT NULL,
  domain          TEXT        NOT NULL DEFAULT '',
  risk_level      TEXT        NOT NULL DEFAULT 'LOW',
  mai_level       TEXT        NOT NULL DEFAULT 'INFORMATIONAL',

  -- Outcome
  passed          BOOLEAN     NOT NULL,
  check_type      TEXT        NOT NULL DEFAULT 'automated',
  reason          TEXT,

  -- Execution context
  tokens_used     INTEGER     DEFAULT 0,
  duration_ms     INTEGER     DEFAULT 0,

  -- ML feedback columns (populated by scoring engine after baseline established)
  predicted_pass         BOOLEAN,
  prediction_confidence  REAL,

  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query patterns: by tenant, by policy, by control family, by worker type, by time
CREATE INDEX IF NOT EXISTS idx_cm_tenant   ON compliance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cm_policy   ON compliance_metrics(policy_id);
CREATE INDEX IF NOT EXISTS idx_cm_family   ON compliance_metrics(control_family);
CREATE INDEX IF NOT EXISTS idx_cm_worker   ON compliance_metrics(worker_type);
CREATE INDEX IF NOT EXISTS idx_cm_captured ON compliance_metrics(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_run      ON compliance_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_cm_passed   ON compliance_metrics(tenant_id, passed);
