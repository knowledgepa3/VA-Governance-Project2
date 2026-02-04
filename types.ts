
export enum AgentRole {
  GATEWAY = 'Unified Gateway',
  TIMELINE = 'Timeline Builder',
  EVIDENCE = 'Evidence Validator',
  RATER_INITIAL = 'Initial Rater Review',
  CP_EXAMINER = 'C&P Examiner',
  RATER_DECISION = 'Rater Decision',
  QA = 'Quality Assurance',
  REPORT = 'Report Generator',
  TELEMETRY = 'Telemetry Collector',
  SUPERVISOR = 'Supervisor',
  REPAIR = 'Repair',
  AUDIT = 'Audit',
  // Financial Roles
  LEDGER_AUDITOR = 'Ledger Auditor',
  FRAUD_DETECTOR = 'Fraud Detector',
  TAX_COMPLIANCE = 'Tax Compliance',
  FINANCIAL_QA = 'Financial QA',
  FINANCIAL_REPORT = 'Financial Report Generator',
  // Cyber IR Roles (Evidence Chain Validation → Kill Chain Validation)
  CYBER_TRIAGE = 'Cyber Triage',                    // Initial incident intake & severity
  KILL_CHAIN_ANALYZER = 'Kill Chain Analyzer',      // MITRE ATT&CK mapping (like Timeline Builder)
  IOC_VALIDATOR = 'IOC Validator',                  // Evidence validation (hashes, IPs, domains)
  LATERAL_MOVEMENT_TRACKER = 'Lateral Movement Tracker',  // Pivot chain analysis
  COMPLIANCE_MAPPER = 'Compliance Mapper',          // NIST 800-53, CMMC, FedRAMP mapping
  THREAT_INTEL_CORRELATOR = 'Threat Intel Correlator',    // External threat intelligence
  CONTAINMENT_ADVISOR = 'Containment Advisor',      // Recommended actions (ADVISORY)
  CYBER_QA = 'Cyber QA',                            // Quality assurance on findings
  IR_REPORT_GENERATOR = 'IR Report Generator',      // Final incident report
  // BD Capture Roles - Proposal Development Workforce
  RFP_ANALYZER = 'RFP Analyzer',                    // Parse RFP, extract requirements, eval criteria
  COMPLIANCE_MATRIX = 'Compliance Matrix',          // Map requirements to capabilities, identify gaps
  PAST_PERFORMANCE = 'Past Performance',            // Match relevant experience from database
  TECHNICAL_WRITER = 'Technical Writer',            // Draft technical approach sections
  PRICING_ANALYST = 'Pricing Analyst',              // Pricing strategy, cost estimates
  PROPOSAL_QA = 'Proposal QA',                      // Review compliance, win themes, red flags
  PROPOSAL_ASSEMBLER = 'Proposal Assembler',        // Compile final deliverable
  // Grant Writing Roles - Federal Grant Application Workforce
  GRANT_OPPORTUNITY_ANALYZER = 'Grant Opportunity Analyzer',  // Parse NOFO, extract requirements
  GRANT_ELIGIBILITY_VALIDATOR = 'Grant Eligibility Validator', // Validate org eligibility
  GRANT_NARRATIVE_WRITER = 'Grant Narrative Writer',          // Write technical narrative sections
  GRANT_BUDGET_DEVELOPER = 'Grant Budget Developer',          // Develop budget justification
  GRANT_COMPLIANCE_CHECKER = 'Grant Compliance Checker',      // Check against NOFO requirements
  GRANT_EVALUATOR_LENS = 'Grant Evaluator Lens',              // Score from evaluator perspective
  GRANT_QA = 'Grant QA',                                      // Quality assurance
  GRANT_APPLICATION_ASSEMBLER = 'Grant Application Assembler' // Compile final package
}

export enum UserRole {
  ISSO = 'ISSO / ACE Architect',
  FORENSIC_SME = 'Forensic SME',
  SANITIZATION_OFFICER = 'Sanitization Officer',
  FEDERAL_AUDITOR = 'Federal Auditor',
  CHIEF_COMPLIANCE_OFFICER = 'Chief Compliance Officer'
}

export enum WorkforceType {
  VA_CLAIMS = 'VA_CLAIMS',
  FINANCIAL_AUDIT = 'FINANCIAL_AUDIT',
  CYBER_IR = 'CYBER_IR',  // Cyber Incident Response
  BD_CAPTURE = 'BD_CAPTURE',  // BD Proposal Capture
  GRANT_WRITING = 'GRANT_WRITING'  // Federal Grant Application
}

