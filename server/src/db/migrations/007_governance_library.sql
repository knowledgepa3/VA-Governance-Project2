-- ============================================================================
-- 007_governance_library.sql — GIA Governance Library v1
--
-- The backbone of the Governance OS. Structured, queryable policy objects
-- that agents "do paperwork against." Not documents — first-class data.
--
-- Four tables:
--   1. governance_packs      — Composable policy collections (BASE, INDUSTRY, ENTERPRISE, DEPARTMENT)
--   2. governance_policies   — Atomic policy objects (controls, requirements, evidence)
--   3. evidence_templates    — What evidence agents must produce per control
--   4. approval_roles        — Who can approve what (role taxonomy)
--
-- Composition model: BASE (priority 10) + INDUSTRY (50) + ENTERPRISE (100) + DEPARTMENT (200)
-- Higher priority packs can escalate but not weaken base controls.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Governance Packs (composable policy collections)
-- ---------------------------------------------------------------------------
CREATE TABLE governance_packs (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pack_id         TEXT NOT NULL,
    tenant_id       TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    pack_type       TEXT NOT NULL CHECK (pack_type IN ('BASE','INDUSTRY','ENTERPRISE','DEPARTMENT')),
    source_framework TEXT NOT NULL DEFAULT 'CUSTOM',
    version         TEXT NOT NULL DEFAULT '1.0.0',
    priority        INTEGER NOT NULL DEFAULT 100,
    policy_count    INTEGER NOT NULL DEFAULT 0,
    control_families TEXT[] DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    content_hash    TEXT NOT NULL DEFAULT '',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pack_id, tenant_id, version)
);

-- ---------------------------------------------------------------------------
-- 2. Governance Policies (atomic policy objects)
-- ---------------------------------------------------------------------------
CREATE TABLE governance_policies (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    policy_id               TEXT NOT NULL,
    tenant_id               TEXT NOT NULL,
    pack_id                 TEXT NOT NULL REFERENCES governance_packs(id) ON DELETE CASCADE,
    control_family          TEXT NOT NULL,
    title                   TEXT NOT NULL,
    description             TEXT DEFAULT '',
    requirements            JSONB NOT NULL DEFAULT '[]',
    evidence_required       JSONB NOT NULL DEFAULT '[]',
    approval_roles          TEXT[] DEFAULT '{}',
    risk_level              TEXT NOT NULL CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    mai_level               TEXT NOT NULL CHECK (mai_level IN ('INFORMATIONAL','ADVISORY','MANDATORY')),
    applicable_worker_types TEXT[] DEFAULT '{}',
    applicable_domains      TEXT[] DEFAULT '{}',
    implementation_status   TEXT NOT NULL DEFAULT 'CONFIGURABLE'
                            CHECK (implementation_status IN ('ENFORCED','EVIDENCED','CONFIGURABLE','PARTIAL')),
    framework_refs          JSONB NOT NULL DEFAULT '[]',
    metadata                JSONB NOT NULL DEFAULT '{}',
    content_hash            TEXT NOT NULL DEFAULT '',
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(policy_id, tenant_id, pack_id)
);

-- ---------------------------------------------------------------------------
-- 3. Evidence Templates (what agents must produce per control)
-- ---------------------------------------------------------------------------
CREATE TABLE evidence_templates (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_id     TEXT NOT NULL,
    tenant_id       TEXT NOT NULL,
    policy_id       TEXT NOT NULL REFERENCES governance_policies(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    template_type   TEXT NOT NULL CHECK (template_type IN
                    ('SCREENSHOT','DOCUMENT','LOG_ENTRY','ATTESTATION','HASH_PROOF','APPROVAL_RECORD')),
    required_fields JSONB NOT NULL DEFAULT '[]',
    format_spec     JSONB NOT NULL DEFAULT '{}',
    is_required     BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(template_id, tenant_id, policy_id)
);

-- ---------------------------------------------------------------------------
-- 4. Approval Role Taxonomy (who can approve what)
-- ---------------------------------------------------------------------------
CREATE TABLE approval_roles (
    id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id                   TEXT NOT NULL,
    role_name                   TEXT NOT NULL,
    description                 TEXT DEFAULT '',
    can_approve_risk_levels     TEXT[] NOT NULL DEFAULT '{LOW,MEDIUM}',
    can_approve_mai_levels      TEXT[] NOT NULL DEFAULT '{INFORMATIONAL,ADVISORY}',
    can_approve_control_families TEXT[] DEFAULT '{}',
    requires_mfa                BOOLEAN NOT NULL DEFAULT false,
    max_approval_value_cents    INTEGER DEFAULT NULL,
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(role_name, tenant_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for runtime queries (agents need fast policy lookups)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_gov_policies_tenant ON governance_policies(tenant_id) WHERE is_active;
CREATE INDEX idx_gov_policies_family ON governance_policies(tenant_id, control_family) WHERE is_active;
CREATE INDEX idx_gov_policies_pack ON governance_policies(pack_id) WHERE is_active;
CREATE INDEX idx_gov_policies_mai ON governance_policies(tenant_id, mai_level) WHERE is_active;
CREATE INDEX idx_gov_policies_workers ON governance_policies USING GIN(applicable_worker_types) WHERE is_active;
CREATE INDEX idx_gov_policies_domains ON governance_policies USING GIN(applicable_domains) WHERE is_active;
CREATE INDEX idx_gov_packs_tenant ON governance_packs(tenant_id) WHERE is_active;
CREATE INDEX idx_gov_packs_priority ON governance_packs(tenant_id, priority DESC) WHERE is_active;
CREATE INDEX idx_gov_evidence_policy ON evidence_templates(policy_id);
CREATE INDEX idx_gov_approval_tenant ON approval_roles(tenant_id) WHERE is_active;

-- ---------------------------------------------------------------------------
-- Auto-update timestamps (reuse existing trigger function from 006)
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_governance_packs_updated_at
    BEFORE UPDATE ON governance_packs
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_runs_timestamp();

CREATE TRIGGER trg_governance_policies_updated_at
    BEFORE UPDATE ON governance_policies
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_runs_timestamp();
