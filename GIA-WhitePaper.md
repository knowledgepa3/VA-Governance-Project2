# GIA: Governed Intelligence Architecture

## A Control Plane for Trustworthy AI Operations

**Version 1.0 | February 2026**

---

## Executive Summary

As AI agents become capable of autonomous action—browsing the web, analyzing sensitive documents, making recommendations that affect real outcomes—the question shifts from "Can AI do this?" to "Should AI do this without oversight?"

**Governed Intelligence Architecture (GIA)** answers this question with a new paradigm: **AI that proposes, humans that approve, and systems that prove.**

GIA is not another AI wrapper or prompt engineering framework. It is a **control plane** that sits between AI capabilities and real-world consequences, ensuring every significant action passes through cryptographically-sealed governance gates with complete audit trails.

### Key Principles

1. **Claude Proposes → GIA Evaluates → Human Approves → System Executes → Evidence Seals**
2. **No action without attribution; no decision without documentation**
3. **Memory-only PII handling; hash-locked audit trails**
4. **Modular architecture for domain-specific governance policies**

---

## The Problem: Ungoverned AI is Untrustworthy AI

### The Trust Gap

Organizations face a fundamental tension:

- **AI Capability**: Modern LLMs can analyze documents, navigate websites, draft communications, and make sophisticated recommendations
- **AI Accountability**: When something goes wrong, there's often no clear record of what the AI "decided," why, or who approved it

This creates an **accountability vacuum** that makes AI unsuitable for high-stakes domains:

| Domain | Risk Without Governance |
|--------|------------------------|
| **Veterans Benefits** | Incorrect claims advice could cost veterans thousands in denied benefits |
| **Federal Contracting** | AI-assisted bid decisions without audit trails create compliance exposure |
| **Healthcare** | Medical recommendations without human verification risk patient safety |
| **Legal** | AI-drafted documents without attorney review could constitute malpractice |
| **Financial** | Automated transactions without gates enable fraud and errors |

### The Compliance Reality

Regulated industries require:
- **Audit trails** for every decision affecting outcomes
- **Human-in-the-loop** for consequential actions
- **Data provenance** proving where information came from
- **PII protection** with documented handling procedures
- **Explainability** for algorithmic recommendations

Current AI deployments fail these requirements not because the AI is incapable, but because the **infrastructure for governance doesn't exist**.

---

## The Solution: Governed Intelligence Architecture

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GIA CONTROL PLANE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   PROPOSE    │───▶│   EVALUATE   │───▶│    GATE      │     │
│   │  (Claude)    │    │  (Tool Router)│    │  (Human)     │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│          │                   │                    │              │
│          ▼                   ▼                    ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │    INTENT    │    │   DECISION   │    │  EXECUTION   │     │
│   │   (Logged)   │    │   (Logged)   │    │   (Sealed)   │     │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │  EVIDENCE CHAIN  │                         │
│                    │  (Hash-Locked)   │                         │
│                    └──────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Five Pillars

#### 1. Canonical Schemas

Every AI action flows through three standardized records:

**ToolCallIntent** - What the AI wants to do
```javascript
{
  id: "intent-a1b2c3",
  action: "browser.navigate",
  args: { url: "https://sam.gov/search" },
  requestedBy: "claude-sonnet-4",
  timestamp: "2026-02-05T17:00:00Z",
  intentHash: "sha256:..."
}
```

**ToolCallDecision** - What GIA decided
```javascript
{
  intentId: "intent-a1b2c3",
  status: "APPROVED",
  evaluatedBy: "GIAToolRouter",
  riskLevel: "MEDIUM",
  gateRequired: true,
  gateResult: "HUMAN_APPROVED",
  approvedPayloadHash: "sha256:...",
  decisionHash: "sha256:..."
}
```

**ToolCallExecution** - What actually happened
```javascript
{
  decisionId: "decision-x7y8z9",
  status: "EXECUTED",
  result: { success: true, data: {...} },
  tokenUsage: { input: 1500, output: 800 },
  executedAt: "2026-02-05T17:00:05Z",
  executionHash: "sha256:...",
  sealed: true
}
```