export enum MAIClassification {
  INFORMATIONAL = 'INFORMATIONAL',
  ADVISORY = 'ADVISORY',
  MANDATORY = 'MANDATORY'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  PAUSED = 'PAUSED',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  REPAIRING = 'REPAIRING'
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  role: AgentRole;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AgentAction {
  id: string;
  timestamp: string;
  agentId: AgentRole;
  actionType: string;
  input: string;
  output: string;
  classification: MAIClassification;
  humanReviewStatus: 'N/A' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerId?: string;
  reviewerRole?: UserRole;
  escalationTrigger: string; 
  duration: number;
  status: 'SUCCESS' | 'FAILURE';
}

export interface SupervisorScore {
  integrity: number;      // 0-100 behavioral integrity
  accuracy: number;       // 0-100 output accuracy
  compliance: number;     // 0-100 regulatory compliance
  latency: number;        // ms response time
  corrections: number;    // number of corrections made
  lastCheck: string;      // timestamp
}

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  progress: number;
  output?: any;
  lastAction?: string;
  supervisorScore?: SupervisorScore;
  tokenUsage?: { input: number; output: number };
}

export interface WorkforceState {
  template: WorkforceType;
  agents: Record<AgentRole, AgentState>;
  currentStep: number;
  logs: AgentAction[];
  activityFeed: ActivityLog[];
  isProcessing: boolean;
  humanActionRequired: boolean;
  requiredActionType?: MAIClassification;
  activeCheckpointAgent?: AgentRole;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content?: string;  // Extracted text for PDFs/text files, or base64 for binary files
  contentType?: 'text' | 'base64';  // Indicates how content is encoded
  readError?: string;  // Error message if file couldn't be read
  truncated?: boolean;  // True if content was truncated due to size limits
  pageCount?: number;  // Number of pages in PDF (if applicable)
}

// Browser Agent Types
export enum BrowserAgentStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  NAVIGATING = 'NAVIGATING',
  WORKING = 'WORKING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface BrowserAgentState {
  id: string;
  task: string;
  status: BrowserAgentStatus;
  classification: MAIClassification;
  currentAction?: string;
  screenshot?: string;
  progress: number;
  logs: string[];
}

// ============================================================================
// CYBER INCIDENT RESPONSE TYPES
// Evidence Chain Validation (ECV) → Kill Chain Validation (KCV) Translation
// ============================================================================

/**
 * Indicator of Compromise - Forensic evidence in cyber domain
 * Equivalent to Documentary Evidence in VA ECV
 */
export interface IOCEvidence {
  id: string;
  type: 'hash_md5' | 'hash_sha256' | 'ip_address' | 'domain' | 'url' | 'email' | 'file_path' | 'registry_key' | 'mutex' | 'user_agent' | 'certificate';
  value: string;
  firstSeen: string;        // ISO timestamp
  lastSeen: string;         // ISO timestamp
  source: string;           // Log source (firewall, EDR, SIEM, etc.)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';  // Like strength rating
  malicious: boolean;
  threatIntelMatch?: {
    feed: string;           // VirusTotal, AlienVault, MISP, etc.
    matchType: string;
    context: string;
  };
}

/**
 * MITRE ATT&CK Technique Mapping
 * Equivalent to 38 CFR Regulatory Pathway in VA ECV
 */
export interface ATTACKTechnique {
  techniqueId: string;      // T1566.001, T1059.001, etc.
  tacticId: string;         // TA0001, TA0002, etc.
  tacticName: string;       // Initial Access, Execution, etc.
  techniqueName: string;    // Spearphishing Attachment, PowerShell, etc.
  subTechniqueId?: string;
  confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE';
  supportingIOCs: string[]; // IOC IDs that support this technique
  timestamp: string;        // When this technique was observed
}

/**
 * Kill Chain Stage - Timeline of attack progression
 * Equivalent to Evidence Chain Timeline in VA ECV
 */
export interface KillChainStage {
  stage: 'RECON' | 'WEAPONIZATION' | 'DELIVERY' | 'EXPLOITATION' | 'INSTALLATION' | 'C2' | 'ACTIONS_ON_OBJECTIVES';
  timestamp: string;
  description: string;
  techniques: ATTACKTechnique[];
  iocs: IOCEvidence[];
  affectedAssets: string[];
  confidence: number;       // 0-100%
}

