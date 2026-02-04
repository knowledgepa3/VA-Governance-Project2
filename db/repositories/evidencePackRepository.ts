/**
 * Evidence Pack Repository
 *
 * Provides persistence operations for evidence packs and related entities.
 * Supports both PostgreSQL and in-memory storage.
 */

import { createHash } from 'crypto';
import {
  query,
  queryOne,
  transaction,
  isDbConfigured,
  getInMemoryStore
} from '../connection';
import {
  DbEvidencePack,
  DbEvidencePackTimeline,
  DbEvidencePackArtifact,
  DbEvidencePackDecision,
  DbEvidencePackApproval,
  EvidencePackQueryOptions
} from '../types';

// Import application types
import { EvidencePack } from '../../maiRuntime';

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

export interface IEvidencePackRepository {
  /**
   * Create a new evidence pack
   */
  create(pack: Partial<DbEvidencePack>): Promise<DbEvidencePack>;

  /**
   * Update evidence pack (status, report, hash)
   */
  update(id: string, updates: Partial<DbEvidencePack>): Promise<DbEvidencePack | null>;

  /**
   * Complete an evidence pack (sets end time, status, hash)
   */
  complete(
    id: string,
    report: { summary: string; findings: string[]; recommendations: string[]; completeness: number }
  ): Promise<DbEvidencePack | null>;

  /**
   * Add timeline step
   */
  addTimelineStep(packId: string, step: Partial<DbEvidencePackTimeline>): Promise<DbEvidencePackTimeline>;

  /**
   * Add artifact
   */
  addArtifact(packId: string, artifact: Partial<DbEvidencePackArtifact>): Promise<DbEvidencePackArtifact>;

  /**
   * Add decision
   */
  addDecision(packId: string, decision: Partial<DbEvidencePackDecision>): Promise<DbEvidencePackDecision>;

  /**
   * Add approval
   */
  addApproval(packId: string, approval: Partial<DbEvidencePackApproval>): Promise<DbEvidencePackApproval>;

  /**
   * Get evidence pack by ID with all related data
   */
  findById(id: string): Promise<EvidencePackWithRelations | null>;

  /**
   * Query evidence packs
   */
  find(options: EvidencePackQueryOptions): Promise<DbEvidencePack[]>;

  /**
   * Get timeline for a pack
   */
  getTimeline(packId: string): Promise<DbEvidencePackTimeline[]>;

  /**
   * Get artifacts for a pack
   */
  getArtifacts(packId: string): Promise<DbEvidencePackArtifact[]>;

  /**
   * Get decisions for a pack
   */
  getDecisions(packId: string): Promise<DbEvidencePackDecision[]>;

  /**
   * Get approvals for a pack
   */
  getApprovals(packId: string): Promise<DbEvidencePackApproval[]>;
}

export interface EvidencePackWithRelations extends DbEvidencePack {
  timeline: DbEvidencePackTimeline[];
  artifacts: DbEvidencePackArtifact[];
  decisions: DbEvidencePackDecision[];
  approvals: DbEvidencePackApproval[];
}

// =============================================================================
// POSTGRESQL IMPLEMENTATION
// =============================================================================

export class PostgresEvidencePackRepository implements IEvidencePackRepository {

