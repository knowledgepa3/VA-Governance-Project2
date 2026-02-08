/**
 * Pack Compiler — Pipeline Config → Spawn Plan
 *
 * Converts a design-time pipeline (from onboarding) into a runtime
 * executable spawn plan (DAG + instruction blocks + schemas + gates).
 *
 * KEY DESIGN CHOICES:
 * - Structure is DETERMINISTIC (topology, caps, gates are compiler-controlled)
 * - Instruction content can be LLM-assisted in v2 (but MVP uses hardcoded blocks)
 * - Output is Zod-validated, normalized, and hashed
 * - Hash enables: "replay this exact run" + audit trail linkage
 *
 * The compiler feels like a build step:
 *   Pipeline JSON (design-time) → Pack Compiler → Spawn Plan JSON (runtime)
 */

import { generateUUID } from '../utils/crypto';
import {
  SpawnPlan,
  SpawnNode,
  SpawnEdge,
  SpawnGate,
  PolicyCaps,
  PerWorkerCaps,
  PIIPolicy,
  WorkerInstruction,
  DEFAULT_CAPS,
  DEFAULT_PER_WORKER_CAPS,
  hashSpawnPlan,
  normalizeSpawnPlan,
} from './spawnPlan.schema';

// ═══════════════════════════════════════════════════════════════════
// INPUT TYPES — What the compiler receives
// ═══════════════════════════════════════════════════════════════════

export interface PipelineConfig {
  /** Pipeline roles from onboarding (e.g. ["Gateway", "Evidence Extractor", ...]) */
  roles: string[];
  /** Domain name */
  domain: string;
  /** Governance level */
  governanceLevel: 'Advisory' | 'Strict' | 'Regulated';
  /** User-selected constraints */
  constraints: string[];
  /** User-selected input types */
  inputs: string[];
  /** User-selected output types */
  outputs: string[];
}

export interface CompileRequest {
  pipeline: PipelineConfig;
  caseId?: string;
  /** Document references (uploaded before compilation) */
  documents: Array<{
    docId: string;
    filename: string;
    mimeType: string;
    contentHash: string;
    sizeBytes: number;
  }>;
}

export interface CompileResult {
  plan: SpawnPlan;
  planHash: string;
  normalizedJson: string;
}

// ═══════════════════════════════════════════════════════════════════
// COMPILER — Main entry point
// ═══════════════════════════════════════════════════════════════════

/**
 * Compile a pipeline config into an executable spawn plan.
 *
 * For MVP: returns a fixed VA Claims plan with hardcoded instruction blocks.
 * In v2: Claude generates domain-specific instructions while compiler
 * controls topology, caps, and gates.
 */
export function compilePipeline(request: CompileRequest): CompileResult {
  const { pipeline, caseId, documents } = request;
  const { governanceLevel, constraints, domain } = pipeline;

  // Determine PII policy from constraints
  const piiPolicy: PIIPolicy = constraints.includes('no-pii')
    ? 'NO_RAW_PII'
    : governanceLevel === 'Regulated'
      ? 'PII_ENCRYPTED'
      : 'PII_ALLOWED';

  // Get caps for governance level
  const caps: PolicyCaps = DEFAULT_CAPS[governanceLevel] || DEFAULT_CAPS.Advisory;

  // Build the plan based on domain
  const planId = generateUUID();
  const runId = generateUUID();  // pre-generated for IO path scoping

  // Select the right plan builder
  const builder = getPlanBuilder(domain);
  const { nodes, edges, gates } = builder(planId, runId, documents, constraints);

  // Assemble the spawn plan
  const plan: SpawnPlan = {
    planId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    domain,
    caseId,
    nodes,
    edges,
    gates,
    caps,
    piiPolicy,
    governanceLevel,
    documentRefs: documents,
  };

  // Validate against Zod schema (this enforces all invariants)
  const parsed = SpawnPlan.parse(plan);

  // Normalize + hash for audit trail
  const normalizedJson = normalizeSpawnPlan(parsed);
  const planHash = hashSpawnPlan(parsed);

  return { plan: parsed, planHash, normalizedJson };
}

// ═══════════════════════════════════════════════════════════════════
// PLAN BUILDERS — Domain-specific DAG construction
// ═══════════════════════════════════════════════════════════════════

type PlanBuilder = (
  planId: string,
  runId: string,
  documents: CompileRequest['documents'],
  constraints: string[],
) => {
  nodes: SpawnNode[];
  edges: SpawnEdge[];
  gates: SpawnGate[];
};

function getPlanBuilder(domain: string): PlanBuilder {
  const dl = domain.toLowerCase();

  // VA Claims — the MVP vertical
  if (dl.includes('va') || dl.includes('veteran') || dl.includes('disability') || dl.includes('claims')) {
    return buildVAClaimsPlan;
  }

  // Default: generic analysis pipeline
  return buildGenericPlan;
}