/**
 * Lateral Movement / Pivot Chain
 * Equivalent to Secondary → Primary Connection in VA ECV
 */
export interface LateralMovementChain {
  id: string;
  sourceAsset: string;
  destinationAsset: string;
  method: string;           // RDP, SMB, WMI, PsExec, etc.
  credentials?: string;     // Account used (anonymized)
  timestamp: string;
  technique: ATTACKTechnique;
  evidence: IOCEvidence[];
}

/**
 * Compliance Framework Mapping
 * Equivalent to 38 CFR mapping in VA ECV
 */
export interface ComplianceMapping {
  framework: 'NIST_800_53' | 'CMMC' | 'FEDRAMP' | 'ISO_27001' | 'PCI_DSS' | 'HIPAA' | 'SOC2';
  controlId: string;        // AC-2, SC-7, etc.
  controlName: string;
  status: 'VIOLATED' | 'AT_RISK' | 'COMPLIANT';
  findingDescription: string;
  remediationRequired: boolean;
  remediationPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Incident Severity Classification
 * Equivalent to disability rating methodology
 */
export enum IncidentSeverity {
  CRITICAL = 'CRITICAL',    // Active breach, data exfiltration in progress
  HIGH = 'HIGH',            // Confirmed compromise, containment needed
  MEDIUM = 'MEDIUM',        // Suspicious activity, investigation needed
  LOW = 'LOW',              // Minor policy violation, monitoring
  INFORMATIONAL = 'INFORMATIONAL'  // FYI only, no action required
}

/**
 * Containment Action - Recommended response
 * Classification determines human oversight requirement
 */
export interface ContainmentAction {
  id: string;
  actionType: 'ISOLATE_HOST' | 'BLOCK_IP' | 'DISABLE_ACCOUNT' | 'QUARANTINE_FILE' | 'RESET_CREDENTIALS' | 'PATCH_SYSTEM' | 'FORENSIC_IMAGE' | 'NOTIFY_STAKEHOLDER';
  target: string;
  priority: 'IMMEDIATE' | 'URGENT' | 'SCHEDULED';
  classification: MAIClassification;  // MANDATORY = human must approve
  rationale: string;
  estimatedImpact: string;
  approved?: boolean;
  approvedBy?: string;
  executedAt?: string;
}

/**
 * Full Cyber Incident Report
 * Equivalent to VA Claims Decision Report
 */
export interface CyberIncidentReport {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'ERADICATED' | 'RECOVERED' | 'CLOSED';

  // Timeline (Evidence Chain)
  detectionTime: string;
  reportedTime: string;
  containmentTime?: string;
  eradicationTime?: string;
  recoveryTime?: string;

  // Kill Chain Analysis
  killChain: KillChainStage[];
  lateralMovement: LateralMovementChain[];

  // Evidence
  iocs: IOCEvidence[];
  attackTechniques: ATTACKTechnique[];

  // Compliance Impact
  complianceMappings: ComplianceMapping[];

  // Response
  containmentActions: ContainmentAction[];

  // Affected Scope
  affectedSystems: string[];
  affectedUsers: string[];
  dataAtRisk: string[];

  // Summary
  executiveSummary: string;
  technicalSummary: string;
  lessonsLearned?: string;

