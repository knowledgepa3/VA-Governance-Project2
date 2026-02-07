/**
 * Tenant Repository — Database Access Layer
 *
 * All tenant queries go through here. Maintains an in-memory cache
 * that is populated on startup and updated on writes.
 */

import { query } from '../connection';
import { logger } from '../../logger';

const log = logger.child({ component: 'TenantRepository' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DbTenant {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise' | 'government';
  data_region: string;
  isolation_level: 'shared' | 'dedicated';
  features: string[];
  owner_user_id: string | null;
  setup_id: string | null;
  domain_type: string | null;
  ai_queries_used: number;
  ai_queries_limit: number;
  billing_cycle_start: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise' | 'government';
  dataRegion: string;
  isolationLevel: 'shared' | 'dedicated';
  features: string[];
  ownerUserId: string | null;
  setupId: string | null;
  domainType: string | null;
  aiQueriesUsed: number;
  aiQueriesLimit: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const tenantCache: Map<string, TenantInfo> = new Map();

function toTenantInfo(row: DbTenant): TenantInfo {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    dataRegion: row.data_region,
    isolationLevel: row.isolation_level,
    features: Array.isArray(row.features) ? row.features : JSON.parse(row.features as any),
    ownerUserId: row.owner_user_id,
    setupId: row.setup_id,
    domainType: row.domain_type,
    aiQueriesUsed: row.ai_queries_used,
    aiQueriesLimit: row.ai_queries_limit,
  };
}

/**
 * Load all active tenants into cache. Call once at startup.
 */
export async function loadCache(): Promise<void> {
  try {
    const result = await query('SELECT * FROM tenants WHERE is_active = true');
    tenantCache.clear();
    for (const row of result.rows) {
      tenantCache.set(row.id, toTenantInfo(row));
    }
    log.info('Tenant cache loaded', { count: tenantCache.size });
  } catch (err: any) {
    // Table might not exist yet (migration hasn't run)
    if (err.code === '42P01') {
      log.warn('Tenants table not found — using defaults until migration runs');
      return;
    }
    throw err;
  }
}

/**
 * Get tenant by ID (cache-first, DB fallback)
 */
export async function findById(id: string): Promise<TenantInfo | null> {
  // Cache hit
  const cached = tenantCache.get(id);
  if (cached) return cached;

  // DB fallback
  const result = await query(
    'SELECT * FROM tenants WHERE id = $1 AND is_active = true',
    [id]
  );
  if (!result.rows[0]) return null;

  const info = toTenantInfo(result.rows[0]);
  tenantCache.set(id, info);
  return info;
}

/**
 * Check if a tenant ID already exists
 */
export async function exists(id: string): Promise<boolean> {
  if (tenantCache.has(id)) return true;
  const result = await query('SELECT 1 FROM tenants WHERE id = $1', [id]);
  return result.rows.length > 0;
}

/**
 * Create a new tenant. Returns the created tenant info.
 */
export async function createTenant(input: {
  id: string;
  name: string;
  tier?: 'free' | 'pro' | 'enterprise' | 'government';
  ownerUserId?: string;
  setupId?: string;
  domainType?: string;
  features?: string[];
  aiQueriesLimit?: number;
}): Promise<TenantInfo> {
  const tier = input.tier || 'free';
  const features = input.features || ['basic'];
  const limit = input.aiQueriesLimit || (tier === 'free' ? 50 : tier === 'pro' ? 500 : 9999);

  const result = await query(
    `INSERT INTO tenants (id, name, tier, features, owner_user_id, setup_id, domain_type, ai_queries_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.id,
      input.name,
      tier,
      JSON.stringify(features),
      input.ownerUserId || null,
      input.setupId || null,
      input.domainType || null,
      limit,
    ]
  );

  const info = toTenantInfo(result.rows[0]);
  tenantCache.set(info.id, info);
  log.info('Tenant created', { tenantId: info.id, tier: info.tier });
  return info;
}

/**
 * Increment AI query usage for a tenant. Returns updated count.
 */
export async function incrementUsage(tenantId: string): Promise<{ used: number; limit: number; allowed: boolean }> {
  const result = await query(
    `UPDATE tenants
     SET ai_queries_used = ai_queries_used + 1, updated_at = now()
     WHERE id = $1
     RETURNING ai_queries_used, ai_queries_limit`,
    [tenantId]
  );

  if (!result.rows[0]) {
    return { used: 0, limit: 0, allowed: false };
  }

  const { ai_queries_used, ai_queries_limit } = result.rows[0];

  // Update cache
  const cached = tenantCache.get(tenantId);
  if (cached) cached.aiQueriesUsed = ai_queries_used;

  return {
    used: ai_queries_used,
    limit: ai_queries_limit,
    allowed: ai_queries_used <= ai_queries_limit,
  };
}

/**
 * Get all cached tenants (for the in-memory tenant isolation system)
 */
export function getAllCached(): Map<string, TenantInfo> {
  return tenantCache;
}
