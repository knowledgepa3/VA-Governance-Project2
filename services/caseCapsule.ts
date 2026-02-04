/**
 * Case Capsule Service
 *
 * Implements the "summarize → store → retrieve" pattern to dramatically reduce
 * token costs. Instead of re-sending the entire evidence universe on every call,
 * we create compact "capsules" that contain:
 *
 * 1. Case metadata (IDs, timestamps, status)
 * 2. Evidence index (hashes, titles, types - NOT full content)
 * 3. Extracted summaries from previous agent runs
 * 4. Key findings and flags
 *
 * This transforms calls from "re-send universe" to "IDs + retrieval + summaries"
 */

import { AgentRole, WorkforceType } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface EvidenceIndexEntry {
  id: string;
  name: string;
  type: string;
  hash: string;
  size: number;
  pageCount?: number;
  dateExtracted: string;

  // Summary info (NOT full content)
  contentSummary: string;        // 1-2 sentence summary
  keyEntities: string[];         // Names, dates, conditions mentioned
  documentType: string;          // e.g., "SMR", "C&P Exam", "DD214", "Rating Decision"
  relevanceScore?: number;       // 0-100 how relevant to the claim
  flagged?: boolean;
  flagReason?: string;
}

export interface AgentSummary {
  agentRole: AgentRole;
  timestamp: string;

  // Compact output summary
  keyFindings: string[];         // Bullet points, not full JSON
  extractedData: Record<string, any>;  // Only the critical fields
  confidence: number;
  warnings: string[];
  nextStepRecommendation?: string;

  // Token tracking
  inputTokensUsed: number;
  outputTokensUsed: number;

  // PROVENANCE - know exactly how this summary was created
  provenance: {
    model: string;                // e.g., "claude-sonnet-4-20250514"
    modelVersion: string;         // For tracking if model changes behavior
    summaryVersion: string;       // e.g., "v1.0" - bump when prompt changes
    policyPackHash: string;       // Hash of governance rules used
    sourceEvidenceHashes: string[]; // Which docs were summarized
    createdAt: string;
    expiresAt?: string;           // Optional TTL for auto-invalidation
  };
}

// Stage definitions for explicit A/B pattern
export type WorkflowStage = 'STAGE_A_INGEST' | 'STAGE_B_WORK' | 'STAGE_C_OUTPUT';

export interface StageConfig {
  stage: WorkflowStage;
  allowRawEvidence: boolean;      // Only Stage A can have raw evidence
  requireCapsule: boolean;        // Stage B/C require capsule
  maxInputTokens: number;         // Stage-specific ceiling
}

export interface CaseCapsule {
  id: string;
  caseId: string;
  createdAt: string;
  updatedAt: string;
  workforceType: WorkforceType;

  // Case metadata
  metadata: {
    veteranId?: string;
    claimType?: string;
    contentions?: string[];
    priorityLevel?: 'routine' | 'expedited' | 'critical';
    currentStatus: string;
  };

  // Evidence index (NOT raw content)
  evidenceIndex: EvidenceIndexEntry[];

  // Agent summaries (compact)
  agentSummaries: Record<string, AgentSummary>;

  // Running totals
  tokenBudget: {
    totalInputUsed: number;
    totalOutputUsed: number;
    estimatedCost: number;
    budgetRemaining?: number;
  };

  // Key findings across all agents
  consolidatedFindings: {
    keyFacts: string[];
    riskFactors: string[];
    missingEvidence: string[];
    recommendedActions: string[];
  };
}

export interface TokenCeiling {
  maxInputTokens: number;
  maxOutputTokens: number;
  warningThreshold: number;  // Percentage (0.8 = 80%)
}

// Default ceilings by model
export const TOKEN_CEILINGS: Record<string, TokenCeiling> = {
  'claude-sonnet-4-20250514': {
    maxInputTokens: 150000,    // Leave headroom from 200k context
    maxOutputTokens: 16000,
    warningThreshold: 0.7
  },
  'claude-3-5-haiku-20241022': {
    maxInputTokens: 150000,
    maxOutputTokens: 8000,
    warningThreshold: 0.7
  },
  'claude-opus-4-20250514': {
    maxInputTokens: 150000,
    maxOutputTokens: 32000,
    warningThreshold: 0.7
  }
};

// ============================================================================
// STAGE A/B CONFIGURATION - Explicit architectural enforcement
// ============================================================================

/**
 * STAGE A (Ingest): Build capsule + evidence index
 *   - CAN have raw evidence content
 *   - Creates summaries for later stages
 *   - Agents: GATEWAY, INTAKE
 *
 * STAGE B (Work): Operate on capsule + referenced IDs
 *   - CANNOT have raw evidence (hard block!)
 *   - Must use capsule summaries
 *   - Agents: EVIDENCE, MEDICAL, LEGAL, NEXUS, RATER
 *
 * STAGE C (Output): Generate final deliverables
 *   - Uses capsule + Stage B findings
 *   - Agents: QA, REPORT, TELEMETRY
 */