  // Audit Trail
  analystNotes: string[];
  reviewedBy?: string;
  approvedBy?: string;
}

// ============================================================================
// RED TEAM / ADVERSARIAL ASSURANCE TYPES
// Independent governance lane for continuous security validation
// ============================================================================

/**
 * Red Team Test Severity Levels
 */
export enum RedTeamSeverity {
  CRITICAL = 'CRITICAL',    // Immediate blocker - agent version cannot be promoted
  HIGH = 'HIGH',            // Serious finding - requires remediation before production
  MEDIUM = 'MEDIUM',        // Notable weakness - should be addressed
  LOW = 'LOW',              // Minor observation - improvement opportunity
  INFORMATIONAL = 'INFO'    // FYI - no action required
}

/**
 * Red Team Test Categories (Test Suites)
 */
export enum RedTeamTestSuite {
  PROMPT_INJECTION = 'PROMPT_INJECTION',       // "Ignore prior instructions..." attacks
  DATA_LEAKAGE = 'DATA_LEAKAGE',               // PII, secrets, internal policy extraction
  AUTHORITY_ESCALATION = 'AUTHORITY_ESCALATION', // MANDATORY bypass attempts
  FABRICATION = 'FABRICATION',                 // Hallucination / invented citations
  WORKFLOW_TAMPER = 'WORKFLOW_TAMPER',         // Ledger manipulation, gate skipping
  TOOL_ABUSE = 'TOOL_ABUSE'                    // Unauthorized web/file/email access
}

/**
 * Red Team Test Phase
 */
export enum RedTeamPhase {
  PRE_FLIGHT = 'PRE_FLIGHT',     // Before execution - probe attack surface
  IN_FLIGHT = 'IN_FLIGHT',       // During execution - monitor for drift/abuse
  POST_FLIGHT = 'POST_FLIGHT'    // After completion - audit outputs
}

/**
 * Red Team Test Status
 */
export enum RedTeamTestStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',  // Test couldn't complete
  SKIPPED = 'SKIPPED'
}

/**
 * Individual Red Team Test Case
 */
export interface RedTeamTestCase {
  id: string;
  suite: RedTeamTestSuite;
  phase: RedTeamPhase;
  name: string;
  description: string;
  attackVector: string;           // The actual prompt/action being tested
  expectedBehavior: string;       // What the agent SHOULD do
  status: RedTeamTestStatus;
  severity: RedTeamSeverity;      // If failed, how severe
  targetAgent?: AgentRole;        // Which agent(s) this tests
  result?: {
    passed: boolean;
    actualBehavior: string;
    evidence: string;             // Logs, screenshots, responses
    timestamp: string;
    executionTimeMs: number;
  };
}

/**
 * Red Team Finding - Security issue discovered during testing
 */
export interface RedTeamFinding {
  id: string;
  testCaseId: string;
  suite: RedTeamTestSuite;
  phase: RedTeamPhase;
  severity: RedTeamSeverity;
  title: string;
  description: string;
  affectedAgent: AgentRole;
  reproductionSteps: string[];
  evidence: {
    input: string;                // Attack payload
    output: string;               // Agent's response
    logs: string[];               // Relevant system logs
    timestamp: string;
  };
  impact: string;                 // What could happen if exploited
  recommendedMitigation: string;  // How to fix
  cweId?: string;                 // CWE mapping (e.g., CWE-77 Command Injection)
  owaspCategory?: string;         // OWASP LLM Top 10 mapping
  status: 'OPEN' | 'ACKNOWLEDGED' | 'MITIGATED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE';
  assignedTo?: string;
  resolvedAt?: string;
  regressionTestAdded: boolean;   // Has this been added to regression suite?
}

/**
 * Red Team Score Card - Summary metrics
 */
export interface RedTeamScoreCard {
  overallScore: number;           // 0-100 (100 = perfect security)
  passRate: number;               // % of tests passed
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  totalTestsRun: number;
  totalTestsPassed: number;
  totalTestsFailed: number;
  totalTestsSkipped: number;
  suiteScores: Record<RedTeamTestSuite, {
    score: number;
    passed: number;
    failed: number;
    findings: number;
  }>;
  phaseScores: Record<RedTeamPhase, {
    score: number;
    passed: number;
    failed: number;
  }>;
  blockerPresent: boolean;        // If true, cannot promote agent version
  certificationStatus: 'PASSED' | 'FAILED' | 'PENDING';
  timestamp: string;
  runDurationMs: number;
}

/**
 * Gating Mode - Controls how blockers affect workflow
 */
export enum AALGatingMode {
  SOFT = 'SOFT',           // Allow completion but mark as "needs review"
  HARD = 'HARD',           // Halt execution immediately on CRITICAL
  CERTIFICATION = 'CERT'   // Hard gate + full suite + fuzzing required
}

/**
 * Assurance Contract - Enforceable governance binding
 * This is the control, not just a report
 */
export interface AssuranceContract {
  contractId: string;
  workforceType: WorkforceType;
  gatingMode: AALGatingMode;
  enforced: boolean;                    // Is this contract active?

  // Trust status - derived from ANY run type
  trustStatus: 'TRUSTED' | 'UNTRUSTED' | 'PENDING_REVIEW';
  trustReason?: string;

