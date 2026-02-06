/**
 * User Repository — Database Access Layer
 *
 * All user queries go through here. bcrypt comparison for password verification.
 * Enforces is_active check on all lookups.
 */

import bcrypt from 'bcryptjs';
import { query } from '../connection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DbUser {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  role: string;
  tenant_id: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  tenantId: string;
  permissions: string[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

function toSafeUser(row: DbUser): SafeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    tenantId: row.tenant_id,
    permissions: row.permissions || [],
  };
}

export async function findByEmail(email: string): Promise<DbUser | null> {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

export async function findById(id: string): Promise<DbUser | null> {
  const result = await query(
    'SELECT * FROM users WHERE id = $1 AND is_active = true',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Verify email + password against the database.
 * Returns SafeUser (no password hash) on success, null on failure.
 * Uses bcrypt.compare for timing-safe comparison.
 */
export async function verifyPassword(email: string, password: string): Promise<SafeUser | null> {
  const user = await findByEmail(email);
  if (!user) {
    // Constant-time: always run bcrypt even if user not found (prevent timing attacks)
    await bcrypt.compare(password, '$2a$12$INVALIDHASHPADDINGTOPREVENTSIDEEFFECTS000000000000');
    return null;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return toSafeUser(user);
}

/**
 * Create a new user with a bcrypt-hashed password.
 */
export async function createUser(input: {
  id: string;
  email: string;
  displayName: string;
  password: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
}): Promise<SafeUser> {
  const hash = await bcrypt.hash(input.password, 12);
  const result = await query(
    `INSERT INTO users (id, email, display_name, password_hash, role, tenant_id, permissions)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.id,
      input.email.toLowerCase().trim(),
      input.displayName,
      hash,
      input.role,
      input.tenantId || 'default',
      JSON.stringify(input.permissions || []),
    ]
  );
  return toSafeUser(result.rows[0]);
}

/**
 * Update user fields (except password).
 */
export async function updateUser(
  id: string,
  updates: Partial<{ displayName: string; role: string; permissions: string[]; isActive: boolean }>
): Promise<SafeUser | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.displayName !== undefined) {
    setClauses.push(`display_name = $${idx++}`);
    values.push(updates.displayName);
  }
  if (updates.role !== undefined) {
    setClauses.push(`role = $${idx++}`);
    values.push(updates.role);
  }
  if (updates.permissions !== undefined) {
    setClauses.push(`permissions = $${idx++}`);
    values.push(JSON.stringify(updates.permissions));
  }
  if (updates.isActive !== undefined) {
    setClauses.push(`is_active = $${idx++}`);
    values.push(updates.isActive);
  }

  if (setClauses.length === 0) return findById(id).then((u) => u ? toSafeUser(u) : null);

  setClauses.push(`updated_at = now()`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ? toSafeUser(result.rows[0]) : null;
}
