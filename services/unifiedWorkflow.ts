/**
 * Unified Workflow Orchestrator
 *
 * Chains Business Agents → ECV Pipeline → Business Agents
 *
 * FLOW:
 * 1. CLIENT INTAKE (Business Layer)
 *    - Intake Agent creates case, gathers info
 *    - Scheduler sets deadlines
 *
 * 2. DOCUMENT ANALYSIS (ECV Pipeline)
 *    - Gateway inventories documents
 *    - Timeline builds chronology
 *    - Evidence extracts forensic details + Caluza elements
 *    - Rater analyzes for CUE/Retro opportunities (DISCOVERED, not templated)
 *    - QA validates findings
 *
 * 3. STRATEGY & DELIVERY (Business Layer)
 *    - Nexus Agent finalizes connection strategy
 *    - Ratings Agent projects ratings
 *    - Appeals Agent handles denials (if applicable)
 *    - Evidence Agent packages with integrity hashes
 *    - Comms Agent delivers to client
 *
 * CUE DISCOVERY:
 * - CUE findings are DISCOVERED during analysis, not forced
 * - When found, they're flagged and added to a CUE Findings Registry
 * - Only surfaced in reports when actually found
 */

import { AgentRole, MAIClassification, WorkforceType } from '../types';
import {
  BUSINESS_AGENTS,
  BusinessAgent,
  WorkflowTemplate,
  WorkflowStep
} from './businessAgents';
import { CORE_PRINCIPLES, FEDERAL_CIRCUIT_CASES, CUE_ERROR_TYPES } from '../knowledge';

// ============================================================================
// WORKFLOW PHASES
// ============================================================================

export enum WorkflowPhase {
  INTAKE = 'INTAKE',
  DOCUMENT_ANALYSIS = 'DOCUMENT_ANALYSIS',
  STRATEGY = 'STRATEGY',
  DELIVERY = 'DELIVERY',
  COMPLETE = 'COMPLETE'
}

export enum WorkflowStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_INPUT = 'AWAITING_INPUT',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

// ============================================================================
// CUE DISCOVERY SYSTEM
// ============================================================================

export interface CUEFinding {
  id: string;
  discoveredAt: string;           // Timestamp
  discoveredBy: string;           // Agent that found it
  discoveredDuring: string;       // Which workflow step

  // The finding itself
  priorDecisionDate: string;
  priorDecisionOutcome: string;
  conditionAffected: string;

  // Error classification
  errorType: 'EVIDENCE_OVERLOOKED' | 'LAW_MISAPPLIED' | 'BENEFIT_OF_DOUBT_FAILURE' |
             'INADEQUATE_EXAM' | 'DUTY_TO_ASSIST' | 'THEORY_NOT_CONSIDERED' |
             'LAY_EVIDENCE_REJECTED' | 'CONTINUITY_IGNORED';

  // Russell v. Principi elements
  russellAnalysis: {
    correctFactsNotBefore: string;      // What facts were missing/ignored
    errorUndebatable: string;            // Why reasonable minds can't differ
    outcomeManifestlyDifferent: string;  // How outcome would change
  };

  // Supporting evidence
  evidenceCitations: string[];           // Specific document/page citations
  legalBasis: string[];                  // Case law and CFR citations

  // Assessment
  viability: 'STRONG' | 'MODERATE' | 'WORTH_PURSUING' | 'WEAK';
  potentialBackPay: {
    estimatedMonths: number;
    basis: string;
  };