  async create(pack: Partial<DbEvidencePack>): Promise<DbEvidencePack> {
    const sql = `
      INSERT INTO evidence_packs (
        tenant_id, execution_id, playbook_id, playbook_version,
        agent_id, operator_id, session_id, started_at, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      pack.tenant_id,
      pack.execution_id,
      pack.playbook_id,
      pack.playbook_version || null,
      pack.agent_id,
      pack.operator_id,
      pack.session_id || null,
      pack.started_at || new Date(),
      pack.status || 'running',
      JSON.stringify(pack.metadata || {})
    ];

    const rows = await query<DbEvidencePack>(sql, params);
    return rows[0];
  }

  async update(id: string, updates: Partial<DbEvidencePack>): Promise<DbEvidencePack | null> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }

    if (updates.ended_at !== undefined) {
      setClauses.push(`ended_at = $${paramIndex++}`);
      params.push(updates.ended_at);
    }

    if (updates.duration_ms !== undefined) {
      setClauses.push(`duration_ms = $${paramIndex++}`);
      params.push(updates.duration_ms);
    }

    if (updates.report_summary !== undefined) {
      setClauses.push(`report_summary = $${paramIndex++}`);
      params.push(updates.report_summary);
    }

    if (updates.report_findings !== undefined) {
      setClauses.push(`report_findings = $${paramIndex++}`);
      params.push(JSON.stringify(updates.report_findings));
    }

    if (updates.report_recommendations !== undefined) {
      setClauses.push(`report_recommendations = $${paramIndex++}`);
      params.push(JSON.stringify(updates.report_recommendations));
    }

    if (updates.completeness_score !== undefined) {
      setClauses.push(`completeness_score = $${paramIndex++}`);
      params.push(updates.completeness_score);
    }

    if (updates.pack_hash !== undefined) {
      setClauses.push(`pack_hash = $${paramIndex++}`);
      params.push(updates.pack_hash);
    }

    if (setClauses.length === 0) {
      return this.findByIdSimple(id);
    }

    params.push(id);
    const sql = `UPDATE evidence_packs SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const rows = await query<DbEvidencePack>(sql, params);
    return rows[0] || null;
  }

  async complete(
    id: string,
    report: { summary: string; findings: string[]; recommendations: string[]; completeness: number }
  ): Promise<DbEvidencePack | null> {
    const endedAt = new Date();

    // Get the pack to calculate duration
    const pack = await this.findByIdSimple(id);
    if (!pack) return null;

    const durationMs = endedAt.getTime() - new Date(pack.started_at).getTime();

    // Calculate pack hash
    const fullPack = await this.findById(id);
    const packHash = this.computePackHash(fullPack!);

    return this.update(id, {
      status: 'completed',
      ended_at: endedAt,
      duration_ms: durationMs,
      report_summary: report.summary,
      report_findings: report.findings,
      report_recommendations: report.recommendations,
      completeness_score: report.completeness,
      pack_hash: packHash
    });
  }