export const STAGE_CONFIGS: Record<WorkflowStage, StageConfig> = {
  STAGE_A_INGEST: {
    stage: 'STAGE_A_INGEST',
    allowRawEvidence: true,       // ✓ Raw PDFs allowed
    requireCapsule: false,        // Capsule doesn't exist yet
    maxInputTokens: 180000        // Higher limit for intake
  },
  STAGE_B_WORK: {
    stage: 'STAGE_B_WORK',
    allowRawEvidence: false,      // ✗ NO raw evidence!
    requireCapsule: true,         // Must use capsule
    maxInputTokens: 80000         // Lower limit - working from summaries
  },
  STAGE_C_OUTPUT: {
    stage: 'STAGE_C_OUTPUT',
    allowRawEvidence: false,      // ✗ NO raw evidence
    requireCapsule: true,         // Must use capsule
    maxInputTokens: 100000        // Moderate for report generation
  }
};

// Map agents to their stage
import { AgentRole } from '../types';

export const AGENT_STAGE_MAP: Record<string, WorkflowStage> = {
  // ==========================================================================
  // VA CLAIMS WORKFLOW
  // ==========================================================================
  // Stage A - Ingest (can see raw docs)
  [AgentRole.GATEWAY]: 'STAGE_A_INGEST',

  // Stage B - Work (capsule only!)
  [AgentRole.EVIDENCE]: 'STAGE_B_WORK',
  [AgentRole.MEDICAL]: 'STAGE_B_WORK',
  [AgentRole.LEGAL]: 'STAGE_B_WORK',
  [AgentRole.NEXUS]: 'STAGE_B_WORK',
  [AgentRole.RATER]: 'STAGE_B_WORK',
  [AgentRole.RATER_DECISION]: 'STAGE_B_WORK',

  // Stage C - Output
  [AgentRole.QA]: 'STAGE_C_OUTPUT',
  [AgentRole.REPORT]: 'STAGE_C_OUTPUT',
  [AgentRole.TELEMETRY]: 'STAGE_C_OUTPUT',
  [AgentRole.SUPERVISOR]: 'STAGE_C_OUTPUT',

  // ==========================================================================
  // BD CAPTURE WORKFLOW
  // ==========================================================================
  // Stage A - Ingest (RFP Analyzer processes raw opportunity/RFP data)
  [AgentRole.RFP_ANALYZER]: 'STAGE_A_INGEST',

  // Stage B - Work (analysis agents work from RFP Analyzer's extracted data)
  [AgentRole.COMPLIANCE_MATRIX]: 'STAGE_B_WORK',
  [AgentRole.PAST_PERFORMANCE]: 'STAGE_B_WORK',
  [AgentRole.TECHNICAL_WRITER]: 'STAGE_B_WORK',
  [AgentRole.PRICING_ANALYST]: 'STAGE_B_WORK',

  // Stage C - Output (QA and Assembly)
  [AgentRole.PROPOSAL_QA]: 'STAGE_C_OUTPUT',
  [AgentRole.PROPOSAL_ASSEMBLER]: 'STAGE_C_OUTPUT',

  // ==========================================================================
  // GRANT WRITING WORKFLOW
  // ==========================================================================
  // Stage A - Ingest
  [AgentRole.GRANT_OPPORTUNITY_ANALYZER]: 'STAGE_A_INGEST',

  // Stage B - Work
  [AgentRole.GRANT_ELIGIBILITY_VALIDATOR]: 'STAGE_B_WORK',
  [AgentRole.GRANT_NARRATIVE_WRITER]: 'STAGE_B_WORK',
  [AgentRole.GRANT_BUDGET_DEVELOPER]: 'STAGE_B_WORK',
  [AgentRole.GRANT_COMPLIANCE_CHECKER]: 'STAGE_B_WORK',
  [AgentRole.GRANT_EVALUATOR_LENS]: 'STAGE_B_WORK',

  // Stage C - Output
  [AgentRole.GRANT_QA]: 'STAGE_C_OUTPUT',
  [AgentRole.GRANT_APPLICATION_ASSEMBLER]: 'STAGE_C_OUTPUT',

  // ==========================================================================
  // FINANCIAL AUDIT WORKFLOW
  // ==========================================================================
  // Stage A - Ingest
  [AgentRole.LEDGER_AUDITOR]: 'STAGE_A_INGEST',

  // Stage B - Work
  [AgentRole.FRAUD_DETECTOR]: 'STAGE_B_WORK',
  [AgentRole.TAX_COMPLIANCE]: 'STAGE_B_WORK',

  // Stage C - Output
  [AgentRole.FINANCIAL_QA]: 'STAGE_C_OUTPUT',
  [AgentRole.FINANCIAL_REPORT]: 'STAGE_C_OUTPUT',

  // ==========================================================================
  // CYBER IR WORKFLOW
  // ==========================================================================
  // Stage A - Ingest
  [AgentRole.KILL_CHAIN_ANALYZER]: 'STAGE_A_INGEST',

  // Stage B - Work
  [AgentRole.IOC_VALIDATOR]: 'STAGE_B_WORK',
  [AgentRole.COMPLIANCE_MAPPER]: 'STAGE_B_WORK',
  [AgentRole.CONTAINMENT_ADVISOR]: 'STAGE_B_WORK',

  // Stage C - Output
  [AgentRole.CYBER_QA]: 'STAGE_C_OUTPUT',
  [AgentRole.IR_REPORT_GENERATOR]: 'STAGE_C_OUTPUT'
};

