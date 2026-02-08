/**
 * Governance Library Store — PostgreSQL Persistence
 *
 * CRUD + query operations for governance packs, policies, evidence templates,
 * and approval roles. Follows runState.store.ts patterns:
 *   - Parameterized queries (SQL injection safe)
 *   - Tenant-scoped (all reads/writes filtered by tenant_id)
 *   - JSONB for complex nested data
 *   - Row → model mapping functions
 *
 * The key function is queryEffectivePolicies() — this is what workers call
 * at runtime to get the policies that apply to their context.
 */

import { query, withTransaction } from '../db/connection';
import {
  GovernancePack,
  GovernancePolicy,
  EvidenceTemplate,
  ApprovalRole,
  PolicyQueryContext,
  GovernanceSummary,
} from './governanceLibrary.schema';

// ═══════════════════════════════════════════════════════════════════
// ROW → MODEL MAPPING
// ═══════════════════════════════════════════════════════════════════

function rowToPack(row: any): GovernancePack {
  return {
    id: row.id,
    packId: row.pack_id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || '',
    packType: row.pack_type,
    sourceFramework: row.source_framework,
    version: row.version,
    priority: row.priority,
    policyCount: row.policy_count,
    controlFamilies: row.control_families || [],
    metadata: {
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      createdBy: row.metadata?.createdBy || 'SYSTEM',
      certificationLevel: row.metadata?.certificationLevel || 0,
    },
    contentHash: row.content_hash,
    isActive: row.is_active,
  };
}

function rowToPolicy(row: any): GovernancePolicy {
  return {
    id: row.id,
    policyId: row.policy_id,
    tenantId: row.tenant_id,
    packId: row.pack_id,
    controlFamily: row.control_family,
    title: row.title,
    description: row.description || '',
    requirements: row.requirements || [],
    evidenceRequired: row.evidence_required || [],
    approvalRoles: row.approval_roles || [],
    riskLevel: row.risk_level,
    maiLevel: row.mai_level,
    applicableWorkerTypes: row.applicable_worker_types || [],
    applicableDomains: row.applicable_domains || [],
    implementationStatus: row.implementation_status,
    frameworkRefs: row.framework_refs || [],
    metadata: {
      version: row.metadata?.version || '1.0.0',
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      createdBy: row.metadata?.createdBy || 'SYSTEM',
      sourceFramework: row.metadata?.sourceFramework || row.source_framework || 'CUSTOM',
      effectiveDate: row.metadata?.effectiveDate || (row.created_at?.toISOString?.() ?? row.created_at),
      expiresAt: row.metadata?.expiresAt,
    },
    contentHash: row.content_hash,
    isActive: row.is_active,
  };
}