  async addTimelineStep(packId: string, step: Partial<DbEvidencePackTimeline>): Promise<DbEvidencePackTimeline> {
    const sql = `
      INSERT INTO evidence_pack_timeline (
        evidence_pack_id, step_id, step_name, step_order,
        timestamp, duration_ms, status, screenshot_path, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      packId,
      step.step_id,
      step.step_name,
      step.step_order,
      step.timestamp || new Date(),
      step.duration_ms || null,
      step.status,
      step.screenshot_path || null,
      step.error_message || null,
      JSON.stringify(step.metadata || {})
    ];

    const rows = await query<DbEvidencePackTimeline>(sql, params);
    return rows[0];
  }

  async addArtifact(packId: string, artifact: Partial<DbEvidencePackArtifact>): Promise<DbEvidencePackArtifact> {
    const sql = `
      INSERT INTO evidence_pack_artifacts (
        evidence_pack_id, artifact_type, filename, file_path, file_size, mime_type,
        source, source_url, extracted_at, content_hash, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const params = [
      packId,
      artifact.artifact_type,
      artifact.filename,
      artifact.file_path || null,
      artifact.file_size || null,
      artifact.mime_type || null,
      artifact.source,
      artifact.source_url || null,
      artifact.extracted_at || new Date(),
      artifact.content_hash,
      JSON.stringify(artifact.metadata || {})
    ];

    const rows = await query<DbEvidencePackArtifact>(sql, params);
    return rows[0];
  }

  async addDecision(packId: string, decision: Partial<DbEvidencePackDecision>): Promise<DbEvidencePackDecision> {
    const sql = `
      INSERT INTO evidence_pack_decisions (
        evidence_pack_id, step_id, decision, reasoning, confidence, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      packId,
      decision.step_id,
      decision.decision,
      decision.reasoning || null,
      decision.confidence || null,
      decision.timestamp || new Date(),
      JSON.stringify(decision.metadata || {})
    ];

    const rows = await query<DbEvidencePackDecision>(sql, params);
    return rows[0];
  }

  async addApproval(packId: string, approval: Partial<DbEvidencePackApproval>): Promise<DbEvidencePackApproval> {
    const sql = `
      INSERT INTO evidence_pack_approvals (
        evidence_pack_id, step_id, action, approved, approver_id, timestamp, attestation, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      packId,
      approval.step_id,
      approval.action,
      approval.approved,
      approval.approver_id,
      approval.timestamp || new Date(),
      approval.attestation || null,
      JSON.stringify(approval.metadata || {})
    ];

    const rows = await query<DbEvidencePackApproval>(sql, params);
    return rows[0];
  }

  async findById(id: string): Promise<EvidencePackWithRelations | null> {
    const pack = await this.findByIdSimple(id);
    if (!pack) return null;

    const [timeline, artifacts, decisions, approvals] = await Promise.all([
      this.getTimeline(id),
      this.getArtifacts(id),
      this.getDecisions(id),
      this.getApprovals(id)
    ]);

    return {
      ...pack,
      timeline,
      artifacts,
      decisions,
      approvals
    };
  }

  private async findByIdSimple(id: string): Promise<DbEvidencePack | null> {
    return queryOne<DbEvidencePack>('SELECT * FROM evidence_packs WHERE id = $1', [id]);
  }

  async find(options: EvidencePackQueryOptions): Promise<DbEvidencePack[]> {
    let sql = 'SELECT * FROM evidence_packs WHERE tenant_id = $1';
    const params: any[] = [options.tenant_id];
    let paramIndex = 2;

    if (options.playbook_id) {
      sql += ` AND playbook_id = $${paramIndex++}`;
      params.push(options.playbook_id);
    }

    if (options.operator_id) {
      sql += ` AND operator_id = $${paramIndex++}`;
      params.push(options.operator_id);
    }

    if (options.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(options.status);
    }

    if (options.start_date) {
      sql += ` AND started_at >= $${paramIndex++}`;
      params.push(options.start_date);
    }

    if (options.end_date) {
      sql += ` AND started_at <= $${paramIndex++}`;
      params.push(options.end_date);
    }

    sql += ' ORDER BY started_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    return query<DbEvidencePack>(sql, params);
  }

  async getTimeline(packId: string): Promise<DbEvidencePackTimeline[]> {
    return query<DbEvidencePackTimeline>(
      'SELECT * FROM evidence_pack_timeline WHERE evidence_pack_id = $1 ORDER BY step_order ASC',
      [packId]
    );
  }

  async getArtifacts(packId: string): Promise<DbEvidencePackArtifact[]> {
    return query<DbEvidencePackArtifact>(
      'SELECT * FROM evidence_pack_artifacts WHERE evidence_pack_id = $1 ORDER BY extracted_at ASC',
      [packId]
    );
  }

  async getDecisions(packId: string): Promise<DbEvidencePackDecision[]> {
    return query<DbEvidencePackDecision>(
      'SELECT * FROM evidence_pack_decisions WHERE evidence_pack_id = $1 ORDER BY timestamp ASC',
      [packId]
    );
  }

  async getApprovals(packId: string): Promise<DbEvidencePackApproval[]> {
    return query<DbEvidencePackApproval>(
      'SELECT * FROM evidence_pack_approvals WHERE evidence_pack_id = $1 ORDER BY timestamp ASC',
      [packId]
    );
  }

  private computePackHash(pack: EvidencePackWithRelations): string {
    const content = JSON.stringify({
      execution_id: pack.execution_id,
      playbook_id: pack.playbook_id,
      timeline: pack.timeline,
      artifacts: pack.artifacts.map(a => a.content_hash),
      decisions: pack.decisions,
      approvals: pack.approvals,
      report: {
        summary: pack.report_summary,
        findings: pack.report_findings,
        recommendations: pack.report_recommendations
      }
    });

    return createHash('sha256').update(content).digest('hex');
  }
}

// =============================================================================
// IN-MEMORY IMPLEMENTATION
// =============================================================================

export class InMemoryEvidencePackRepository implements IEvidencePackRepository {
  private timelineCounter = 0;
  private artifactCounter = 0;
  private decisionCounter = 0;
  private approvalCounter = 0;

