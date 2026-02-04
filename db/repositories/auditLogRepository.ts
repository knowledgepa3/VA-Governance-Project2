/**
 * Audit Log Repository
 *
 * Provides persistence operations for audit log entries.
 * Supports both PostgreSQL and in-memory storage (for demos).
 *
 * Design: Append-only with hash chaining for AU-9 compliance.
 */

import { createHash } from 'crypto';
import {
  query,
  queryOne,
  isDbConfigured,
  getInMemoryStore
} from '../connection';
import {
  DbAuditLogEntry,
  CreateAuditLogEntry,
  AuditLogQueryOptions,
  ChainVerificationResult
} from '../types';

// Import application types for conversion
import { AuditLogEntry, ActionType, PolicyDecision } from '../../maiRuntime';
import { MAIClassification } from '../../types';

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

export interface IAuditLogRepository {
  /**
   * Append a new audit log entry (immutable)
   */
  append(entry: CreateAuditLogEntry): Promise<DbAuditLogEntry>;

  /**
   * Get entries by query options
   */
  find(options: AuditLogQueryOptions): Promise<DbAuditLogEntry[]>;

  /**
   * Get a single entry by ID
   */
  findById(id: string): Promise<DbAuditLogEntry | null>;

  /**
   * Get entries for a specific session
   */
  findBySession(sessionId: string): Promise<DbAuditLogEntry[]>;

  /**
   * Verify hash chain integrity
   */
  verifyChain(tenantId: string, fromSequence?: number): Promise<ChainVerificationResult>;

  /**
   * Export entries for SIEM integration
   */
  exportForSIEM(options: AuditLogQueryOptions): Promise<string>;
}

// =============================================================================
// POSTGRESQL IMPLEMENTATION
// =============================================================================

export class PostgresAuditLogRepository implements IAuditLogRepository {

  async append(entry: CreateAuditLogEntry): Promise<DbAuditLogEntry> {
    const sql = `
      INSERT INTO audit_log (
        tenant_id, agent_id, session_id, operator_id, operator_role,
        action, target, url, domain,
        classification, policy_decision, policy_rule_id,
        approved, approver_id, attestation,
        reasoning, context, screenshot_path
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18
      )
      RETURNING *
    `;

    const params = [
      entry.tenant_id,
      entry.agent_id,
      entry.session_id || null,
      entry.operator_id,
      entry.operator_role || null,
      entry.action,
      entry.target || null,
      entry.url || null,
      entry.domain || null,
      entry.classification,
      entry.policy_decision,
      entry.policy_rule_id || null,
      entry.approved ?? null,
      entry.approver_id || null,
      entry.attestation || null,
      entry.reasoning || null,
      JSON.stringify(entry.context || {}),
      entry.screenshot_path || null
    ];

    const rows = await query<DbAuditLogEntry>(sql, params);
    return rows[0];
  }

  async find(options: AuditLogQueryOptions): Promise<DbAuditLogEntry[]> {
    let sql = 'SELECT * FROM audit_log WHERE tenant_id = $1';
    const params: any[] = [options.tenant_id];
    let paramIndex = 2;

    if (options.start_date) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(options.start_date);
    }