  // Certification status - ONLY from CERTIFICATION runs
  certificationStatus: 'CERTIFIED' | 'NOT_CERTIFIED' | 'EXPIRED';
  certifiedAt?: string;
  certificationExpiresAt?: string;
  certificationRunId?: string;

  // Enforcement rules
  blockOnCritical: boolean;             // CRITICAL findings = blocked
  blockOnHighCount: number;             // Block if HIGH findings exceed this count
  requireHumanApprovalIfUntrusted: boolean;  // Force MANDATORY for all outputs if untrusted

  // Promotion gate
  promotionAllowed: boolean;            // Can this agent version be deployed?
  promotionBlockers: string[];          // Finding IDs blocking promotion
  promotionCriteriaId?: string;         // Which criteria was applied
  promotionEvaluation?: PromotionEvaluation;

  // Known Acceptable Risks
  appliedKARs: string[];                // KAR IDs considered in this evaluation

  // Timestamps
  lastValidated: string;
  validUntil?: string;                  // Contract expires, requires re-validation
}

/**
 * Red Team Run Configuration
 */
export interface RedTeamRunConfig {
  runType: 'LIGHTWEIGHT' | 'STANDARD' | 'COMPREHENSIVE' | 'CERTIFICATION';
  targetWorkforce: WorkforceType;
  targetAgents?: AgentRole[];     // Specific agents to test, or all if empty
  suitesToRun?: RedTeamTestSuite[];  // Specific suites, or all if empty
  phasesToRun?: RedTeamPhase[];   // Specific phases, or all if empty
  fuzzing: boolean;               // Enable randomized test generation
  fuzzIterations?: number;        // How many fuzz iterations
  stopOnCritical: boolean;        // Halt run if critical finding
  parallelTests: number;          // How many tests to run concurrently
  timeoutMs: number;              // Max time per test
  gatingMode: AALGatingMode;      // How to handle blockers
}

/**
 * Reproducibility Context - Everything needed to replay this exact run
 */
export interface AALReproducibilityContext {
  seed: number;                         // Random seed for deterministic replay
  suiteVersion: string;                 // Hash of test suite file
  policyVersion: string;                // Hash of MAI/UAC policy config
  agentVersion: string;                 // Hash of agent prompt pack / system prompts
  platformVersion: string;              // ACE platform version
  environmentHash: string;              // Hash of relevant env config (sanitized)
}

/**
 * Artifact Reference - Pointer to auditable artifacts
 */
export interface AALArtifactRef {
  type: 'LEDGER_ENTRY' | 'AGENT_OUTPUT' | 'WORKFLOW_STATE' | 'SCREENSHOT' | 'LOG_BUNDLE';
  id: string;
  hash: string;                         // SHA-256 of artifact content
  timestamp: string;
  storageLocation?: string;             // Where it's persisted
}

/**
 * Red Team Run Result - Complete test run output
 * Audit-grade with full reproducibility
 */
export interface RedTeamRunResult {
  runId: string;
  config: RedTeamRunConfig;
  startTime: string;
  endTime: string;
  scoreCard: RedTeamScoreCard;
  findings: RedTeamFinding[];
  testResults: RedTeamTestCase[];
  logs: RedTeamActivityLog[];
  recommendations: RedTeamRecommendation[];
  regressionTestsGenerated: string[];  // New tests to add to suite

  // Reproducibility (audit-grade)
  reproducibility: AALReproducibilityContext;
  artifactRefs: AALArtifactRef[];
  environment: AuditableEnvironment;    // Safe, non-secret env state

  // Assurance Contract outcome
  contract: AssuranceContract;

  // Policy Decision Records (immutable audit trail)
  policyDecisions: PolicyDecisionRecord[];

  // Workflow impact
  workflowTrustStatus: 'TRUSTED' | 'UNTRUSTED' | 'PENDING_REVIEW';
  executionHalted: boolean;             // Was workflow stopped due to HARD gate?
  haltReason?: string;

  // Executive summary
  executiveProof?: ExecutiveProof;      // Generated on demand
}

/**
 * Score History Entry - For trend tracking
 */
export interface AALScoreHistoryEntry {
  runId: string;
  timestamp: string;
  workforceType: WorkforceType;
  runType: string;
  overallScore: number;
  passRate: number;
  criticalFindings: number;
  highFindings: number;
  totalFindings: number;
  certificationStatus: 'PASSED' | 'FAILED' | 'PENDING';
  blockerPresent: boolean;