function rowToTemplate(row: any): EvidenceTemplate {
  return {
    id: row.id,
    templateId: row.template_id,
    tenantId: row.tenant_id,
    policyId: row.policy_id,
    name: row.name,
    description: row.description || '',
    templateType: row.template_type,
    requiredFields: row.required_fields || [],
    formatSpec: row.format_spec || {},
    isRequired: row.is_required,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function rowToRole(row: any): ApprovalRole {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    roleName: row.role_name,
    description: row.description || '',
    canApproveRiskLevels: row.can_approve_risk_levels || [],
    canApproveMaiLevels: row.can_approve_mai_levels || [],
    canApproveControlFamilies: row.can_approve_control_families || [],
    requiresMfa: row.requires_mfa,
    maxApprovalValueCents: row.max_approval_value_cents,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PACK OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createPack(
  pack: {
    packId: string;
    name: string;
    description?: string;
    packType: string;
    sourceFramework?: string;
    version?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
    contentHash?: string;
  },
  tenantId: string,
): Promise<GovernancePack> {
  const result = await query(
    `INSERT INTO governance_packs
     (pack_id, tenant_id, name, description, pack_type, source_framework, version, priority, metadata, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      pack.packId,
      tenantId,
      pack.name,
      pack.description || '',
      pack.packType,
      pack.sourceFramework || 'CUSTOM',
      pack.version || '1.0.0',
      pack.priority || 100,
      JSON.stringify(pack.metadata || {}),
      pack.contentHash || '',
    ]
  );
  return rowToPack(result.rows[0]);
}

export async function getPack(packId: string, tenantId: string): Promise<GovernancePack | null> {
  const result = await query(
    `SELECT * FROM governance_packs WHERE id = $1 AND tenant_id = $2`,
    [packId, tenantId]
  );
  return result.rows[0] ? rowToPack(result.rows[0]) : null;
}

export async function getPackByPackId(packId: string, tenantId: string): Promise<GovernancePack | null> {
  const result = await query(
    `SELECT * FROM governance_packs WHERE pack_id = $1 AND tenant_id = $2 AND is_active = true
     ORDER BY version DESC LIMIT 1`,
    [packId, tenantId]
  );
  return result.rows[0] ? rowToPack(result.rows[0]) : null;
}

export async function listPacks(
  tenantId: string,
  filters?: { packType?: string; sourceFramework?: string; activeOnly?: boolean },
): Promise<GovernancePack[]> {
  const conditions = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (filters?.packType) {
    conditions.push(`pack_type = $${idx}`);
    params.push(filters.packType);
    idx++;
  }
  if (filters?.sourceFramework) {
    conditions.push(`source_framework = $${idx}`);
    params.push(filters.sourceFramework);
    idx++;
  }
  if (filters?.activeOnly !== false) {
    conditions.push('is_active = true');
  }

  const result = await query(
    `SELECT * FROM governance_packs
     WHERE ${conditions.join(' AND ')}
     ORDER BY priority DESC, created_at ASC`,
    params
  );
  return result.rows.map(rowToPack);
}

export async function updatePackCounts(
  packDbId: string,
  tenantId: string,
): Promise<void> {
  await query(
    `UPDATE governance_packs
     SET policy_count = (
       SELECT COUNT(*) FROM governance_policies
       WHERE pack_id = $1 AND tenant_id = $2 AND is_active = true
     ),
     control_families = (
       SELECT ARRAY(
         SELECT DISTINCT control_family FROM governance_policies
         WHERE pack_id = $1 AND tenant_id = $2 AND is_active = true
         ORDER BY control_family
       )
     )
     WHERE id = $1 AND tenant_id = $2`,
    [packDbId, tenantId]
  );
}

export async function deactivatePack(packId: string, tenantId: string): Promise<GovernancePack | null> {
  const result = await query(
    `UPDATE governance_packs SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [packId, tenantId]
  );
  return result.rows[0] ? rowToPack(result.rows[0]) : null;
}

// ═══════════════════════════════════════════════════════════════════
// POLICY OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createPolicy(
  policy: {
    policyId: string;
    packId: string;
    controlFamily: string;
    title: string;
    description?: string;
    requirements?: any[];
    evidenceRequired?: any[];
    approvalRoles?: string[];
    riskLevel: string;
    maiLevel: string;
    applicableWorkerTypes?: string[];
    applicableDomains?: string[];
    implementationStatus?: string;
    frameworkRefs?: any[];
    metadata?: Record<string, unknown>;
    contentHash?: string;
  },
  tenantId: string,
): Promise<GovernancePolicy> {
  const result = await query(
    `INSERT INTO governance_policies
     (policy_id, tenant_id, pack_id, control_family, title, description,
      requirements, evidence_required, approval_roles, risk_level, mai_level,
      applicable_worker_types, applicable_domains, implementation_status,
      framework_refs, metadata, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      policy.policyId,
      tenantId,
      policy.packId,
      policy.controlFamily,
      policy.title,
      policy.description || '',
      JSON.stringify(policy.requirements || []),
      JSON.stringify(policy.evidenceRequired || []),
      policy.approvalRoles || [],
      policy.riskLevel,
      policy.maiLevel,
      policy.applicableWorkerTypes || [],
      policy.applicableDomains || [],
      policy.implementationStatus || 'CONFIGURABLE',
      JSON.stringify(policy.frameworkRefs || []),
      JSON.stringify(policy.metadata || {}),
      policy.contentHash || '',
    ]
  );
  return rowToPolicy(result.rows[0]);
}

export async function createPoliciesBatch(
  policies: Parameters<typeof createPolicy>[0][],
  tenantId: string,
): Promise<number> {
  let created = 0;
  await withTransaction(async (txQuery) => {
    for (const policy of policies) {
      await txQuery(
        `INSERT INTO governance_policies
         (policy_id, tenant_id, pack_id, control_family, title, description,
          requirements, evidence_required, approval_roles, risk_level, mai_level,
          applicable_worker_types, applicable_domains, implementation_status,
          framework_refs, metadata, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (policy_id, tenant_id, pack_id) DO NOTHING`,
        [
          policy.policyId,
          tenantId,
          policy.packId,
          policy.controlFamily,
          policy.title,
          policy.description || '',
          JSON.stringify(policy.requirements || []),
          JSON.stringify(policy.evidenceRequired || []),
          policy.approvalRoles || [],
          policy.riskLevel,
          policy.maiLevel,
          policy.applicableWorkerTypes || [],
          policy.applicableDomains || [],
          policy.implementationStatus || 'CONFIGURABLE',
          JSON.stringify(policy.frameworkRefs || []),
          JSON.stringify(policy.metadata || {}),
          policy.contentHash || '',
        ]
      );
      created++;
    }
  });
  return created;
}

export async function getPolicy(policyId: string, tenantId: string): Promise<GovernancePolicy | null> {
  const result = await query(
    `SELECT * FROM governance_policies WHERE id = $1 AND tenant_id = $2`,
    [policyId, tenantId]
  );
  return result.rows[0] ? rowToPolicy(result.rows[0]) : null;
}

export async function getPolicyByPolicyId(policyId: string, tenantId: string): Promise<GovernancePolicy | null> {
  const result = await query(
    `SELECT * FROM governance_policies WHERE policy_id = $1 AND tenant_id = $2 AND is_active = true
     LIMIT 1`,
    [policyId, tenantId]
  );
  return result.rows[0] ? rowToPolicy(result.rows[0]) : null;
}

export async function listPolicies(
  tenantId: string,
  filters?: {
    controlFamily?: string;
    maiLevel?: string;
    riskLevel?: string;
    packId?: string;
    workerType?: string;
    domain?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  },
): Promise<GovernancePolicy[]> {
  const conditions = ['p.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (filters?.controlFamily) {
    conditions.push(`p.control_family = $${idx}`);
    params.push(filters.controlFamily);
    idx++;
  }
  if (filters?.maiLevel) {
    conditions.push(`p.mai_level = $${idx}`);
    params.push(filters.maiLevel);
    idx++;
  }
  if (filters?.riskLevel) {
    conditions.push(`p.risk_level = $${idx}`);
    params.push(filters.riskLevel);
    idx++;
  }
  if (filters?.packId) {
    conditions.push(`p.pack_id = $${idx}`);
    params.push(filters.packId);
    idx++;
  }
  if (filters?.workerType) {
    conditions.push(`(p.applicable_worker_types = '{}' OR $${idx} = ANY(p.applicable_worker_types))`);
    params.push(filters.workerType);
    idx++;
  }
  if (filters?.domain) {
    conditions.push(`(p.applicable_domains = '{}' OR $${idx} = ANY(p.applicable_domains))`);
    params.push(filters.domain);
    idx++;
  }
  if (filters?.activeOnly !== false) {
    conditions.push('p.is_active = true');
  }

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const result = await query(
    `SELECT p.* FROM governance_policies p
     JOIN governance_packs gp ON p.pack_id = gp.id
     WHERE ${conditions.join(' AND ')} AND gp.is_active = true
     ORDER BY gp.priority DESC, p.control_family ASC, p.policy_id ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return result.rows.map(rowToPolicy);
}

// ═══════════════════════════════════════════════════════════════════
// RUNTIME QUERY — THE KEY FUNCTION
// Workers call this: "What policies apply to me right now?"
// ═══════════════════════════════════════════════════════════════════

export async function queryEffectivePolicies(
  tenantId: string,
  context: PolicyQueryContext,
): Promise<GovernancePolicy[]> {
  const conditions = ['p.tenant_id = $1', 'p.is_active = true', 'gp.is_active = true'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (context.workerType) {
    // Empty array means "applies to all workers"
    conditions.push(`(p.applicable_worker_types = '{}' OR $${idx} = ANY(p.applicable_worker_types))`);
    params.push(context.workerType);
    idx++;
  }
  if (context.domain) {
    conditions.push(`(p.applicable_domains = '{}' OR $${idx} = ANY(p.applicable_domains))`);
    params.push(context.domain);
    idx++;
  }
  if (context.controlFamily) {
    conditions.push(`p.control_family = $${idx}`);
    params.push(context.controlFamily);
    idx++;
  }
  if (context.maiLevel) {
    conditions.push(`p.mai_level = $${idx}`);
    params.push(context.maiLevel);
    idx++;
  }
  if (context.riskLevel) {
    conditions.push(`p.risk_level = $${idx}`);
    params.push(context.riskLevel);
    idx++;
  }

  const result = await query(
    `SELECT p.* FROM governance_policies p
     JOIN governance_packs gp ON p.pack_id = gp.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY gp.priority DESC, p.control_family ASC, p.risk_level DESC`,
    params
  );
  return result.rows.map(rowToPolicy);
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE TEMPLATE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createEvidenceTemplate(
  template: {
    templateId: string;
    policyId: string;
    name: string;
    description?: string;
    templateType: string;
    requiredFields?: any[];
    formatSpec?: Record<string, unknown>;
    isRequired?: boolean;
  },
  tenantId: string,
): Promise<EvidenceTemplate> {
  const result = await query(
    `INSERT INTO evidence_templates
     (template_id, tenant_id, policy_id, name, description, template_type, required_fields, format_spec, is_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (template_id, tenant_id, policy_id) DO NOTHING
     RETURNING *`,
    [
      template.templateId,
      tenantId,
      template.policyId,
      template.name,
      template.description || '',
      template.templateType,
      JSON.stringify(template.requiredFields || []),
      JSON.stringify(template.formatSpec || {}),
      template.isRequired !== false,
    ]
  );
  return result.rows[0] ? rowToTemplate(result.rows[0]) : null as any;
}

export async function getEvidenceTemplates(
  policyId: string,
  tenantId: string,
): Promise<EvidenceTemplate[]> {
  const result = await query(
    `SELECT * FROM evidence_templates WHERE policy_id = $1 AND tenant_id = $2 ORDER BY name`,
    [policyId, tenantId]
  );
  return result.rows.map(rowToTemplate);
}

export async function listEvidenceTemplates(
  tenantId: string,
  filters?: { policyId?: string; controlFamily?: string },
): Promise<EvidenceTemplate[]> {
  if (filters?.policyId) {
    return getEvidenceTemplates(filters.policyId, tenantId);
  }

  if (filters?.controlFamily) {
    const result = await query(
      `SELECT et.* FROM evidence_templates et
       JOIN governance_policies gp ON et.policy_id = gp.id
       WHERE et.tenant_id = $1 AND gp.control_family = $2 AND gp.is_active = true
       ORDER BY et.name`,
      [tenantId, filters.controlFamily]
    );
    return result.rows.map(rowToTemplate);
  }

  const result = await query(
    `SELECT * FROM evidence_templates WHERE tenant_id = $1 ORDER BY name LIMIT 200`,
    [tenantId]
  );
  return result.rows.map(rowToTemplate);
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL ROLE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createApprovalRole(
  role: {
    roleName: string;
    description?: string;
    canApproveRiskLevels?: string[];
    canApproveMaiLevels?: string[];
    canApproveControlFamilies?: string[];
    requiresMfa?: boolean;
    maxApprovalValueCents?: number | null;
  },
  tenantId: string,
): Promise<ApprovalRole> {
  const result = await query(
    `INSERT INTO approval_roles
     (tenant_id, role_name, description, can_approve_risk_levels, can_approve_mai_levels,
      can_approve_control_families, requires_mfa, max_approval_value_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (role_name, tenant_id) DO NOTHING
     RETURNING *`,
    [
      tenantId,
      role.roleName,
      role.description || '',
      role.canApproveRiskLevels || ['LOW', 'MEDIUM'],
      role.canApproveMaiLevels || ['INFORMATIONAL', 'ADVISORY'],
      role.canApproveControlFamilies || [],
      role.requiresMfa || false,
      role.maxApprovalValueCents ?? null,
    ]
  );
  return result.rows[0] ? rowToRole(result.rows[0]) : null as any;
}

export async function getApprovalRoles(tenantId: string): Promise<ApprovalRole[]> {
  const result = await query(
    `SELECT * FROM approval_roles WHERE tenant_id = $1 AND is_active = true ORDER BY role_name`,
    [tenantId]
  );
  return result.rows.map(rowToRole);
}

/**
 * Get approval roles that can approve a given policy's risk + MAI level.
 */
export async function getApprovalRolesForPolicy(
  riskLevel: string,
  maiLevel: string,
  tenantId: string,
): Promise<ApprovalRole[]> {
  const result = await query(
    `SELECT * FROM approval_roles
     WHERE tenant_id = $1
       AND is_active = true
       AND $2 = ANY(can_approve_risk_levels)
       AND $3 = ANY(can_approve_mai_levels)
     ORDER BY role_name`,
    [tenantId, riskLevel, maiLevel]
  );
  return result.rows.map(rowToRole);
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY / DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export async function getGovernanceSummary(tenantId: string): Promise<GovernanceSummary> {
  // Run multiple counts in parallel
  const [packsResult, policiesResult, familyResult, templatesResult, rolesResult, packDetailsResult] =
    await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE is_active) as active,
           COUNT(*) as total
         FROM governance_packs WHERE tenant_id = $1`,
        [tenantId]
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE is_active) as active,
           COUNT(*) as total
         FROM governance_policies WHERE tenant_id = $1`,
        [tenantId]
      ),
      query(
        `SELECT control_family, COUNT(*) as cnt
         FROM governance_policies
         WHERE tenant_id = $1 AND is_active = true
         GROUP BY control_family ORDER BY control_family`,
        [tenantId]
      ),
      query(
        `SELECT COUNT(*) as total FROM evidence_templates WHERE tenant_id = $1`,
        [tenantId]
      ),
      query(
        `SELECT COUNT(*) as total FROM approval_roles WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      ),
      query(
        `SELECT pack_id, name, pack_type, policy_count, source_framework
         FROM governance_packs WHERE tenant_id = $1 AND is_active = true
         ORDER BY priority DESC`,
        [tenantId]
      ),
    ]);

  const familyBreakdown: Record<string, number> = {};
  for (const row of familyResult.rows) {
    familyBreakdown[row.control_family] = parseInt(row.cnt, 10);
  }

  // Get latest update time
  const lastUpdatedResult = await query(
    `SELECT MAX(updated_at) as last_updated
     FROM governance_policies WHERE tenant_id = $1`,
    [tenantId]
  );

  return {
    packsActive: parseInt(packsResult.rows[0]?.active || '0', 10),
    packsTotal: parseInt(packsResult.rows[0]?.total || '0', 10),
    policiesActive: parseInt(policiesResult.rows[0]?.active || '0', 10),
    policiesTotal: parseInt(policiesResult.rows[0]?.total || '0', 10),
    controlFamilies: Object.keys(familyBreakdown).sort(),
    evidenceTemplates: parseInt(templatesResult.rows[0]?.total || '0', 10),
    approvalRoles: parseInt(rolesResult.rows[0]?.total || '0', 10),
    packBreakdown: packDetailsResult.rows.map((r: any) => ({
      packId: r.pack_id,
      name: r.name,
      packType: r.pack_type,
      policyCount: r.policy_count,
      sourceFramework: r.source_framework,
    })),
    familyBreakdown,
    lastUpdated: lastUpdatedResult.rows[0]?.last_updated?.toISOString?.() ?? new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CHECK IF SEEDED
// ═══════════════════════════════════════════════════════════════════

export async function isSeeded(tenantId: string): Promise<boolean> {
  const result = await query(
    `SELECT COUNT(*) as cnt FROM governance_packs
     WHERE tenant_id = $1 AND pack_type = 'BASE' AND is_active = true`,
    [tenantId]
  );
  return parseInt(result.rows[0]?.cnt || '0', 10) > 0;
}