#### 2. Governed Gates

Gates are **mandatory human approval points** for consequential actions:

| Gate Type | Triggers When | Approval Required |
|-----------|---------------|-------------------|
| **Financial** | Any transaction > $0 | Explicit "approve" + amount confirmation |
| **PII** | Personal data handling | Consent + security acknowledgment |
| **External** | API calls, navigation | Domain whitelist + purpose confirmation |
| **Export** | Data leaving system | Content review + destination approval |
| **Submission** | Forms, applications | Full content review + legal acknowledgment |

Gates cannot be bypassed programmatically. Even in demo mode, gates fire to demonstrate the governance flow.

#### 3. Evidence Chain

Every workflow produces a **cryptographically-linked evidence chain**:

```
Pack 1: Document Intake
  ├── Hash: sha256:a1b2c3...
  ├── Previous: null (genesis)
  └── Contents: { files: [...], hashes: [...] }
         │
         ▼
Pack 2: Analysis Complete
  ├── Hash: sha256:d4e5f6...
  ├── Previous: sha256:a1b2c3... (links to Pack 1)
  └── Contents: { findings: [...], model: "sonnet" }
         │
         ▼
Pack 3: Human Approval
  ├── Hash: sha256:g7h8i9...
  ├── Previous: sha256:d4e5f6... (links to Pack 2)
  └── Contents: { gate: "export", decision: "approved" }
```

**Tamper Detection**: If any pack is modified, the chain breaks and verification fails.

#### 4. PII Protection

GIA implements defense-in-depth for sensitive data:

| Layer | Protection |
|-------|------------|
| **Collection** | Gate-protected, explicit consent required |
| **Storage** | Memory-only (JavaScript variables), never localStorage |
| **Audit Trail** | Hash of PII stored, never plaintext |
| **Display** | Masked format (***-**-1234) |
| **Export** | Clear warnings, user must acknowledge |
| **Session End** | Automatic clearing when browser closes |

#### 5. Module System

GIA supports domain-specific governance through pluggable modules:

```javascript
GIAModuleSystem.register({
  id: 'va-claims',
  name: 'VA Claims Analysis',
  version: '2.0.0',
  riskLevel: 'HIGH',

  // Domain-specific governance
  requiredGates: ['document-review', 'rating-verification', 'export'],
  piiPolicy: 'HASH_ONLY',
  domainWhitelist: ['va.gov', 'ebenefits.va.gov'],

  // Specialized tools
  tools: [
    { action: 'analyze-dd214', risk: 'MEDIUM', requiresGate: false },
    { action: 'calculate-rating', risk: 'HIGH', requiresGate: true },
    { action: 'submit-claim', risk: 'CRITICAL', requiresGate: true }
  ]
});
```

---

## Implementation: VA Claims Analysis

### The Challenge

Veterans navigating the VA disability claims system face:
- 500+ page medical records to review
- Complex regulatory framework (38 CFR Part 4)
- High stakes (rating differences = thousands in lifetime benefits)
- Adversarial context (initial denials are common)

### The GIA Solution

**6-Agent Pipeline with Governed Gates**

```
GATEWAY Agent
    │ Catalogs all documents, identifies evidence types
    ▼
TIMELINE Agent
    │ Reconstructs service history, injury dates, treatment sequence
    ▼
EVIDENCE Agent
    │ Maps evidence to rating criteria, identifies nexus
    ▼
RATER Agent ──────┐
    │             │ ⚠️ MANDATORY GATE: Human verifies rating logic
    ▼             │
QA Agent ─────────┤
    │             │ ⚠️ MANDATORY GATE: Human verifies citations
    ▼             │
REPORT Agent ─────┘
    │
    ▼
[OPTIONAL] PII Gate ── Add Veteran name/SSN to report
    │
    ▼
Export Gate ── Confirm before generating final document
```

### Security Model