  // Action
  recommendedAction: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CUERegistry {
  caseId: string;
  findings: CUEFinding[];
  lastUpdated: string;
  totalPotentialBackPayMonths: number;
  strongFindings: number;
  moderateFindings: number;
}

// Initialize empty CUE registry for a case
export function createCUERegistry(caseId: string): CUERegistry {
  return {
    caseId,
    findings: [],
    lastUpdated: new Date().toISOString(),
    totalPotentialBackPayMonths: 0,
    strongFindings: 0,
    moderateFindings: 0
  };
}

// Add a CUE finding (called by agents when they discover one)
export function addCUEFinding(registry: CUERegistry, finding: Omit<CUEFinding, 'id'>): CUERegistry {
  const newFinding: CUEFinding = {
    ...finding,
    id: `CUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  const updatedFindings = [...registry.findings, newFinding];

  return {
    ...registry,
    findings: updatedFindings,
    lastUpdated: new Date().toISOString(),
    totalPotentialBackPayMonths: updatedFindings.reduce(
      (sum, f) => sum + (f.potentialBackPay?.estimatedMonths || 0), 0
    ),
    strongFindings: updatedFindings.filter(f => f.viability === 'STRONG').length,
    moderateFindings: updatedFindings.filter(f => f.viability === 'MODERATE').length
  };
}

// ============================================================================
// RETRO EFFECTIVE DATE DISCOVERY
// ============================================================================

export interface RetroFinding {
  id: string;
  discoveredAt: string;
  discoveredBy: string;

  conditionAffected: string;
  currentEffectiveDate: string;
  proposedEffectiveDate: string;

  basis: 'INFORMAL_CLAIM' | 'INTENT_TO_FILE' | 'DATE_ENTITLEMENT_AROSE' |
         'LIBERALIZING_LAW' | 'CUE_REVISION' | 'ONE_YEAR_INCREASE';

  legalBasis: string;              // 38 CFR 3.400, 3.155, 3.114, etc.
  supportingEvidence: string[];    // Document citations
  explanation: string;

  estimatedMonthsRetro: number;
  viability: 'STRONG' | 'MODERATE' | 'WORTH_PURSUING';
}

export interface RetroRegistry {
  caseId: string;
  findings: RetroFinding[];
  lastUpdated: string;
  totalPotentialMonths: number;
}

// ============================================================================
// UNIFIED WORKFLOW STATE
// ============================================================================

export interface UnifiedWorkflowState {
  id: string;
  caseId: string;
  claimType: string;

  // Current status
  phase: WorkflowPhase;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;

  // Progress tracking
  stepsCompleted: CompletedStep[];
  currentAgent: string | null;

  // Discovery registries (findings accumulate during workflow)
  cueRegistry: CUERegistry;
  retroRegistry: RetroRegistry;

  // Outputs from each phase
  intakeOutput?: IntakeOutput;
  analysisOutput?: AnalysisOutput;
  strategyOutput?: StrategyOutput;

  // Timestamps
  startedAt: string;
  lastUpdated: string;
  completedAt?: string;

  // Error handling
  errors: WorkflowError[];
  requiresHumanIntervention: boolean;
  interventionReason?: string;
}

export interface CompletedStep {
  stepNumber: number;
  phase: WorkflowPhase;
  agentId: string;
  agentName: string;
  task: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  output: any;
  cueFindings: number;      // How many CUE findings discovered in this step
  retroFindings: number;    // How many retro findings discovered
}

export interface WorkflowError {
  step: number;
  agentId: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
}

// ============================================================================
// PHASE OUTPUTS
// ============================================================================

export interface IntakeOutput {
  caseCreated: boolean;
  caseId: string;
  veteranInfo: {
    name: string;
    lastFour: string;
    branch: string;
    serviceStart: string;
    serviceEnd: string;
    combatVeteran: boolean;
  };
  claimsIdentified: {
    condition: string;
    claimType: 'DIRECT' | 'SECONDARY' | 'INCREASE' | 'TDIU' | 'CUE' | 'APPEAL';
    primaryCondition?: string;  // For secondary claims
    priorDecision?: string;     // For appeals/CUE
  }[];
  documentsReceived: {
    name: string;
    type: string;
    pages: number;
  }[];
  deadlinesSet: {
    type: string;
    date: string;
    daysRemaining: number;
  }[];
  priorityLevel: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  priorityReason: string;
}

export interface AnalysisOutput {
  // Document inventory
  documentInventory: {
    totalDocuments: number;
    serviceEra: number;
    postService: number;
    nexusOpinions: number;
    layStatements: number;
  };

  // Timeline
  timeline: {
    serviceEntry: string;
    serviceSeparation: string;
    keyEvents: {
      date: string;
      event: string;
      source: string;
      significance: string;
    }[];
    gaps: {
      from: string;
      to: string;
      bridgingEvidence?: string;
    }[];
  };

  // Caluza/Shedden element analysis per condition
  conditionAnalysis: {
    condition: string;
    currentDisability: {
      established: boolean;
      diagnosis: string;
      source: string;
      strength: 'STRONG' | 'ADEQUATE' | 'WEAK';
    };
    inServiceEvent: {
      established: boolean;
      event: string;
      source: string;
      strength: 'STRONG' | 'ADEQUATE' | 'WEAK';
    };
    nexus: {
      established: boolean;
      type: 'MEDICAL_OPINION' | 'CONTINUITY' | 'PRESUMPTIVE' | 'NONE';
      source?: string;
      strength: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'MISSING';
    };
    recommendedPathway: 'DIRECT' | 'SECONDARY' | 'PRESUMPTIVE' | 'AGGRAVATION';
    overallStrength: 'EXCEPTIONALLY_HIGH' | 'HIGH' | 'MODERATE_HIGH' | 'MODERATE' | 'DEVELOPING';
  }[];

  // CUE/Retro discovered during analysis (reference to registries)
  cueDiscoveredCount: number;
  retroDiscoveredCount: number;

  // QA validation
  qaValidation: {
    passed: boolean;
    issues: string[];
    recommendations: string[];
  };
}

export interface StrategyOutput {
  // Per-condition strategy
  conditionStrategies: {
    condition: string;
    recommendedApproach: string;
    connectionType: 'DIRECT' | 'SECONDARY' | 'PRESUMPTIVE' | 'AGGRAVATION';
    primaryCondition?: string;  // For secondary
    evidenceNeeded: string[];
    nexusLetterGuidance?: string;
    estimatedRating: {
      minimum: number;
      likely: number;
      maximum: number;
    };
    ratingCriteria: string;
    diagnosticCode: string;
  }[];

  // Combined rating projection
  combinedRatingProjection: {
    current: number;
    projected: number;
    tdiumEligible: boolean;
    bilateralFactor: boolean;
  };

  // CUE strategy (only if findings exist)
  cueStrategy?: {
    totalFindings: number;
    strongFindings: CUEFinding[];
    recommendedActions: string[];
    potentialBackPayMonths: number;
    priorityOrder: string[];
  };

  // Retro strategy (only if findings exist)
  retroStrategy?: {
    totalFindings: number;
    findings: RetroFinding[];
    recommendedActions: string[];
    potentialMonthsRetro: number;
  };

  // Appeal strategy (if applicable)
  appealStrategy?: {
    recommendedLane: 'SUPPLEMENTAL' | 'HLR' | 'BOARD';
    rationale: string;
    arguments: string[];
    evidenceNeeded: string[];
    timeline: string;
  };

  // Overall recommendations
  prioritizedActions: {
    priority: number;
    action: string;
    rationale: string;
    deadline?: string;
  }[];
}

// ============================================================================
// UNIFIED WORKFLOW TEMPLATES
// ============================================================================

export interface UnifiedWorkflowStep {
  order: number;
  phase: WorkflowPhase;
  layer: 'BUSINESS' | 'ECV';
  agentId: string;           // Business agent ID or ECV role
  agentName: string;
  task: string;
  inputs: string[];
  outputs: string[];
  cueDiscoveryEnabled: boolean;    // Can this step discover CUE?
  retroDiscoveryEnabled: boolean;  // Can this step discover retro?
  requiresApproval: boolean;
  estimatedMinutes: number;
}

export interface UnifiedWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  claimTypes: string[];      // What claim types this applies to
  estimatedTime: string;
  steps: UnifiedWorkflowStep[];
}

// ============================================================================
// STANDARD UNIFIED WORKFLOW
// ============================================================================

export const UNIFIED_CLAIM_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'unified-claim-workflow',
  name: 'Unified Claim Processing',
  description: 'Complete end-to-end workflow: Intake → Document Analysis → Strategy → Delivery',
  claimTypes: ['NEW_CLAIM', 'SECONDARY', 'INCREASE', 'APPEAL'],
  estimatedTime: '3-6 hours',
  steps: [
    // ========== PHASE 1: INTAKE (Business Layer) ==========
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Create case, gather veteran info, identify claim types, receive documents',
      inputs: ['Veteran contact', 'Service history', 'Conditions claimed', 'Documents uploaded'],
      outputs: ['Case created', 'Claims identified', 'Documents cataloged', 'Priority set'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 20
    },
    {
      order: 2,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'scheduler-agent',
      agentName: 'Deadline Manager',
      task: 'Set critical deadlines, check for approaching appeal windows',
      inputs: ['Case details', 'Prior decision dates'],
      outputs: ['Deadlines set', 'Timeline created', 'Urgent flags if applicable'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 10
    },

    // ========== PHASE 2: DOCUMENT ANALYSIS (ECV Pipeline) ==========
    {
      order: 3,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'GATEWAY',
      agentName: 'Document Intake Gateway',
      task: 'Inventory all documents, identify types, note page counts and date ranges',
      inputs: ['All uploaded documents'],
      outputs: ['Document inventory', 'Evidence categories', 'Notable flags'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 15
    },
    {
      order: 4,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'TIMELINE',
      agentName: 'Chronological Evidence Mapper',
      task: 'Build forensic timeline with exact dates, sources, and page citations',
      inputs: ['Document inventory', 'Service history'],
      outputs: ['Chronological timeline', 'Gap analysis', 'Continuity assessment (Walker)'],
      cueDiscoveryEnabled: true,  // Can find overlooked dates/evidence
      retroDiscoveryEnabled: true, // Can find earlier claim dates
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 5,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'Forensic Evidence Extractor',
      task: 'Extract exact quotes, map to Caluza/Shedden elements, assess probative value',
      inputs: ['All documents', 'Timeline'],
      outputs: ['Evidence by element', 'Exact quotes with citations', 'Strength assessment'],
      cueDiscoveryEnabled: true,  // Can find overlooked evidence
      retroDiscoveryEnabled: true, // Can find earlier entitlement evidence
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 6,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'RATER_INITIAL',
      agentName: 'Evidence Synthesis & CUE Analyst',
      task: 'Synthesize evidence, assess grant supportability, DISCOVER any CUE/Retro opportunities',
      inputs: ['Evidence extraction', 'Prior decisions if any', 'Timeline'],
      outputs: ['Grant assessment', 'CUE findings (if any)', 'Retro findings (if any)', 'Nexus assessment'],
      cueDiscoveryEnabled: true,  // PRIMARY CUE DISCOVERY AGENT
      retroDiscoveryEnabled: true, // PRIMARY RETRO DISCOVERY AGENT
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 7,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'QA',
      agentName: 'Quality Assurance',
      task: 'Validate all findings, check citations, verify legal standards applied correctly',
      inputs: ['All analysis outputs', 'CUE/Retro findings'],
      outputs: ['QA validation', 'Issues flagged', 'Corrections needed'],
      cueDiscoveryEnabled: true,  // Can catch missed CUE during review
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 20
    },

    // ========== PHASE 3: STRATEGY (Business Layer) ==========
    {
      order: 8,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'nexus-agent',
      agentName: 'Nexus Strategist',
      task: 'Finalize service connection strategy based on analysis, recommend pathways',
      inputs: ['Evidence analysis', 'Caluza element status', 'Timeline'],
      outputs: ['Connection strategy per condition', 'Recommended pathways', 'Evidence gaps'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 9,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'ratings-agent',
      agentName: 'Ratings Analyst',
      task: 'Project ratings based on symptoms and criteria, assess TDIU eligibility',
      inputs: ['Conditions', 'Symptoms documented', 'Diagnostic codes'],
      outputs: ['Rating projections', 'Combined rating estimate', 'TDIU assessment'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 20
    },
    {
      order: 10,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'appeals-agent',
      agentName: 'Appeals Specialist',
      task: 'Develop CUE strategy (if findings exist), appeal strategy (if applicable)',
      inputs: ['CUE registry', 'Retro registry', 'Prior decisions'],
      outputs: ['CUE motion strategy', 'Appeal lane recommendation', 'Argument framework'],
      cueDiscoveryEnabled: false,  // Uses findings, doesn't discover new ones
      retroDiscoveryEnabled: false,
      requiresApproval: true,      // Strategy needs approval
      estimatedMinutes: 30
    },

    // ========== PHASE 4: DELIVERY (Business Layer) ==========
    {
      order: 11,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'Evidence Coordinator',
      task: 'Package all outputs with integrity hashes, create evidence index',
      inputs: ['All analysis', 'All strategies', 'CUE/Retro findings'],
      outputs: ['Evidence package', 'Package hash', 'Evidence index'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 20
    },
    {
      order: 12,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'comms-agent',
      agentName: 'Communications Manager',
      task: 'Draft delivery email, explain findings, outline next steps',
      inputs: ['Evidence package', 'Strategy summary', 'CUE/Retro highlights'],
      outputs: ['Delivery email', 'Summary document', 'Action items'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 15
    }
  ]
};

// ============================================================================
// CUE-SPECIFIC WORKFLOW (When CUE is the primary focus)
// ============================================================================

export const CUE_FOCUSED_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'cue-focused-workflow',
  name: 'CUE Analysis Workflow',
  description: 'Deep dive into prior decisions to identify Clear and Unmistakable Errors',
  claimTypes: ['CUE', 'APPEAL'],
  estimatedTime: '4-6 hours',
  steps: [
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Gather prior decision letters, original claim files, all evidence from prior decisions',
      inputs: ['Prior decision letters', 'Original evidence', 'Claims file'],
      outputs: ['Case created', 'Prior decisions cataloged', 'Original evidence identified'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 2,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'TIMELINE',
      agentName: 'Chronological Mapper',
      task: 'Build timeline of decisions, claims, and evidence - identify what existed at each decision point',
      inputs: ['All prior decisions', 'All prior evidence'],
      outputs: ['Decision timeline', 'Evidence-at-decision mapping'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 3,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'Evidence Extractor',
      task: 'Extract EXACTLY what evidence was in the record at time of each decision',
      inputs: ['Timeline', 'All documents'],
      outputs: ['Evidence inventory per decision', 'Favorable evidence identification'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 4,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'RATER_INITIAL',
      agentName: 'CUE Hunter',
      task: 'Apply Russell v. Principi test to each prior decision - find undebatable errors',
      inputs: ['Evidence at decision', 'Decision rationale', 'Applicable law at time'],
      outputs: ['CUE findings with Russell analysis', 'Viability assessment', 'Back pay calculation'],
      cueDiscoveryEnabled: true,  // This is the PRIMARY purpose
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 60
    },
    {
      order: 5,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'QA',
      agentName: 'CUE Validation',
      task: 'Validate CUE findings against Fugo limitations, ensure errors are truly undebatable',
      inputs: ['CUE findings'],
      outputs: ['Validated CUE findings', 'Rejected findings with reasons', 'Strength ranking'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 6,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'appeals-agent',
      agentName: 'CUE Strategist',
      task: 'Develop CUE motion strategy, prioritize findings, draft argument framework',
      inputs: ['Validated CUE findings', 'Prior decisions'],
      outputs: ['CUE motion strategy', 'Argument outline', 'Evidence list', 'Priority order'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 45
    },
    {
      order: 7,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'CUE Package Builder',
      task: 'Package CUE motion with supporting evidence, organize by finding',
      inputs: ['CUE strategy', 'Supporting evidence', 'Legal citations'],
      outputs: ['CUE motion package', 'Evidence exhibits', 'Package hash'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 30
    },
    {
      order: 8,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'comms-agent',
      agentName: 'Communications',
      task: 'Explain CUE findings to client, outline potential back pay, next steps',
      inputs: ['CUE package', 'Strategy summary', 'Back pay estimate'],
      outputs: ['Client explanation email', 'CUE summary document'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 20
    }
  ]
};

// ============================================================================
// WORKFLOW ORCHESTRATION FUNCTIONS
// ============================================================================

export function initializeWorkflow(
  caseId: string,
  claimType: string,
  template: UnifiedWorkflowTemplate = UNIFIED_CLAIM_WORKFLOW
): UnifiedWorkflowState {
  return {
    id: `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    caseId,
    claimType,
    phase: WorkflowPhase.INTAKE,
    status: WorkflowStatus.NOT_STARTED,
    currentStep: 0,
    totalSteps: template.steps.length,
    stepsCompleted: [],
    currentAgent: null,
    cueRegistry: createCUERegistry(caseId),
    retroRegistry: {
      caseId,
      findings: [],
      lastUpdated: new Date().toISOString(),
      totalPotentialMonths: 0
    },
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    errors: [],
    requiresHumanIntervention: false
  };
}

export function getNextStep(
  state: UnifiedWorkflowState,
  template: UnifiedWorkflowTemplate
): UnifiedWorkflowStep | null {
  const nextStepIndex = state.currentStep;
  if (nextStepIndex >= template.steps.length) {
    return null;
  }
  return template.steps[nextStepIndex];
}

export function completeStep(
  state: UnifiedWorkflowState,
  step: UnifiedWorkflowStep,
  output: any,
  cueFindings: number = 0,
  retroFindings: number = 0
): UnifiedWorkflowState {
  const completedStep: CompletedStep = {
    stepNumber: step.order,
    phase: step.phase,
    agentId: step.agentId,
    agentName: step.agentName,
    task: step.task,
    startedAt: state.lastUpdated,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(state.lastUpdated).getTime(),
    output,
    cueFindings,
    retroFindings
  };

  const newPhase = state.currentStep + 1 < 3 ? WorkflowPhase.INTAKE :
                   state.currentStep + 1 < 8 ? WorkflowPhase.DOCUMENT_ANALYSIS :
                   state.currentStep + 1 < 11 ? WorkflowPhase.STRATEGY :
                   WorkflowPhase.DELIVERY;

  return {
    ...state,
    currentStep: state.currentStep + 1,
    phase: newPhase,
    status: state.currentStep + 1 >= state.totalSteps ?
            WorkflowStatus.COMPLETE : WorkflowStatus.IN_PROGRESS,
    stepsCompleted: [...state.stepsCompleted, completedStep],
    lastUpdated: new Date().toISOString(),
    completedAt: state.currentStep + 1 >= state.totalSteps ?
                 new Date().toISOString() : undefined
  };
}

// ============================================================================
// CUE DISCOVERY PROMPTS (Injected into agents during CUE-enabled steps)
// ============================================================================

export const CUE_DISCOVERY_PROMPT = `
## CUE DISCOVERY MODE ACTIVE

As you analyze this case, ACTIVELY LOOK FOR Clear and Unmistakable Errors in any prior VA decisions.

### What is CUE? (Russell v. Principi, 3 Vet. App. 310)
CUE exists when:
1. The correct facts, as known at the time, were NOT before the adjudicator
2. The statutory/regulatory provisions were INCORRECTLY applied
3. The error is UNDEBATABLE - reasonable minds could not differ
4. The outcome would be MANIFESTLY DIFFERENT but for the error

### Red Flags to Look For:
- VA failed to apply benefit of the doubt (Gilbert violation)
- Favorable evidence was in the record but not discussed
- Wrong diagnostic code applied
- Secondary connection not considered (Hickson violation)
- Lay evidence rejected solely for lacking medical records (Buchanan violation)
- Continuity of symptoms for chronic disease ignored (Walker pathway missed)
- Inadequate C&P exam relied upon (Barr violation)
- Medical opinion lacked rationale but was accepted (Nieves-Rodriguez)

### What is NOT CUE (Fugo v. Brown):
- Disagreement with how evidence was weighed
- A change in diagnosis
- Duty to assist failures (usually)
- New evidence that wasn't in the record

### When You Find a Potential CUE:
Report it with:
1. Prior decision date and outcome
2. Specific error identified
3. Evidence that was overlooked or law misapplied
4. Why error is undebatable
5. How outcome would differ
6. Estimated back pay months

DO NOT force CUE findings. Only report when you find genuine undebatable errors.
`;

export const RETRO_DISCOVERY_PROMPT = `
## RETROACTIVE EFFECTIVE DATE DISCOVERY MODE ACTIVE

Look for opportunities to get an EARLIER effective date for this veteran.

### Effective Date Rules (38 CFR 3.400):
- General rule: Later of (1) date of claim or (2) date entitlement arose
- Within 1 year of discharge: Day after discharge
- Increased rating: Up to 1 year prior if facts ascertainable

### What to Look For:
1. **Informal Claims** (pre-AMA): Any communication showing intent to file
   - Letters mentioning conditions
   - Treatment records expressing desire to claim
   - Statements to VA personnel

2. **Intent to File**: ITF submissions that predate formal claim

3. **Earlier Entitlement**: Medical evidence showing condition existed before claim date

4. **Liberalizing Laws**: PACT Act, new presumptives - check if veteran qualifies for earlier date

5. **CUE Revision**: If prior denial was CUE, effective date goes back to original claim

### When You Find a Retro Opportunity:
Report:
1. Current effective date
2. Proposed earlier date
3. Legal basis (38 CFR cite)
4. Supporting evidence
5. Estimated months of retro
`;

// ============================================================================
// CLAIM-TYPE SPECIFIC WORKFLOWS
// ============================================================================

export const SECONDARY_CLAIM_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'secondary-claim-workflow',
  name: 'Secondary Service Connection',
  description: 'Process for claims secondary to already service-connected conditions',
  claimTypes: ['SECONDARY'],
  estimatedTime: '3-5 hours',
  steps: [
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Identify primary SC condition(s), document secondary condition claimed, verify primary is service-connected',
      inputs: ['VA rating decision showing primary SC', 'Medical evidence of secondary condition'],
      outputs: ['Case created', 'Primary SC verified', 'Secondary identified', 'Causation theory noted'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 20
    },
    {
      order: 2,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'Evidence Extractor',
      task: 'Extract medical evidence showing CAUSATION or AGGRAVATION link between primary and secondary',
      inputs: ['All medical records', 'Primary condition records', 'Secondary condition records'],
      outputs: ['Causation evidence', 'Aggravation evidence (Allen v. Brown)', 'Medical nexus language'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 3,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'RATER_INITIAL',
      agentName: 'Secondary Connection Analyst',
      task: 'Apply 38 CFR 3.310 analysis - proximate cause OR aggravation beyond natural progression',
      inputs: ['Primary condition details', 'Secondary evidence', 'Medical literature'],
      outputs: ['3.310 analysis', 'Causation OR aggravation pathway', 'Medical nexus assessment'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 40
    },
    {
      order: 4,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'nexus-agent',
      agentName: 'Nexus Strategist',
      task: 'Develop secondary nexus strategy with medical rationale for causation/aggravation',
      inputs: ['3.310 analysis', 'Medical evidence'],
      outputs: ['Secondary nexus strategy', 'Nexus letter guidance', 'Medical literature to cite'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 5,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'Evidence Coordinator',
      task: 'Package secondary claim evidence with 38 CFR 3.310 framework',
      inputs: ['Strategy', 'Medical evidence', 'Nexus materials'],
      outputs: ['Secondary claim package', 'Evidence index citing 3.310'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 25
    }
  ]
};

export const PTSD_CLAIM_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'ptsd-claim-workflow',
  name: 'PTSD/Mental Health Claim',
  description: 'Specialized workflow for PTSD and mental health conditions',
  claimTypes: ['PTSD', 'MENTAL_HEALTH'],
  estimatedTime: '4-6 hours',
  steps: [
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Identify stressor type (combat, MST, fear of hostile activity, other), gather service history',
      inputs: ['DD214', 'Service records', 'Stressor statement'],
      outputs: ['Stressor type identified', 'Combat status verified', 'MST markers noted if applicable'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 2,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'TIMELINE',
      agentName: 'Stressor Timeline Mapper',
      task: 'Build timeline of stressor events, treatment history, symptom progression',
      inputs: ['Stressor statements', 'Service records', 'Mental health treatment records'],
      outputs: ['Stressor timeline', 'Treatment history', 'Symptom progression'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 40
    },
    {
      order: 3,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'PTSD Evidence Extractor',
      task: 'Extract DSM-5 criteria evidence, stressor corroboration, nexus opinions',
      inputs: ['Mental health records', 'C&P exams', 'Lay statements'],
      outputs: ['DSM-5 criteria mapping', 'Stressor verification', 'Nexus evidence', 'GAF/functional scores'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 4,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'RATER_INITIAL',
      agentName: 'PTSD Analyst',
      task: 'Apply 38 CFR 3.304(f) analysis, assess stressor verification requirements based on type',
      inputs: ['Stressor evidence', 'Service records', 'Diagnosis'],
      outputs: ['3.304(f) analysis', 'Stressor verification status', 'Rating criteria analysis (4.130)'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 45
    },
    {
      order: 5,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'ratings-agent',
      agentName: 'Mental Health Ratings Analyst',
      task: 'Analyze symptoms against 38 CFR 4.130 General Rating Formula, project rating',
      inputs: ['Mental health evidence', 'Functional impairment evidence', 'Occupational impact'],
      outputs: ['Rating projection (0-100%)', 'Symptom-to-criteria mapping', 'TDIU consideration'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 30
    },
    {
      order: 6,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'Evidence Coordinator',
      task: 'Package PTSD claim with stressor documentation, DBQ recommendations',
      inputs: ['All analysis', 'Stressor evidence', 'Treatment records'],
      outputs: ['PTSD evidence package', 'Stressor corroboration summary'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 25
    }
  ]
};

export const TDIU_CLAIM_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'tdiu-claim-workflow',
  name: 'TDIU Claim',
  description: 'Total Disability based on Individual Unemployability workflow',
  claimTypes: ['TDIU'],
  estimatedTime: '3-5 hours',
  steps: [
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Verify schedular eligibility (60%/70% threshold), gather employment history',
      inputs: ['Current rating decision', 'Employment history', 'VA Form 21-8940'],
      outputs: ['Schedular eligibility verified', 'Employment history documented', 'Last work date'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 25
    },
    {
      order: 2,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'TDIU Evidence Extractor',
      task: 'Extract evidence of unemployability - functional limitations, work restrictions, inability to maintain employment',
      inputs: ['Medical records', 'Employment records', 'Lay statements', 'Vocational assessments'],
      outputs: ['Functional limitations', 'Work restrictions documented', 'Employment gaps'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 40
    },
    {
      order: 3,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'RATER_INITIAL',
      agentName: 'TDIU Analyst',
      task: 'Apply 38 CFR 4.16(a) and (b) analysis - can veteran secure/follow substantially gainful employment?',
      inputs: ['Current ratings', 'Functional evidence', 'Employment history'],
      outputs: ['4.16 analysis', 'Schedular vs extraschedular pathway', 'Marginal employment assessment'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,
      requiresApproval: false,
      estimatedMinutes: 40
    },
    {
      order: 4,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'ratings-agent',
      agentName: 'TDIU Strategist',
      task: 'Develop TDIU strategy - schedular, extraschedular, or rating increase first',
      inputs: ['4.16 analysis', 'Current ratings', 'Functional evidence'],
      outputs: ['TDIU strategy', 'Recommended approach', 'Evidence gaps'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 30
    },
    {
      order: 5,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'Evidence Coordinator',
      task: 'Package TDIU claim with Form 21-8940 guidance, employer statements',
      inputs: ['TDIU strategy', 'Functional evidence', 'Employment documentation'],
      outputs: ['TDIU evidence package', 'Form guidance', 'Employer statement templates'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 25
    }
  ]
};

export const INCREASE_CLAIM_WORKFLOW: UnifiedWorkflowTemplate = {
  id: 'increase-claim-workflow',
  name: 'Rating Increase Claim',
  description: 'Claim for increased rating on existing service-connected condition',
  claimTypes: ['INCREASE'],
  estimatedTime: '2-4 hours',
  steps: [
    {
      order: 1,
      phase: WorkflowPhase.INTAKE,
      layer: 'BUSINESS',
      agentId: 'intake-agent',
      agentName: 'Intake Specialist',
      task: 'Identify current rating, diagnostic code, and symptoms supporting increase',
      inputs: ['Current rating decision', 'Recent medical records', 'Symptom statement'],
      outputs: ['Current rating documented', 'Diagnostic code identified', 'Worsening symptoms noted'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 20
    },
    {
      order: 2,
      phase: WorkflowPhase.DOCUMENT_ANALYSIS,
      layer: 'ECV',
      agentId: 'EVIDENCE',
      agentName: 'Increase Evidence Extractor',
      task: 'Extract evidence of worsening - compare current symptoms to rating criteria for next level',
      inputs: ['Medical records', 'Lay statements', 'Functional assessments'],
      outputs: ['Current symptom evidence', 'Comparison to rating criteria', 'Worsening documented'],
      cueDiscoveryEnabled: true,
      retroDiscoveryEnabled: true,  // Can find earlier worsening date
      requiresApproval: false,
      estimatedMinutes: 35
    },
    {
      order: 3,
      phase: WorkflowPhase.STRATEGY,
      layer: 'BUSINESS',
      agentId: 'ratings-agent',
      agentName: 'Ratings Analyst',
      task: 'Map symptoms to next rating level criteria, identify gaps, recommend evidence',
      inputs: ['Current rating', 'Symptom evidence', 'Rating schedule criteria'],
      outputs: ['Rating increase pathway', 'Criteria gap analysis', 'Evidence recommendations'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: false,
      estimatedMinutes: 25
    },
    {
      order: 4,
      phase: WorkflowPhase.DELIVERY,
      layer: 'BUSINESS',
      agentId: 'evidence-agent',
      agentName: 'Evidence Coordinator',
      task: 'Package increase claim with symptom comparison, DBQ guidance',
      inputs: ['Rating analysis', 'Medical evidence', 'Criteria mapping'],
      outputs: ['Increase evidence package', 'C&P exam preparation guide'],
      cueDiscoveryEnabled: false,
      retroDiscoveryEnabled: false,
      requiresApproval: true,
      estimatedMinutes: 20
    }
  ]
};

// ============================================================================
// EXPORTS
// ============================================================================

export const UNIFIED_WORKFLOWS: UnifiedWorkflowTemplate[] = [
  UNIFIED_CLAIM_WORKFLOW,
  CUE_FOCUSED_WORKFLOW,
  SECONDARY_CLAIM_WORKFLOW,
  PTSD_CLAIM_WORKFLOW,
  TDIU_CLAIM_WORKFLOW,
  INCREASE_CLAIM_WORKFLOW
];

export function getUnifiedWorkflowById(id: string): UnifiedWorkflowTemplate | undefined {
  return UNIFIED_WORKFLOWS.find(w => w.id === id);
}

export function getWorkflowForClaimType(claimType: string): UnifiedWorkflowTemplate {
  const specificWorkflow = UNIFIED_WORKFLOWS.find(w =>
    w.claimTypes.includes(claimType.toUpperCase())
  );
  return specificWorkflow || UNIFIED_CLAIM_WORKFLOW;  // Default to unified
}

export default {
  UNIFIED_CLAIM_WORKFLOW,
  CUE_FOCUSED_WORKFLOW,
  SECONDARY_CLAIM_WORKFLOW,
  PTSD_CLAIM_WORKFLOW,
  TDIU_CLAIM_WORKFLOW,
  INCREASE_CLAIM_WORKFLOW,
  UNIFIED_WORKFLOWS,
  initializeWorkflow,
  getNextStep,
  completeStep,
  createCUERegistry,
  addCUEFinding,
  CUE_DISCOVERY_PROMPT,
  RETRO_DISCOVERY_PROMPT
};
