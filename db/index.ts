/**
 * Database Module
 *
 * Provides persistence layer for ACE Governance Platform.
 *
 * Features:
 * - PostgreSQL support for production
 * - In-memory fallback for demos/testing
 * - Hash-chained audit logs (AU-9 compliance)
 * - Evidence pack storage with full provenance
 *
 * Usage:
 *   import { getAuditLogRepository, getEvidencePackRepository } from './db';
 *
 *   const auditRepo = getAuditLogRepository();
 *   await auditRepo.append({ ... });
 *
 * Environment Variables:
 *   DB_HOST - PostgreSQL host
 *   DB_PORT - PostgreSQL port (default: 5432)
 *   DB_NAME - Database name (default: ace_governance)
 *   DB_USER - Database user
 *   DB_PASSWORD - Database password
 *   DB_SSL - SSL mode (require, prefer, disable)
 *   DB_POOL_MAX - Max pool connections (default: 10)
 *
 * If DB_HOST and DB_PASSWORD are not set, falls back to in-memory storage.
 */

// Connection management
export {
  getPool,
  getClient,
  query,
  queryOne,
  transaction,
  closePool,
  healthCheck,
  isDbConfigured,
  getInMemoryStore,
  loadDbConfig,
  DbConfig
} from './connection';

// Types
export * from './types';

// Repositories
export {
  getAuditLogRepository,
  resetAuditLogRepository,
  toDbAuditEntry,
  toMaiAuditEntry,
  IAuditLogRepository,
  PostgresAuditLogRepository,
  InMemoryAuditLogRepository
} from './repositories/auditLogRepository';

export {
  getEvidencePackRepository,
  resetEvidencePackRepository,
  IEvidencePackRepository,
  EvidencePackWithRelations,
  PostgresEvidencePackRepository,
  InMemoryEvidencePackRepository
} from './repositories/evidencePackRepository';
