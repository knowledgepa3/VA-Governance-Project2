/**
 * Simple SQL Migration Runner
 *
 * Reads *.sql files from the migrations/ directory in alphabetical order.
 * Tracks applied migrations in a `_migrations` table.
 * Each migration runs in its own transaction for safety.
 *
 * Called automatically by connection.initialize() at server startup.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(pool: Pool): Promise<void> {
  // Ensure _migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // Get already-applied migrations
  const applied = await pool.query('SELECT name FROM _migrations ORDER BY name');
  const appliedSet = new Set(applied.rows.map((r: any) => r.name));

  // Read migration files in order
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[DB] No migrations directory found, skipping');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue; // Already applied
    }

    console.log(`[DB] Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[DB] Migration applied: ${file}`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`[DB] Migration FAILED: ${file} — ${err.message}`);
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
}