// Current summary schema version - bump when prompts change
export const SUMMARY_SCHEMA_VERSION = 'v1.0.0';

// ============================================================================
// CACHEABLE SYSTEM COMPONENTS
// ============================================================================

/**
 * These are the "stable" parts that should be cached / reused across calls.
 * Instead of sending them every time, we generate a hash and let Claude's
 * prompt caching handle it.
 */
export const CACHEABLE_COMPONENTS = {
  // Governance boilerplate - same for all VA claims
  VA_GOVERNANCE_PREAMBLE: `
## ACE COGNITIVE GOVERNANCE FRAMEWORK
You are an agent within the Agentic Control Environment (ACE), operating under strict federal compliance governance.

### Core Principles
1. NEVER fabricate evidence or citations
2. ALL findings must trace to specific source documents
3. Apply VA benefit-of-the-doubt doctrine (38 USC § 5107(b))
4. Flag uncertainty rather than guess
5. Maintain audit trail for all conclusions

### Compliance Requirements
- 38 CFR Part 3 - Adjudication
- 38 CFR § 3.159 - VA duty to assist
- M21-1 Adjudication Procedures Manual
- Federal Rules of Evidence 702 (expert testimony standards)
`.trim(),

  // Tool registry schema - same structure always
  TOOL_REGISTRY_SCHEMA: `
## Available Actions
- EXTRACT: Pull specific data points from evidence
- CITE: Reference specific document with page/section
- FLAG: Mark issue requiring human review
- CALCULATE: Compute rating percentages, dates, etc.
- RECOMMEND: Suggest next action (must cite basis)
`.trim(),

  // Output format requirements - consistent across agents
  OUTPUT_FORMAT_REQUIREMENTS: `
## Required Output Format
Your response MUST be valid JSON with these fields:
- ace_compliance_status: "PASSED" | "PASSED_WITH_WARNINGS" | "NEEDS_REVIEW"
- confidence_score: 0-100
- key_findings: string[] (max 5 bullet points)
- cited_evidence: { document_id, page, excerpt }[]
- warnings: string[] (any concerns or uncertainties)
- next_recommended_action: string
`.trim()
};

