/**
 * Spawn Plan Schema — The Canonical Contract
 *
 * This file is the spine of the GIA execution layer.
 * Every runtime concept is defined here as a Zod schema.
 *
 * INVARIANTS ENFORCED:
 * 1. Worker types are a closed enum (allowlist)
 * 2. Node count cannot exceed caps.maxWorkers
 * 3. Edges and gates reference valid node IDs
 * 4. IO paths must be workspace-scoped (no escapes)
 * 5. Worker outputs cannot contain spawn plan keys (no recursion / depth > 2)
 *
 * Nothing executes without passing through these schemas.
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// WORKER TYPE — THE ALLOWLIST (Invariant #3)
// Only these archetypes can exist in a spawn plan.
// ═══════════════════════════════════════════════════════════════════

export const WorkerType = z.enum([
  'gateway',
  'intake',
  'extractor',
  'analyzer',
  'compliance',
  'scorer',
  'writer',
  'builder',
  'validator',
  'qa',
  'supervisor',   // note: this is a role archetype name, NOT the Supervisor executor
  'telemetry',
]);
export type WorkerType = z.infer<typeof WorkerType>;

// ═══════════════════════════════════════════════════════════════════
// RUN STATUS — STATE MACHINE
// ═══════════════════════════════════════════════════════════════════

export const RunStatus = z.enum([
  'pending',
  'running',
  'paused_at_gate',
  'completed',
  'failed',
  'sealed',
]);
export type RunStatus = z.infer<typeof RunStatus>;

// ═══════════════════════════════════════════════════════════════════
// MAI LEVEL — Governance classification per action
// ═══════════════════════════════════════════════════════════════════

export const MAILevel = z.enum([
  'INFORMATIONAL',
  'ADVISORY',
  'MANDATORY',
]);
export type MAILevel = z.infer<typeof MAILevel>;

// ═══════════════════════════════════════════════════════════════════
// POLICY CAPS — Hard Limits (Invariant #4)
// Pre-checked at plan validation, live-checked during execution.
// ═══════════════════════════════════════════════════════════════════

export const PolicyCaps = z.object({
  maxWorkers: z.number().int().min(1).max(12),
  maxTokens: z.number().int().min(1000).max(500000),
  maxCostCents: z.number().int().min(1).max(10000),     // in cents
  maxRuntimeMs: z.number().int().min(5000).max(600000),  // 5s – 10min
  maxParallel: z.number().int().min(1).max(4),
});
export type PolicyCaps = z.infer<typeof PolicyCaps>;

// Per-worker caps (prevents "Writer goes wild")
export const PerWorkerCaps = z.object({
  maxTokens: z.number().int().min(100).max(100000),
  maxRuntimeMs: z.number().int().min(1000).max(120000),  // 1s – 2min
});
export type PerWorkerCaps = z.infer<typeof PerWorkerCaps>;

// ═══════════════════════════════════════════════════════════════════
// IO REF — Workspace-scoped paths (Invariant: no IO escapes)
// ═══════════════════════════════════════════════════════════════════

const WORKSPACE_PATH_PREFIX = /^\/workspace\/run\/[a-zA-Z0-9_-]+\//;

export const IORef = z.object({
  path: z.string().regex(WORKSPACE_PATH_PREFIX, 'IO path must be under /workspace/run/<runId>/'),
  type: z.enum(['input', 'output', 'artifact', 'upload']),
  description: z.string().max(200),
});
export type IORef = z.infer<typeof IORef>;

// ═══════════════════════════════════════════════════════════════════
// WORKER INSTRUCTION — What a worker is told to do
// ═══════════════════════════════════════════════════════════════════

export const WorkerInstruction = z.object({
  systemPrompt: z.string().min(10).max(4000),
  taskDescription: z.string().min(5).max(2000),
  constraints: z.array(z.string().max(200)).max(10),
  outputFormat: z.string().max(500).optional(),
});
export type WorkerInstruction = z.infer<typeof WorkerInstruction>;

// ═══════════════════════════════════════════════════════════════════
// SPAWN NODE — A single worker instance in the plan
// ═══════════════════════════════════════════════════════════════════

export const SpawnNode = z.object({
  id: z.string().regex(/^node-[a-z0-9-]+$/, 'Node ID must be node-<lowercase-alphanumeric>'),
  type: WorkerType,
  label: z.string().min(1).max(80),        // Human-readable: "Evidence Extractor"
  instruction: WorkerInstruction,
  maiLevel: MAILevel,
  perWorkerCaps: PerWorkerCaps,
  dependsOn: z.array(z.string()).default([]),  // node IDs this node depends on
});
export type SpawnNode = z.infer<typeof SpawnNode>;

// ═══════════════════════════════════════════════════════════════════
// SPAWN EDGE — Data dependency between nodes
// ═══════════════════════════════════════════════════════════════════

export const SpawnEdge = z.object({
  from: z.string(),    // source node ID
  to: z.string(),      // target node ID
  dataKey: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Data key must be a valid identifier'),
});
export type SpawnEdge = z.infer<typeof SpawnEdge>;

// ═══════════════════════════════════════════════════════════════════
// SPAWN GATE — Execution stop point (Invariant #6)
// A gate is NOT a UI banner. It is a runtime STOP.
// ═══════════════════════════════════════════════════════════════════

export const SpawnGate = z.object({
  id: z.string().regex(/^gate-[a-z0-9-]+$/),
  afterNode: z.string(),     // triggers after this node completes
  label: z.string().min(1).max(100),
  description: z.string().max(500),
  requiresApproval: z.boolean().default(true),
  maiLevel: MAILevel.default('MANDATORY'),
});
export type SpawnGate = z.infer<typeof SpawnGate>;

// ═══════════════════════════════════════════════════════════════════
// PII POLICY — Controls data handling
// ═══════════════════════════════════════════════════════════════════

export const PIIPolicy = z.enum([
  'NO_RAW_PII',      // PII must be redacted before output
  'PII_ALLOWED',     // PII can pass through (regulated context)
  'PII_ENCRYPTED',   // PII must be encrypted at rest
]);
export type PIIPolicy = z.infer<typeof PIIPolicy>;

// ═══════════════════════════════════════════════════════════════════
// SPAWN PLAN — The complete executable plan
// This is what the Pack Compiler produces and Supervisor executes.
// ═══════════════════════════════════════════════════════════════════

export const SpawnPlan = z.object({
  // Metadata
  planId: z.string().uuid(),
  version: z.literal('1.0.0'),
  createdAt: z.string().datetime(),
  domain: z.string().min(1).max(100),
  caseId: z.string().optional(),

  // The DAG
  nodes: z.array(SpawnNode).min(2).max(12),  // at least Gateway + Telemetry
  edges: z.array(SpawnEdge),
  gates: z.array(SpawnGate),

  // Hard limits
  caps: PolicyCaps,

  // Policy
  piiPolicy: PIIPolicy,
  governanceLevel: z.enum(['Advisory', 'Strict', 'Regulated']),

  // Document references (uploaded before compilation)
  documentRefs: z.array(z.object({
    docId: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    contentHash: z.string(),
    sizeBytes: z.number().int().positive(),
  })).default([]),

}).superRefine((plan, ctx) => {
  // ─── INVARIANT ENFORCEMENT ───────────────────────────────────

  const nodeIds = new Set(plan.nodes.map(n => n.id));

  // 1. Node count must not exceed maxWorkers cap
  if (plan.nodes.length > plan.caps.maxWorkers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Plan has ${plan.nodes.length} nodes but caps.maxWorkers is ${plan.caps.maxWorkers}`,
      path: ['nodes'],
    });
  }

  // 2. First node must be gateway type
  if (plan.nodes.length > 0 && plan.nodes[0].type !== 'gateway') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'First node must be of type "gateway"',
      path: ['nodes', 0, 'type'],
    });
  }

  // 3. Last node must be telemetry type
  if (plan.nodes.length > 0 && plan.nodes[plan.nodes.length - 1].type !== 'telemetry') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Last node must be of type "telemetry"',
      path: ['nodes', plan.nodes.length - 1, 'type'],
    });
  }

  // 4. All edges reference valid node IDs
  for (let i = 0; i < plan.edges.length; i++) {
    const edge = plan.edges[i];
    if (!nodeIds.has(edge.from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge[${i}].from references unknown node "${edge.from}"`,
        path: ['edges', i, 'from'],
      });
    }
    if (!nodeIds.has(edge.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge[${i}].to references unknown node "${edge.to}"`,
        path: ['edges', i, 'to'],
      });
    }
  }

  // 5. All gates reference valid node IDs
  for (let i = 0; i < plan.gates.length; i++) {
    const gate = plan.gates[i];
    if (!nodeIds.has(gate.afterNode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Gate[${i}].afterNode references unknown node "${gate.afterNode}"`,
        path: ['gates', i, 'afterNode'],
      });
    }
  }

  // 6. Node dependencies reference valid node IDs
  for (let ni = 0; ni < plan.nodes.length; ni++) {
    const node = plan.nodes[ni];
    for (const dep of node.dependsOn) {
      if (!nodeIds.has(dep)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node "${node.id}" depends on unknown node "${dep}"`,
          path: ['nodes', ni, 'dependsOn'],
        });
      }
    }
  }
});

export type SpawnPlan = z.infer<typeof SpawnPlan>;

// ═══════════════════════════════════════════════════════════════════
// GATE RESOLUTION — Record of a gate approval/rejection
// ═══════════════════════════════════════════════════════════════════

export const GateResolution = z.object({
  gateId: z.string(),
  approved: z.boolean(),
  resolvedAt: z.string().datetime(),
  resolvedBy: z.string(),     // userId
  rationale: z.string().max(1000).optional(),
});
export type GateResolution = z.infer<typeof GateResolution>;

// ═══════════════════════════════════════════════════════════════════
// WORKER OUTPUT — What a worker returns (Invariant #2 + #5)
// Explicitly BLOCKS spawn plan keys to prevent depth > 2.
// ═══════════════════════════════════════════════════════════════════

export const WorkerOutput = z.object({
  nodeId: z.string(),
  type: WorkerType,
  status: z.enum(['success', 'error', 'partial']),
  data: z.record(z.string(), z.unknown()),
  summary: z.string().max(2000),
  tokensUsed: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  artifactPaths: z.array(z.string()).default([]),
}).strict();  // .strict() rejects unknown keys

export type WorkerOutput = z.infer<typeof WorkerOutput>;

/**
 * INVARIANT #2: Deep-scan worker output for forbidden keys.
 * Workers cannot return spawn plan directives.
 * This prevents depth > 2 (workers spawning workers).
 */