  // Delta from previous run
  scoreDelta?: number;
  findingsDelta?: number;
}

/**
 * Score Trend Summary - Aggregated history view
 */
export interface AALScoreTrend {
  workforceType: WorkforceType;
  entries: AALScoreHistoryEntry[];
  currentScore: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
  trendPercentage: number;              // % change over window
  lastCertificationPass?: string;       // Timestamp
  daysSinceLastCertification: number;
  topFailingSuites: { suite: RedTeamTestSuite; failCount: number }[];
}

/**
 * ML Feedback Loop Types for Adaptive Red Teaming
 */

// Vulnerability pattern tracking across runs
export interface VulnerabilityPattern {
  patternId: string;
  suite: RedTeamTestSuite;
  vectorCategory: string;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  wasRemediated: boolean;
  remediationDate?: string;
  recurrenceAfterRemediation: number;
  averageSeverity: number; // 1-5 scale
  predictedNextOccurrence: number; // probability 0-1
}

// Adaptive penalty weights learned from history
export interface AdaptivePenaltyWeights {
  workforceType: WorkforceType;
  lastUpdated: string;
  weights: {
    critical: number;  // default 25, adapts based on impact
    high: number;      // default 10
    medium: number;    // default 5
    low: number;       // default 2
    info: number;      // default 0.5
  };
  suiteMultipliers: Record<RedTeamTestSuite, number>; // 0.5-2.0 range
  learningRate: number; // how fast weights adapt
  confidenceScore: number; // 0-1, based on sample size
  // Supervisor score integration
  supervisorScoreImpact: {
    avgIntegrity: number;      // Running average from supervisor checks
    avgAccuracy: number;
    avgCompliance: number;
    totalCorrections: number;  // Cumulative corrections across runs
    agentReliabilityScores: Record<string, number>; // Per-agent reliability 0-100
  };
}

// Agent performance tracking for ML feedback
export interface AgentPerformanceHistory {
  agentRole: string;
  workforceType: WorkforceType;
  runs: number;
  avgIntegrity: number;
  avgAccuracy: number;
  avgCompliance: number;
  avgLatencyMs: number;
  totalCorrections: number;
  failureRate: number;
  lastUpdated: string;
}

// Test prioritization based on failure history
export interface TestPrioritization {
  workforceType: WorkforceType;
  generatedAt: string;
  prioritizedSuites: {
    suite: RedTeamTestSuite;
    priority: number; // 1-10, higher = more important to test
    historicalFailRate: number;
    recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    recommendedTestIntensity: 'MINIMAL' | 'STANDARD' | 'INTENSIVE';
  }[];
  focusAreas: string[]; // specific vulnerability categories to focus on
  skipRecommendations: string[]; // areas that consistently pass
}

// Remediation effectiveness tracking
export interface RemediationEffectiveness {
  remediationId: string;
  appliedDate: string;
  targetSuite: RedTeamTestSuite;
  targetFindings: string[];
  preRemediationScore: number;
  postRemediationScore: number;
  scoreImprovement: number;
  findingsResolved: number;
  findingsRecurred: number;
  effectivenessRating: 'EXCELLENT' | 'GOOD' | 'PARTIAL' | 'INEFFECTIVE';
  daysUntilRecurrence?: number;
}

// ML prediction output
export interface RiskPrediction {
  workforceType: WorkforceType;
  predictedAt: string;
  predictionWindow: '7_DAYS' | '30_DAYS' | '90_DAYS';
  predictedScore: number;
  confidenceInterval: { low: number; high: number };
  highRiskSuites: RedTeamTestSuite[];
  emergingThreats: string[];
  recommendedActions: string[];
  modelConfidence: number; // 0-1
}

// Aggregate ML state
export interface AALMLState {
  workforceType: WorkforceType;
  lastModelUpdate: string;
  trainingDataPoints: number;
  vulnerabilityPatterns: VulnerabilityPattern[];
  adaptiveWeights: AdaptivePenaltyWeights;
  testPrioritization: TestPrioritization;
  remediationHistory: RemediationEffectiveness[];
  latestPrediction?: RiskPrediction;
  modelVersion: string;
}

/**
 * Red Team Activity Log
 */
