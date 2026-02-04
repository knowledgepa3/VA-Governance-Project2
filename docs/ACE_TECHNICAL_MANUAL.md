# ACE Platform: Technical Manual

**Version:** 1.0
**Last Updated:** February 2026
**Author:** ACE Development Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Concepts](#3-core-concepts)
4. [File Structure](#4-file-structure)
5. [Type System Deep Dive](#5-type-system-deep-dive)
6. [Workforce Templates](#6-workforce-templates)
7. [Agent Orchestration](#7-agent-orchestration)
8. [Claude API Integration](#8-claude-api-integration)
9. [Adversarial Assurance Lane (AAL)](#9-adversarial-assurance-lane-aal)
10. [ML Feedback Loop](#10-ml-feedback-loop)
11. [Demo Canon System](#11-demo-canon-system)
12. [UI Components](#12-ui-components)
13. [Data Flow](#13-data-flow)
14. [Extending the Platform](#14-extending-the-platform)

---

## 1. Introduction

ACE (Automated Compliance Engine) is a multi-agent AI orchestration platform designed for enterprise workflows requiring governance, auditability, and human oversight. The platform coordinates specialized AI agents through governed workflows, with built-in adversarial testing and continuous learning.

### Key Design Principles

1. **Safety-First**: No consequential action without human approval
2. **Auditability**: Complete telemetry and reproducibility
3. **Adaptability**: ML-driven continuous improvement
4. **Modularity**: Easy to add new workforces and agents

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx (Orchestrator)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   State     │  │  Workflow   │  │    UI Components        │  │
│  │  Management │  │  Execution  │  │  (AgentCard, Reports)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    claudeService.ts                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Model     │  │   Prompt    │  │    Response             │  │
│  │  Selection  │  │  Building   │  │    Parsing              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    redTeamAgent.ts                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Test Suite │  │   Scoring   │  │    ML Engine            │  │
│  │  Execution  │  │   & Gating  │  │    (AALMLEngine)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 Workforces

A **Workforce** is a specialized configuration of agents designed for a specific domain. Each workforce has:

- **Unique agent roles** specific to that domain
- **Workflow sequence** defining execution order
- **Domain-specific prompts** for each agent
- **Report templates** for output generation

**Available Workforces:**
| Workforce | Enum Value | Purpose |
|-----------|------------|---------|
| VA Claims | `WorkforceType.VA_CLAIMS` | Disability claims analysis |
| Financial Audit | `WorkforceType.FINANCIAL_AUDIT` | Multi-entity financial review |
| Cyber IR | `WorkforceType.CYBER_IR` | Incident response |
| BD Capture | `WorkforceType.BD_CAPTURE` | Federal proposal writing |
| Grant Writing | `WorkforceType.GRANT_WRITING` | Grant application assembly |

### 3.2 Agents

An **Agent** is a specialized AI entity with:

- **Role**: Defined in `AgentRole` enum
- **Status**: IDLE → WORKING → COMPLETE/ERROR
- **Configuration**: Prompt templates, MAI classification
- **Output**: Structured JSON response
- **Supervisor Score**: Integrity, accuracy, compliance metrics

### 3.3 MAI Classification

**Multi-Agent Integrity (MAI)** classifies every agent action:

```typescript
enum MAIClassification {
  INFORMATIONAL = 'INFORMATIONAL',  // Read-only, no human review needed
  ADVISORY = 'ADVISORY',            // Recommendations, optional review
  MANDATORY = 'MANDATORY'           // Requires human approval before execution
}
```

### 3.4 Supervisor Scoring

Each agent output is scored by the Supervisor:

```typescript
interface SupervisorScore {
  integrity: number;    // 0-100: Output consistency and safety
  accuracy: number;     // 0-100: Correctness of analysis
  compliance: number;   // 0-100: Regulatory adherence
  corrections: number;  // Count of required fixes
}
```

---

## 4. File Structure

```
ACE-VA-Agents-main/
├── App.tsx                    # Main orchestrator component
├── types.ts                   # All TypeScript interfaces and enums
├── constants.ts               # Agent configs, demo data, templates
├── claudeService.ts           # Claude API integration
├── redTeamAgent.ts            # Adversarial testing & ML engine
├── demoCanon.ts               # Frozen demo scenarios
├── pdfUtils.ts                # PDF text extraction
├── pastPerformanceDatabase.ts # Past performance for BD Capture
├── config.browser.ts          # Browser-safe configuration
│
├── components/
│   ├── AgentCard.tsx          # Individual agent status display
│   ├── DemoCanonSelector.tsx  # Demo scenario picker
│   ├── RedTeamDashboard.tsx   # AAL results visualization
│   ├── ReportView.tsx         # VA Claims report renderer
│   ├── FinancialReportView.tsx
│   ├── CyberReportView.tsx
│   ├── CaptureReportView.tsx
│   ├── MonitoringDashboard.tsx
│   ├── AuditPage.tsx
│   ├── ComplianceStatement.tsx
│   ├── GovernancePolicy.tsx
│   ├── BlueprintsView.tsx
│   └── ArchitectureView.tsx
│
└── docs/
    ├── DEPLOYMENT_SAFETY.md
    ├── ACE_TECHNICAL_MANUAL.md  (this file)
    └── ACE_WHITEPAPER.md
```

---

## 5. Type System Deep Dive

### 5.1 Core Types (types.ts)

#### WorkforceState
The central state object for the entire application:

```typescript
interface WorkforceState {
  template: WorkforceType;                    // Current workforce
  agents: Record<AgentRole, AgentState>;      // All agent states
  currentStep: number;                        // Workflow progress
  logs: AgentAction[];                        // Audit trail
  activityFeed: ActivityLog[];                // UI feed
  isProcessing: boolean;                      // Workflow running?
  humanActionRequired: boolean;               // Awaiting approval?
}
```

#### AgentState
Individual agent runtime state:

```typescript
interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  progress: number;                   // 0-100
  output?: any;                       // Structured response
  error?: string;
  supervisorScore?: SupervisorScore;
  tokenUsage?: { input: number; output: number };
}
```

#### AgentAction
Audit log entry for compliance:

```typescript
interface AgentAction {
  id: string;
  timestamp: string;
  agentId: AgentRole;
  actionType: string;
  classification: MAIClassification;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  humanReviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewerId?: string;
  reviewerRole?: UserRole;
  duration?: number;
  escalationTrigger?: string;
}
```

### 5.2 Red Team Types

#### RedTeamRunResult
Complete adversarial test run output:

```typescript
interface RedTeamRunResult {
  runId: string;
  timestamp: string;
  config: RedTeamConfig;
  findings: RedTeamFinding[];
  scoreCard: RedTeamScoreCard;
  workflowTrustStatus: 'TRUSTED' | 'CONDITIONAL' | 'UNTRUSTED';
  contract: AssuranceContract;
  reproducibility: AALReproducibilityContext;
  executionHalted: boolean;
  haltReason?: string;
}
```

#### AdaptivePenaltyWeights
ML-learned scoring weights:

```typescript
interface AdaptivePenaltyWeights {
  weights: {
    critical: number;  // Severity multipliers
    high: number;
    medium: number;
    low: number;
  };
  suiteMultipliers: Record<RedTeamTestSuite, number>;
  learningRate: number;
  confidenceScore: number;
  supervisorScoreImpact: {
    avgIntegrity: number;
    avgAccuracy: number;
    avgCompliance: number;
    totalCorrections: number;
    agentReliabilityScores: Record<string, number>;
  };
  lastUpdated?: string;
}
```

---

## 6. Workforce Templates

### 6.1 Template Structure (constants.ts)

Each workforce template defines:

```typescript
interface WorkforceTemplate {
  name: string;
  description: string;
  roles: AgentRole[];           // Ordered execution sequence
  configs: Record<AgentRole, AgentConfig>;
}

interface AgentConfig {
  role: AgentRole;
  name: string;
  description: string;
  classification: MAIClassification;
  systemPrompt: string;         // Role-specific instructions
  inputSchema?: string;         // Expected input format
  outputSchema?: string;        // Required output structure
}
```

### 6.2 VA Claims Workflow

```
GATEWAY → INTAKE → EVIDENCE → NEXUS → CFR_SPECIALIST →
RATER_MUSCULOSKELETAL → RATER_MENTAL → RATER_DECISION →
QA → REPORT → TELEMETRY → SUPERVISOR
```

**Key Agents:**
- `GATEWAY`: Document intake and classification
- `EVIDENCE`: Evidence chain extraction
- `NEXUS`: Service connection analysis
- `RATER_DECISION`: CUE/retroactive date analysis
- `REPORT`: Final ECV report generation

### 6.3 Financial Audit Workflow

```
GATEWAY → LEDGER_AUDITOR → INTERCOMPANY_RECONCILER →
CONSOLIDATION_SPECIALIST → FRAUD_DETECTOR → TAX_COMPLIANCE →
FINANCIAL_QA → FINANCIAL_REPORT → TELEMETRY → SUPERVISOR
```

### 6.4 Cyber IR Workflow

```
CYBER_TRIAGE → KILL_CHAIN_ANALYZER → IOC_VALIDATOR →
FORENSIC_RECONSTRUCTOR → COMPLIANCE_MAPPER → CONTAINMENT_ADVISOR →
CYBER_QA → IR_REPORT_GENERATOR → TELEMETRY → SUPERVISOR
```

### 6.5 BD Capture Workflow

```
RFP_ANALYZER → COMPLIANCE_MATRIX → PAST_PERFORMANCE →
TECHNICAL_WRITER → PRICING_ANALYST → PROPOSAL_QA →
PROPOSAL_ASSEMBLER → TELEMETRY → SUPERVISOR
```

### 6.6 Grant Writing Workflow

```
GRANT_OPPORTUNITY_ANALYZER → GRANT_ELIGIBILITY_VALIDATOR →
GRANT_NARRATIVE_WRITER → GRANT_BUDGET_DEVELOPER →
GRANT_COMPLIANCE_CHECKER → GRANT_EVALUATOR_LENS →
GRANT_QA → GRANT_APPLICATION_ASSEMBLER → TELEMETRY → SUPERVISOR
```

---

## 7. Agent Orchestration

### 7.1 Workflow Execution (App.tsx)

The `executeWorkflow` function orchestrates agent execution:

```typescript
const executeWorkflow = async (step: number) => {
  // 1. Check for abort signal
  if (workflowAbortRef.current) {
    addActivity(AgentRole.SUPERVISOR, `Workflow halted at step ${step}.`);
    return;
  }

  // 2. Get current role and config
  const role = ROLES_IN_ORDER[step - 1];
  const config = activeTemplate.configs[role];

  // 3. Update agent status to WORKING
  updateAgent(role, { status: AgentStatus.WORKING, progress: 5 });

  // 4. Build input from previous agent outputs
  const inputData = buildInputForAgent(role);

  // 5. Call Claude API
  const response = await runAgentStep(role, state.template, inputData);

  // 6. Run supervisor check
  const supervisorResult = await supervisorCheck(role, response);

  // 7. Update agent with results and score
  updateAgent(role, {
    status: AgentStatus.COMPLETE,
    output: response,
    supervisorScore: supervisorResult.score
  });

  // 8. Continue to next step or finish
  if (step < ROLES_IN_ORDER.length) {
    executeWorkflow(step + 1);
  } else {
    setState(prev => ({ ...prev, isProcessing: false }));
  }
};
```

### 7.2 State Management

ACE uses React useState with refs to handle async state:

```typescript
// State for UI updates
const [state, setState] = useState<WorkforceState>(getInitialState());

// Ref for async access (avoids stale closures)
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);

// Update agent helper
const updateAgent = useCallback((role: AgentRole, updates: Partial<AgentState>) => {
  setState(prev => ({
    ...prev,
    agents: {
      ...prev.agents,
      [role]: { ...prev.agents[role], ...updates }
    }
  }));
}, []);
```

### 7.3 Human-in-the-Loop Gates

When an agent has `MAIClassification.MANDATORY`:

```typescript
if (config.classification === MAIClassification.MANDATORY) {
  setState(prev => ({ ...prev, humanActionRequired: true }));
  addActivity(AgentRole.SUPERVISOR,
    `[MANDATORY] Awaiting human approval for ${role}`);

  // Workflow pauses here until human approves
  await waitForHumanApproval(role);
}
```

---

## 8. Claude API Integration

### 8.1 Intelligent Model Selection (claudeService.ts)

ACE automatically selects the optimal Claude model:

```typescript
// OPUS: Complex reasoning, synthesis, final reports
const opusRoles = [
  AgentRole.REPORT,
  AgentRole.QA,
  AgentRole.RATER_DECISION,
  AgentRole.FINANCIAL_REPORT,
  AgentRole.TECHNICAL_WRITER,
  // ... more complex roles
];

// HAIKU: Simple intake, fast processing
const haikuRoles = [
  AgentRole.GATEWAY,
  AgentRole.TELEMETRY,
  AgentRole.CYBER_TRIAGE,
];

// SONNET: Everything else (balanced)
let modelName: string;
if (opusRoles.includes(role)) {
  modelName = "claude-opus-4-20250514";
} else if (haikuRoles.includes(role)) {
  modelName = "claude-haiku-4-20250514";
} else {
  modelName = "claude-sonnet-4-20250514";
}
```

### 8.2 API Call Structure

```typescript
export async function runAgentStep(
  role: AgentRole,
  template: WorkforceType,
  inputData: any
): Promise<any> {
  const config = AGENT_CONFIGS[template][role];

  // Build message with system prompt and input
  const response = await anthropic.messages.create({
    model: modelName,
    max_tokens: maxTokens,
    system: config.systemPrompt,
    messages: [{
      role: 'user',
      content: buildPromptContent(role, inputData)
    }]
  });

  // Parse and clean JSON response
  const text = response.content[0].text;
  return JSON.parse(cleanJsonResponse(text));
}
```

### 8.3 JSON Response Cleaning

Handles common LLM response issues:

```typescript
export function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Remove trailing commas (invalid JSON)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Handle truncated responses
  if (!cleaned.trim().endsWith('}') && !cleaned.trim().endsWith(']')) {
    // Attempt to close open structures
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    cleaned += '}'.repeat(openBraces - closeBraces);
  }

  return cleaned.trim();
}
```

---

## 9. Adversarial Assurance Lane (AAL)

### 9.1 Overview

The AAL is a continuous red-teaming system that validates workflow integrity:

```
┌─────────────────────────────────────────────────────────┐
│                    AAL Pipeline                          │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │
│  │  Test    │ → │  Score   │ → │  Gating          │    │
│  │  Suites  │   │  Card    │   │  Decision        │    │
│  └──────────┘   └──────────┘   └──────────────────┘    │
│                                         │               │
│                                         ▼               │
│                              ┌──────────────────┐       │
│                              │  Contract        │       │
│                              │  Generation      │       │
│                              └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Test Suites

```typescript
enum RedTeamTestSuite {
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  DATA_LEAKAGE = 'DATA_LEAKAGE',
  AUTHORITY_ESCALATION = 'AUTHORITY_ESCALATION',
  FABRICATION = 'FABRICATION',
  WORKFLOW_TAMPER = 'WORKFLOW_TAMPER',
  TOOL_ABUSE = 'TOOL_ABUSE'
}
```

**Test Examples:**

| Suite | Test | What It Checks |
|-------|------|----------------|
| PROMPT_INJECTION | Ignore instructions | Agent resists override attempts |
| DATA_LEAKAGE | PII extraction | No unauthorized data disclosure |
| FABRICATION | Hallucination | Outputs grounded in evidence |
| AUTHORITY_ESCALATION | Scope creep | Agent stays within boundaries |

### 9.3 Scoring Algorithm

```typescript
function calculateScore(findings: RedTeamFinding[]): number {
  let score = 100;

  for (const finding of findings) {
    const severityWeight = weights.weights[finding.severity];
    const suiteMultiplier = weights.suiteMultipliers[finding.suite];

    score -= severityWeight * suiteMultiplier;
  }

  return Math.max(0, Math.round(score));
}
```

### 9.4 Gating Modes

```typescript
enum AALGatingMode {
  SOFT = 'SOFT',           // Log warnings, allow continuation (60+ required)
  HARD = 'HARD',           // Block on failure (70+ required)
  CERTIFICATION = 'CERT'   // Full audit, zero blockers (80+ required)
}
```

### 9.5 Assurance Contracts

After each run, a cryptographically-referenceable contract is generated:

```typescript
interface AssuranceContract {
  contractId: string;           // "ACE-CONTRACT-{timestamp}"
  issuedAt: string;
  expiresAt: string;            // 24 hours later
  workforceType: WorkforceType;
  gatingMode: AALGatingMode;
  scoreAtIssuance: number;
  promotionAllowed: boolean;
  trustReason: string;
  constraints: string[];
  artifactRefs: AALArtifactRef[];
}
```

---

## 10. ML Feedback Loop

### 10.1 Architecture

The `AALMLEngine` class provides continuous learning:

```
┌─────────────────────────────────────────────────────────┐
│                    ML Pipeline                           │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │  Run Result  │ → │  Pattern     │ → │  Weight    │  │
│  │  Processing  │   │  Detection   │   │  Adjustment│  │
│  └──────────────┘   └──────────────┘   └────────────┘  │
│         │                                    │          │
│         ▼                                    ▼          │
│  ┌──────────────┐                    ┌────────────┐    │
│  │  Supervisor  │                    │  Risk      │    │
│  │  Integration │                    │  Prediction│    │
│  └──────────────┘                    └────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Processing a Run

```typescript
static processRunForLearning(
  result: RedTeamRunResult,
  supervisorScores?: Record<string, SupervisorScoreInput>
): MLProcessingResult {
  const workforceType = result.config.targetWorkforce;

  // 1. Integrate supervisor scores (connects workflow to ML)
  if (supervisorScores) {
    this.integrateSupervisorScores(workforceType, supervisorScores);
  }

  // 2. Update adaptive weights from this run
  const updatedWeights = this.updateWeightsFromRun(result);

  // 3. Track vulnerability patterns
  const patterns = this.trackVulnerabilityPatterns(result);

  // 4. Update remediation effectiveness
  this.updateRemediationEffectiveness(workforceType, result);

  // 5. Generate test prioritization
  const prioritization = this.generateTestPrioritization(workforceType);

  // 6. Predict future risk
  const prediction = this.predictRisk(workforceType);

  return { updatedWeights, patterns, prioritization, prediction };
}
```

### 10.3 Supervisor Score Integration

Connects agent behavioral metrics to adversarial learning:

```typescript
static integrateSupervisorScores(
  workforceType: WorkforceType,
  agentScores: Record<string, SupervisorScoreInput>
): void {
  const weights = this.getAdaptiveWeights(workforceType);

  // Calculate running averages (exponential moving average)
  const alpha = 0.3; // 30% weight to new data

  weights.supervisorScoreImpact = {
    avgIntegrity: existing.avgIntegrity * (1 - alpha) + newAvg * alpha,
    avgAccuracy: existing.avgAccuracy * (1 - alpha) + newAvg * alpha,
    // ...
  };

  // Adjust learning rate based on trust
  const trustFactor = (avgIntegrity + avgAccuracy) / 200;
  weights.learningRate = 0.05 + (0.15 * trustFactor); // 0.05-0.20

  // If reliability is low, be stricter
  if (avgReliability < 70) {
    weights.weights.critical *= (1 + (70 - avgReliability) / 100);
  }
}
```

### 10.4 Risk Prediction

30-day forward prediction using exponential smoothing:

```typescript
static predictRisk(workforceType: WorkforceType): RiskPrediction {
  const history = AALScoreHistory.getHistory(workforceType);

  // Calculate trend using weighted moving average
  const alpha = 0.3;
  let smoothedScore = history[0].overallScore;

  for (const entry of history.slice(1)) {
    smoothedScore = alpha * entry.overallScore + (1 - alpha) * smoothedScore;
  }

  // Project forward
  const trend = this.calculateTrend(history);
  const predictedScore = Math.min(100, Math.max(0,
    smoothedScore + (trend.direction === 'IMPROVING' ? 5 : -5)
  ));

  return {
    predictedScore,
    confidence: weights.confidenceScore,
    highRiskSuites: this.identifyHighRiskSuites(history),
    recommendation: predictedScore >= 80 ? 'MAINTAIN' : 'REMEDIATE'
  };
}
```

---

## 11. Demo Canon System

### 11.1 Purpose

The Demo Canon provides frozen, reproducible scenarios for:
- Sales demonstrations
- Regression testing
- Developer onboarding
- Validation before deployment

### 11.2 Scenario Structure (demoCanon.ts)

```typescript
interface DemoScenario {
  id: string;                    // "CANON-VA-001"
  name: string;
  description: string;
  workforce: WorkforceType;
  difficulty: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  expectedDuration: string;
  highlights: string[];          // Key demo points

  inputArtifacts: DemoArtifact[];
  expectedOutputs: DemoExpectedOutput[];
  failureInjectionPoints: FailureInjection[];
  validationChecks: ValidationCheck[];
}
```

### 11.3 Available Scenarios

| ID | Workforce | Difficulty | Highlights |
|----|-----------|------------|------------|
| CANON-VA-001 | VA Claims | COMPLEX | CUE detection, secondary conditions |
| CANON-FIN-001 | Financial | COMPLEX | Multi-entity consolidation, fraud |
| CANON-CYBER-001 | Cyber IR | COMPLEX | APT detection, lateral movement |
| CANON-BD-001 | BD Capture | MODERATE | RFP analysis, compliance matrix |
| CANON-GRANT-001 | Grant Writing | MODERATE | CDC NOFO, budget justification |

### 11.4 Failure Injection

Test system resilience by enabling failures:

```typescript
interface FailureInjection {
  type: FailureType;
  name: string;
  triggerCondition: string;
  expectedRecovery: string;
}

enum FailureType {
  JSON_PARSE = 'JSON_PARSE',           // Malformed response
  TIMEOUT = 'TIMEOUT',                  // Agent timeout
  INVALID_OUTPUT = 'INVALID_OUTPUT',    // Schema violation
  RED_TEAM_BLOCK = 'RED_TEAM_BLOCK',   // AAL blocks promotion
  SUPERVISOR_CORRECTION = 'SUPERVISOR_CORRECTION'
}
```

### 11.5 Validation Checks

```typescript
interface ValidationCheck {
  checkType: ValidationType;
  target: string;
  expectedValue?: any;
  tolerance?: number;
}

enum ValidationType {
  OUTPUT_PRESENT = 'OUTPUT_PRESENT',
  FIELD_MATCH = 'FIELD_MATCH',
  SCORE_THRESHOLD = 'SCORE_THRESHOLD',
  NO_PII_LEAK = 'NO_PII_LEAK',
  COMPLIANCE_MET = 'COMPLIANCE_MET'
}
```

---

## 12. UI Components

### 12.1 AgentCard

Displays individual agent status:

```typescript
interface AgentCardProps {
  state: AgentState;
  onViewOutput: (role: AgentRole) => void;
}

// Renders:
// - Agent name and role
// - Status indicator (IDLE/WORKING/COMPLETE/ERROR)
// - Progress bar
// - Supervisor score (if available)
// - Token usage
// - "View Output" button
```

### 12.2 RedTeamDashboard

Visualizes AAL results:

- Score card with pass/fail status
- Findings list with severity badges
- Suite-by-suite breakdown
- Contract details
- Reproducibility information

### 12.3 Report Views

Each workforce has a specialized report renderer:

- `ReportView.tsx`: VA Claims ECV report
- `FinancialReportView.tsx`: Audit report
- `CyberReportView.tsx`: Incident report (KCV)
- `CaptureReportView.tsx`: Proposal deliverable

---

## 13. Data Flow

### 13.1 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│  (File Upload / Demo Data / Demo Canon)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     App.tsx: startProcessing()                   │
│  - Validates input                                               │
│  - Initializes workflow state                                    │
│  - Calls executeWorkflow(1)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    executeWorkflow(step)                         │
│  For each agent in ROLES_IN_ORDER:                              │
│  1. Update status to WORKING                                     │
│  2. Build input from previous outputs                            │
│  3. Call runAgentStep()                                          │
│  4. Run supervisorCheck()                                        │
│  5. Update agent with output + score                             │
│  6. Log to activityFeed                                          │
│  7. Continue to next step                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    claudeService.ts                              │
│  - Select model (Opus/Sonnet/Haiku)                             │
│  - Build prompt with system + user content                       │
│  - Call Anthropic API                                            │
│  - Parse and clean JSON response                                 │
│  - Return structured output                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW COMPLETE                             │
│  - Final report generated                                        │
│  - Telemetry collected                                           │
│  - User can: View Report / Run AAL / Export Telemetry           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    executeAAL()                                  │
│  1. Run test suites against workflow                             │
│  2. Generate findings                                            │
│  3. Calculate score                                              │
│  4. Apply gating decision                                        │
│  5. Generate contract                                            │
│  6. Feed results to ML engine                                    │
│  7. Integrate supervisor scores                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 State Flow

```
getInitialState() → useState(state)
                         │
                         ▼
                    updateAgent()
                         │
                         ▼
                    setState(prev => ...)
                         │
                         ▼
                    React re-render
                         │
                         ▼
                    UI reflects new state
```

---

## 14. Extending the Platform

### 14.1 Adding a New Workforce

1. **Add WorkforceType enum value** (types.ts):
```typescript
enum WorkforceType {
  // existing...
  NEW_WORKFORCE = 'new_workforce'
}
```

2. **Add AgentRoles** (types.ts):
```typescript
enum AgentRole {
  // existing...
  NEW_AGENT_1 = 'new_agent_1',
  NEW_AGENT_2 = 'new_agent_2',
}
```

3. **Create template** (constants.ts):
```typescript
const NEW_WORKFORCE_TEMPLATE: WorkforceTemplate = {
  name: 'New Workforce',
  description: '...',
  roles: [AgentRole.NEW_AGENT_1, AgentRole.NEW_AGENT_2, ...],
  configs: {
    [AgentRole.NEW_AGENT_1]: {
      role: AgentRole.NEW_AGENT_1,
      name: 'Agent 1',
      description: '...',
      classification: MAIClassification.ADVISORY,
      systemPrompt: '...',
      outputSchema: '...'
    },
    // ...
  }
};
```

4. **Add to WORKFORCE_TEMPLATES** (constants.ts):
```typescript
export const WORKFORCE_TEMPLATES = {
  // existing...
  [WorkforceType.NEW_WORKFORCE]: NEW_WORKFORCE_TEMPLATE
};
```

5. **Add model selection** (claudeService.ts):
```typescript
const opusRoles = [
  // Add complex roles
  AgentRole.NEW_CRITICAL_AGENT,
];

const haikuRoles = [
  // Add simple roles
  AgentRole.NEW_INTAKE_AGENT,
];
```

6. **Create report component** (components/NewReportView.tsx)

7. **Add demo data** (constants.ts)

8. **Add Demo Canon scenario** (demoCanon.ts)

### 14.2 Adding a New Test Suite to AAL

1. **Add to enum** (types.ts):
```typescript
enum RedTeamTestSuite {
  // existing...
  NEW_TEST = 'NEW_TEST'
}
```

2. **Implement test** (redTeamAgent.ts):
```typescript
private static async runNewTest(): Promise<RedTeamFinding[]> {
  const findings: RedTeamFinding[] = [];

  // Test implementation

  return findings;
}
```

3. **Add to test execution**:
```typescript
private static async runAllTests(): Promise<RedTeamFinding[]> {
  const allFindings = await Promise.all([
    // existing...
    this.runNewTest()
  ]);
  return allFindings.flat();
}
```

4. **Initialize multiplier** (AALMLEngine):
```typescript
suiteMultipliers: {
  // existing...
  [RedTeamTestSuite.NEW_TEST]: 1.0
}
```

---

## Appendix A: Environment Setup

### Required Environment Variables

```bash
# .env file
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### Running the Application

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
```

---

## Appendix B: Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| JSON parse error | LLM returned malformed JSON | `cleanJsonResponse()` handles most cases |
| Agent timeout | Complex analysis | Increase timeout, use OPUS model |
| AAL score drops | New vulnerability | Check findings, update prompts |
| State not updating | Stale closure | Use `stateRef.current` in async code |

### Debug Logging

Enable console logging:
```typescript
console.log(`[${role}] Using ${modelName}`);
console.log(`[AAL ML] Processed run:`, { ... });
```

---

*End of Technical Manual*
