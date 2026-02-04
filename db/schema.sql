-- =============================================================================
-- ACE Governance Platform - PostgreSQL Schema
-- =============================================================================
--
-- This schema supports:
-- - Immutable audit log entries with hash chaining (AU-9 compliance)
-- - Evidence packs with full provenance tracking
-- - Session management for multi-tenant deployments
-- - Operator identity tracking (AC-2, IA-2 compliance)
--
-- Design Principles:
-- 1. Append-only tables for audit data (no UPDATE/DELETE in application layer)
-- 2. Hash chains for tamper detection
-- 3. JSONB for flexible metadata without schema changes
-- 4. Proper indexing for query performance
-- 5. Tenant isolation via tenant_id foreign key
--
-- =============================================================================

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tenants (for multi-tenant deployments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- -----------------------------------------------------------------------------
-- Operators (users who interact with the system)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_id VARCHAR(255),  -- ID from external auth provider (Auth0, Login.gov)
    email VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- ISSO, ANALYST, AUDITOR, BD_MANAGER, etc.
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT unique_tenant_external_id UNIQUE (tenant_id, external_id),
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_operators_tenant ON operators(tenant_id);
CREATE INDEX idx_operators_external_id ON operators(external_id);
CREATE INDEX idx_operators_role ON operators(role);

-- -----------------------------------------------------------------------------
-- Sessions (for tracking operator sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    operator_id UUID NOT NULL REFERENCES operators(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',

    -- Session state
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_sessions_operator ON sessions(operator_id);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- AUDIT TABLES (Append-Only)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Audit Log Entries
-- Core table for all auditable events
-- Designed for AU-2, AU-3, AU-9 compliance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Sequence for hash chaining
    sequence_num BIGSERIAL NOT NULL,

    -- Event identification
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_id VARCHAR(100) NOT NULL,
    session_id UUID REFERENCES sessions(id),

    -- Actor identification (AU-3: Who)
    operator_id UUID NOT NULL REFERENCES operators(id),
    operator_role VARCHAR(50),

    -- Event details (AU-3: What, Where)
    action VARCHAR(50) NOT NULL,  -- ActionType enum
    target TEXT,
    url TEXT,
    domain VARCHAR(255),

    -- Classification and decision
    classification VARCHAR(20) NOT NULL,  -- MAIClassification
    policy_decision VARCHAR(30) NOT NULL,  -- PolicyDecision
    policy_rule_id VARCHAR(100),

    -- Approval tracking
    approved BOOLEAN,
    approver_id UUID REFERENCES operators(id),
    approval_timestamp TIMESTAMPTZ,
    attestation TEXT,

    -- Context and reasoning
    reasoning TEXT,
    context JSONB DEFAULT '{}',

    -- Evidence
    screenshot_path TEXT,

    -- Integrity (AU-9)
    content_hash VARCHAR(64) NOT NULL,  -- SHA-256 of entry content
    previous_hash VARCHAR(64),  -- Hash of previous entry (chain)

    -- Prevent updates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_operator ON audit_log(operator_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_classification ON audit_log(classification);
CREATE INDEX idx_audit_log_sequence ON audit_log(tenant_id, sequence_num);
CREATE INDEX idx_audit_log_session ON audit_log(session_id);

-- Unique constraint for hash chain integrity
CREATE UNIQUE INDEX idx_audit_log_chain ON audit_log(tenant_id, sequence_num);

-- =============================================================================
-- EVIDENCE PACK TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Evidence Packs (execution records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Execution identification
    execution_id VARCHAR(100) NOT NULL,
    playbook_id VARCHAR(100) NOT NULL,
    playbook_version VARCHAR(50),
    agent_id VARCHAR(100) NOT NULL,

    -- Actor
    operator_id UUID NOT NULL REFERENCES operators(id),
    session_id UUID REFERENCES sessions(id),

    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'running',  -- running, completed, failed, cancelled

    -- Report summary
    report_summary TEXT,
    report_findings JSONB DEFAULT '[]',
    report_recommendations JSONB DEFAULT '[]',
    completeness_score INTEGER,  -- 0-100

    -- Integrity
    pack_hash VARCHAR(64),  -- SHA-256 of entire pack
    signature TEXT,  -- Optional cryptographic signature

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_tenant_execution UNIQUE (tenant_id, execution_id)
);

CREATE INDEX idx_evidence_packs_tenant ON evidence_packs(tenant_id);
CREATE INDEX idx_evidence_packs_execution ON evidence_packs(execution_id);
CREATE INDEX idx_evidence_packs_playbook ON evidence_packs(playbook_id);
CREATE INDEX idx_evidence_packs_operator ON evidence_packs(operator_id);
CREATE INDEX idx_evidence_packs_status ON evidence_packs(status);
CREATE INDEX idx_evidence_packs_started ON evidence_packs(started_at);

-- -----------------------------------------------------------------------------
-- Evidence Pack Timeline (steps)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_pack_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_pack_id UUID NOT NULL REFERENCES evidence_packs(id) ON DELETE CASCADE,

    step_id VARCHAR(100) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,

    timestamp TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL,  -- completed, failed, skipped

    screenshot_path TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_timeline_pack ON evidence_pack_timeline(evidence_pack_id);
CREATE INDEX idx_timeline_step ON evidence_pack_timeline(step_id);
CREATE INDEX idx_timeline_order ON evidence_pack_timeline(evidence_pack_id, step_order);

-- -----------------------------------------------------------------------------
-- Evidence Pack Artifacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_pack_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_pack_id UUID NOT NULL REFERENCES evidence_packs(id) ON DELETE CASCADE,

    artifact_type VARCHAR(50) NOT NULL,  -- document, data, screenshot, report
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Provenance
    source TEXT NOT NULL,
    source_url TEXT,
    extracted_at TIMESTAMPTZ NOT NULL,

    -- Integrity
    content_hash VARCHAR(64) NOT NULL,  -- SHA-256

    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_artifacts_pack ON evidence_pack_artifacts(evidence_pack_id);
CREATE INDEX idx_artifacts_type ON evidence_pack_artifacts(artifact_type);
CREATE INDEX idx_artifacts_hash ON evidence_pack_artifacts(content_hash);

-- -----------------------------------------------------------------------------
-- Evidence Pack Decisions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_pack_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_pack_id UUID NOT NULL REFERENCES evidence_packs(id) ON DELETE CASCADE,

    step_id VARCHAR(100) NOT NULL,
    decision VARCHAR(100) NOT NULL,
    reasoning TEXT,
    confidence DECIMAL(5,2),  -- 0.00 to 100.00

    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_decisions_pack ON evidence_pack_decisions(evidence_pack_id);
CREATE INDEX idx_decisions_step ON evidence_pack_decisions(step_id);

-- -----------------------------------------------------------------------------
-- Evidence Pack Approvals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_pack_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_pack_id UUID NOT NULL REFERENCES evidence_packs(id) ON DELETE CASCADE,

    step_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,

    approved BOOLEAN NOT NULL,
    approver_id UUID NOT NULL REFERENCES operators(id),

    timestamp TIMESTAMPTZ NOT NULL,
    attestation TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_approvals_pack ON evidence_pack_approvals(evidence_pack_id);
CREATE INDEX idx_approvals_approver ON evidence_pack_approvals(approver_id);

-- =============================================================================
-- BD WORKFORCE TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Opportunities (RFP/RFI tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Identification
    rfp_number VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    agency VARCHAR(255),
    sub_agency VARCHAR(255),

    -- Details
    description TEXT,
    estimated_value DECIMAL(15,2),
    naics_codes VARCHAR(255),
    set_aside_type VARCHAR(100),

    -- Dates
    posted_date DATE,
    response_deadline TIMESTAMPTZ,

    -- Analysis
    status VARCHAR(50) NOT NULL DEFAULT 'new',  -- new, qualifying, qualified, no_bid, bid, won, lost
    bid_decision VARCHAR(50),  -- STRONG_BID, BID, QUALIFIED_NO_BID, NO_BID
    win_probability DECIMAL(5,2),

    -- Assignment
    assigned_to UUID REFERENCES operators(id),
    teaming_required BOOLEAN,
    competitor_count INTEGER,

    -- Source data
    sam_gov_url TEXT,
    source_data JSONB DEFAULT '{}',

    -- Tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qualified_at TIMESTAMPTZ,
    decision_at TIMESTAMPTZ,

    CONSTRAINT unique_tenant_rfp UNIQUE (tenant_id, rfp_number)
);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_decision ON opportunities(bid_decision);
CREATE INDEX idx_opportunities_deadline ON opportunities(response_deadline);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: Update updated_at timestamp
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at
    BEFORE UPDATE ON operators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Function: Generate content hash for audit entries
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_audit_content_hash()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate SHA-256 hash of audit entry content
    NEW.content_hash = encode(
        digest(
            COALESCE(NEW.agent_id, '') ||
            COALESCE(NEW.operator_id::text, '') ||
            COALESCE(NEW.action, '') ||
            COALESCE(NEW.target, '') ||
            COALESCE(NEW.classification, '') ||
            COALESCE(NEW.policy_decision, '') ||
            COALESCE(NEW.reasoning, '') ||
            COALESCE(NEW.timestamp::text, ''),
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_audit_hash
    BEFORE INSERT ON audit_log
    FOR EACH ROW EXECUTE FUNCTION generate_audit_content_hash();

-- -----------------------------------------------------------------------------
-- Function: Link audit entries in hash chain
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION link_audit_chain()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash VARCHAR(64);
BEGIN
    -- Get the hash of the previous entry for this tenant
    SELECT content_hash INTO prev_hash
    FROM audit_log
    WHERE tenant_id = NEW.tenant_id
    ORDER BY sequence_num DESC
    LIMIT 1;

    NEW.previous_hash = prev_hash;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER link_audit_chain
    BEFORE INSERT ON audit_log
    FOR EACH ROW EXECUTE FUNCTION link_audit_chain();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- View: Audit log with operator details
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW audit_log_view AS
SELECT
    al.*,
    o.display_name as operator_name,
    o.email as operator_email,
    o.role as operator_role_name,
    ao.display_name as approver_name
FROM audit_log al
JOIN operators o ON al.operator_id = o.id
LEFT JOIN operators ao ON al.approver_id = ao.id;

-- -----------------------------------------------------------------------------
-- View: Evidence pack summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW evidence_pack_summary AS
SELECT
    ep.*,
    o.display_name as operator_name,
    (SELECT COUNT(*) FROM evidence_pack_timeline ept WHERE ept.evidence_pack_id = ep.id) as step_count,
    (SELECT COUNT(*) FROM evidence_pack_artifacts epa WHERE epa.evidence_pack_id = ep.id) as artifact_count,
    (SELECT COUNT(*) FROM evidence_pack_approvals epa WHERE epa.evidence_pack_id = ep.id) as approval_count
FROM evidence_packs ep
JOIN operators o ON ep.operator_id = o.id;

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Create default tenant for single-tenant deployments
INSERT INTO tenants (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    '{"single_tenant": true}'
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE audit_log IS 'Immutable audit log for all system events. Append-only with hash chaining for tamper detection.';
COMMENT ON TABLE evidence_packs IS 'Execution records for playbook runs with full provenance tracking.';
COMMENT ON TABLE operators IS 'Users who interact with the system. External auth IDs mapped here.';
COMMENT ON TABLE opportunities IS 'BD opportunity tracking for RFP/RFI qualification workflow.';

COMMENT ON COLUMN audit_log.content_hash IS 'SHA-256 hash of entry content for integrity verification';
COMMENT ON COLUMN audit_log.previous_hash IS 'Hash of previous entry in chain for tamper detection';
COMMENT ON COLUMN audit_log.sequence_num IS 'Monotonically increasing sequence for ordering and chain validation';