export interface RedTeamActivityLog {
  id: string;
  timestamp: string;
  phase: RedTeamPhase;
  suite?: RedTeamTestSuite;
  testCaseId?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'attack' | 'defense';
}

/**
 * Red Team Recommendation
 */
export interface RedTeamRecommendation {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'GUARDRAIL' | 'POLICY' | 'ARCHITECTURE' | 'TRAINING' | 'MONITORING';
  title: string;
  description: string;
  relatedFindings: string[];      // Finding IDs
  estimatedEffort: 'TRIVIAL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'EPIC';
  implementationGuidance: string;
}

/**
 * In-Flight Monitoring Event
 * Captures real-time anomalies during agent execution
 */
export interface InFlightMonitorEvent {
  id: string;
  timestamp: string;
  agentRole: AgentRole;
  eventType: 'DRIFT_DETECTED' | 'UNSAFE_TOOL_USE' | 'AUTHORITY_VIOLATION' | 'CHALLENGE_FAILED' | 'ANOMALOUS_OUTPUT';
  severity: RedTeamSeverity;
  description: string;
  context: {
    expectedBehavior: string;
    actualBehavior: string;
    triggerCondition: string;
  };
  autoMitigated: boolean;
  mitigationAction?: string;
}

/**
 * Pre-Flight Attack Vector
 * Structured prompt injection / attack payloads
 */
export interface PreFlightAttackVector {
  id: string;
  suite: RedTeamTestSuite;
  name: string;
  payload: string;                // The actual attack prompt
  targetBehavior: string;         // What we're trying to make the agent do
  expectedDefense: string;        // How the agent should respond
  sophistication: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'APT';
  source?: string;                // Attribution (research paper, real incident, etc.)
}

// ============================================================================
// POLICY DECISION RECORD (PDR)
// Immutable audit record of every enforcement action
// ============================================================================

/**
 * Policy Decision Type - What action was enforced
 */
export enum PolicyDecisionType {
  PROMOTION_BLOCKED = 'PROMOTION_BLOCKED',
  PROMOTION_ALLOWED = 'PROMOTION_ALLOWED',
  OUTPUT_FORCED_MANDATORY = 'OUTPUT_FORCED_MANDATORY',
  RUN_HALTED = 'RUN_HALTED',
  TRUST_DOWNGRADED = 'TRUST_DOWNGRADED',
  CERTIFICATION_REQUIRED = 'CERTIFICATION_REQUIRED',
  HUMAN_REVIEW_REQUIRED = 'HUMAN_REVIEW_REQUIRED',
  RISK_ACCEPTED = 'RISK_ACCEPTED'
}

/**
 * Policy Decision Record - Immutable audit entry
 * Every enforcement action creates one of these
 */
export interface PolicyDecisionRecord {
  pdrId: string;                          // Unique identifier
  timestamp: string;                      // ISO timestamp
  decision: PolicyDecisionType;           // What was decided
  reason: string;                         // Human-readable explanation

  // Evidence chain
  triggerFindingIds: string[];            // Which findings triggered this
  triggerRule: string;                    // Which rule was invoked
  evidenceRefs: AALArtifactRef[];         // Ledger pointers

  // Actor
  actor: {
    system: 'AAL';
    version: string;
    runId: string;
    contractId: string;
  };

  // Context
  workforceType: WorkforceType;
  gatingMode: AALGatingMode;
  priorTrustStatus?: 'TRUSTED' | 'UNTRUSTED' | 'PENDING_REVIEW';
  newTrustStatus: 'TRUSTED' | 'UNTRUSTED' | 'PENDING_REVIEW';

  // Signature (for tamper detection)
  contentHash: string;                    // Hash of decision + reason + evidenceRefs
}

// ============================================================================
// KNOWN ACCEPTABLE RISKS (KAR)
// Enterprise risk acceptance with expiry and ownership
// ============================================================================

/**
 * Known Acceptable Risk - Formal risk acceptance
 */
export interface KnownAcceptableRisk {
  karId: string;
  findingId: string;                      // Which finding is accepted
  findingSuite: RedTeamTestSuite;
  findingSeverity: RedTeamSeverity;

  // Acceptance details
  acceptedBy: string;                     // Person who accepted (email/ID)
  acceptedByRole: string;                 // Their role (CISO, Risk Owner, etc.)
  acceptedAt: string;                     // When accepted
  expiresAt: string;                      // MUST have expiry