const FORBIDDEN_OUTPUT_KEYS = ['spawnPlan', 'spawn_plan', 'nodes', 'edges', 'gates', 'spawnDirective'];

export function containsForbiddenKeys(obj: unknown, path: string = ''): string | null {
  if (obj === null || obj === undefined || typeof obj !== 'object') return null;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const found = containsForbiddenKeys(obj[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_OUTPUT_KEYS.includes(key)) {
      return `${path}.${key}`;
    }
    const found = containsForbiddenKeys((obj as Record<string, unknown>)[key], `${path}.${key}`);
    if (found) return found;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// WORKER CONTEXT — Injected into workers (deliberately limited)
// ═══════════════════════════════════════════════════════════════════

export interface WorkerContext {
  runId: string;
  caseId: string;
  /** Scoped Claude API call — workers cannot configure model or bypass audit */
  claudeProxy: (systemPrompt: string, userMessage: string) => Promise<{
    content: string;
    tokensUsed: { input: number; output: number };
  }>;
  /** Scoped file writer — only writes to /workspace/run/<runId>/ */
  writeArtifact: (filename: string, data: string | Buffer) => Promise<string>;
  /** Read an uploaded document by docId */
  readDocument: (docId: string) => Promise<{ content: string; filename: string; mimeType: string }>;
  /** Policy (read-only) */
  policy: {
    piiPolicy: PIIPolicy;
    governanceLevel: string;
    constraints: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════
// CAPS USED — Tracks cumulative resource usage during execution
// ═══════════════════════════════════════════════════════════════════

export const CapsUsed = z.object({
  tokens: z.number().int().min(0).default(0),
  costCents: z.number().min(0).default(0),
  runtimeMs: z.number().int().min(0).default(0),
  workersSpawned: z.number().int().min(0).default(0),
});
export type CapsUsed = z.infer<typeof CapsUsed>;

// ═══════════════════════════════════════════════════════════════════
// NORMALIZATION + HASHING — Makes plans deterministic and diffable
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalize a spawn plan for deterministic hashing.
 *
 * IMPORTANT: Excludes volatile fields (planId, createdAt) so that
 * "same inputs = same hash" is literally true across runs.
 * Sorts nodes by ID, edges by from+to, gates by afterNode,
 * documentRefs by docId. Returns canonical JSON string.
 */
export function normalizeSpawnPlan(plan: SpawnPlan): string {
  // Extract only structural fields — exclude volatile metadata
  const normalized = {
    version: plan.version,
    domain: plan.domain,
    caseId: plan.caseId,
    nodes: [...plan.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...plan.edges].sort((a, b) =>
      a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
    ),
    gates: [...plan.gates].sort((a, b) => a.afterNode.localeCompare(b.afterNode)),
    caps: plan.caps,
    piiPolicy: plan.piiPolicy,
    governanceLevel: plan.governanceLevel,
    documentRefs: [...plan.documentRefs].sort((a, b) => a.docId.localeCompare(b.docId)),
  };
  return JSON.stringify(normalized, null, 0); // compact, deterministic
}

/**
 * SHA-256 hash of a normalized spawn plan.
 * This hash enables: "replay this exact run" + audit trail linkage.
 */
export function hashSpawnPlan(plan: SpawnPlan): string {
  const normalized = normalizeSpawnPlan(plan);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE LEVEL → DEFAULT CAPS MAPPING
// ═══════════════════════════════════════════════════════════════════

export const DEFAULT_CAPS: Record<string, PolicyCaps> = {
  Advisory: {
    maxWorkers: 10,
    maxTokens: 200000,
    maxCostCents: 500,    // $5.00
    maxRuntimeMs: 300000, // 5 min
    maxParallel: 2,
  },
  Strict: {
    maxWorkers: 8,
    maxTokens: 100000,
    maxCostCents: 200,    // $2.00
    maxRuntimeMs: 180000, // 3 min
    maxParallel: 1,
  },
  Regulated: {
    maxWorkers: 6,
    maxTokens: 50000,
    maxCostCents: 100,    // $1.00
    maxRuntimeMs: 120000, // 2 min
    maxParallel: 1,
  },
};

export const DEFAULT_PER_WORKER_CAPS: PerWorkerCaps = {
  maxTokens: 32000,
  maxRuntimeMs: 60000,  // 1 min
};
