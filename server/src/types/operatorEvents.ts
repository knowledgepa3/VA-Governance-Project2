/**
 * Operator Console Event Schema
 *
 * Defines event types for the operator console.
 * v1: Used for type safety in boot/integrity responses.
 * v2 (Phase 2): Will power SSE stream via GET /api/stream.
 *
 * These types are shared between server routes and client rendering.
 */

// ═══════════════════════════════════════════════════════════════════
// SSE Event Types (Phase 2 — defined now, implemented later)
// ═══════════════════════════════════════════════════════════════════

export type OperatorEventType =
  | 'run.created'
  | 'run.updated'
  | 'run.completed'
  | 'run.failed'
  | 'gate.created'
  | 'gate.resolved'
  | 'integrity.changed'
  | 'alert.created'
  | 'agent.status';

export interface OperatorEvent {
  type: OperatorEventType;
  ts: string;
  payload: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════
// Boot Response Shape
// ═══════════════════════════════════════════════════════════════════

export interface BootResponse {
  version: {
    sha: string;
    buildTime: string;
    env: string;
  };
  operator: {
    displayName: string;
    role: string;
    tenantId: string;
  };
  enforcement: {
    demoLock: boolean;
    packHash: string;
    policyHash: string;
    configDrift: boolean;
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    db: boolean;
    ai: boolean;
  };
  agents: {
    registered: number;
    workers: string[];
  };
  pipelines: {
    total: number;
    active: number;
    paused: number;
    failed: number;
    completed: number;
  };
  gates: {
    pending: number;
    oldest: string | null;
  };
  audit: {
    chainValid: boolean;
    entryCount: number;
    lastHash: string;
  };
  cost: {
    today: { tokens: number; usd: number };
    mtd: { tokens: number; usd: number };
  };
  alerts: AlertEntry[];
}

export interface AlertEntry {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  action: string;
  resourceType: string;
}

// ═══════════════════════════════════════════════════════════════════
// Integrity Response Shape
// ═══════════════════════════════════════════════════════════════════

export interface IntegrityResponse {
  demoLock: { enforced: boolean; reason: string };
  secretsScan: { clean: boolean; scanMethod: 'build-time'; lastScanAt: string };
  policyHash: { hash: string; pinned: boolean; drift: boolean };
  sessionBinding: { active: boolean; method: string };
  auditImmutable: { enabled: boolean; chainValid: boolean };
  piiControls: { redactionRequired: boolean; scanner: 'active' | 'inactive' };
  rateLimiting: { enabled: boolean; endpoints: number };
  rbac: { enabled: boolean; governanceRoles: string[] };
  breakGlass: { active: boolean; lastActivatedAt: string | null; actor: string | null };
}
