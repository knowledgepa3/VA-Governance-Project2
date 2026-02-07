-- ============================================================================
-- ACE Governance Platform — Remove Demo Seed Users
-- ============================================================================
-- Production hardening: remove all demo/example users seeded by 002.
-- Real users are provisioned through the registration endpoint or admin CLI.
--
-- Must handle foreign key references (case_shells.created_by -> users.id)
-- before deleting users.
-- ============================================================================

-- Step 1: Nullify foreign key references to demo users
UPDATE case_shells SET created_by = NULL
WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@example.com');

UPDATE case_shells SET created_by = NULL
WHERE created_by IN (
  SELECT id FROM users
  WHERE password_hash = '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S'
);

-- Step 2: Remove all demo users (seeded with @example.com emails)
DELETE FROM users WHERE email LIKE '%@example.com';

-- Step 3: Remove any remaining users with the known demo password hash
DELETE FROM users WHERE password_hash = '$2a$12$evOsuegJvI3Y6MavgVk1geiV1zA3KdWcxEb2d.qYeQ.o9XkA.NU5S';
