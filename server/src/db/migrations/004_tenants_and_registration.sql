-- ============================================================================
-- ACE Governance Platform — Tenants Table + Registration Support
-- ============================================================================
-- Phase 2: Self-service signup. Moves tenant registry from in-memory Map
-- to PostgreSQL with caching. Adds usage tracking columns for free tier.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tenants (multi-tenant registry — source of truth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    tier            TEXT NOT NULL DEFAULT 'free'
                    CHECK (tier IN ('free', 'pro', 'enterprise', 'government')),
    data_region     TEXT NOT NULL DEFAULT 'us-east-1',
    isolation_level TEXT NOT NULL DEFAULT 'shared'
                    CHECK (isolation_level IN ('shared', 'dedicated')),
    features        JSONB NOT NULL DEFAULT '["basic"]',
    owner_user_id   TEXT,
    setup_id        TEXT,
    domain_type     TEXT,
    ai_queries_used INTEGER NOT NULL DEFAULT 0,
    ai_queries_limit INTEGER NOT NULL DEFAULT 50,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_tier ON tenants(tier);

-- ---------------------------------------------------------------------------
-- Seed the two pre-existing tenants so existing data stays consistent
-- ---------------------------------------------------------------------------
INSERT INTO tenants (id, name, tier, data_region, isolation_level, features)
VALUES
    ('default', 'Default Tenant', 'free', 'us-east-1', 'shared', '["basic"]'),
    ('gov-va', 'VA Government', 'government', 'us-gov-west-1', 'dedicated', '["basic","pii","fedramp","audit_export"]')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Add FK from users.tenant_id → tenants.id (deferred, existing rows OK)
-- ---------------------------------------------------------------------------
-- Note: We don't add the FK constraint here because existing users may
-- reference tenants not yet in the table. The application enforces this.