// ═══════════════════════════════════════════════════════════════════
// VA CLAIMS PLAN — The MVP vertical slice
// 6 workers, 2 gates, linear DAG
// ═══════════════════════════════════════════════════════════════════

function buildVAClaimsPlan(
  planId: string,
  runId: string,
  documents: CompileRequest['documents'],
  constraints: string[],
): { nodes: SpawnNode[]; edges: SpawnEdge[]; gates: SpawnGate[] } {

  const workerCaps: PerWorkerCaps = { ...DEFAULT_PER_WORKER_CAPS };

  const docList = documents.map(d => `- ${d.filename} (${d.mimeType})`).join('\n');
  const constraintList = constraints.length > 0 ? constraints.join(', ') : 'none';

  const nodes: SpawnNode[] = [
    // ── NODE 1: Gateway ──────────────────────────────────────
    {
      id: 'node-gateway',
      type: 'gateway',
      label: 'Document Gateway',
      maiLevel: 'INFORMATIONAL',
      perWorkerCaps: workerCaps,
      dependsOn: [],
      instruction: {
        systemPrompt: `You are a document intake gateway for VA disability claims processing. Your job is to validate and inventory uploaded documents. You ensure all files are readable, categorize them by type (DD-214, medical records, service records, buddy statements, etc.), and flag any missing or corrupted files.`,
        taskDescription: `Validate and inventory the following uploaded documents for a VA disability claim:\n\n${docList}\n\nFor each document:\n1. Confirm it is a valid, readable file\n2. Categorize it (DD-214, medical record, service record, buddy statement, nexus letter, other)\n3. Extract basic metadata (pages, dates if visible, issuing authority)\n4. Flag any issues (unreadable, wrong format, possibly incomplete)\n\nReturn a structured inventory with categories, statuses, and any flags.`,
        constraints: [`Operating constraints: ${constraintList}`, 'Do not extract PII — only document metadata and categories'],
        outputFormat: 'JSON with fields: documents (array of {docId, filename, category, status, flags, metadata}), summary, totalDocuments, issuesFound',
      },
    },

    // ── NODE 2: Extractor ────────────────────────────────────
    {
      id: 'node-extractor',
      type: 'extractor',
      label: 'Evidence Extractor',
      maiLevel: 'ADVISORY',
      perWorkerCaps: workerCaps,
      dependsOn: ['node-gateway'],
      instruction: {
        systemPrompt: `You are a VA claims evidence extractor. You pull key facts from veteran service and medical documents that are relevant to disability claim evaluation. You extract structured data — dates, conditions, service connections, treatments — without adding interpretation.`,
        taskDescription: `Extract key evidence from the validated documents. Focus on:\n\n1. Service dates (entry, discharge, deployments)\n2. Discharge status and character of service\n3. Medical conditions documented (diagnosis, onset date, treating provider)\n4. Service-connected events (injuries, exposures, incidents)\n5. Treatment history (dates, providers, medications)\n6. Any nexus opinions or buddy statements\n\nReturn structured data, NOT interpretation. Cite which document each fact comes from.`,
        constraints: [`Operating constraints: ${constraintList}`, 'Extract facts only — do not interpret or evaluate claim strength'],
        outputFormat: 'JSON with fields: serviceDates, dischargeStatus, conditions (array), serviceEvents (array), treatments (array), nexusOpinions (array), buddyStatements (array), sourceMap (docId → facts)',
      },
    },

    // ── NODE 3: Validator ────────────────────────────────────
    {
      id: 'node-validator',
      type: 'validator',
      label: 'Cross-Check Validator',
      maiLevel: 'ADVISORY',
      perWorkerCaps: workerCaps,
      dependsOn: ['node-extractor'],
      instruction: {
        systemPrompt: `You are a VA claims data validator. You cross-check extracted evidence for internal consistency, flag discrepancies between documents, and identify gaps that could weaken a claim. You do NOT make eligibility determinations — you flag issues for human review.`,
        taskDescription: `Cross-check the extracted evidence for consistency:\n\n1. Do service dates match across DD-214 and medical records?\n2. Are condition onset dates consistent with service periods?\n3. Do treatment records support claimed conditions?\n4. Are there gaps in the evidence chain (missing records, unexplained timelines)?\n5. Do buddy statements corroborate documented events?\n6. Flag any contradictions or inconsistencies\n\nAssign a confidence score (0-100) to each condition's evidence chain.`,
        constraints: [`Operating constraints: ${constraintList}`, 'Flag issues — do not make claim decisions'],
        outputFormat: 'JSON with fields: validationResults (array of {condition, confidenceScore, flags, inconsistencies, gaps}), overallScore, criticalFlags, recommendations',
      },
    },

    // ── NODE 4: Compliance ───────────────────────────────────
    {
      id: 'node-compliance',
      type: 'compliance',
      label: 'Compliance & PII Scanner',
      maiLevel: 'MANDATORY',
      perWorkerCaps: workerCaps,
      dependsOn: ['node-validator'],
      instruction: {
        systemPrompt: `You are a VA claims compliance checker. You verify that the claim processing meets 38 CFR regulatory requirements and HIPAA privacy standards. You scan for PII exposure, check eligibility prerequisites, and ensure all required evidence categories are present.`,
        taskDescription: `Run compliance checks on the validated evidence:\n\n1. PII Scan: Identify any raw PII (SSN, full DOB, addresses) in outputs so far\n2. 38 CFR Eligibility: Does the veteran meet basic eligibility (service period, discharge status)?\n3. Evidence Completeness: Are all required evidence categories present per 38 CFR 3.303/3.304?\n4. HIPAA: Are medical records being handled per privacy requirements?\n5. Generate a redaction report if PII was found\n\nThis is a MANDATORY step — findings must be reviewed before proceeding.`,
        constraints: [`Operating constraints: ${constraintList}`, 'This is a MANDATORY classification — output triggers human review gate'],
        outputFormat: 'JSON with fields: piiFindings (array), eligibilityCheck {eligible, reason, cfr_references}, completenessCheck {complete, missingCategories}, hipaaCompliance {compliant, issues}, redactionReport {fieldsToRedact}',
      },
    },

    // ── NODE 5: Writer ───────────────────────────────────────
    {
      id: 'node-writer',
      type: 'writer',
      label: 'ECV Report Writer',
      maiLevel: 'ADVISORY',
      perWorkerCaps: { maxTokens: 50000, maxRuntimeMs: 90000 },  // Writer gets more room
      dependsOn: ['node-compliance'],
      instruction: {
        systemPrompt: `You are a VA Enhanced Claim View (ECV) report writer. You synthesize validated evidence into a structured narrative report that supports a veteran's disability claim. The report follows VA format guidelines and references specific evidence with citations.`,
        taskDescription: `Generate an Enhanced Claim View (ECV) report from the validated evidence:\n\n1. Executive Summary: Brief overview of the claim\n2. Service History: Dates, deployments, discharge status\n3. Claimed Conditions: Each condition with:\n   - Description and onset\n   - Supporting evidence (with document citations)\n   - Service connection rationale\n   - Evidence strength assessment\n4. Evidence Chain: How documents connect condition to service\n5. Recommendations: Suggested next steps, additional evidence needed\n6. Compliance Notes: Any compliance findings that affect the claim\n\nUse professional, factual language. Cite specific documents for every claim.`,
        constraints: [`Operating constraints: ${constraintList}`, 'Cite every factual claim to a specific source document'],
        outputFormat: 'Markdown report with sections: Executive Summary, Service History, Claimed Conditions (per condition), Evidence Chain, Recommendations, Compliance Notes',
      },
    },

    // ── NODE 6: Telemetry ────────────────────────────────────
    {
      id: 'node-telemetry',
      type: 'telemetry',
      label: 'Evidence Bundler & Sealer',
      maiLevel: 'INFORMATIONAL',
      perWorkerCaps: { maxTokens: 2000, maxRuntimeMs: 10000 },
      dependsOn: ['node-writer'],
      instruction: {
        systemPrompt: `You are the telemetry and evidence bundling agent. You collect all artifacts from the pipeline run, generate a manifest with SHA-256 hashes, and prepare the sealed evidence bundle. You do NOT modify any content — you only inventory, hash, and seal.`,
        taskDescription: `Seal the evidence bundle:\n\n1. Collect all worker outputs and artifacts\n2. Generate SHA-256 hash for each artifact\n3. Build manifest (artifact ID, filename, hash, worker source)\n4. Include gate approval records\n5. Generate bundle summary\n6. Return the complete evidence bundle ready for sealing`,
        constraints: ['Read-only: do not modify any artifacts', 'Include all gate approval records in manifest'],
        outputFormat: 'JSON with fields: manifest {artifacts (array of {id, filename, hash, source})}, gateRecords (array), bundleSummary, totalArtifacts, integrityHash',
      },
    },
  ];

  // Linear DAG edges
  const edges: SpawnEdge[] = [
    { from: 'node-gateway', to: 'node-extractor', dataKey: 'documentInventory' },
    { from: 'node-extractor', to: 'node-validator', dataKey: 'extractedEvidence' },
    { from: 'node-validator', to: 'node-compliance', dataKey: 'validationReport' },
    { from: 'node-compliance', to: 'node-writer', dataKey: 'complianceReport' },
    { from: 'node-writer', to: 'node-telemetry', dataKey: 'ecvReport' },
  ];

  // Gates — execution STOPS here until human approves
  const gates: SpawnGate[] = [
    {
      id: 'gate-validation-review',
      afterNode: 'node-validator',
      label: 'Validation Review',
      description: 'Review cross-check findings and inconsistency flags before compliance processing. Verify extracted data accuracy and evidence chain integrity.',
      requiresApproval: true,
      maiLevel: 'MANDATORY',
    },
    {
      id: 'gate-final-approval',
      afterNode: 'node-writer',
      label: 'Final Report Approval',
      description: 'Review the generated ECV report and compliance findings before sealing the evidence bundle. This is the last opportunity to request changes.',
      requiresApproval: true,
      maiLevel: 'MANDATORY',
    },
  ];

  return { nodes, edges, gates };
}

