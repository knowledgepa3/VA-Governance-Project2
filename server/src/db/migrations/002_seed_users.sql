-- ============================================================================
-- ACE Governance Platform — Seed Default Users
-- ============================================================================
-- Matches the 7 users from MockAuthProvider on the frontend.
-- All passwords = "demo" (bcrypt cost 12).
-- ON CONFLICT DO NOTHING makes this idempotent.
-- ============================================================================

INSERT INTO users (id, email, display_name, password_hash, role, tenant_id, permissions) VALUES
  (
    'user-isso-001',
    'isso@example.com',
    'Jane Smith (ISSO)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'ISSO / ACE Architect',
    'default',
    '["admin", "audit:read", "audit:write", "cases:read", "cases:write", "cases:profile", "ai:chat", "compliance:read"]'::jsonb
  ),
  (
    'user-analyst-001',
    'analyst@example.com',
    'Bob Johnson (Analyst)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'Security Analyst',
    'default',
    '["audit:read", "cases:read", "cases:write", "cases:profile", "ai:chat"]'::jsonb
  ),
  (
    'user-auditor-001',
    'auditor@example.com',
    'Carol Williams (Auditor)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'Federal Auditor',
    'default',
    '["audit:read", "audit:verify", "cases:read", "compliance:read"]'::jsonb
  ),
  (
    'user-bd-001',
    'bd@example.com',
    'David Lee (BD Manager)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'BD Manager',
    'default',
    '["cases:read", "cases:write", "ai:chat"]'::jsonb
  ),
  (
    'user-capture-001',
    'capture@example.com',
    'Emily Chen (Capture Manager)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'Capture Manager',
    'default',
    '["cases:read", "cases:write", "ai:chat"]'::jsonb
  ),
  (
    'user-forensic-001',
    'forensic@example.com',
    'Frank Miller (Forensic SME)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'Forensic SME',
    'default',
    '["cases:read", "cases:write", "cases:profile", "ai:chat"]'::jsonb
  ),
  (
    'user-viewer-001',
    'viewer@example.com',
    'Grace Taylor (Viewer)',
    '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S',
    'Viewer',
    'default',
    '["cases:read"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