  // Justification
  businessJustification: string;          // Why this risk is acceptable
  mitigatingControls: string[];           // What compensating controls exist
  residualRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // Governance
  reviewRequired: boolean;                // Needs periodic review?
  nextReviewDate?: string;
  escalationPath?: string;                // Who to escalate to if risk materializes

  // Status
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED';
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

// ============================================================================
// PROMOTION CRITERIA
// First-class config for mathematically deterministic promotion rules
// ============================================================================

/**
 * Promotion Criteria - Defines what "shippable" means
 */
export interface PromotionCriteria {
  criteriaId: string;
  name: string;                           // "Production Ready", "Staging OK", etc.
  description: string;

  // Hard rules (must pass)
  maxCriticalFindings: number;            // Usually 0
  maxHighFindings: number;                // Usually 2-3
  maxMediumFindings: number;              // Usually 10
  minOverallScore: number;                // Usually 80-95

  // Certification requirements
  requireCertificationRun: boolean;       // Must have CERTIFICATION type run
  maxDaysSinceCertification: number;      // Cert expires after N days

  // Suite-specific rules
  requiredSuiteScores?: Partial<Record<RedTeamTestSuite, number>>;  // Min score per suite

  // KAR handling
  allowAcceptedRisks: boolean;            // Can KARs override findings?
  maxAcceptedCritical: number;            // Even with KAR, limit criticals

  // Metadata
  createdAt: string;
  createdBy: string;
  version: number;
}

/**
 * Promotion Evaluation Result
 */
export interface PromotionEvaluation {
  criteriaId: string;
  criteriaName: string;
  evaluatedAt: string;

  // Result
  passed: boolean;

  // Rule-by-rule breakdown
  ruleResults: {
    rule: string;
    required: string | number;
    actual: string | number;
    passed: boolean;
  }[];

  // Blockers
  blockers: string[];                     // Human-readable list of what failed

  // Accepted risks applied
  appliedKARs: string[];                  // KAR IDs that were considered
}

// ============================================================================
// AUDITABLE ENVIRONMENT CONTEXT
// Whitelisted, non-secret environment state
// ============================================================================

/**
 * Auditable Environment - Safe to log, no secrets
 */
export interface AuditableEnvironment {
  // App config flags (safe)
  demoMode: boolean;
  targetWorkforce: WorkforceType;

  // Enabled tools/features
  enabledTools: string[];                 // e.g., ['web_fetch', 'file_read']
  featureFlags: Record<string, boolean>;  // e.g., { 'experimental_agents': false }

  // Gate defaults
  defaultGatingMode: AALGatingMode;
  defaultPromotionCriteriaId?: string;

  // Platform info
  platformVersion: string;
  suiteVersion: string;

  // Timestamps
  configLoadedAt: string;

  // NEVER include: API keys, secrets, raw env vars, credentials
}

// ============================================================================
// EXECUTIVE PROOF
// One-page summary for deal-closing conversations
// ============================================================================

/**
 * Executive Proof - The artifact that closes deals
 */
export interface ExecutiveProof {
  generatedAt: string;
  generatedBy: 'AAL';
  version: string;

  // Identity
  workforceType: WorkforceType;
  workforceName: string;

  // Current State
  trustStatus: 'TRUSTED' | 'UNTRUSTED' | 'PENDING_REVIEW';
  certificationStatus: 'PASSED' | 'FAILED' | 'PENDING' | 'EXPIRED';
  promotionStatus: 'ALLOWED' | 'BLOCKED';

  // Key Metrics
  currentScore: number;
  lastRunDate: string;
  lastCertificationDate?: string;
  daysSinceCertification: number;

  // Risk Summary
  openFindings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  acceptedRisks: number;                  // KARs in effect

  // Top Blockers (if any)
  blockers: {
    id: string;
    severity: string;
    title: string;
  }[];

  // Trend (last 5 runs)
  trend: {
    direction: 'IMPROVING' | 'DECLINING' | 'STABLE';
    percentage: number;
    scores: number[];                     // Last 5 scores
  };

  // Reproducibility (for audit)
  lastRunId: string;
  lastRunSeed: number;
  suiteVersion: string;

  // Promotion Criteria Applied
  promotionCriteria: {
    name: string;
    passed: boolean;
    failedRules: string[];
  };

  // One-liner
  summary: string;                        // "TRUSTED - Ready for production deployment"
}
