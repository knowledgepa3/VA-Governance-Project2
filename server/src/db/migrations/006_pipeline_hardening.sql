-- ============================================================================
-- 006_pipeline_hardening.sql — Security Hardening for Pipeline Execution
--
-- Adds database-level enforcement for invariants that were previously
-- only enforced at the application layer:
--
-- 1. CHECK constraint on status values (no arbitrary strings)
-- 2. Trigger to prevent ANY update on sealed rows (DB-level immutability)
-- 3. Auto-update trigger for updated_at (no more relying on app code)
-- ============================================================================

-- 1. CHECK constraint: status must be one of the valid state machine values
ALTER TABLE pipeline_runs
  ADD CONSTRAINT chk_pipeline_runs_status
  CHECK (status IN ('pending', 'running', 'paused_at_gate', 'completed', 'failed', 'sealed'));

-- 2. Sealed immutability: prevent ANY modification of sealed rows.
--    This is the database-level guarantee that backs the application-level
--    "once sealed, no further writes" contract. Even a direct SQL UPDATE
--    from an admin console will be rejected.
CREATE OR REPLACE FUNCTION prevent_sealed_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'sealed' AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Cannot modify a sealed pipeline run (id: %)', OLD.id;
  END IF;
  IF OLD.status = 'sealed' THEN
    RAISE EXCEPTION 'Cannot modify a sealed pipeline run (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_runs_sealed_immutable
  BEFORE UPDATE ON pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sealed_update();

-- 3. Auto-update trigger for updated_at
--    Ensures updated_at is always current, even if application code forgets.
CREATE OR REPLACE FUNCTION update_pipeline_runs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_runs_updated_at
  BEFORE UPDATE ON pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_runs_timestamp();
