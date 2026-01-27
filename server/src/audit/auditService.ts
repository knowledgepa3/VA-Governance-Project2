/**
 * Audit Service - Hash-Chained Event Log
 *
 * Provides tamper-evident audit logging with:
 * - Canonicalized JSON hashing
 * - Hash chain (each entry includes prevHash)
 * - Fail-closed on write errors
 * - Integrity verification
 *
 * CRITICAL: If audit.append() fails, the action MUST be blocked.
 */

import { generateUUID, canonicalize, hashObject, sha256Hex } from '../utils/crypto';
import { logger, getCurrentContext } from '../logger';
import { auditStore } from './auditStore';

const log = logger.child({ component: 'AuditService' });

/**
 * Actor who performed the action
 */
export interface AuditActor {
  sub: string;       // Subject (user ID)
  role: string;      // Role at time of action
  sessionId: string; // Session ID
  tenantId?: string; // Tenant ID (for multi-tenant)
}

/**
 * Resource affected by the action
 */
export interface AuditResource {
  type: string;      // e.g., 'agent_run', 'document', 'approval'
  id: string;        // Resource identifier
}

/**
 * Audit entry structure
 */
export interface AuditEntry {
  id: string;
  ts: string;
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
  correlationId: string;
}

/**
 * Action types for audit logging
 * Use string enum for extensibility
 */
export type AuditAction =
  // Authentication
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_FAILED'
  // AI Operations
  | 'AI_REQUEST_CREATED'
  | 'AI_RESPONSE_RECEIVED'
  | 'AI_REQUEST_BLOCKED'
  // Governance
  | 'GATE_APPROVAL_REQUESTED'
  | 'GATE_APPROVED'
  | 'GATE_REJECTED'
  | 'GATE_TIMEOUT'
  | 'SOD_VIOLATION'
  // Data Operations
  | 'DATA_REDACTION_APPLIED'
  | 'DATA_EXPORT_REQUESTED'
  | 'DATA_EXPORT_APPROVED'
  // Workflow
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_STEP_COMPLETED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  // System
  | 'SYSTEM_ERROR'
  | 'INTEGRITY_CHECK_PASSED'
  | 'INTEGRITY_CHECK_FAILED'
  // Generic
  | string;

/**
 * In-memory state for hash chain
 */
let prevHash = '';
let entryIndex = 0;
let isInitialized = false;

/**
 * Initialize the audit service
 * MUST be called before any operations
 */
export async function initializeAuditService(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Initialize the store
  await auditStore.initialize();

  // Load previous hash from last entry if exists
  const entries = await auditStore.readAll();
  if (entries.length > 0) {
    try {
      const lastEntry = JSON.parse(entries[entries.length - 1]) as AuditEntry;
      prevHash = lastEntry.hash;
      entryIndex = entries.length;
      log.info('Audit service initialized with existing chain', {
        entryCount: entries.length,
        lastHash: prevHash.slice(0, 16)
      });
    } catch (error) {
      log.error('Failed to parse last audit entry', {}, error as Error);
      throw new Error('Audit chain corrupted - cannot initialize');
    }
  } else {
    prevHash = '';
    entryIndex = 0;
    log.info('Audit service initialized with new chain');
  }

  isInitialized = true;
}

/**
 * Append an audit entry
 *
 * FAIL-CLOSED: Throws on any error - caller must handle
 *
 * @returns The created audit entry
 */
export async function append(
  actor: AuditActor,
  action: AuditAction,
  resource: AuditResource,
  payload: Record<string, unknown> = {}
): Promise<AuditEntry> {
  if (!isInitialized) {
    throw new Error('Audit service not initialized');
  }

  const ctx = getCurrentContext();
  const id = generateUUID();
  const ts = new Date().toISOString();

  // Build entry without hash first
  const entryData = {
    id,
    ts,
    actor,
    action,
    resource,
    payload: sanitizePayload(payload),
    prevHash,
    correlationId: ctx?.correlationId || 'NO_CORRELATION'
  };

  // Create hash using canonicalized data
  const hash = hashObject({
    ...entryData,
    index: entryIndex
  });

  const entry: AuditEntry = {
    ...entryData,
    hash
  };

  // CRITICAL: Write to store - this MUST succeed
  try {
    const jsonl = JSON.stringify(entry);
    await auditStore.appendLine(jsonl);

    // Update chain state only after successful write
    prevHash = hash;
    entryIndex++;

    log.audit('Audit entry created', {
      id,
      action,
      resourceType: resource.type,
      resourceId: resource.id,
      hash: hash.slice(0, 16)
    });

    return entry;
  } catch (error) {
    log.error('CRITICAL: Audit write failed', {
      action,
      resourceType: resource.type
    }, error as Error);

    // Re-throw - caller MUST handle this failure
    throw new Error(`Audit write failed: ${(error as Error).message}`);
  }
}