// ═══════════════════════════════════════════════════════════════════
// GENERIC PLAN — Fallback for non-VA domains
// Minimal 4-node pipeline: Gateway → Extractor → Writer → Telemetry
// ═══════════════════════════════════════════════════════════════════

function buildGenericPlan(
  planId: string,
  runId: string,
  documents: CompileRequest['documents'],
  constraints: string[],
): { nodes: SpawnNode[]; edges: SpawnEdge[]; gates: SpawnGate[] } {

  const workerCaps: PerWorkerCaps = { ...DEFAULT_PER_WORKER_CAPS };
  const constraintList = constraints.length > 0 ? constraints.join(', ') : 'none';

  const nodes: SpawnNode[] = [
    {
      id: 'node-gateway',
      type: 'gateway',
      label: 'Document Gateway',
      maiLevel: 'INFORMATIONAL',
      perWorkerCaps: workerCaps,
      dependsOn: [],
      instruction: {
        systemPrompt: 'You are a document intake gateway. Validate and inventory uploaded documents.',
        taskDescription: `Validate and categorize the uploaded documents. Return a structured inventory.`,
        constraints: [`Operating constraints: ${constraintList}`],
        outputFormat: 'JSON with fields: documents (array), summary, totalDocuments',
      },
    },
    {
      id: 'node-extractor',
      type: 'extractor',
      label: 'Data Extractor',
      maiLevel: 'ADVISORY',
      perWorkerCaps: workerCaps,
      dependsOn: ['node-gateway'],
      instruction: {
        systemPrompt: 'You are a document data extractor. Pull key facts and structure them.',
        taskDescription: 'Extract key data points from the validated documents. Return structured facts.',
        constraints: [`Operating constraints: ${constraintList}`],
        outputFormat: 'JSON with extracted data fields relevant to the domain',
      },
    },
    {
      id: 'node-writer',
      type: 'writer',
      label: 'Report Writer',
      maiLevel: 'ADVISORY',
      perWorkerCaps: { maxTokens: 50000, maxRuntimeMs: 90000 },
      dependsOn: ['node-extractor'],
      instruction: {
        systemPrompt: 'You are a report writer. Synthesize extracted data into a clear narrative report.',
        taskDescription: 'Generate a structured report from the extracted data.',
        constraints: [`Operating constraints: ${constraintList}`],
        outputFormat: 'Markdown report with relevant sections',
      },
    },
    {
      id: 'node-telemetry',
      type: 'telemetry',
      label: 'Evidence Sealer',
      maiLevel: 'INFORMATIONAL',
      perWorkerCaps: { maxTokens: 2000, maxRuntimeMs: 10000 },
      dependsOn: ['node-writer'],
      instruction: {
        systemPrompt: 'You are the telemetry agent. Seal the evidence bundle with manifest and hashes.',
        taskDescription: 'Collect all artifacts, hash them, build manifest, seal the bundle.',
        constraints: ['Read-only: do not modify artifacts'],
        outputFormat: 'JSON with manifest, hashes, and bundle summary',
      },
    },
  ];

  const edges: SpawnEdge[] = [
    { from: 'node-gateway', to: 'node-extractor', dataKey: 'documentInventory' },
    { from: 'node-extractor', to: 'node-writer', dataKey: 'extractedData' },
    { from: 'node-writer', to: 'node-telemetry', dataKey: 'report' },
  ];

  const gates: SpawnGate[] = [
    {
      id: 'gate-final-approval',
      afterNode: 'node-writer',
      label: 'Report Approval',
      description: 'Review the generated report before sealing.',
      requiresApproval: true,
      maiLevel: 'MANDATORY',
    },
  ];

  return { nodes, edges, gates };
}
