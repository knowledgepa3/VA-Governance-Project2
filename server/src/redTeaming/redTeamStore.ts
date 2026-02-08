/**
 * Red Team Store — PostgreSQL CRUD for Red Team Findings
 *
 * Persists adversarial probe results (failed probes = findings).
 * Finding lifecycle is forward-only:
 *   discovered → in_review → remediated → verified
 *
 * Invariants:
 *   - 'verified' status requires a sealed evidence bundle ID
 *   - Status transitions are forward-only (cannot go backwards)
 *   - All queries are tenant-scoped
 *   - Errors are logged, never thrown (fail-open pattern)
 */

import { query } from '../db/connection';
import { logger } from '../logger';

const log = logger.child({ component: 'RedTeamStore' });

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type FindingStatus = 'discovered' | 'in_review' | 'remediated' | 'verified';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RedTeamFinding {
  id: string;
  tenantId: string;
  runId: string;
  probeName: string;
  probeCategory: string;
  targetWorker: string;
  severity: FindingSeverity;
  controlFamily: string;
  passed: boolean;
  responseSnippet: string;
  expectedBehavior: string;
  status: FindingStatus;
  remediationNote: string | null;
  remediationEvidenceId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  discoveredAt: string;
  updatedAt: string;
}

export interface RedTeamStats {
  totalFindings: number;
  openFindings: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  lastRunAt: string | null;
}

export interface OpenFindingCount {
  severity: string;
  controlFamily: string;
  count: number;
}

export interface WorkerFindingCount {
  targetWorker: string;
  total: number;
  critical: number;
  high: number;
}

// Allowed status transitions (forward-only)
const VALID_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  discovered: ['in_review'],
  in_review: ['remediated'],
  remediated: ['verified'],
  verified: [],
};

// ═══════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new finding from a failed probe.
 */