/**
 * Verify the integrity of the audit chain
 *
 * @returns Verification result
 */
export async function verifyChain(
  fromIndex?: number,
  toIndex?: number
): Promise<{
  valid: boolean;
  entriesChecked: number;
  brokenAt?: number;
  error?: string;
}> {
  const entries = await auditStore.readAll();

  if (entries.length === 0) {
    return { valid: true, entriesChecked: 0 };
  }

  const start = fromIndex ?? 0;
  const end = toIndex ?? entries.length;

  let expectedPrevHash = '';

  // If starting from middle, get the hash before start
  if (start > 0) {
    try {
      const prevEntry = JSON.parse(entries[start - 1]) as AuditEntry;
      expectedPrevHash = prevEntry.hash;
    } catch (error) {
      return {
        valid: false,
        entriesChecked: 0,
        brokenAt: start - 1,
        error: 'Failed to parse entry before start'
      };
    }
  }

  for (let i = start; i < end && i < entries.length; i++) {
    try {
      const entry = JSON.parse(entries[i]) as AuditEntry;

      // Check prevHash chain
      if (entry.prevHash !== expectedPrevHash) {
        log.error('Hash chain broken', {
          index: i,
          expectedPrevHash: expectedPrevHash.slice(0, 16),
          actualPrevHash: entry.prevHash.slice(0, 16)
        });

        return {
          valid: false,
          entriesChecked: i - start,
          brokenAt: i,
          error: `Hash chain broken at index ${i}`
        };
      }

      // Verify entry hash
      const entryData = {
        id: entry.id,
        ts: entry.ts,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        payload: entry.payload,
        prevHash: entry.prevHash,
        correlationId: entry.correlationId,
        index: i
      };

      const computedHash = hashObject(entryData);

      if (computedHash !== entry.hash) {
        log.error('Entry hash mismatch', {
          index: i,
          expectedHash: computedHash.slice(0, 16),
          actualHash: entry.hash.slice(0, 16)
        });

        return {
          valid: false,
          entriesChecked: i - start,
          brokenAt: i,
          error: `Hash mismatch at index ${i}`
        };
      }

      expectedPrevHash = entry.hash;
    } catch (error) {
      return {
        valid: false,
        entriesChecked: i - start,
        brokenAt: i,
        error: `Parse error at index ${i}: ${(error as Error).message}`
      };
    }
  }

  const entriesChecked = Math.min(end, entries.length) - start;

  log.info('Audit chain verification passed', { entriesChecked });

  return { valid: true, entriesChecked };
}

/**
 * Get audit entries with filters
 */
export async function getEntries(filters?: {
  from?: Date;
  to?: Date;
  actor?: string;
  action?: AuditAction;
  resourceType?: string;
  correlationId?: string;
  limit?: number;
}): Promise<AuditEntry[]> {
  let entries: string[];

  if (filters?.from && filters?.to) {
    entries = await auditStore.readRange(filters.from, filters.to);
  } else {
    entries = await auditStore.readAll();
  }

  let parsed = entries.map(e => JSON.parse(e) as AuditEntry);

  // Apply filters
  if (filters?.actor) {
    parsed = parsed.filter(e => e.actor.sub === filters.actor);
  }

  if (filters?.action) {
    parsed = parsed.filter(e => e.action === filters.action);
  }

  if (filters?.resourceType) {
    parsed = parsed.filter(e => e.resource.type === filters.resourceType);
  }

  if (filters?.correlationId) {
    parsed = parsed.filter(e => e.correlationId === filters.correlationId);
  }

  if (filters?.limit) {
    parsed = parsed.slice(-filters.limit);
  }

  return parsed;
}

/**
 * Get the current chain state
 */
export function getChainState(): {
  entryCount: number;
  lastHash: string;
} {
  return {
    entryCount: entryIndex,
    lastHash: prevHash
  };
}

/**
 * Sanitize payload to remove sensitive data
 * We store fingerprints instead of raw sensitive values
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_FIELDS = [
    'password', 'token', 'secret', 'key',
    'ssn', 'credit_card', 'account_number',
    'prompt', 'response', 'content', 'message'
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(sf => keyLower.includes(sf));

    if (isSensitive && typeof value === 'string') {
      // Store fingerprint instead of value
      sanitized[key] = {
        _fingerprint: sha256Hex(value).slice(0, 16),
        _length: value.length
      };
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Export for use in middleware
 */
export const auditService = {
  initialize: initializeAuditService,
  append,
  verifyChain,
  getEntries,
  getChainState
};

export default auditService;