  async create(pack: Partial<DbEvidencePack>): Promise<DbEvidencePack> {
    const store = getInMemoryStore();
    const id = `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const dbPack: DbEvidencePack = {
      id,
      tenant_id: pack.tenant_id!,
      execution_id: pack.execution_id!,
      playbook_id: pack.playbook_id!,
      playbook_version: pack.playbook_version,
      agent_id: pack.agent_id!,
      operator_id: pack.operator_id!,
      session_id: pack.session_id,
      started_at: pack.started_at || new Date(),
      status: pack.status || 'running',
      report_findings: [],
      report_recommendations: [],
      metadata: pack.metadata || {},
      created_at: new Date()
    };

    store.insert('evidence_packs', id, dbPack);
    return dbPack;
  }

  async update(id: string, updates: Partial<DbEvidencePack>): Promise<DbEvidencePack | null> {
    const store = getInMemoryStore();
    const existing = store.find('evidence_packs', id);
    if (!existing) return null;

    store.update('evidence_packs', id, updates);
    return store.find('evidence_packs', id);
  }

  async complete(
    id: string,
    report: { summary: string; findings: string[]; recommendations: string[]; completeness: number }
  ): Promise<DbEvidencePack | null> {
    const pack = await this.findById(id);
    if (!pack) return null;

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - new Date(pack.started_at).getTime();
    const packHash = createHash('sha256').update(JSON.stringify(pack)).digest('hex');

    return this.update(id, {
      status: 'completed',
      ended_at: endedAt,
      duration_ms: durationMs,
      report_summary: report.summary,
      report_findings: report.findings,
      report_recommendations: report.recommendations,
      completeness_score: report.completeness,
      pack_hash: packHash
    });
  }

  async addTimelineStep(packId: string, step: Partial<DbEvidencePackTimeline>): Promise<DbEvidencePackTimeline> {
    const store = getInMemoryStore();
    const id = `timeline-${++this.timelineCounter}`;

    const dbStep: DbEvidencePackTimeline = {
      id,
      evidence_pack_id: packId,
      step_id: step.step_id!,
      step_name: step.step_name!,
      step_order: step.step_order!,
      timestamp: step.timestamp || new Date(),
      duration_ms: step.duration_ms,
      status: step.status!,
      screenshot_path: step.screenshot_path,
      error_message: step.error_message,
      metadata: step.metadata || {}
    };

    store.insert('evidence_pack_timeline', id, dbStep);
    return dbStep;
  }

  async addArtifact(packId: string, artifact: Partial<DbEvidencePackArtifact>): Promise<DbEvidencePackArtifact> {
    const store = getInMemoryStore();
    const id = `artifact-${++this.artifactCounter}`;

    const dbArtifact: DbEvidencePackArtifact = {
      id,
      evidence_pack_id: packId,
      artifact_type: artifact.artifact_type!,
      filename: artifact.filename!,
      file_path: artifact.file_path,
      file_size: artifact.file_size,
      mime_type: artifact.mime_type,
      source: artifact.source!,
      source_url: artifact.source_url,
      extracted_at: artifact.extracted_at || new Date(),
      content_hash: artifact.content_hash!,
      metadata: artifact.metadata || {}
    };

    store.insert('evidence_pack_artifacts', id, dbArtifact);
    return dbArtifact;
  }

  async addDecision(packId: string, decision: Partial<DbEvidencePackDecision>): Promise<DbEvidencePackDecision> {
    const store = getInMemoryStore();
    const id = `decision-${++this.decisionCounter}`;

    const dbDecision: DbEvidencePackDecision = {
      id,
      evidence_pack_id: packId,
      step_id: decision.step_id!,
      decision: decision.decision!,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      timestamp: decision.timestamp || new Date(),
      metadata: decision.metadata || {}
    };

    store.insert('evidence_pack_decisions', id, dbDecision);
    return dbDecision;
  }

  async addApproval(packId: string, approval: Partial<DbEvidencePackApproval>): Promise<DbEvidencePackApproval> {
    const store = getInMemoryStore();
    const id = `approval-${++this.approvalCounter}`;

    const dbApproval: DbEvidencePackApproval = {
      id,
      evidence_pack_id: packId,
      step_id: approval.step_id!,
      action: approval.action!,
      approved: approval.approved!,
      approver_id: approval.approver_id!,
      timestamp: approval.timestamp || new Date(),
      attestation: approval.attestation,
      metadata: approval.metadata || {}
    };

    store.insert('evidence_pack_approvals', id, dbApproval);
    return dbApproval;
  }

  async findById(id: string): Promise<EvidencePackWithRelations | null> {
    const pack = getInMemoryStore().find('evidence_packs', id);
    if (!pack) return null;

    return {
      ...pack,
      timeline: await this.getTimeline(id),
      artifacts: await this.getArtifacts(id),
      decisions: await this.getDecisions(id),
      approvals: await this.getApprovals(id)
    };
  }

  async find(options: EvidencePackQueryOptions): Promise<DbEvidencePack[]> {
    let packs = getInMemoryStore().findWhere('evidence_packs',
      (p: DbEvidencePack) => p.tenant_id === options.tenant_id
    );

    if (options.playbook_id) {
      packs = packs.filter(p => p.playbook_id === options.playbook_id);
    }

    if (options.operator_id) {
      packs = packs.filter(p => p.operator_id === options.operator_id);
    }

    if (options.status) {
      packs = packs.filter(p => p.status === options.status);
    }

    packs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    if (options.offset) packs = packs.slice(options.offset);
    if (options.limit) packs = packs.slice(0, options.limit);

    return packs;
  }

  async getTimeline(packId: string): Promise<DbEvidencePackTimeline[]> {
    return getInMemoryStore()
      .findWhere('evidence_pack_timeline', (t: DbEvidencePackTimeline) => t.evidence_pack_id === packId)
      .sort((a, b) => a.step_order - b.step_order);
  }

  async getArtifacts(packId: string): Promise<DbEvidencePackArtifact[]> {
    return getInMemoryStore()
      .findWhere('evidence_pack_artifacts', (a: DbEvidencePackArtifact) => a.evidence_pack_id === packId);
  }

  async getDecisions(packId: string): Promise<DbEvidencePackDecision[]> {
    return getInMemoryStore()
      .findWhere('evidence_pack_decisions', (d: DbEvidencePackDecision) => d.evidence_pack_id === packId);
  }

  async getApprovals(packId: string): Promise<DbEvidencePackApproval[]> {
    return getInMemoryStore()
      .findWhere('evidence_pack_approvals', (a: DbEvidencePackApproval) => a.evidence_pack_id === packId);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let repositoryInstance: IEvidencePackRepository | null = null;

export function getEvidencePackRepository(): IEvidencePackRepository {
  if (!repositoryInstance) {
    repositoryInstance = isDbConfigured()
      ? new PostgresEvidencePackRepository()
      : new InMemoryEvidencePackRepository();

    console.log(`[EvidencePack] Using ${isDbConfigured() ? 'PostgreSQL' : 'in-memory'} repository`);
  }

  return repositoryInstance;
}

export function resetEvidencePackRepository(): void {
  repositoryInstance = null;
}
