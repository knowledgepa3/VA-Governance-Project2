-- ============================================================================
-- ACE Governance Platform — Remove Demo Seed Users
-- ============================================================================
-- Production hardening: remove all demo/example users seeded by 002.
-- Real users are provisioned through the registration endpoint or admin CLI.
--
-- This migration is safe to run multiple times (DELETE is idempotent).
-- ============================================================================

-- Remove all demo users (seeded with @example.com emails and "demo" password)
DELETE FROM users WHERE email LIKE '%@example.com';

-- Remove any users with the known demo password hash
-- bcrypt hash of "demo" (cost 12): $2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S
DELETE FROM users WHERE password_hash = '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S';