```
┌─────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARIES                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐      ┌────────────────┐            │
│  │   UNTRUSTED    │      │    TRUSTED     │            │
│  │                │      │                │            │
│  │  • Web content │      │  • User input  │            │
│  │  • API responses│ ───▶│  • Gate decisions│           │
│  │  • File contents│ GATE │  • Export approval│         │
│  │  • AI outputs  │      │  • PII consent │            │
│  │                │      │                │            │
│  └────────────────┘      └────────────────┘            │
│                                                          │
│  AI outputs are PROPOSALS until human-approved          │
│  External data is UNTRUSTED until gate-verified         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Tool Router (Enterprise Grade)

**Idempotency & Replay Protection**
```javascript
// Each call gets a unique nonce
const nonce = crypto.randomUUID();

// Nonces are tracked to prevent replay
if (usedNonces.has(nonce)) {
  return { status: 'REJECTED', reason: 'REPLAY_DETECTED' };
}

// Calls expire after 5 minutes
if (Date.now() > call.expiresAt) {
  return { status: 'EXPIRED' };
}
```

**Hash-Locked Execution**
```javascript
// Decision includes hash of approved payload
const approvedHash = await sha256(JSON.stringify(args));

// Execution verifies hash matches
if (executionHash !== decision.approvedPayloadHash) {
  return { status: 'REJECTED', reason: 'PAYLOAD_TAMPERED' };
}
```

**Pre-flight PII Redaction**
```javascript
const PII_PATTERNS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
};

// Redact before any external transmission
function redactPII(text) {
  let redacted = text;
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, `[${type}_REDACTED]`);
  }
  return redacted;
}
```

### Evidence Pack Schema

```typescript
interface EvidencePack {
  id: string;              // Unique pack identifier
  workflowId: string;      // Parent workflow
  source: string;          // Origin system
  endpoint: string;        // API/action path
  timestamp: string;       // ISO 8601

  request: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    hash: string;          // SHA-256 of request
  };

  response: {
    status?: number;
    data?: any;
    hash: string;          // SHA-256 of response
  };

  validation: {
    inputHash: string;
    outputHash: string;
    packHash: string;      // SHA-256 of entire pack
    previousPackHash: string | null;  // Chain link
    sealed: boolean;
    sealedAt?: string;
  };
}
```

### Governance Configuration

```javascript
const GIA_CONFIG = {
  // Workflow settings
  workflow: {
    maxDuration: 600000,       // 10 minute timeout
    tokenCeiling: 100000,      // Max tokens per session
    requireEvidenceChain: true,
    autoSealOnComplete: true,
  },

  // Gate policies
  gates: {
    financial: { threshold: 0, requireAmount: true },
    pii: { requireConsent: true, hashOnly: true },
    export: { requireReview: true, maxSize: 10485760 },
    external: { requireWhitelist: true, logAll: true },
  },

  // Security
  security: {
    nonceExpiry: 300000,       // 5 minutes
    maxReplayWindow: 60000,    // 1 minute
    hashAlgorithm: 'SHA-256',
    piiStorage: 'MEMORY_ONLY',
  },

  // Audit
  audit: {
    retainDays: 90,
    includePayloads: true,
    redactPII: true,
    exportFormat: 'JSON',
  },
};
```

---

## Compliance Mapping

### NIST 800-53 (Federal Information Security)

| Control | GIA Implementation |
|---------|-------------------|
| **AC-2** Account Management | Module-based access, workflow-scoped permissions |
| **AU-2** Audit Events | All tool calls logged with Intent→Decision→Execution |
| **AU-10** Non-repudiation | Hash-locked evidence chains, sealed packs |
| **IA-2** Identification | PII gate with explicit consent and hashing |
| **SC-8** Transmission Confidentiality | Pre-flight PII redaction, domain whitelists |
| **SI-10** Information Input Validation | Schema validation, hash verification |

### SOC 2 Type II

| Criteria | GIA Implementation |
|----------|-------------------|
| **CC6.1** Logical Access | Gate-based approval for sensitive operations |
| **CC7.2** System Monitoring | Real-time workflow tracking, evidence chain |
| **CC8.1** Change Management | Version-controlled modules, immutable audit logs |
| **PI1.1** Privacy Notice | Clear PII collection consent, memory-only storage |

### HIPAA (Healthcare)

| Requirement | GIA Implementation |
|-------------|-------------------|
| **Access Controls** | Governed gates for PHI access |
| **Audit Controls** | Complete activity logging with hashes |
| **Integrity Controls** | Hash-locked evidence chain |
| **Transmission Security** | PII redaction, domain restrictions |

---

## Deployment Models

### Model 1: Browser-Based (Current)

```
┌─────────────────────────────────────────┐
│              USER BROWSER               │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │         GIA Console             │   │
│  │  • Full governance engine       │   │
│  │  • Local evidence storage       │   │
│  │  • Memory-only PII              │   │
│  └─────────────────────────────────┘   │
│              │                          │
│              ▼                          │
│  ┌─────────────────────────────────┐   │
│  │      Claude API (Direct)        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Pros**: Zero infrastructure, immediate deployment, data never leaves browser
**Cons**: Evidence not persisted long-term, single-user