    if (options.end_date) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(options.end_date);
    }

    if (options.operator_id) {
      sql += ` AND operator_id = $${paramIndex++}`;
      params.push(options.operator_id);
    }

    if (options.action) {
      sql += ` AND action = $${paramIndex++}`;
      params.push(options.action);
    }

    if (options.classification) {
      sql += ` AND classification = $${paramIndex++}`;
      params.push(options.classification);
    }

    if (options.session_id) {
      sql += ` AND session_id = $${paramIndex++}`;
      params.push(options.session_id);
    }

    const order = options.order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY sequence_num ${order}`;

    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    return query<DbAuditLogEntry>(sql, params);
  }

  async findById(id: string): Promise<DbAuditLogEntry | null> {
    return queryOne<DbAuditLogEntry>(
      'SELECT * FROM audit_log WHERE id = $1',
      [id]
    );
  }

  async findBySession(sessionId: string): Promise<DbAuditLogEntry[]> {
    return query<DbAuditLogEntry>(
      'SELECT * FROM audit_log WHERE session_id = $1 ORDER BY sequence_num ASC',
      [sessionId]
    );
  }

  async verifyChain(tenantId: string, fromSequence?: number): Promise<ChainVerificationResult> {
    // Get entries in order
    let sql = 'SELECT * FROM audit_log WHERE tenant_id = $1';
    const params: any[] = [tenantId];

    if (fromSequence !== undefined) {
      sql += ' AND sequence_num >= $2';
      params.push(fromSequence);
    }

    sql += ' ORDER BY sequence_num ASC';

    const entries = await query<DbAuditLogEntry>(sql, params);

    if (entries.length === 0) {
      return { valid: true, entries_checked: 0 };
    }

    let previousHash: string | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify previous hash matches
      if (i > 0 && entry.previous_hash !== previousHash) {
        return {
          valid: false,
          entries_checked: i + 1,
          first_invalid_sequence: entry.sequence_num,
          error: `Chain broken at sequence ${entry.sequence_num}: expected previous_hash ${previousHash}, got ${entry.previous_hash}`
        };
      }

      // Verify content hash
      const computedHash = this.computeContentHash(entry);
      if (entry.content_hash !== computedHash) {
        return {
          valid: false,
          entries_checked: i + 1,
          first_invalid_sequence: entry.sequence_num,
          error: `Content hash mismatch at sequence ${entry.sequence_num}: expected ${computedHash}, got ${entry.content_hash}`
        };
      }

      previousHash = entry.content_hash;
    }

    return {
      valid: true,
      entries_checked: entries.length
    };
  }

  async exportForSIEM(options: AuditLogQueryOptions): Promise<string> {
    const entries = await this.find(options);
    return JSON.stringify(entries, null, 2);
  }

  private computeContentHash(entry: DbAuditLogEntry): string {
    const content =
      (entry.agent_id || '') +
      (entry.operator_id || '') +
      (entry.action || '') +
      (entry.target || '') +
      (entry.classification || '') +
      (entry.policy_decision || '') +
      (entry.reasoning || '') +
      (entry.timestamp?.toISOString() || '');

    return createHash('sha256').update(content).digest('hex');
  }
}

// =============================================================================
// IN-MEMORY IMPLEMENTATION (for demos/testing)
// =============================================================================

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private sequenceCounter = 0;
  private lastHash: string | null = null;

  async append(entry: CreateAuditLogEntry): Promise<DbAuditLogEntry> {
    const store = getInMemoryStore();
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sequenceNum = ++this.sequenceCounter;
    const timestamp = new Date();

    const contentHash = this.computeContentHash({
      agent_id: entry.agent_id,
      operator_id: entry.operator_id,
      action: entry.action,
      target: entry.target,
      classification: entry.classification,
      policy_decision: entry.policy_decision,
      reasoning: entry.reasoning,
      timestamp
    });

    const dbEntry: DbAuditLogEntry = {
      id,
      tenant_id: entry.tenant_id,
      sequence_num: sequenceNum,
      timestamp,
      agent_id: entry.agent_id,
      session_id: entry.session_id,
      operator_id: entry.operator_id,
      operator_role: entry.operator_role,
      action: entry.action,
      target: entry.target,
      url: entry.url,
      domain: entry.domain,
      classification: entry.classification,
      policy_decision: entry.policy_decision,
      policy_rule_id: entry.policy_rule_id,
      approved: entry.approved,
      approver_id: entry.approver_id,
      attestation: entry.attestation,
      reasoning: entry.reasoning,
      context: entry.context || {},
      screenshot_path: entry.screenshot_path,
      content_hash: contentHash,
      previous_hash: this.lastHash || undefined,
      created_at: timestamp
    };

    store.insert('audit_log', id, dbEntry);
    this.lastHash = contentHash;

    return dbEntry;
  }

  async find(options: AuditLogQueryOptions): Promise<DbAuditLogEntry[]> {
    const store = getInMemoryStore();
    let entries = store.findWhere('audit_log', (e: DbAuditLogEntry) =>
      e.tenant_id === options.tenant_id
    );

    if (options.operator_id) {
      entries = entries.filter(e => e.operator_id === options.operator_id);
    }

    if (options.action) {
      entries = entries.filter(e => e.action === options.action);
    }

    if (options.classification) {
      entries = entries.filter(e => e.classification === options.classification);
    }

    if (options.session_id) {
      entries = entries.filter(e => e.session_id === options.session_id);
    }

    if (options.start_date) {
      entries = entries.filter(e => e.timestamp >= options.start_date!);
    }

    if (options.end_date) {
      entries = entries.filter(e => e.timestamp <= options.end_date!);
    }

    // Sort
    entries.sort((a, b) => {
      const order = options.order === 'asc' ? 1 : -1;
      return (a.sequence_num - b.sequence_num) * order;
    });

    // Pagination
    if (options.offset) {
      entries = entries.slice(options.offset);
    }

    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  async findById(id: string): Promise<DbAuditLogEntry | null> {
    return getInMemoryStore().find('audit_log', id);
  }

  async findBySession(sessionId: string): Promise<DbAuditLogEntry[]> {
    return getInMemoryStore()
      .findWhere('audit_log', (e: DbAuditLogEntry) => e.session_id === sessionId)
      .sort((a, b) => a.sequence_num - b.sequence_num);
  }

  async verifyChain(tenantId: string, fromSequence?: number): Promise<ChainVerificationResult> {
    const entries = await this.find({
      tenant_id: tenantId,
      order: 'asc'
    });

    const filtered = fromSequence !== undefined
      ? entries.filter(e => e.sequence_num >= fromSequence)
      : entries;

    if (filtered.length === 0) {
      return { valid: true, entries_checked: 0 };
    }

    let previousHash: string | null = null;

    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];

      if (i > 0 && entry.previous_hash !== previousHash) {
        return {
          valid: false,
          entries_checked: i + 1,
          first_invalid_sequence: entry.sequence_num,
          error: `Chain broken at sequence ${entry.sequence_num}`
        };
      }

      previousHash = entry.content_hash;
    }

    return {
      valid: true,
      entries_checked: filtered.length
    };
  }

  async exportForSIEM(options: AuditLogQueryOptions): Promise<string> {
    const entries = await this.find(options);
    return JSON.stringify(entries, null, 2);
  }

  private computeContentHash(data: Partial<DbAuditLogEntry>): string {
    const content =
      (data.agent_id || '') +
      (data.operator_id || '') +
      (data.action || '') +
      (data.target || '') +
      (data.classification || '') +
      (data.policy_decision || '') +
      (data.reasoning || '') +
      (data.timestamp?.toISOString() || '');

    return createHash('sha256').update(content).digest('hex');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let repositoryInstance: IAuditLogRepository | null = null;

/**
 * Get the audit log repository (singleton)
 */
export function getAuditLogRepository(): IAuditLogRepository {
  if (!repositoryInstance) {
    repositoryInstance = isDbConfigured()
      ? new PostgresAuditLogRepository()
      : new InMemoryAuditLogRepository();

    console.log(`[AuditLog] Using ${isDbConfigured() ? 'PostgreSQL' : 'in-memory'} repository`);
  }

  return repositoryInstance;
}

/**
 * Reset repository (for testing)
 */
export function resetAuditLogRepository(): void {
  repositoryInstance = null;
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert MAI runtime AuditLogEntry to DB CreateAuditLogEntry
 */
export function toDbAuditEntry(
  entry: AuditLogEntry,
  tenantId: string,
  sessionId?: string
): CreateAuditLogEntry {
  return {
    tenant_id: tenantId,
    agent_id: entry.agentId,
    session_id: sessionId,
    operator_id: entry.operatorId,
    action: entry.action,
    target: entry.target,
    classification: entry.classification,
    policy_decision: entry.policyDecision,
    approved: entry.approved,
    approver_id: entry.approver,
    reasoning: entry.reasoning,
    screenshot_path: entry.screenshot
  };
}

/**
 * Convert DB entry to MAI runtime format
 */
export function toMaiAuditEntry(dbEntry: DbAuditLogEntry): AuditLogEntry {
  return {
    timestamp: dbEntry.timestamp,
    agentId: dbEntry.agent_id,
    operatorId: dbEntry.operator_id,
    action: dbEntry.action as ActionType,
    target: dbEntry.target || '',
    classification: dbEntry.classification as MAIClassification,
    policyDecision: dbEntry.policy_decision as PolicyDecision,
    approved: dbEntry.approved,
    approver: dbEntry.approver_id,
    reasoning: dbEntry.reasoning || '',
    screenshot: dbEntry.screenshot_path,
    hash: dbEntry.content_hash
  };
}