export async function createFinding(finding: {
  id: string;
  tenantId: string;
  runId: string;
  probeName: string;
  probeCategory: string;
  targetWorker: string;
  severity: FindingSeverity;
  controlFamily: string;
  passed: boolean;
  responseSnippet: string;
  expectedBehavior: string;
}): Promise<RedTeamFinding | null> {
  try {
    const result = await query(
      `INSERT INTO red_team_findings
       (id, tenant_id, run_id, probe_name, probe_category, target_worker,
        severity, control_family, passed, response_snippet, expected_behavior)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        finding.id,
        finding.tenantId,
        finding.runId,
        finding.probeName,
        finding.probeCategory,
        finding.targetWorker,
        finding.severity,
        finding.controlFamily,
        finding.passed,
        finding.responseSnippet.slice(0, 1000), // Truncate snippets
        finding.expectedBehavior,
      ]
    );

    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  } catch (err) {
    log.warn('Failed to create red team finding', {
      id: finding.id, error: (err as Error).message
    });
    return null;
  }
}

/**
 * Update finding status with forward-only lifecycle enforcement.
 */
export async function updateFindingStatus(
  id: string,
  tenantId: string,
  newStatus: FindingStatus,
  opts?: {
    reviewedBy?: string;
    remediationNote?: string;
    remediationEvidenceId?: string;
  }
): Promise<RedTeamFinding | null> {
  try {
    // Fetch current status
    const current = await query(
      `SELECT status FROM red_team_findings WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (current.rows.length === 0) {
      log.warn('Finding not found for status update', { id, tenantId });
      return null;
    }

    const currentStatus = current.rows[0].status as FindingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed.includes(newStatus)) {
      log.warn('Invalid status transition', {
        id, from: currentStatus, to: newStatus, allowed
      });
      return null;
    }

    // 'verified' requires evidence bundle ID
    if (newStatus === 'verified' && !opts?.remediationEvidenceId) {
      log.warn('verified status requires remediationEvidenceId', { id });
      return null;
    }

    const result = await query(
      `UPDATE red_team_findings
       SET status = $3,
           reviewed_by = COALESCE($4, reviewed_by),
           reviewed_at = CASE WHEN $4 IS NOT NULL THEN now() ELSE reviewed_at END,
           remediation_note = COALESCE($5, remediation_note),
           remediation_evidence_id = COALESCE($6, remediation_evidence_id),
           updated_at = now()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        id,
        tenantId,
        newStatus,
        opts?.reviewedBy || null,
        opts?.remediationNote || null,
        opts?.remediationEvidenceId || null,
      ]
    );

    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  } catch (err) {
    log.warn('Failed to update finding status', {
      id, error: (err as Error).message
    });
    return null;
  }
}

/**
 * Get a single finding by ID.
 */
export async function getFinding(id: string, tenantId: string): Promise<RedTeamFinding | null> {
  try {
    const result = await query(
      `SELECT * FROM red_team_findings WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  } catch (err) {
    log.warn('Failed to get finding', { id, error: (err as Error).message });
    return null;
  }
}

/**
 * Query findings with filters. Tenant-scoped.
 */
export async function queryFindings(tenantId: string, filters?: {
  status?: FindingStatus;
  severity?: FindingSeverity;
  probeCategory?: string;
  controlFamily?: string;
  targetWorker?: string;
  limit?: number;
}): Promise<RedTeamFinding[]> {
  try {
    const conditions = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIdx = 2;

    if (filters?.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters?.severity) {
      conditions.push(`severity = $${paramIdx++}`);
      params.push(filters.severity);
    }
    if (filters?.probeCategory) {
      conditions.push(`probe_category = $${paramIdx++}`);
      params.push(filters.probeCategory);
    }
    if (filters?.controlFamily) {
      conditions.push(`control_family = $${paramIdx++}`);
      params.push(filters.controlFamily);
    }
    if (filters?.targetWorker) {
      conditions.push(`target_worker = $${paramIdx++}`);
      params.push(filters.targetWorker);
    }

    const limit = Math.min(filters?.limit || 100, 500);

    const result = await query(
      `SELECT * FROM red_team_findings
       WHERE ${conditions.join(' AND ')}
       ORDER BY discovered_at DESC
       LIMIT ${limit}`,
      params
    );

    return result.rows.map(mapRow);
  } catch (err) {
    log.warn('Failed to query findings', { tenantId, error: (err as Error).message });
    return [];
  }
}

/**
 * Get open finding counts by severity and control family.
 * Feeds into complianceAnalytics for risk boost + drift synthesis.
 */
export async function getOpenFindingCounts(tenantId: string): Promise<OpenFindingCount[]> {
  try {
    const result = await query(
      `SELECT severity, control_family, COUNT(*) as count
       FROM red_team_findings
       WHERE tenant_id = $1
         AND status IN ('discovered', 'in_review')
       GROUP BY severity, control_family
       ORDER BY count DESC`,
      [tenantId]
    );

    return result.rows.map((row: any) => ({
      severity: row.severity,
      controlFamily: row.control_family,
      count: parseInt(row.count, 10),
    }));
  } catch (err) {
    log.warn('Failed to get open finding counts', { error: (err as Error).message });
    return [];
  }
}

/**
 * Get finding counts per target worker.
 * Feeds into worker risk profile (Bayesian risk boost).
 */
export async function getWorkerFindingCounts(tenantId: string): Promise<WorkerFindingCount[]> {
  try {
    const result = await query(
      `SELECT target_worker,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical,
              COUNT(*) FILTER (WHERE severity = 'HIGH') as high
       FROM red_team_findings
       WHERE tenant_id = $1
         AND status IN ('discovered', 'in_review')
         AND target_worker != ''
       GROUP BY target_worker
       ORDER BY total DESC`,
      [tenantId]
    );

    return result.rows.map((row: any) => ({
      targetWorker: row.target_worker,
      total: parseInt(row.total, 10),
      critical: parseInt(row.critical, 10),
      high: parseInt(row.high, 10),
    }));
  } catch (err) {
    log.warn('Failed to get worker finding counts', { error: (err as Error).message });
    return [];
  }
}

/**
 * Get summary stats for boot response and dashboard.
 */
export async function getRedTeamStats(tenantId: string): Promise<RedTeamStats> {
  try {
    const [totalResult, severityResult, statusResult, categoryResult, lastRunResult] = await Promise.all([
      query(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('discovered', 'in_review')) as open
         FROM red_team_findings WHERE tenant_id = $1`,
        [tenantId]
      ),
      query(
        `SELECT severity, COUNT(*) as count
         FROM red_team_findings WHERE tenant_id = $1
         GROUP BY severity`,
        [tenantId]
      ),
      query(
        `SELECT status, COUNT(*) as count
         FROM red_team_findings WHERE tenant_id = $1
         GROUP BY status`,
        [tenantId]
      ),
      query(
        `SELECT probe_category, COUNT(*) as count
         FROM red_team_findings WHERE tenant_id = $1
         GROUP BY probe_category`,
        [tenantId]
      ),
      query(
        `SELECT MAX(discovered_at) as last_run
         FROM red_team_findings WHERE tenant_id = $1`,
        [tenantId]
      ),
    ]);

    const bySeverity: Record<string, number> = {};
    for (const row of severityResult.rows) {
      bySeverity[row.severity] = parseInt(row.count, 10);
    }

    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    const byCategory: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      byCategory[row.probe_category] = parseInt(row.count, 10);
    }

    return {
      totalFindings: parseInt(totalResult.rows[0]?.total || '0', 10),
      openFindings: parseInt(totalResult.rows[0]?.open || '0', 10),
      bySeverity,
      byStatus,
      byCategory,
      lastRunAt: lastRunResult.rows[0]?.last_run
        ? new Date(lastRunResult.rows[0].last_run).toISOString()
        : null,
    };
  } catch (err) {
    log.warn('Failed to get red team stats', { error: (err as Error).message });
    return {
      totalFindings: 0,
      openFindings: 0,
      bySeverity: {},
      byStatus: {},
      byCategory: {},
      lastRunAt: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ROW MAPPER
// ═══════════════════════════════════════════════════════════════════

function mapRow(row: any): RedTeamFinding {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    runId: row.run_id,
    probeName: row.probe_name,
    probeCategory: row.probe_category,
    targetWorker: row.target_worker,
    severity: row.severity,
    controlFamily: row.control_family,
    passed: row.passed,
    responseSnippet: row.response_snippet || '',
    expectedBehavior: row.expected_behavior || '',
    status: row.status,
    remediationNote: row.remediation_note || null,
    remediationEvidenceId: row.remediation_evidence_id || null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    discoveredAt: new Date(row.discovered_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