### Model 2: Hybrid (Recommended for Enterprise)

```
┌─────────────────┐     ┌─────────────────┐
│  User Browser   │     │  GIA Backend    │
│  (UI + Gates)   │────▶│  (Evidence DB)  │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Claude API     │
                        │  (Server-side)  │
                        └─────────────────┘
```

**Pros**: Persistent evidence, multi-user, API key security
**Cons**: Infrastructure required, network dependency

### Model 3: Air-Gapped (High Security)

```
┌─────────────────────────────────────────┐
│           SECURE ENCLAVE                │
├─────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    │
│  │ GIA Engine  │───▶│ Local LLM   │    │
│  └─────────────┘    └─────────────┘    │
│         │                               │
│         ▼                               │
│  ┌─────────────────────────────────┐   │
│  │    Encrypted Evidence Store     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
        │
        ▼ (Export only via approved gate)
┌─────────────────┐
│ External System │
└─────────────────┘
```

**Pros**: Maximum security, no external network
**Cons**: Requires local LLM, complex setup

---

## Roadmap

### Phase 1: Foundation (Complete)
- [x] Core governance engine
- [x] Evidence chain with hash verification
- [x] Gate system (financial, PII, export)
- [x] VA Claims 6-agent pipeline
- [x] Browser automation with MCP
- [x] Demo mode with synthetic data

### Phase 2: Enterprise Hardening (Q2 2026)
- [ ] Server-side evidence persistence
- [ ] Multi-user workflow sharing
- [ ] Role-based gate delegation
- [ ] SSO integration
- [ ] Compliance reporting dashboard

### Phase 3: Platform Expansion (Q3 2026)
- [ ] Additional domain modules (Legal, Healthcare, Finance)
- [ ] Custom module SDK
- [ ] Third-party tool integration marketplace
- [ ] Real-time collaboration
- [ ] Mobile companion app

### Phase 4: Intelligence Layer (Q4 2026)
- [ ] Adversarial testing automation (Red Team)
- [ ] Governance policy learning
- [ ] Anomaly detection in approval patterns
- [ ] Predictive risk scoring
- [ ] Continuous compliance monitoring

---

## Conclusion

The AI industry has focused on capability. **GIA focuses on accountability.**

As AI agents become more powerful and autonomous, the organizations that thrive will be those that can deploy AI confidently—knowing that every action is proposed, evaluated, approved, executed, and proven.

GIA provides that confidence through:

1. **Transparent Governance**: See exactly what AI proposes before it acts
2. **Cryptographic Proof**: Evidence chains that detect tampering
3. **Human Authority**: Gates ensure humans remain in control
4. **Regulatory Readiness**: Built for compliance from day one
5. **Domain Flexibility**: Modular architecture adapts to any use case

**AI that proposes. Humans that approve. Systems that prove.**

That's Governed Intelligence Architecture.

---

## About

**GIA** is developed by veterans, for veterans—and for anyone who needs AI they can trust.

**Contact**: [Your contact information]
**Demo**: https://gia-platform.vercel.app/console
**Repository**: https://github.com/knowledgepa3/gia-platform

---

*© 2026 GIA Project. All rights reserved.*
