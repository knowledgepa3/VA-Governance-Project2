/**
 * Case Repository — Database Access Layer
 *
 * All case CRUD operations. Tenant-scoped queries.
 * Profile encryption/decryption handled transparently.
 */

import { query, withTransaction } from '../connection';
import { encryptProfile, decryptProfile } from '../profileEncryption';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types (match frontend CaseShell / SensitiveProfile interfaces)
// ---------------------------------------------------------------------------

export interface CaseShellRow {
  id: string;
  case_alias: string;
  claim_type: string;
  condition_count: number;
  status: string;
  priority: string;
  evidence_package_ids: string[];
  evidence_hashes: string[];
  communication_count: number;
  last_contacted_at: string | null;
  completed_at: string | null;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseProfileData {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  conditions: string[];
  servicePeriod: { start: string; end: string };
  deployments?: string[];
  notes: string;
}

export interface CaseStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completedThisWeek: number;
  averageResolutionDays: number;
}

export interface BundleRunRow {
  id: string;
  case_id: string;
  bundle_id: string;
  bundle_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  result: any;
  evidence_count: number;
}

// ---------------------------------------------------------------------------
// Case Alias Generation
// ---------------------------------------------------------------------------

export async function getNextCaseAlias(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await query("SELECT nextval('case_alias_seq') AS seq");
  const seq = String(result.rows[0].seq).padStart(3, '0');
  return `CASE-${year}-${seq}`;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createCase(
  input: {
    claimType: string;
    conditionCount?: number;
    priority?: string;
    profileData?: CaseProfileData;
  },
  userId: string,
  tenantId: string
): Promise<CaseShellRow> {
  const id = randomUUID();
  const alias = await getNextCaseAlias();

  return withTransaction(async (txQuery) => {
    // Insert shell
    const shellResult = await txQuery(
      `INSERT INTO case_shells (id, case_alias, claim_type, condition_count, priority, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, alias, input.claimType, input.conditionCount || 0, input.priority || 'normal', tenantId, userId]
    );

    // Insert encrypted profile if provided
    if (input.profileData) {
      const { encrypted, hash } = encryptProfile(input.profileData);
      await txQuery(
        `INSERT INTO case_profiles (case_id, encrypted_data, data_hash, tenant_id)
         VALUES ($1, $2, $3, $4)`,
        [id, encrypted, hash, tenantId]
      );
    }

    return shellResult.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getCaseShell(id: string, tenantId: string): Promise<CaseShellRow | null> {
  const result = await query(
    'SELECT * FROM case_shells WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows[0] || null;
}

export async function getCaseProfile(id: string, tenantId: string): Promise<CaseProfileData | null> {
  const result = await query(
    'SELECT encrypted_data FROM case_profiles WHERE case_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (!result.rows[0]) return null;
  return decryptProfile(result.rows[0].encrypted_data) as CaseProfileData;
}

export async function listCaseShells(
  tenantId: string,
  filters?: { status?: string; priority?: string; limit?: number; offset?: number }
): Promise<CaseShellRow[]> {
  const conditions = ['tenant_id = $1'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters?.priority) {
    conditions.push(`priority = $${idx++}`);
    values.push(filters.priority);
  }

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const result = await query(
    `SELECT * FROM case_shells
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateCaseShell(
  id: string,
  updates: Partial<{
    claimType: string;
    conditionCount: number;
    status: string;
    priority: string;
    evidencePackageIds: string[];
    evidenceHashes: string[];
    communicationCount: number;
    lastContactedAt: string;
    completedAt: string;
  }>,
  tenantId: string
): Promise<CaseShellRow | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    claimType: 'claim_type',
    conditionCount: 'condition_count',
    status: 'status',
    priority: 'priority',
    evidencePackageIds: 'evidence_package_ids',
    evidenceHashes: 'evidence_hashes',
    communicationCount: 'communication_count',
    lastContactedAt: 'last_contacted_at',
    completedAt: 'completed_at',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = (updates as any)[key];
    if (val !== undefined) {
      const isJsonb = col.endsWith('_ids') || col.endsWith('_hashes');
      setClauses.push(`${col} = $${idx++}`);
      values.push(isJsonb ? JSON.stringify(val) : val);
    }
  }

  if (setClauses.length === 0) return getCaseShell(id, tenantId);

  setClauses.push(`updated_at = now()`);
  values.push(id, tenantId);

  const result = await query(
    `UPDATE case_shells SET ${setClauses.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function updateCaseProfile(
  id: string,
  data: Partial<CaseProfileData>,
  tenantId: string
): Promise<boolean> {
  // Read existing, merge, re-encrypt
  const existing = await getCaseProfile(id, tenantId);
  const merged = { ...(existing || {}), ...data } as CaseProfileData;
  const { encrypted, hash } = encryptProfile(merged);

  const result = await query(
    `INSERT INTO case_profiles (case_id, encrypted_data, data_hash, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (case_id) DO UPDATE SET encrypted_data = $2, data_hash = $3, updated_at = now()`,
    [id, encrypted, hash, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateStatus(
  id: string,
  status: string,
  tenantId: string
): Promise<CaseShellRow | null> {
  const extra: Record<string, any> = {};
  if (status === 'complete') {
    extra.completedAt = new Date().toISOString();
  }
  return updateCaseShell(id, { status, ...extra }, tenantId);
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export async function getCaseStats(tenantId: string): Promise<CaseStats> {
  const statsResult = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'new')::int AS status_new,
       COUNT(*) FILTER (WHERE status = 'researching')::int AS status_researching,
       COUNT(*) FILTER (WHERE status = 'evidence-ready')::int AS status_evidence_ready,
       COUNT(*) FILTER (WHERE status = 'review')::int AS status_review,
       COUNT(*) FILTER (WHERE status = 'complete')::int AS status_complete,
       COUNT(*) FILTER (WHERE status = 'on-hold')::int AS status_on_hold,
       COUNT(*) FILTER (WHERE priority = 'low')::int AS priority_low,
       COUNT(*) FILTER (WHERE priority = 'normal')::int AS priority_normal,
       COUNT(*) FILTER (WHERE priority = 'high')::int AS priority_high,
       COUNT(*) FILTER (WHERE priority = 'urgent')::int AS priority_urgent,
       COUNT(*) FILTER (WHERE completed_at >= now() - interval '7 days')::int AS completed_this_week,
       COALESCE(
         AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
         FILTER (WHERE completed_at IS NOT NULL),
         0
       )::float AS avg_resolution_days
     FROM case_shells
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const row = statsResult.rows[0];
  return {
    total: row.total,
    byStatus: {
      new: row.status_new,
      researching: row.status_researching,
      'evidence-ready': row.status_evidence_ready,
      review: row.status_review,
      complete: row.status_complete,
      'on-hold': row.status_on_hold,
    },
    byPriority: {
      low: row.priority_low,
      normal: row.priority_normal,
      high: row.priority_high,
      urgent: row.priority_urgent,
    },
    completedThisWeek: row.completed_this_week,
    averageResolutionDays: Math.round(row.avg_resolution_days * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Bundle Runs
// ---------------------------------------------------------------------------

export async function startBundleRun(
  caseId: string,
  bundleId: string,
  bundleName: string
): Promise<BundleRunRow> {
  const id = randomUUID();
  const result = await query(
    `INSERT INTO bundle_runs (id, case_id, bundle_id, bundle_name, status)
     VALUES ($1, $2, $3, $4, 'running')
     RETURNING *`,
    [id, caseId, bundleId, bundleName]
  );
  return result.rows[0];
}

export async function completeBundleRun(
  runId: string,
  status: string,
  result: any,
  evidenceCount: number
): Promise<BundleRunRow | null> {
  const res = await query(
    `UPDATE bundle_runs SET status = $1, result = $2, evidence_count = $3, completed_at = now()
     WHERE id = $4 RETURNING *`,
    [status, JSON.stringify(result), evidenceCount, runId]
  );
  return res.rows[0] || null;
}

export async function getBundleRuns(caseId: string): Promise<BundleRunRow[]> {
  const result = await query(
    'SELECT * FROM bundle_runs WHERE case_id = $1 ORDER BY started_at DESC',
    [caseId]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Communications
// ---------------------------------------------------------------------------

export async function addCommunication(
  caseId: string,
  entry: { type: string; direction: string; subject?: string; content: string; attachments?: string[] },
  tenantId: string
): Promise<void> {
  const id = randomUUID();
  // Encrypt content (may contain PHI)
  const { encrypted } = encryptProfile({ content: entry.content });

  await query(
    `INSERT INTO communication_log (id, case_id, type, direction, subject, content_encrypted, attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, caseId, entry.type, entry.direction, entry.subject || null, encrypted, JSON.stringify(entry.attachments || [])]
  );

  // Update communication count on shell
  await query(
    `UPDATE case_shells SET communication_count = communication_count + 1, last_contacted_at = now(), updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [caseId, tenantId]
  );
}
