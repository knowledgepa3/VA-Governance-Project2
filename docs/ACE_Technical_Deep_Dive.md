# ACE Technical Deep Dive
## A Complete Technical Guide for Intelligent Conversation

**Purpose**: This document gives you the technical understanding to speak confidently about every component of the ACE platform - how it works, why it's designed this way, and the underlying technologies.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [The Multi-Agent Pipeline](#3-the-multi-agent-pipeline)
4. [Data Flow & PII Protection](#4-data-flow--pii-protection)
5. [The Adversarial Assurance Lane (AAL)](#5-the-adversarial-assurance-lane-aal)
6. [Cryptographic Concepts & Future State](#6-cryptographic-concepts--future-state)
7. [API Integrations](#7-api-integrations)
8. [The Audit & Telemetry System](#8-the-audit--telemetry-system)
9. [Human Oversight Gates](#9-human-oversight-gates)
10. [Key Technical Terms Glossary](#10-key-technical-terms-glossary)

---

## 1. System Architecture Overview

### What We Built

ACE is a **multi-agent AI orchestration platform** with built-in governance. Think of it as:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  (React + TypeScript + Tailwind CSS)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │     UAC     │  │  Supervisor │  │   Forensic  │            │
│  │   (Access)  │  │  (Scoring)  │  │   Ledger    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT PIPELINE                               │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  │ Unified │ → │  Agent  │ → │  Agent  │ → │  REPAIR │        │
│  │ Gateway │   │    1    │   │    2    │   │  Agent  │        │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER                               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │         Adversarial Assurance Lane (AAL)            │       │
│  │    (Red Team Testing / Security Validation)         │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Anthropic  │  │     VA      │  │   Future:   │            │
│  │  Claude API │  │ Lighthouse  │  │  More APIs  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Why We Chose It |
|-------|------------|-----------------|
| Frontend | React 18 + TypeScript | Type safety, component architecture, industry standard |
| Styling | Tailwind CSS | Rapid UI development, consistent design system |
| Build Tool | Vite | Fast development builds, modern ES modules |
| AI Backend | Anthropic Claude API | Best-in-class reasoning, large context window |
| State Management | React useState/useReducer | Simple, no external dependencies needed |
| Data Export | Native JSON | Universal format, easy to parse |

### Key Files & Their Purpose

```
App.tsx                 → Main application, state management, workflow orchestration
types.ts                → TypeScript interfaces (the "contracts" for data)
claudeService.ts        → Anthropic API integration
redTeamAgent.ts         → AAL security validation engine
vaApiService.ts         → VA Lighthouse API integration

components/
  AgentCard.tsx         → Individual agent status display
  ReportView.tsx        → Final report rendering
  ComplianceStatement.tsx → Dynamic compliance framework mapping
  SystemSecurityPlan.tsx  → SSP documentation
  StandardOperatingProcedures.tsx → SOPs
  MonitoringDashboard.tsx → Real-time telemetry
  VAIntegrationPanel.tsx  → VA API interaction UI
```

---

## 2. Authentication & Authorization

### Current State: Demo Mode

**What it does now:**
```typescript
// In App.tsx
const [currentUser, setCurrentUser] = useState<UserRole>(UserRole.ISSO);

// Role definitions
enum UserRole {
  ISSO = 'ISSO',           // Full access
  ANALYST = 'Analyst',     // Can run workflows, approve gates
  AUDITOR = 'Auditor'      // Read-only access
}

// Permission check
const canActionWorkforce = currentUser !== UserRole.AUDITOR;
```

**How it works:**
1. User selects role from dropdown (simulated login)
2. Role stored in React state
3. UI elements check `canActionWorkforce` before allowing actions
4. All actions logged with the user's role

**Why demo mode is fine for now:**
- Demonstrates the RBAC (Role-Based Access Control) model
- Shows how permissions would be enforced
- Allows testing all user journeys

### Production State: OAuth 2.0

**What OAuth 2.0 is:**
OAuth 2.0 is an authorization framework that lets users grant limited access to their accounts without sharing passwords.

**The OAuth 2.0 Flow (simplified):**
```
┌──────────┐                                    ┌──────────┐
│   User   │                                    │   ACE    │
│ (Browser)│                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  1. Click "Login with VA"                    │
     │──────────────────────────────────────────────>│
     │                                               │
     │  2. Redirect to VA Identity Provider         │
     │<──────────────────────────────────────────────│
     │                                               │
     │         ┌─────────────────┐                  │
     │         │  VA Identity    │                  │
     │         │    Provider     │                  │
     │         └────────┬────────┘                  │
     │                  │                           │
     │  3. User logs in with PIV/CAC               │
     │─────────────────>│                           │
     │                  │                           │
     │  4. "Allow ACE to access your profile?"     │
     │<─────────────────│                           │
     │                  │                           │
     │  5. User approves                           │
     │─────────────────>│                           │
     │                  │                           │
     │  6. Redirect back with authorization code   │
     │<─────────────────│                           │
     │                  │                           │
     │──────────────────────────────────────────────>│
     │                                               │
     │  7. ACE exchanges code for access token      │
     │                  │<──────────────────────────│
     │                  │                           │
     │                  │  8. Return access token   │
     │                  │──────────────────────────>│
     │                                               │
     │  9. ACE uses token to get user info         │
     │                                               │
     │  10. Session established with real identity │
     │<──────────────────────────────────────────────│
```

**Key OAuth 2.0 Terms:**

| Term | What It Means |
|------|---------------|
| **Authorization Server** | The system that authenticates users (e.g., VA Identity Provider) |
| **Resource Server** | The API being accessed (e.g., VA Lighthouse) |
| **Client** | Your application (ACE) |
| **Access Token** | A credential that proves the user authorized your app |
| **Refresh Token** | Used to get new access tokens without re-login |
| **Scope** | What permissions the token grants (e.g., "read:profile") |

**For VA specifically:**
- VA uses **OAuth 2.0 with PKCE** (Proof Key for Code Exchange)
- Users authenticate via **PIV/CAC** (government smart cards)
- ACE would register as an authorized client with VA

**How to talk about it:**
> "In production, ACE integrates with the organization's identity provider using OAuth 2.0. Users authenticate through their existing SSO - whether that's Azure AD, Okta, or in the federal space, PIV/CAC through the agency's identity provider. The access tokens are short-lived and scoped to only the permissions needed. We never see or store user passwords."

---

## 3. The Multi-Agent Pipeline

### What is a Multi-Agent System?

Instead of one big AI doing everything, we have **specialized agents** that each do one thing well:

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT PIPELINE                              │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ UNIFIED  │    │ EVIDENCE │    │  MEDICAL │    │  RATER   │ │
│  │ GATEWAY  │ ─> │VALIDATOR │ ─> │  NEXUS   │ ─> │PERSPEC-  │ │
│  │          │    │          │    │          │    │  TIVE    │ │
│  │ Sanitize │    │ Analyze  │    │ Connect  │    │ Recommend│ │
│  │ + Struct │    │ Evidence │    │ Diagnoses│    │ Rating   │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │              │               │               │         │
│       ▼              ▼               ▼               ▼         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    SUPERVISOR AGENT                      │  │
│  │         (Monitors all agents, scores outputs)           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                │
│  │  REPAIR  │    │   C&P    │    │  REPORT  │                │
│  │  AGENT   │ ─> │PERSPEC-  │ ─> │GENERATOR │                │
│  │          │    │  TIVE    │    │          │                │
│  │ Fix Errors│    │ Alt View │    │ Compile  │                │
│  └──────────┘    └──────────┘    └──────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multi-Agent?

1. **Specialization**: Each agent has a focused prompt and purpose
2. **Auditability**: You can see exactly which agent said what
3. **Error Isolation**: If one agent fails, others aren't affected
4. **Human Oversight**: Natural points to insert human review

### How Agents Communicate

Agents don't talk to each other directly. The **Supervisor** orchestrates:

```typescript
// Simplified flow from App.tsx
const processWorkflow = async () => {
  // 1. Unified Gateway processes input
  const sanitizedData = await runAgentStep(AgentRole.UNIFIED_GATEWAY, rawInput);

  // 2. Supervisor checks output
  const gatewayScore = await supervisorCheck(sanitizedData);

  // 3. If score meets threshold, continue to next agent
  if (gatewayScore.integrity >= THRESHOLD) {
    const evidence = await runAgentStep(AgentRole.EVIDENCE_VALIDATOR, sanitizedData);
    // ... continue pipeline
  } else {
    // Trigger human oversight gate
    triggerHumanGate(AgentRole.UNIFIED_GATEWAY);
  }
};
```

### Agent State Machine

Each agent goes through defined states:

```
IDLE → PROCESSING → VALIDATING → COMPLETE
                 ↘           ↗
                   AWAITING_HUMAN
                         ↓
                   (Human Decision)
                    ↙         ↘
              COMPLETE      RESET → PROCESSING
```

**How to talk about it:**
> "ACE uses a multi-agent architecture where specialized AI agents handle specific tasks - one for data sanitization, one for evidence analysis, one for medical correlation, and so on. A Supervisor agent monitors all outputs and scores them for integrity, accuracy, and compliance. If any agent's output falls below our governance thresholds, the workflow pauses for human review before continuing."

---

## 4. Data Flow & PII Protection

### The Unified Gateway

The first agent in every pipeline. Its job: **sanitize everything**.

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED GATEWAY                            │
│                                                                 │
│  INPUT (Raw Documents)                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ "John Smith, SSN: 123-45-6789, served in Iraq..."       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   PII DETECTION                          │  │
│  │  • Names → [VETERAN_NAME]                               │  │
│  │  • SSN → [REDACTED_SSN]                                 │  │
│  │  • DOB → [REDACTED_DOB]                                 │  │
│  │  • Addresses → [REDACTED_ADDRESS]                       │  │
│  │  • Phone/Email → [REDACTED_CONTACT]                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  OUTPUT (Sanitized)                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ "[VETERAN_NAME], SSN: [REDACTED], served in Iraq..."    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Redacted

| Data Type | Redaction Marker | Example |
|-----------|------------------|---------|
| Names | [VETERAN_NAME] | "John Smith" → "[VETERAN_NAME]" |
| SSN | [REDACTED_SSN] | "123-45-6789" → "[REDACTED_SSN]" |
| DOB | [REDACTED_DOB] | "01/15/1985" → "[REDACTED_DOB]" |
| Addresses | [REDACTED_ADDRESS] | "123 Main St" → "[REDACTED_ADDRESS]" |
| Phone | [REDACTED_PHONE] | "(555) 123-4567" → "[REDACTED_PHONE]" |
| Medical Record # | [REDACTED_MRN] | "MRN: 12345" → "[REDACTED_MRN]" |

### Why This Matters

1. **Downstream agents never see PII** - They work with sanitized data only
2. **API calls are safe** - We're not sending PII to external AI services
3. **Audit trail is clean** - Logs don't contain sensitive data
4. **Compliance** - HIPAA, Privacy Act, VA 6500 all require this

### Defense in Depth

Even if one layer fails, others protect:

```
Layer 1: Unified Gateway (immediate redaction)
    ↓
Layer 2: Agent prompts explicitly forbid PII processing
    ↓
Layer 3: Supervisor checks for PII leakage in outputs
    ↓
Layer 4: AAL tests for data leakage vulnerabilities
    ↓
Layer 5: Audit logs flag any PII detection
```

**How to talk about it:**
> "Every piece of data that enters ACE goes through our Unified Gateway first. This agent immediately identifies and redacts all PII - names, SSNs, dates of birth, addresses, medical record numbers. The downstream AI agents never see the original sensitive data, they only work with redacted versions. This is our first line of defense, but we also have the Supervisor checking outputs, the AAL testing for leakage, and the audit system flagging any anomalies."

---

## 5. The Adversarial Assurance Lane (AAL)

### What is Red Teaming?

**Red teaming** is simulating attacks against your own system to find vulnerabilities before real attackers do.

For AI systems, this means testing for:
- **Prompt injection**: Can malicious input make the AI ignore its instructions?
- **Data leakage**: Can the AI be tricked into revealing sensitive information?
- **Hallucination**: Does the AI make things up?
- **Instruction override**: Can the AI be told to bypass safety measures?

### AAL Test Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    AAL TEST VECTORS                             │
│                                                                 │
│  PROMPT INJECTION (PI)                                         │
│  ├── PI-001: Direct instruction override                       │
│  ├── PI-002: Encoded payload injection                         │
│  ├── PI-003: Context manipulation                              │
│  └── PI-004: Role hijacking attempts                          │
│                                                                 │
│  DATA LEAKAGE (DL)                                             │
│  ├── DL-001: PII extraction attempts                          │
│  ├── DL-002: System prompt extraction                         │
│  ├── DL-003: Training data extraction                         │
│  ├── DL-004: Cross-session data leakage                       │
│  ├── DL-005: Indirect disclosure via reasoning                │
│  └── DL-006: Summarization leakage                            │
│                                                                 │
│  INSTRUCTION ADHERENCE (IA)                                    │
│  ├── IA-001: Boundary testing                                 │
│  ├── IA-002: Scope creep detection                            │
│  ├── IA-003: Authority escalation                             │
│  └── IA-004: Safety bypass attempts                           │
│                                                                 │
│  HALLUCINATION DETECTION (HD)                                  │
│  ├── HD-001: Citation verification                            │
│  ├── HD-002: Factual consistency                              │
│  └── HD-003: Source attribution                               │
└─────────────────────────────────────────────────────────────────┘
```

### How AAL Works

```typescript
// Simplified from redTeamAgent.ts
const runAALTest = async (testCase: TestVector) => {
  // 1. Prepare attack payload
  const payload = testCase.attackPayload;

  // 2. Send to target agent
  const response = await targetAgent.process(payload);

  // 3. Analyze response for vulnerability indicators
  const analysis = analyzeResponse(response, testCase.expectedBehavior);

  // 4. Score and classify
  return {
    passed: analysis.secure,
    finding: analysis.vulnerability,
    severity: classifySeverity(analysis),
    evidence: response
  };
};
```

### AAL Scoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    AAL SCORECARD                                │
│                                                                 │
│  Overall Score: 87/100                                         │
│                                                                 │
│  Trust Status: CONDITIONAL                                     │
│    ├── TRUSTED (90-100): Safe for production                  │
│    ├── CONDITIONAL (70-89): Document risk acceptance          │
│    └── UNTRUSTED (<70): Requires remediation                  │
│                                                                 │
│  Category Breakdown:                                           │
│    Prompt Injection:    22/25  ████████████████████░░░░        │
│    Data Leakage:        23/25  ████████████████████░░░░        │
│    Instruction Adhere:  20/25  ████████████████░░░░░░░░        │
│    Hallucination:       22/25  ████████████████████░░░░        │
│                                                                 │
│  Findings:                                                     │
│    BLOCKER: 0                                                  │
│    HIGH: 1 (IA-003: Partial authority escalation)             │
│    MEDIUM: 2                                                   │
│    LOW: 3                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Severity Classification

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| **BLOCKER** | Critical vulnerability, system cannot be trusted | Must fix before ANY use |
| **HIGH** | Significant risk, could cause harm | Fix before production |
| **MEDIUM** | Moderate risk, should be addressed | Document if accepting risk |
| **LOW** | Minor issue, best practice | Recommend fixing |

**How to talk about it:**
> "Before any workflow goes to production, we run it through our Adversarial Assurance Lane. This is essentially automated red teaming - we throw 44 different attack vectors at the system, testing for prompt injection, data leakage, hallucinations, and instruction bypass. The system gets a security score and a trust classification. If it's 'Untrusted,' it can't be used for real decisions until the vulnerabilities are fixed."

---

## 6. Cryptographic Concepts & Future State

### Current State vs. Production Requirements

| Feature | Current (Demo) | Production | Technology |
|---------|---------------|------------|------------|
| User Auth | Role dropdown | OAuth 2.0 / SAML | JWT tokens |
| Session Mgmt | React state | Server-side sessions | Encrypted cookies |
| Data at Rest | Browser memory | Encrypted database | AES-256 |
| Data in Transit | HTTPS | HTTPS + TLS 1.3 | TLS certificates |
| Audit Integrity | Append-only array | Signed, tamper-evident | HMAC / Digital signatures |
| API Auth | API keys in env | Key vault / HSM | Azure Key Vault, AWS KMS |

### Key Cryptographic Concepts

#### 1. **Encryption** (Confidentiality)
Making data unreadable without the key.

```
Plaintext: "John Smith, SSN 123-45-6789"
     │
     ▼ [AES-256 Encryption with Key]
     │
Ciphertext: "a7f3b2c9e8d1..."  (unreadable without key)
```

**AES-256**: The gold standard for symmetric encryption. Used for data at rest.

#### 2. **Hashing** (Integrity)
Creating a fixed-size "fingerprint" of data. Any change creates a completely different hash.

```
Input: "Audit log entry #1234"
     │
     ▼ [SHA-256 Hash]
     │
Hash: "e3b0c44298fc1c149afbf4c8996fb924..."

If someone changes even one character:
Input: "Audit log entry #1235"  (changed 4 to 5)
     │
     ▼ [SHA-256 Hash]
     │
Hash: "7f83b1657ff1fc53b92dc18148a1d65a..."  (completely different!)
```

**Why it matters for ACE**: We could hash each audit log entry. If someone tampers with logs, the hashes won't match.

#### 3. **Digital Signatures** (Authentication + Integrity)
Proves who created something AND that it hasn't been modified.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIGITAL SIGNATURE                            │
│                                                                 │
│  1. ISSO approves at Human Oversight Gate                      │
│                                                                 │
│  2. System creates approval record:                            │
│     {                                                          │
│       "action": "approve",                                     │
│       "user": "john.smith@agency.gov",                        │
│       "timestamp": "2024-01-15T10:30:00Z",                    │
│       "agentId": "evidence-validator"                         │
│     }                                                          │
│                                                                 │
│  3. System signs with ISSO's private key:                      │
│     Record + Private Key → Signature                           │
│                                                                 │
│  4. Anyone can verify with ISSO's public key:                  │
│     Record + Signature + Public Key → Valid/Invalid            │
│                                                                 │
│  Result: Proof that THIS person approved at THIS time          │
│          and the record hasn't been changed                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. **JWT (JSON Web Tokens)**
How modern authentication works. A self-contained token with user info.

```
JWT Structure:
┌─────────────┬─────────────┬─────────────┐
│   HEADER    │   PAYLOAD   │  SIGNATURE  │
│  (algorithm)│  (user data)│  (verify)   │
└─────────────┴─────────────┴─────────────┘
      │              │              │
      ▼              ▼              ▼
  "RS256"      {                 "abc123..."
               "sub": "user123",
               "role": "ISSO",
               "exp": 1699999999
               }

The signature proves:
1. The token was issued by a trusted authority
2. The payload hasn't been tampered with
```

**How to talk about it:**
> "In production, every human approval at an oversight gate would be digitally signed. The signature cryptographically proves who made the decision and when, and ensures the record can't be altered without detection. This gives us true non-repudiation - you can't deny you approved something when your private key signed it."

---

## 7. API Integrations

### Anthropic Claude API

**What it is**: The AI service that powers our agents.

**How we use it**:
```typescript
// From claudeService.ts (simplified)
const runAgentStep = async (role: AgentRole, input: string) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: AGENT_PROMPTS[role],  // Role-specific system prompt
      messages: [{ role: 'user', content: input }]
    })
  });

  return response.json();
};
```

**Key concepts**:
- **System Prompt**: Instructions that define the agent's behavior
- **Max Tokens**: Limit on response length (cost control)
- **Model**: Which Claude version to use

### VA Lighthouse API

**What it is**: VA's official API platform for accessing veteran data.

**Available APIs** (that we integrate with):
| API | Purpose | Data Returned |
|-----|---------|---------------|
| Veteran Verification | Confirm veteran status | Service history, discharge status |
| Disability Rating | Get current ratings | Combined rating, individual conditions |
| Claims Status | Track pending claims | Claim phase, documents needed |
| Benefits Intake | Submit documents | Submission confirmation |

**Authentication Flow**:
```
1. ACE registered as OAuth client with VA
2. Veteran authenticates via ID.me or Login.gov
3. Veteran authorizes ACE to access their data
4. VA returns access token
5. ACE uses token to call APIs
6. Token expires, refresh as needed
```

**Current State**: We use **sandbox mode** with simulated data. Production requires:
- OAuth client registration with VA
- Security review
- Terms of service agreement

**How to talk about it:**
> "We integrate with VA Lighthouse, which is the VA's official API platform. In the demo, we use sandbox mode with simulated veteran data. In production, veterans would authenticate through ID.me or Login.gov, authorize ACE to access their records, and we'd pull real service history and disability ratings. All of this goes through proper OAuth flows - we never see veteran passwords."

---

## 8. The Audit & Telemetry System

### What Gets Logged

Every significant event creates an audit record:

```typescript
interface ActivityLog {
  id: string;              // Unique identifier
  timestamp: string;       // ISO 8601 format
  role: string;            // Which agent or user
  message: string;         // What happened
  type: 'info' | 'success' | 'warning' | 'error';
}
```

### Audit Trail Example

```
[10:30:01] SUPERVISOR    | Workflow initiated by ISSO (info)
[10:30:02] GATEWAY       | Processing 3 input documents (info)
[10:30:03] GATEWAY       | PII redaction complete: 12 fields sanitized (success)
[10:30:05] EVIDENCE      | Analyzing service records (info)
[10:30:08] EVIDENCE      | Found 3 service-connected conditions (success)
[10:30:10] SUPERVISOR    | Integrity score: 94/100 (info)
[10:30:12] NEXUS         | Processing medical correlations (info)
[10:30:15] REPAIR        | Minor inconsistency detected, auto-corrected (warning)
[10:30:18] SUPERVISOR    | Human oversight gate triggered (warning)
[10:30:45] ANALYST       | Gate approved by Jane.Doe@agency.gov (success)
[10:30:47] REPORT        | Generating final package (info)
[10:30:52] SUPERVISOR    | Workflow complete. Trust status: TRUSTED (success)
```

### Telemetry Package Export

When you export, you get everything:

```json
{
  "exportMetadata": {
    "exportTimestamp": "2024-01-15T10:31:00Z",
    "platformVersion": "1.0.0",
    "exportedBy": "ISSO",
    "environmentMode": "demo"
  },
  "sessionContext": {
    "sessionType": "FULL_GOVERNANCE_RUN",
    "status": "WORKFLOW_COMPLETED_WITH_AAL",
    "workforceTemplate": "VA_CLAIMS"
  },
  "governanceAuditLog": {
    "summary": {
      "totalEvents": 47,
      "successCount": 38,
      "warningCount": 7,
      "errorCount": 2
    },
    "activityFeed": [ /* all 47 events */ ]
  },
  "aalSecurityValidation": {
    "executed": true,
    "overallScore": 87,
    "trustStatus": "CONDITIONAL",
    "findings": [ /* detailed findings */ ]
  },
  "agentOutputs": {
    "unified_gateway": { /* full output */ },
    "evidence_validator": { /* full output */ },
    // ... all agents
  }
}
```

**How to talk about it:**
> "Every action in ACE is logged to our Forensic Ledger - which agent did what, when, with what result. We track successes, warnings, and errors. Human oversight decisions are logged with the user's identity. At any time, you can export the complete telemetry package as JSON, which gives auditors everything they need to reconstruct exactly what happened in a workflow."

---

## 9. Human Oversight Gates

### What Triggers a Gate

Gates are triggered when governance scores fall below thresholds:

```typescript
const GOVERNANCE_THRESHOLDS = {
  integrity: 85,    // Data consistency
  accuracy: 80,     // Factual correctness
  compliance: 90    // Regulatory adherence
};

// After each agent completes:
if (scores.integrity < THRESHOLDS.integrity ||
    scores.accuracy < THRESHOLDS.accuracy ||
    scores.compliance < THRESHOLDS.compliance) {
  triggerHumanOversightGate();
}
```

### Gate Types

| Type | Trigger | Bypass Allowed? |
|------|---------|-----------------|
| **MANDATORY** | Critical thresholds not met | Never |
| **CONDITIONAL** | Minor issues, REPAIR attempted fix | Only if REPAIR successful |

### Gate UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  BEHAVIORAL INTEGRITY GATE                                 │
│                                                                 │
│  Agent: Evidence Validator                                     │
│  Issue: Accuracy score 78% (threshold: 80%)                   │
│                                                                 │
│  REPAIR Agent Applied: "Cross-referenced dates with DD-214"   │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │  ✓ Validate     │    │  ↺ Request      │                   │
│  │    Logic        │    │    Reset        │                   │
│  └─────────────────┘    └─────────────────┘                   │
│                                                                 │
│  Your decision will be logged with your identity.              │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Recorded

```json
{
  "gateEvent": {
    "timestamp": "2024-01-15T10:30:45Z",
    "gateType": "MANDATORY",
    "triggeringAgent": "evidence_validator",
    "triggeringScore": {
      "integrity": 92,
      "accuracy": 78,
      "compliance": 95
    },
    "thresholdViolated": "accuracy",
    "repairAttempted": true,
    "repairAction": "Cross-referenced dates with DD-214",
    "humanDecision": "APPROVED",
    "decidedBy": "jane.doe@agency.gov",
    "decisionTimestamp": "2024-01-15T10:30:45Z"
  }
}
```

**How to talk about it:**
> "ACE has built-in Human Oversight Gates that pause the workflow when AI confidence drops below our thresholds. The human reviewer sees exactly what triggered the gate, what the REPAIR agent tried to fix, and makes an informed decision to proceed or reset. Their decision is logged with their identity - this is how we maintain human accountability even in an automated system."

---

## 10. Key Technical Terms Glossary

### Authentication & Authorization
| Term | Definition |
|------|------------|
| **OAuth 2.0** | Authorization framework for granting limited access without sharing passwords |
| **SAML** | Security Assertion Markup Language - older SSO protocol, common in enterprises |
| **JWT** | JSON Web Token - self-contained token for transmitting claims |
| **RBAC** | Role-Based Access Control - permissions based on user roles |
| **SSO** | Single Sign-On - one login for multiple systems |
| **PIV/CAC** | Personal Identity Verification / Common Access Card - government smart cards |
| **MFA** | Multi-Factor Authentication - requiring multiple proof methods |

### Cryptography
| Term | Definition |
|------|------------|
| **AES-256** | Advanced Encryption Standard with 256-bit keys - gold standard for symmetric encryption |
| **SHA-256** | Secure Hash Algorithm - creates fixed-size fingerprint of data |
| **RSA** | Asymmetric encryption using public/private key pairs |
| **TLS** | Transport Layer Security - encrypts data in transit (HTTPS uses this) |
| **HMAC** | Hash-based Message Authentication Code - verifies integrity and authenticity |
| **PKI** | Public Key Infrastructure - system for managing digital certificates |

### AI & ML
| Term | Definition |
|------|------------|
| **LLM** | Large Language Model - AI trained on text (Claude, GPT, etc.) |
| **Prompt Injection** | Attack that manipulates AI via malicious input |
| **Hallucination** | When AI generates false information confidently |
| **Context Window** | Maximum amount of text an LLM can process at once |
| **Token** | Unit of text processing (roughly 4 characters = 1 token) |
| **Fine-tuning** | Training a model on specific data for specialized tasks |

### Compliance & Governance
| Term | Definition |
|------|------------|
| **ATO** | Authorization to Operate - formal approval to run a system |
| **POA&M** | Plan of Action & Milestones - tracking known security gaps |
| **SSP** | System Security Plan - comprehensive security documentation |
| **FIPS 199** | Federal standard for categorizing information systems (Low/Moderate/High) |
| **FedRAMP** | Federal Risk and Authorization Management Program - cloud security standard |
| **SOC 2** | Service Organization Control 2 - commercial security audit standard |

### API & Integration
| Term | Definition |
|------|------------|
| **REST** | Representational State Transfer - common API architecture style |
| **API Key** | Secret credential for authenticating API requests |
| **Webhook** | Automated message sent when an event occurs |
| **Rate Limiting** | Restricting number of API calls to prevent abuse |
| **Sandbox** | Test environment with fake data |

---

## Quick Reference: How to Explain ACE

### The 30-Second Pitch
> "ACE is an AI governance platform that lets you run multi-agent AI workflows with built-in security and compliance. Every action is logged, every AI output is scored for integrity, and humans stay in the loop through mandatory oversight gates. Before anything goes to production, it runs through our adversarial testing lane that simulates attacks. The result is AI that's auditable, defensible, and trustworthy."

### The Technical Pitch (2 minutes)
> "ACE orchestrates multiple specialized AI agents - each with a focused purpose - through a governed pipeline. Data enters through a Unified Gateway that strips PII before any AI processing. A Supervisor agent scores every output for integrity, accuracy, and compliance. When scores drop below thresholds, the workflow pauses for human review.
>
> Our Adversarial Assurance Lane runs 44+ attack vectors against the system - prompt injection, data leakage, hallucination detection - and produces a security scorecard. Only workflows that achieve 'Trusted' status can be used for real decisions.
>
> Everything is logged to an immutable audit trail. You can export complete telemetry packages for compliance review. The system maps to NIST AI RMF, NIST 800-53, CMMC, and EU AI Act requirements.
>
> Authentication is OAuth 2.0 compatible - in production, users authenticate through existing enterprise identity providers. Role-based access control restricts who can run workflows versus who can only audit."

### Handling Technical Questions

**Q: "Is the data encrypted?"**
> "Data in transit is encrypted via TLS 1.3. In the demo, data is held in browser memory and never persisted. In production deployment, data at rest would use AES-256 encryption with keys managed through a proper key management system."

**Q: "How do you prevent prompt injection?"**
> "Multiple layers. First, the Unified Gateway sanitizes inputs before they reach AI agents. Second, each agent has hardened system prompts that explicitly reject instruction override attempts. Third, the Supervisor monitors for anomalous outputs. Fourth, our AAL runs prompt injection tests against every workflow. We test for direct injection, encoded payloads, context manipulation, and role hijacking."

**Q: "What happens if the AI is wrong?"**
> "That's why we have Human Oversight Gates. The system scores AI outputs and when confidence is below thresholds, a human must review and approve. The AI output is always advisory - humans make final decisions. Plus, our audit trail shows exactly what the AI said and what the human decided, so there's clear accountability."

**Q: "How does this meet [specific compliance framework]?"**
> "We've mapped our controls to multiple frameworks. In the Compliance Dashboard, you can select which frameworks apply - NIST AI RMF, NIST 800-53, CMMC, EU AI Act, or others. Each control shows exactly how ACE implements it and what evidence exists. The SSP provides formal documentation of our security posture."

---

*Document Version: 1.0*
*Last Updated: Based on ACE Platform v1.0.0-prototype*
