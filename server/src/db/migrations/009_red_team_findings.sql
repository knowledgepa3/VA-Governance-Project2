-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 009: Red Team Findings — Adversarial Probe Persistence
--
-- Stores red team probe results (failed probes = findings).
-- One row per finding: a probe that detected a vulnerability.
--
-- Lifecycle: discovered → in_review → remediated → verified
-- Forward-only transitions. 'verified' requires sealed evidence bundle ID.
--
-- Invariant: This table references pipeline_runs by ID but has NO foreign key.
-- Sealed runs are immutable — FK would break the pattern. Reference by convention.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS red_team_findings (
  id                      TEXT        PRIMARY KEY,
  tenant_id               TEXT        NOT NULL,
  run_id                  TEXT        NOT NULL,

  -- Probe identification
  probe_name              TEXT        NOT NULL,
  probe_category          TEXT        NOT NULL,
  target_worker           TEXT        NOT NULL DEFAULT '',
  severity                TEXT        NOT NULL DEFAULT 'MEDIUM',
  control_family          TEXT        NOT NULL DEFAULT '',

  -- Result
  passed                  BOOLEAN     NOT NULL,
  response_snippet        TEXT        DEFAULT '',
  expected_behavior       TEXT        DEFAULT '',

  -- Lifecycle
  status                  TEXT        NOT NULL DEFAULT 'discovered',
  remediation_note        TEXT,
  remediation_evidence_id TEXT,
  reviewed_by             TEXT,
  reviewed_at             TIMESTAMPTZ,

  -- Timestamps
  discovered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query patterns: by tenant, status, severity, worker, family, run, time
CREATE INDEX IF NOT EXISTS idx_rtf_tenant     ON red_team_findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rtf_status     ON red_team_findings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rtf_severity   ON red_team_findings(severity);
CREATE INDEX IF NOT EXISTS idx_rtf_worker     ON red_team_findings(target_worker);
CREATE INDEX IF NOT EXISTS idx_rtf_family     ON red_team_findings(control_family);
CREATE INDEX IF NOT EXISTS idx_rtf_run        ON red_team_findings(run_id);
CREATE INDEX IF NOT EXISTS idx_rtf_discovered ON red_team_findings(discovered_at DESC);
