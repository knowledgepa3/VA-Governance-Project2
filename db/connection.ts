/**
 * Database Connection Manager
 *
 * Manages PostgreSQL connections with pooling.
 * Designed for both serverless and traditional deployments.
 */

import { Pool, PoolConfig, PoolClient } from 'pg';

// =============================================================================
// CONNECTION CONFIGURATION
// =============================================================================

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;  // Max pool connections
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Load database configuration from environment
 */
export function loadDbConfig(): DbConfig {
  const sslMode = process.env.DB_SSL || 'prefer';

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ace_governance',
    user: process.env.DB_USER || 'ace',
    password: process.env.DB_PASSWORD || '',
    ssl: sslMode === 'require' ? { rejectUnauthorized: false } :
         sslMode === 'disable' ? false :
         undefined,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
}

// =============================================================================
// CONNECTION POOL
// =============================================================================

let pool: Pool | null = null;

/**
 * Get or create the connection pool
 */
export function getPool(config?: DbConfig): Pool {
  if (!pool) {
    const dbConfig = config || loadDbConfig();
    pool = new Pool(dbConfig as PoolConfig);

    // Log connection events
    pool.on('connect', () => {
      console.log('[DB] Client connected to pool');
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err);
    });
  }

  return pool;
}

/**
 * Get a client from the pool
 * Remember to release the client when done!
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Execute a query (automatically acquires and releases client)
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row or null
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

/**
 * Check database connectivity
 */
export async function healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();

  try {
    await query('SELECT 1');
    return {
      healthy: true,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// MOCK IMPLEMENTATION (for when DB is not configured)
// =============================================================================

/**
 * Check if database is configured
 */
export function isDbConfigured(): boolean {
  return !!(process.env.DB_HOST && process.env.DB_PASSWORD);
}

/**
 * In-memory store for when database is not configured
 * Useful for development and demos
 */
export class InMemoryStore {
  private data: Map<string, Map<string, any>> = new Map();

  constructor() {
    // Initialize default tables
    this.data.set('audit_log', new Map());
    this.data.set('evidence_packs', new Map());
    this.data.set('operators', new Map());
    this.data.set('sessions', new Map());
    this.data.set('opportunities', new Map());
  }

  insert(table: string, id: string, record: any): void {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }
    this.data.get(table)!.set(id, { ...record, id });
  }

  find(table: string, id: string): any | null {
    return this.data.get(table)?.get(id) || null;
  }

  findAll(table: string): any[] {
    const tableData = this.data.get(table);
    return tableData ? Array.from(tableData.values()) : [];
  }

  findWhere(table: string, predicate: (record: any) => boolean): any[] {
    return this.findAll(table).filter(predicate);
  }

  update(table: string, id: string, updates: Partial<any>): void {
    const existing = this.find(table, id);
    if (existing) {
      this.data.get(table)!.set(id, { ...existing, ...updates });
    }
  }

  delete(table: string, id: string): void {
    this.data.get(table)?.delete(id);
  }

  clear(table?: string): void {
    if (table) {
      this.data.get(table)?.clear();
    } else {
      this.data.forEach(t => t.clear());
    }
  }
}

// Global in-memory store instance
let inMemoryStore: InMemoryStore | null = null;

export function getInMemoryStore(): InMemoryStore {
  if (!inMemoryStore) {
    inMemoryStore = new InMemoryStore();
  }
  return inMemoryStore;
}