// Generate a stable hash for caching
function generateCacheKey(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cache_${Math.abs(hash).toString(16)}`;
}

// ============================================================================
// SERVICE
// ============================================================================

class CaseCapsuleService {
  private static instance: CaseCapsuleService;
  private capsules: Map<string, CaseCapsule> = new Map();
  private cacheKeys: Map<string, string> = new Map();

  private constructor() {
    this.loadFromStorage();
    this.initializeCacheKeys();
  }

  static getInstance(): CaseCapsuleService {
    if (!CaseCapsuleService.instance) {
      CaseCapsuleService.instance = new CaseCapsuleService();
    }
    return CaseCapsuleService.instance;
  }

  private initializeCacheKeys(): void {
    // Pre-compute cache keys for stable components
    Object.entries(CACHEABLE_COMPONENTS).forEach(([key, content]) => {
      this.cacheKeys.set(key, generateCacheKey(content));
    });
  }

  // -------------------------------------------------------------------------
  // Capsule Lifecycle
  // -------------------------------------------------------------------------

  createCapsule(caseId: string, workforceType: WorkforceType): CaseCapsule {
    const capsule: CaseCapsule = {
      id: `CAPSULE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      caseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workforceType,
      metadata: {
        currentStatus: 'initialized'
      },
      evidenceIndex: [],
      agentSummaries: {},
      tokenBudget: {
        totalInputUsed: 0,
        totalOutputUsed: 0,
        estimatedCost: 0
      },
      consolidatedFindings: {
        keyFacts: [],
        riskFactors: [],
        missingEvidence: [],
        recommendedActions: []
      }
    };

    this.capsules.set(caseId, capsule);
    this.saveToStorage();
    return capsule;
  }

  getCapsule(caseId: string): CaseCapsule | null {
    return this.capsules.get(caseId) || null;
  }

  // -------------------------------------------------------------------------
  // Evidence Indexing (NOT storing raw content)
  // -------------------------------------------------------------------------

  indexEvidence(
    caseId: string,
    evidence: {
      name: string;
      type: string;
      size: number;
      content?: string;  // We'll summarize this, not store it
      pageCount?: number;
    }
  ): EvidenceIndexEntry {
    const capsule = this.capsules.get(caseId);
    if (!capsule) {
      throw new Error(`No capsule found for case ${caseId}`);
    }

    // Generate hash from content or metadata
    const hashInput = evidence.content || `${evidence.name}-${evidence.size}-${Date.now()}`;
    const hash = generateCacheKey(hashInput);

    // Create summary from content (if provided)
    let contentSummary = 'Content not analyzed yet';
    let keyEntities: string[] = [];
    let documentType = 'Unknown';

    if (evidence.content) {
      // Quick extraction of key info (this would be more sophisticated in production)
      contentSummary = evidence.content.slice(0, 200).replace(/\s+/g, ' ').trim() + '...';

      // Detect document type from name/content
      const nameLower = evidence.name.toLowerCase();
      if (nameLower.includes('smr') || nameLower.includes('service medical')) {
        documentType = 'Service Medical Record';
      } else if (nameLower.includes('c&p') || nameLower.includes('comp and pen')) {
        documentType = 'C&P Examination';
      } else if (nameLower.includes('dd214') || nameLower.includes('dd-214')) {
        documentType = 'DD-214 Discharge Document';
      } else if (nameLower.includes('rating') || nameLower.includes('decision')) {
        documentType = 'Rating Decision';
      } else if (nameLower.includes('nexus') || nameLower.includes('imo')) {
        documentType = 'Nexus Letter / IMO';
      } else if (evidence.type === 'application/pdf') {
        documentType = 'PDF Document';
      }
    }

    const entry: EvidenceIndexEntry = {
      id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: evidence.name,
      type: evidence.type,
      hash,
      size: evidence.size,
      pageCount: evidence.pageCount,
      dateExtracted: new Date().toISOString(),
      contentSummary,
      keyEntities,
      documentType
    };

    capsule.evidenceIndex.push(entry);
    capsule.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return entry;
  }

  // -------------------------------------------------------------------------
  // Agent Summary Recording
  // -------------------------------------------------------------------------

  recordAgentSummary(
    caseId: string,
    agentRole: AgentRole,
    output: any,
    tokenUsage: { input: number; output: number },
    model: string = 'claude-sonnet-4-20250514'
  ): void {
    const capsule = this.capsules.get(caseId);
    if (!capsule) return;

    // Get evidence hashes for provenance
    const sourceEvidenceHashes = capsule.evidenceIndex.map(e => e.hash);

    // Extract key findings from agent output
    const summary: AgentSummary = {
      agentRole,
      timestamp: new Date().toISOString(),
      keyFindings: this.extractKeyFindings(output),
      extractedData: this.extractCriticalFields(agentRole, output),
      confidence: output.confidence_score || output.confidence || 80,
      warnings: output.warnings || output.risk_factors || [],
      nextStepRecommendation: output.next_recommended_action || output.recommendation,
      inputTokensUsed: tokenUsage.input,
      outputTokensUsed: tokenUsage.output,

      // PROVENANCE - full audit trail
      provenance: {
        model,
        modelVersion: model.split('-').pop() || 'unknown',
        summaryVersion: SUMMARY_SCHEMA_VERSION,
        policyPackHash: capsule.id, // Could be more specific governance hash
        sourceEvidenceHashes,
        createdAt: new Date().toISOString(),
        expiresAt: undefined // No expiration by default
      }
    };

    capsule.agentSummaries[agentRole] = summary;

    // Update token budget
    capsule.tokenBudget.totalInputUsed += tokenUsage.input;
    capsule.tokenBudget.totalOutputUsed += tokenUsage.output;
    capsule.tokenBudget.estimatedCost = this.calculateCost(
      capsule.tokenBudget.totalInputUsed,
      capsule.tokenBudget.totalOutputUsed
    );

    // Consolidate findings
    this.updateConsolidatedFindings(capsule, summary);

    capsule.updatedAt = new Date().toISOString();
    this.saveToStorage();
  }

  private extractKeyFindings(output: any): string[] {
    const findings: string[] = [];

    if (output.key_findings) {
      findings.push(...(Array.isArray(output.key_findings) ? output.key_findings : [output.key_findings]));
    }
    if (output.findings) {
      findings.push(...(Array.isArray(output.findings) ? output.findings : [output.findings]));
    }
    if (output.summary) {
      findings.push(typeof output.summary === 'string' ? output.summary : JSON.stringify(output.summary).slice(0, 200));
    }

    // Limit to top 5
    return findings.slice(0, 5);
  }

  private extractCriticalFields(role: AgentRole, output: any): Record<string, any> {
    // Extract only the fields that matter for downstream agents
    const critical: Record<string, any> = {};

    switch (role) {
      case AgentRole.GATEWAY:
        critical.documentsProcessed = output.documents_processed || output.files_analyzed;
        critical.evidenceTypes = output.evidence_types || output.document_categories;
        critical.dateRange = output.service_date_range || output.date_range;
        break;

      case AgentRole.MEDICAL:
        critical.conditions = output.conditions_identified || output.medical_conditions;
        critical.treatmentHistory = output.treatment_summary;
        critical.currentStatus = output.current_diagnosis || output.current_status;
        break;

      case AgentRole.LEGAL:
        critical.applicableRegulations = output.regulations_cited || output.legal_basis;
        critical.ratingCriteria = output.rating_criteria || output.diagnostic_codes;
        critical.complianceStatus = output.compliance_status;
        break;

      case AgentRole.NEXUS:
        critical.serviceConnection = output.service_connection_analysis;
        critical.nexusStrength = output.nexus_strength || output.connection_rating;
        critical.supportingEvidence = output.supporting_citations;
        break;

      default:
        // Generic extraction
        if (output.result) critical.result = output.result;
        if (output.status) critical.status = output.status;
        if (output.recommendation) critical.recommendation = output.recommendation;
    }

    return critical;
  }

  private updateConsolidatedFindings(capsule: CaseCapsule, summary: AgentSummary): void {
    // Merge new findings, deduplicate
    summary.keyFindings.forEach(finding => {
      if (!capsule.consolidatedFindings.keyFacts.includes(finding)) {
        capsule.consolidatedFindings.keyFacts.push(finding);
      }
    });

    summary.warnings.forEach(warning => {
      if (!capsule.consolidatedFindings.riskFactors.includes(warning)) {
        capsule.consolidatedFindings.riskFactors.push(warning);
      }
    });

    // Keep lists manageable
    capsule.consolidatedFindings.keyFacts = capsule.consolidatedFindings.keyFacts.slice(-20);
    capsule.consolidatedFindings.riskFactors = capsule.consolidatedFindings.riskFactors.slice(-10);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Sonnet pricing: $3/1M input, $15/1M output
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  // -------------------------------------------------------------------------
  // Context Building (The Key Optimization)
  // -------------------------------------------------------------------------

  /**
   * Build a compact context for an agent call.
   * This is the key function - it returns a SMALL payload instead of raw evidence.
   */
  buildAgentContext(
    caseId: string,
    targetAgent: AgentRole,
    options: {
      includeEvidenceIndex?: boolean;
      includePreviousSummaries?: boolean;
      includeConsolidatedFindings?: boolean;
      maxTokenEstimate?: number;
    } = {}
  ): {
    context: string;
    estimatedTokens: number;
    cacheablePrefix: string;
    dynamicSuffix: string;
  } {
    const capsule = this.capsules.get(caseId);

    const {
      includeEvidenceIndex = true,
      includePreviousSummaries = true,
      includeConsolidatedFindings = true,
      maxTokenEstimate = 50000
    } = options;

    // CACHEABLE PREFIX - same across all calls for this agent type
    const cacheablePrefix = [
      CACHEABLE_COMPONENTS.VA_GOVERNANCE_PREAMBLE,
      CACHEABLE_COMPONENTS.TOOL_REGISTRY_SCHEMA,
      CACHEABLE_COMPONENTS.OUTPUT_FORMAT_REQUIREMENTS
    ].join('\n\n');

    // DYNAMIC SUFFIX - case-specific, but COMPACT
    const dynamicParts: string[] = [];

    if (capsule) {
      // Case metadata (tiny)
      dynamicParts.push(`## Case Context
- Case ID: ${capsule.caseId}
- Status: ${capsule.metadata.currentStatus}
- Contentions: ${capsule.metadata.contentions?.join(', ') || 'Not specified'}
- Evidence Count: ${capsule.evidenceIndex.length} documents indexed`);

      // Evidence INDEX (not content!)
      if (includeEvidenceIndex && capsule.evidenceIndex.length > 0) {
        const indexLines = capsule.evidenceIndex.map(e =>
          `  - [${e.id}] ${e.documentType}: "${e.name}" (${e.hash.slice(0, 8)})`
        );
        dynamicParts.push(`## Evidence Index\n${indexLines.join('\n')}`);
      }

      // Previous agent summaries (compact)
      if (includePreviousSummaries && Object.keys(capsule.agentSummaries).length > 0) {
        const summaryLines = Object.entries(capsule.agentSummaries).map(([role, sum]) => {
          const findings = sum.keyFindings.slice(0, 3).map(f => `    • ${f}`).join('\n');
          return `### ${role} (confidence: ${sum.confidence}%)\n${findings}`;
        });
        dynamicParts.push(`## Previous Agent Findings\n${summaryLines.join('\n\n')}`);
      }

      // Consolidated findings
      if (includeConsolidatedFindings && capsule.consolidatedFindings.keyFacts.length > 0) {
        dynamicParts.push(`## Key Facts Established
${capsule.consolidatedFindings.keyFacts.slice(0, 10).map(f => `- ${f}`).join('\n')}`);

        if (capsule.consolidatedFindings.riskFactors.length > 0) {
          dynamicParts.push(`## Risk Factors / Warnings
${capsule.consolidatedFindings.riskFactors.slice(0, 5).map(r => `- ⚠️ ${r}`).join('\n')}`);
        }
      }
    } else {
      dynamicParts.push(`## Case Context\nNo capsule found - processing new case.`);
    }

    const dynamicSuffix = dynamicParts.join('\n\n');
    const fullContext = `${cacheablePrefix}\n\n---\n\n${dynamicSuffix}`;

    // Rough token estimate (4 chars ≈ 1 token)
    const estimatedTokens = Math.ceil(fullContext.length / 4);

    return {
      context: fullContext,
      estimatedTokens,
      cacheablePrefix,
      dynamicSuffix
    };
  }

  // -------------------------------------------------------------------------
  // Token Ceiling Enforcement
  // -------------------------------------------------------------------------

  /**
   * Check if a payload exceeds the token ceiling.
   * If so, return instructions for auto-summarization.
   */
  enforceTokenCeiling(
    payload: string,
    model: string = 'claude-sonnet-4-20250514'
  ): {
    withinCeiling: boolean;
    estimatedTokens: number;
    ceiling: number;
    overageTokens: number;
    recommendation: 'proceed' | 'summarize' | 'split' | 'reject';
    message: string;
  } {
    const ceiling = TOKEN_CEILINGS[model] || TOKEN_CEILINGS['claude-sonnet-4-20250514'];
    const estimatedTokens = Math.ceil(payload.length / 4);
    const overageTokens = Math.max(0, estimatedTokens - ceiling.maxInputTokens);
    const utilizationRate = estimatedTokens / ceiling.maxInputTokens;

    let recommendation: 'proceed' | 'summarize' | 'split' | 'reject';
    let message: string;

    if (utilizationRate <= ceiling.warningThreshold) {
      recommendation = 'proceed';
      message = `Within ceiling (${Math.round(utilizationRate * 100)}% utilization)`;
    } else if (utilizationRate <= 1.0) {
      recommendation = 'proceed';
      message = `Approaching ceiling (${Math.round(utilizationRate * 100)}% utilization) - consider optimization`;
    } else if (utilizationRate <= 1.5) {
      recommendation = 'summarize';
      message = `Exceeds ceiling by ${overageTokens} tokens - auto-summarization recommended`;
    } else if (utilizationRate <= 2.0) {
      recommendation = 'split';
      message = `Significantly exceeds ceiling - split into multiple calls`;
    } else {
      recommendation = 'reject';
      message = `Payload too large (${Math.round(utilizationRate * 100)}% of ceiling) - cannot process`;
    }

    return {
      withinCeiling: estimatedTokens <= ceiling.maxInputTokens,
      estimatedTokens,
      ceiling: ceiling.maxInputTokens,
      overageTokens,
      recommendation,
      message
    };
  }

  // -------------------------------------------------------------------------
  // Stage Validation (Hard Block for Raw Evidence in Stage B)
  // -------------------------------------------------------------------------

  /**
   * Validate that a payload is appropriate for the agent's stage.
   * HARD BLOCKS raw evidence content in Stage B/C.
   */
  validateStageCompliance(
    agentRole: string,
    payload: any,
    caseId?: string
  ): {
    compliant: boolean;
    stage: WorkflowStage;
    violations: string[];
    recommendation: string;
  } {
    const stage = AGENT_STAGE_MAP[agentRole] || 'STAGE_B_WORK';
    const stageConfig = STAGE_CONFIGS[stage];
    const violations: string[] = [];

    // Check if raw evidence is present
    const hasRawEvidence = this.detectRawEvidence(payload);

    // Stage A: Raw evidence allowed
    if (stage === 'STAGE_A_INGEST') {
      return {
        compliant: true,
        stage,
        violations: [],
        recommendation: 'Proceed with intake - raw evidence allowed'
      };
    }

    // Stage B/C: Raw evidence NOT allowed!
    if (hasRawEvidence && !stageConfig.allowRawEvidence) {
      violations.push(`RAW_EVIDENCE_IN_${stage}: Raw document content detected in Stage B/C payload`);
      violations.push(`Agent ${agentRole} should use capsule summaries, not raw evidence`);
    }

    // Stage B/C: Should have capsule
    if (stageConfig.requireCapsule && caseId) {
      const capsule = this.capsules.get(caseId);
      if (!capsule) {
        violations.push(`MISSING_CAPSULE: Stage ${stage} requires a case capsule but none found`);
      } else if (Object.keys(capsule.agentSummaries).length === 0) {
        violations.push(`EMPTY_CAPSULE: Capsule exists but has no agent summaries - Stage A may not have completed`);
      }
    }

    // Check stage-specific token ceiling
    const payloadSize = JSON.stringify(payload).length;
    const estimatedTokens = Math.ceil(payloadSize / 4);
    if (estimatedTokens > stageConfig.maxInputTokens) {
      violations.push(`TOKEN_CEILING_${stage}: ${estimatedTokens} tokens exceeds stage limit of ${stageConfig.maxInputTokens}`);
    }

    const compliant = violations.length === 0;
    let recommendation: string;

    if (compliant) {
      recommendation = `Proceed - ${stage} compliance verified`;
    } else if (hasRawEvidence) {
      recommendation = `BLOCKED: Remove raw evidence content. Use caseCapsule.buildAgentContext() to get capsule-based context instead.`;
    } else {
      recommendation = `Review violations and ensure Stage A (ingest) completed before running Stage B/C agents`;
    }

    return {
      compliant,
      stage,
      violations,
      recommendation
    };
  }

  /**
   * Detect if payload contains raw evidence content (large text blocks, PDFs, etc.)
   * Uses multiple detection strategies including content hashing and pattern matching.
   */
  private detectRawEvidence(payload: any): boolean {
    if (!payload) return false;

    const detectionResults = {
      hasFileContents: false,
      hasLargeDocuments: false,
      hasPatternMatch: false,
      hasSuspiciousSize: false,
      hasEncodedContent: false,
      contentHashes: [] as string[]
    };

    // Strategy 1: Check for file contents array
    if (payload.fileContents && Array.isArray(payload.fileContents)) {
      const hasContent = payload.fileContents.some((f: any) => {
        if (f.content && f.content.length > 1000) {
          // Generate hash for tracking
          detectionResults.contentHashes.push(this.quickHash(f.content.slice(0, 500)));
          return true;
        }
        return false;
      });
      if (hasContent) detectionResults.hasFileContents = true;
    }

    // Strategy 2: Check for inline document content
    if (payload.documents || payload.evidence || payload.files) {
      const docs = payload.documents || payload.evidence || payload.files;
      if (Array.isArray(docs)) {
        const hasLargeContent = docs.some((d: any) => {
          const content = d.content || d.text || d.data || d.body;
          if (content && typeof content === 'string' && content.length > 1000) {
            detectionResults.contentHashes.push(this.quickHash(content.slice(0, 500)));
            return true;
          }
          return false;
        });
        if (hasLargeContent) detectionResults.hasLargeDocuments = true;
      }
    }

    // Strategy 3: Pattern-based detection for raw document signatures
    // NOTE: Patterns should detect ACTUAL raw content, not just type metadata
    // "type": "application/pdf" in metadata is OK, actual PDF content is not
    const stringified = JSON.stringify(payload);
    const rawDocPatterns = [
      // Document structure patterns (actual XML/document content)
      /<DOCUMENT[^>]*>[^<]+</i,          // Actual document XML content
      /contentType":\s*"text\/[^"]+",\s*"content"/,  // Content field with contentType

      // PDF magic bytes (actual PDF content, not type metadata)
      /%PDF-1\.[0-9]/,                   // Actual PDF header
      /PK\x03\x04/,                      // ZIP/DOCX magic bytes (actual content)

      // Medical record patterns (common in VA claims - large blocks of text)
      /MEDICAL\s+RECORD[:\s]{1,5}\w{100,}/i,   // Medical record with substantial content
      /DISCHARGE\s+SUMMARY[:\s]{1,5}\w{100,}/i,
      /SERVICE\s+MEDICAL\s+RECORDS.*\n.*\n.*\n/i, // Multi-line medical content

      // Large text block indicators (actual content, not just field names)
      /"content":\s*"[^"]{5000,}/,       // Content field > 5KB
      /"text":\s*"[^"]{5000,}/,          // Text field > 5KB
      /"body":\s*"[^"]{5000,}/,          // Body field > 5KB

      // Base64 encoded content (common for file data)
      /data:application\/[^;]+;base64,[A-Za-z0-9+\/=]{1000,}/, // Data URL with substantial content
      /"data":\s*"[A-Za-z0-9+\/=]{10000,}"/, // Large base64 block
    ];

    for (const pattern of rawDocPatterns) {
      if (pattern.test(stringified)) {
        detectionResults.hasPatternMatch = true;
        break;
      }
    }

    // Strategy 4: Size-based detection with entropy analysis
    if (stringified.length > 50000) { // >50KB payload is suspicious for Stage B
      detectionResults.hasSuspiciousSize = true;

      // Check entropy - raw docs have more uniform entropy than structured JSON
      const entropy = this.calculateEntropy(stringified.slice(0, 10000));
      if (entropy > 4.5) { // Higher entropy suggests raw content, not structured data
        detectionResults.hasEncodedContent = true;
      }
    }

    // Strategy 5: Check nested objects for hidden content
    const nestedLargeContent = this.findNestedLargeContent(payload, 0, 5);
    if (nestedLargeContent) {
      detectionResults.hasLargeDocuments = true;
    }

    // Combine detection results
    const detected =
      detectionResults.hasFileContents ||
      detectionResults.hasLargeDocuments ||
      detectionResults.hasPatternMatch ||
      (detectionResults.hasSuspiciousSize && detectionResults.hasEncodedContent);

    // Log detection for audit
    if (detected) {
      console.warn('[CaseCapsule] Raw evidence detected:', {
        ...detectionResults,
        payloadSize: stringified.length
      });
    }

    return detected;
  }

  /**
   * Quick hash for content fingerprinting (not cryptographic)
   */
  private quickHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `qh_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Calculate Shannon entropy of a string (higher = more random/compressed)
   */
  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Recursively search for large content blocks in nested objects
   */
  private findNestedLargeContent(obj: any, depth: number, maxDepth: number): boolean {
    if (depth > maxDepth || obj === null || obj === undefined) return false;

    if (typeof obj === 'string' && obj.length > 3000) {
      return true;
    }

    if (Array.isArray(obj)) {
      return obj.some(item => this.findNestedLargeContent(item, depth + 1, maxDepth));
    }

    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        // Skip known safe fields
        if (['id', 'hash', 'timestamp', 'type', 'name'].includes(key)) continue;

        if (this.findNestedLargeContent(obj[key], depth + 1, maxDepth)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get pre-flight estimate for a workflow run
   */
  getPreFlightEstimate(
    caseId: string,
    agentRoles: string[]
  ): {
    totalEstimatedTokens: number;
    perAgentEstimates: Record<string, number>;
    stageBreakdown: Record<WorkflowStage, number>;
    warnings: string[];
    canProceed: boolean;
  } {
    const capsule = this.capsules.get(caseId);
    const perAgentEstimates: Record<string, number> = {};
    const stageBreakdown: Record<WorkflowStage, number> = {
      'STAGE_A_INGEST': 0,
      'STAGE_B_WORK': 0,
      'STAGE_C_OUTPUT': 0
    };
    const warnings: string[] = [];

    let totalEstimatedTokens = 0;

    for (const role of agentRoles) {
      const stage = AGENT_STAGE_MAP[role] || 'STAGE_B_WORK';
      const stageConfig = STAGE_CONFIGS[stage];

      // Estimate based on stage
      let estimate: number;
      if (stage === 'STAGE_A_INGEST') {
        // Stage A will have raw evidence - estimate based on file sizes
        estimate = 50000; // Placeholder - would calculate from actual files
      } else {
        // Stage B/C use capsule context
        const context = this.buildAgentContext(caseId, role as AgentRole);
        estimate = context.estimatedTokens;
      }

      perAgentEstimates[role] = estimate;
      stageBreakdown[stage] += estimate;
      totalEstimatedTokens += estimate;

      // Check against stage ceiling
      if (estimate > stageConfig.maxInputTokens) {
        warnings.push(`${role}: Estimated ${estimate} tokens exceeds ${stage} ceiling of ${stageConfig.maxInputTokens}`);
      }
    }

    // Overall warnings
    if (!capsule && agentRoles.some(r => AGENT_STAGE_MAP[r] !== 'STAGE_A_INGEST')) {
      warnings.push('No case capsule found - Stage B/C agents may fail');
    }

    return {
      totalEstimatedTokens,
      perAgentEstimates,
      stageBreakdown,
      warnings,
      canProceed: warnings.length === 0
    };
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.capsules);
      localStorage.setItem('ace_case_capsules', JSON.stringify(data));
    } catch (e) {
      console.warn('[CaseCapsule] Failed to save:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('ace_case_capsules');
      if (data) {
        const parsed = JSON.parse(data);
        this.capsules = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.warn('[CaseCapsule] Failed to load:', e);
    }
  }

  clearCapsule(caseId: string): void {
    this.capsules.delete(caseId);
    this.saveToStorage();
  }

  clearAllCapsules(): void {
    this.capsules.clear();
    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  getStats(): {
    totalCapsules: number;
    totalTokensUsed: number;
    totalCost: number;
    averageTokensPerCase: number;
  } {
    let totalTokens = 0;
    let totalCost = 0;

    this.capsules.forEach(capsule => {
      totalTokens += capsule.tokenBudget.totalInputUsed + capsule.tokenBudget.totalOutputUsed;
      totalCost += capsule.tokenBudget.estimatedCost;
    });

    return {
      totalCapsules: this.capsules.size,
      totalTokensUsed: totalTokens,
      totalCost,
      averageTokensPerCase: this.capsules.size > 0 ? totalTokens / this.capsules.size : 0
    };
  }
}

// Export singleton
export const caseCapsule = CaseCapsuleService.getInstance();

// Export for type usage
export type { CaseCapsuleService };
