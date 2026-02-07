/**
 * PostgreSQL Connection Pool
 *
 * Singleton pool for all database operations.
 * Configured for a resource-constrained 2GB droplet:
 *   - max 5 connections (Express is single-threaded)
 *   - 30s idle timeout
 *   - 5s connection timeout
 *
 * Usage:
 *   import { query, initialize, shutdown } from './db/connection';
 *   await initialize();  // called once at server startup
 *   const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */

import { Pool, QueryResult } from 'pg';
import { runMigrations } from './migrate';

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'ace'}:${process.env.POSTGRES_PASSWORD || 'dev_only_changeme'}@${process.env.POSTGRES_HOST || 'postgres'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'ace_governance'}`;

// Warn if using default password
const dbPassword = process.env.POSTGRES_PASSWORD || '';
if (!dbPassword || dbPassword.includes('changeme') || dbPassword.includes('dev_only')) {
  console.warn('[DB] WARNING: Using default database password. Set POSTGRES_PASSWORD in .env for production.');
  if (process.env.NODE_ENV === 'production') {
    console.error('[DB] FATAL: Default database password in production is not allowed.');
    process.exit(1);
  }
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log pool errors (don't crash the server)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// ---------------------------------------------------------------------------
// Query helper with slow-query logging
// ---------------------------------------------------------------------------

const SLOW_QUERY_MS = 500;

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_MS) {
      console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 120)}...`);
    }
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    console.error(`[DB] Query error (${duration}ms): ${err.message}`);
    console.error(`[DB] SQL: ${text.substring(0, 200)}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Transaction helper
// ---------------------------------------------------------------------------

export async function withTransaction<T>(fn: (query: (text: string, params?: any[]) => Promise<QueryResult>) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txQuery = (text: string, params?: any[]) => client.query(text, params);
    const result = await fn(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function initialize(): Promise<void> {
  // Test connection
  try {
    const res = await pool.query('SELECT NOW() AS now');
    console.log(`[DB] Connected to PostgreSQL at ${new Date(res.rows[0].now).toISOString()}`);
  } catch (err: any) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    throw err;
  }

  // Run pending migrations
  await runMigrations(pool);
  console.log('[DB] Migrations complete');
}

export async function shutdown(): Promise<void> {
  console.log('[DB] Shutting down connection pool...');
  await pool.end();
  console.log('[DB] Pool closed');
}
