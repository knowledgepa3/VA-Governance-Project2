-- ============================================================================
-- ACE Governance Platform — Initial Database Schema
-- ============================================================================
-- Tables: users, case_shells, case_profiles, bundle_runs, communication_log
-- Design: Shell/Profile split preserves privacy-by-design architecture.
--         Profiles are stored as AES-256-GCM encrypted blobs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Users (validated accounts with bcrypt password hashes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    permissions     JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ---------------------------------------------------------------------------
-- Case Shells (non-sensitive metadata — maps to CaseShell interface)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_shells (
    id                      TEXT PRIMARY KEY,
    case_alias              TEXT UNIQUE NOT NULL,
    claim_type              TEXT NOT NULL,
    condition_count         INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'new',
    priority                TEXT NOT NULL DEFAULT 'normal',
    evidence_package_ids    JSONB NOT NULL DEFAULT '[]',
    evidence_hashes         JSONB NOT NULL DEFAULT '[]',
    communication_count     INTEGER NOT NULL DEFAULT 0,
    last_contacted_at       TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    tenant_id               TEXT NOT NULL DEFAULT 'default',
    created_by              TEXT REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shells_tenant ON case_shells(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shells_status ON case_shells(status);
CREATE INDEX IF NOT EXISTS idx_shells_created ON case_shells(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shells_alias ON case_shells(case_alias);

-- ---------------------------------------------------------------------------
-- Case Profiles (encrypted PII/PHI — AES-256-GCM blob)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_profiles (
    case_id                 TEXT PRIMARY KEY REFERENCES case_shells(id) ON DELETE CASCADE,
    encrypted_data          TEXT NOT NULL,
    encryption_key_version  INTEGER NOT NULL DEFAULT 1,
    data_hash               TEXT NOT NULL,
    tenant_id               TEXT NOT NULL DEFAULT 'default',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Bundle Runs (research execution history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bundle_runs (
    id              TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES case_shells(id) ON DELETE CASCADE,
    bundle_id       TEXT NOT NULL,
    bundle_name     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    result          JSONB,
    evidence_count  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bundle_runs_case ON bundle_runs(case_id);
CREATE INDEX IF NOT EXISTS idx_bundle_runs_status ON bundle_runs(status);

-- ---------------------------------------------------------------------------
-- Communication Log (encrypted entries — may contain PHI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communication_log (
    id                  TEXT PRIMARY KEY,
    case_id             TEXT NOT NULL REFERENCES case_shells(id) ON DELETE CASCADE,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
    type                TEXT NOT NULL,
    direction           TEXT NOT NULL,
    subject             TEXT,
    content_encrypted   TEXT NOT NULL,
    attachments         JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_comm_case ON communication_log(case_id);
CREATE INDEX IF NOT EXISTS idx_comm_timestamp ON communication_log(timestamp DESC);

-- ---------------------------------------------------------------------------
-- Case alias sequence for auto-generating CASE-2026-001, CASE-2026-002, ...
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS case_alias_seq START 1;
